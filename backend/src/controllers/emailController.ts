import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { scheduleEmailJob, getQueueMetrics } from '../queues/emailQueue.js';
import { elasticsearchService } from '../services/elasticsearch.js';
import { config } from '../config/env.js';

const scheduleSchema = z.object({
  fromEmail: z.string().email(),
  toEmails: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  startTime: z.string().optional(),
  delaySeconds: z.number().int().min(0).optional(),
  hourlyLimit: z.number().int().min(1).optional(),
});

export class EmailController {
  public static async scheduleEmails(req: Request, res: Response): Promise<void> {
    try {
      const parsed = scheduleSchema.parse(req.body);
      const { fromEmail, toEmails, subject, body } = parsed;

      const delaySeconds = parsed.delaySeconds ?? config.scheduler.defaultDelaySeconds;
      const hourlyLimit = parsed.hourlyLimit ?? config.scheduler.defaultMaxEmailsPerHour;
      
      const requestedStartTime = parsed.startTime ? new Date(parsed.startTime) : new Date();
      const baseStartTimeMs = Math.max(Date.now(), requestedStartTime.getTime());
      
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const createdEmails = [];

      for (let i = 0; i < toEmails.length; i++) {
        const recipient = toEmails[i];
        
        // Stagger individual email start times by delaySeconds to distribute load
        const scheduledTime = new Date(baseStartTimeMs + i * (delaySeconds * 1000));

        // 1. Create DB Record (Relational persistence)
        const emailRecord = await prisma.email.create({
          data: {
            senderEmail: fromEmail,
            recipientEmail: recipient,
            subject,
            body,
            status: 'SCHEDULED',
            scheduledAt: scheduledTime,
            delaySeconds,
            hourlyLimit,
            batchId,
          },
        });

        // 2. Schedule in BullMQ delayed queue (No Cron)
        const jobId = await scheduleEmailJob({
          emailId: emailRecord.id,
          senderEmail: fromEmail,
          recipientEmail: recipient,
          subject,
          body,
          scheduledAt: scheduledTime.toISOString(),
          delaySeconds,
          hourlyLimit,
          batchId,
        });

        // Update DB with BullMQ Job ID for idempotency tracking
        await prisma.email.update({
          where: { id: emailRecord.id },
          data: { jobId },
        });

        // 3. Index into Elasticsearch
        await elasticsearchService.indexEmail({
          id: emailRecord.id,
          senderEmail: fromEmail,
          recipientEmail: recipient,
          subject,
          body,
          status: 'SCHEDULED',
          scheduledAt: scheduledTime,
          delaySeconds,
          hourlyLimit,
        });

        createdEmails.push({
          id: emailRecord.id,
          recipientEmail: recipient,
          scheduledAt: scheduledTime,
          jobId,
        });
      }

      res.status(201).json({
        success: true,
        message: `Successfully scheduled ${createdEmails.length} email(s).`,
        batchId,
        count: createdEmails.length,
        emails: createdEmails,
      });
    } catch (error: any) {
      console.error('[EmailController Error]', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
  }

  public static async getScheduledEmails(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const skip = (page - 1) * limit;

      const [emails, total] = await Promise.all([
        prisma.email.findMany({
          where: {
            status: { in: ['SCHEDULED', 'QUEUED', 'PROCESSING', 'RATE_LIMITED'] },
          },
          orderBy: { scheduledAt: 'asc' },
          skip,
          take: limit,
        }),
        prisma.email.count({
          where: {
            status: { in: ['SCHEDULED', 'QUEUED', 'PROCESSING', 'RATE_LIMITED'] },
          },
        }),
      ]);

      res.json({
        success: true,
        data: emails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getSentEmails(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '50', 10);
      const skip = (page - 1) * limit;

      const [emails, total] = await Promise.all([
        prisma.email.findMany({
          where: {
            status: { in: ['SENT', 'FAILED'] },
          },
          orderBy: { sentAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.email.count({
          where: {
            status: { in: ['SENT', 'FAILED'] },
          },
        }),
      ]);

      res.json({
        success: true,
        data: emails,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async searchEmails(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const status = req.query.status as string;

      const result = await elasticsearchService.searchEmails(q, status);
      res.json({
        success: true,
        query: q,
        source: result.source,
        total: result.total,
        data: result.results,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [scheduledCount, sentCount, failedCount, rateLimitedCount, queueStats] = await Promise.all([
        prisma.email.count({ where: { status: 'SCHEDULED' } }),
        prisma.email.count({ where: { status: 'SENT' } }),
        prisma.email.count({ where: { status: 'FAILED' } }),
        prisma.email.count({ where: { status: 'RATE_LIMITED' } }),
        getQueueMetrics(),
      ]);

      res.json({
        success: true,
        stats: {
          scheduled: scheduledCount,
          sent: sentCount,
          failed: failedCount,
          rateLimited: rateLimitedCount,
          queue: queueStats,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
