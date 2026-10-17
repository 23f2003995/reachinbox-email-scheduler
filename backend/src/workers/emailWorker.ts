import { Worker, Job } from 'bullmq';
import { config } from '../config/env.js';
import { redisConnection } from '../config/redis.js';
import { prisma } from '../db/prisma.js';
import { etherealService } from '../services/ethereal.js';
import { rateLimiterService } from '../services/rateLimiter.js';
import { elasticsearchService } from '../services/elasticsearch.js';
import { EmailJobData, emailQueue } from '../queues/emailQueue.js';

export function createEmailWorker(): Worker<EmailJobData> {
  console.log(`[BullMQ Worker] Spawning Email Worker with concurrency = ${config.bullmq.concurrency}`);

  const worker = new Worker<EmailJobData>(
    config.bullmq.queueName,
    async (job: Job<EmailJobData>, token?: string) => {
      const { emailId, senderEmail, recipientEmail, subject, body, delaySeconds, hourlyLimit } = job.data;

      console.log(`[Worker] Processing Job ${job.id} for recipient: ${recipientEmail} (Sender: ${senderEmail})`);

      // 1. Idempotency Check in DB
      const existingEmail = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!existingEmail) {
        console.warn(`[Worker] Email ${emailId} not found in database. Skipping.`);
        return { status: 'skipped_not_found' };
      }

      if (existingEmail.status === 'SENT') {
        console.log(`[Worker] Email ${emailId} is already marked as SENT. Skipping to prevent duplicate send.`);
        return { status: 'skipped_already_sent' };
      }

      // Mark status as PROCESSING
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'PROCESSING' },
      });

      // 2. Rate Limiting Check (Redis-backed atomic window counter)
      const limit = hourlyLimit || config.scheduler.defaultMaxEmailsPerHour;
      const rateLimitCheck = await rateLimiterService.checkAndIncrement(senderEmail, limit);

      if (!rateLimitCheck.allowed) {
        const retryDelay = rateLimitCheck.retryDelayMs || 60000;
        const nextRunTime = rateLimitCheck.nextAvailableWindow || new Date(Date.now() + retryDelay);

        console.warn(
          `[Worker Rate-Limit] Sender ${senderEmail} reached limit (${rateLimitCheck.currentCount}/${limit}). Rescheduling job ${job.id} for ${nextRunTime.toISOString()} (${Math.round(retryDelay / 1000)}s delay).`
        );

        // Update DB record to reflect RATE_LIMITED state and new scheduled time
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'RATE_LIMITED',
            scheduledAt: nextRunTime,
            retryCount: { increment: 1 },
          },
        });

        // Delay job in BullMQ to the next available hour window
        if (token && typeof (job as any).moveToDelayed === 'function') {
          await (job as any).moveToDelayed(Date.now() + retryDelay, token);
          return { status: 'rescheduled_rate_limited', nextRunTime };
        } else {
          // Fallback: Re-enqueue delayed job
          await emailQueue.add('send-email', {
            ...job.data,
            scheduledAt: nextRunTime.toISOString(),
          }, {
            delay: retryDelay,
            jobId: `email_${emailId}_retry_${Date.now()}`,
          });
          return { status: 'rescheduled_readded', nextRunTime };
        }
      }

      // 3. Throttle Delay Between Sends (to mimic realistic email provider pacing)
      const throttleSec = delaySeconds ?? config.scheduler.defaultDelaySeconds;
      if (throttleSec > 0) {
        console.log(`[Worker Pacing] Applying throttle delay of ${throttleSec}s before sending to ${recipientEmail}...`);
        await new Promise((resolve) => setTimeout(resolve, throttleSec * 1000));
      }

      // 4. Send Email via Ethereal SMTP
      try {
        const sendResult = await etherealService.sendEmail({
          from: senderEmail,
          to: recipientEmail,
          subject,
          body,
        });

        const previewUrl = typeof sendResult.previewUrl === 'string' ? sendResult.previewUrl : null;
        const sentAt = new Date();

        console.log(`[Worker Success] Sent email to ${recipientEmail}! Ethereal Preview URL: ${previewUrl}`);

        // Update Relational DB
        const updatedEmail = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt,
            etherealPreviewUrl: previewUrl,
            errorMessage: null,
          },
        });

        // Update Elasticsearch Index
        await elasticsearchService.indexEmail({
          id: updatedEmail.id,
          senderEmail: updatedEmail.senderEmail,
          recipientEmail: updatedEmail.recipientEmail,
          subject: updatedEmail.subject,
          body: updatedEmail.body,
          status: 'SENT',
          scheduledAt: updatedEmail.scheduledAt,
          sentAt: updatedEmail.sentAt,
          etherealPreviewUrl: previewUrl,
        });

        return {
          status: 'SENT',
          emailId,
          recipientEmail,
          previewUrl,
          sentAt,
        };
      } catch (sendError: any) {
        console.error(`[Worker Error] Failed to send email to ${recipientEmail}:`, sendError.message);

        // Update DB with failure
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            errorMessage: sendError.message,
            retryCount: { increment: 1 },
          },
        });

        // Update Elasticsearch Index
        await elasticsearchService.indexEmail({
          id: emailId,
          senderEmail,
          recipientEmail,
          subject,
          body,
          status: 'FAILED',
          scheduledAt: new Date(job.data.scheduledAt),
          errorMessage: sendError.message,
        });

        throw sendError; // Triggers BullMQ retry backoff
      }
    },
    {
      connection: redisConnection,
      concurrency: config.bullmq.concurrency,
      limiter: {
        max: 50,
        duration: 1000,
      },
    }
  );

  worker.on('ready', () => {
    console.log('[BullMQ Worker] Worker is connected and listening for jobs.');
  });

  worker.on('error', (err) => {
    console.error('[BullMQ Worker Error]', err);
  });

  return worker;
}
