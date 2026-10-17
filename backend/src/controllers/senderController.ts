import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { rateLimiterService } from '../services/rateLimiter.js';
import { etherealService } from '../services/ethereal.js';
import nodemailer from 'nodemailer';

export class SenderController {
  public static async getSenders(req: Request, res: Response): Promise<void> {
    try {
      await etherealService.initialize();
      const accounts = await prisma.senderAccount.findMany({
        orderBy: { isDefault: 'desc' },
      });

      const withUsage = await Promise.all(
        accounts.map(async (acc) => {
          const usage = await rateLimiterService.getSenderUsage(acc.email, acc.hourlyLimit);
          return {
            id: acc.id,
            name: acc.name,
            email: acc.email,
            hourlyLimit: acc.hourlyLimit,
            delaySeconds: acc.delaySeconds,
            isDefault: acc.isDefault,
            currentHourUsage: usage.currentCount,
            remainingQuota: usage.remaining,
            windowStart: usage.windowStart,
          };
        })
      );

      res.json({ success: true, senders: withUsage });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async createSender(req: Request, res: Response): Promise<void> {
    try {
      const { name, hourlyLimit, delaySeconds } = req.body;
      
      // Auto-generate test ethereal account
      const testAccount = await nodemailer.createTestAccount();
      
      const newSender = await prisma.senderAccount.create({
        data: {
          name: name || `Sender (${testAccount.user.split('@')[0]})`,
          email: testAccount.user,
          etherealUser: testAccount.user,
          etherealPass: testAccount.pass,
          hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 20,
          delaySeconds: delaySeconds ? parseInt(delaySeconds, 10) : 2,
          isDefault: false,
        },
      });

      etherealService.registerTransporter(newSender.email, testAccount.user, testAccount.pass);

      res.status(201).json({
        success: true,
        sender: newSender,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
