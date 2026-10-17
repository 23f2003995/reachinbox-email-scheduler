import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';
import { prisma } from '../db/prisma.js';

interface SenderCredentials {
  user: string;
  pass: string;
  name: string;
  email: string;
}

class EtherealService {
  private transporters: Map<string, Transporter> = new Map();
  private defaultSender: SenderCredentials | null = null;
  private initialized: boolean = false;

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[Ethereal] Initializing Ethereal test SMTP accounts...');
      
      // Check existing accounts in database
      const existingAccounts = await prisma.senderAccount.findMany();

      if (existingAccounts.length === 0) {
        // Create 2 test accounts automatically for multi-sender capability
        console.log('[Ethereal] Generating initial test sender accounts...');
        
        const testAccount1 = await nodemailer.createTestAccount();
        const testAccount2 = await nodemailer.createTestAccount();

        await prisma.senderAccount.upsert({
          where: { email: testAccount1.user },
          update: {},
          create: {
            name: 'ReachInbox Outreach (Alex)',
            email: testAccount1.user,
            etherealUser: testAccount1.user,
            etherealPass: testAccount1.pass,
            hourlyLimit: config.scheduler.defaultMaxEmailsPerHour,
            delaySeconds: config.scheduler.defaultDelaySeconds,
            isDefault: true,
          },
        });

        await prisma.senderAccount.upsert({
          where: { email: testAccount2.user },
          update: {},
          create: {
            name: 'ReachInbox Growth (Sarah)',
            email: testAccount2.user,
            etherealUser: testAccount2.user,
            etherealPass: testAccount2.pass,
            hourlyLimit: config.scheduler.defaultMaxEmailsPerHour,
            delaySeconds: config.scheduler.defaultDelaySeconds,
            isDefault: false,
          },
        });

        console.log(`[Ethereal] Created Sender 1: ${testAccount1.user}`);
        console.log(`[Ethereal] Created Sender 2: ${testAccount2.user}`);
      }

      // Load all sender accounts and register transporters
      const accounts = await prisma.senderAccount.findMany();
      for (const acc of accounts) {
        if (acc.etherealUser && acc.etherealPass) {
          this.registerTransporter(acc.email, acc.etherealUser, acc.etherealPass);
          if (acc.isDefault || !this.defaultSender) {
            this.defaultSender = {
              user: acc.etherealUser,
              pass: acc.etherealPass,
              name: acc.name,
              email: acc.email,
            };
          }
        }
      }

      this.initialized = true;
      console.log(`[Ethereal] Loaded ${this.transporters.size} active SMTP sender transporters.`);
    } catch (error) {
      console.error('[Ethereal Error] Failed to initialize Ethereal service:', error);
    }
  }

  public registerTransporter(email: string, user: string, pass: string): Transporter {
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: { user, pass },
    });

    this.transporters.set(email.toLowerCase(), transporter);
    return transporter;
  }

  public async getTransporterForSender(senderEmail: string): Promise<{ transporter: Transporter; senderEmail: string }> {
    await this.initialize();

    const normalized = senderEmail.toLowerCase();
    let transporter = this.transporters.get(normalized);

    if (!transporter) {
      // Find in DB
      const account = await prisma.senderAccount.findUnique({
        where: { email: senderEmail },
      });

      if (account?.etherealUser && account.etherealPass) {
        transporter = this.registerTransporter(account.email, account.etherealUser, account.etherealPass);
      } else if (this.defaultSender) {
        // Fallback to default
        transporter = this.transporters.get(this.defaultSender.email.toLowerCase())!;
        return { transporter, senderEmail: this.defaultSender.email };
      } else {
        throw new Error(`No SMTP credentials configured for sender: ${senderEmail}`);
      }
    }

    return { transporter, senderEmail };
  }

  public async sendEmail(params: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string; previewUrl: string | false }> {
    const { transporter, senderEmail } = await this.getTransporterForSender(params.from);

    const info = await transporter.sendMail({
      from: `"${senderEmail.split('@')[0]}" <${senderEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="border-bottom: 2px solid #16a34a; padding-bottom: 10px; margin-bottom: 15px;">
            <h2 style="color: #16a34a; margin: 0;">ReachInbox Outreach</h2>
          </div>
          <div style="white-space: pre-wrap; margin-bottom: 20px;">
            ${params.body}
          </div>
          <div style="font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
            Sent automatically via ReachInbox Job Scheduler &bull; Provider: Ethereal Fake SMTP
          </div>
        </div>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    return {
      messageId: info.messageId,
      previewUrl: previewUrl,
    };
  }
}

export const etherealService = new EtherealService();
