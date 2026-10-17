import { Queue, QueueEvents } from 'bullmq';
import { config } from '../config/env.js';
import { redisConnection } from '../config/redis.js';

export interface EmailJobData {
  emailId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  delaySeconds: number;
  hourlyLimit: number;
  batchId?: string;
}

export const emailQueue = new Queue<EmailJobData>(config.bullmq.queueName, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const queueEvents = new QueueEvents(config.bullmq.queueName, {
  connection: redisConnection,
});

queueEvents.on('completed', ({ jobId }) => {
  console.log(`[Queue Event] Job ${jobId} completed successfully.`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[Queue Event] Job ${jobId} failed: ${failedReason}`);
});

/**
 * Enqueues an email job into BullMQ with exact delay and idempotent Job ID.
 */
export async function scheduleEmailJob(data: EmailJobData): Promise<string> {
  const targetDate = new Date(data.scheduledAt);
  const now = Date.now();
  const delayMs = Math.max(0, targetDate.getTime() - now);

  const jobId = `email_${data.emailId}`;

  const job = await emailQueue.add('send-email', data, {
    jobId,
    delay: delayMs,
  });

  console.log(
    `[BullMQ] Enqueued Job ${job.id} for ${data.recipientEmail} with delay ${Math.round(
      delayMs / 1000
    )}s (Scheduled: ${data.scheduledAt})`
  );

  return job.id!;
}

/**
 * Fetch queue status metrics for frontend dashboard
 */
export async function getQueueMetrics() {
  const [waiting, active, delayed, completed, failed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getDelayedCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    delayed,
    completed,
    failed,
    total: waiting + active + delayed + completed + failed,
  };
}
