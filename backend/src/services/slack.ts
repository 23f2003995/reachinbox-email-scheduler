import axios from 'axios';
import { prisma } from '../db/prisma.js';
import { config } from '../config/env.js';

export interface SlackRateLimitAlertPayload {
  senderEmail: string;
  currentCount: number;
  hourlyLimit: number;
  windowStart: Date;
  nextAvailableWindow: Date;
  delayedJobCount?: number;
}

class SlackService {
  public async getIntegration(tenantId = 'default-tenant') {
    return prisma.slackIntegration.findUnique({
      where: { tenantId },
    });
  }

  public async connectWebhook(webhookUrl: string, tenantId = 'default-tenant') {
    const integration = await prisma.slackIntegration.upsert({
      where: { tenantId },
      update: {
        webhookUrl,
        isConnected: true,
      },
      create: {
        tenantId,
        webhookUrl,
        isConnected: true,
      },
    });

    // Send test connection confirmation message
    await this.sendMessage(
      {
        text: '✅ *ReachInbox Slack Integration Connected!*',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🔔 ReachInbox Email Scheduler Connected',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'You have successfully linked your Slack channel. Real-time rate limit alerts will be posted here immediately whenever a sender reaches their hourly sending quota.',
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `🕒 Connected at: ${new Date().toUTCString()} | Status: Active`,
              },
            ],
          },
        ],
      },
      tenantId
    );

    return integration;
  }

  public async disconnect(tenantId = 'default-tenant') {
    return prisma.slackIntegration.upsert({
      where: { tenantId },
      update: {
        isConnected: false,
        webhookUrl: null,
        accessToken: null,
      },
      create: {
        tenantId,
        isConnected: false,
      },
    });
  }

  public async sendMessage(payload: any, tenantId = 'default-tenant'): Promise<boolean> {
    const integration = await this.getIntegration(tenantId);
    
    // Check either DB integration or fallback SLACK_WEBHOOK_URL env
    const webhookUrl = integration?.isConnected && integration.webhookUrl 
      ? integration.webhookUrl 
      : config.slack.webhookUrl;

    if (!webhookUrl) {
      // Slack not connected; handle cleanly without crashing
      return false;
    }

    try {
      await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      return true;
    } catch (error: any) {
      console.error('[Slack Error] Failed to send message to Slack:', error.response?.data || error.message);
      return false;
    }
  }

  public async notifyRateLimitHit(params: SlackRateLimitAlertPayload, tenantId = 'default-tenant'): Promise<boolean> {
    const integration = await this.getIntegration(tenantId);
    const hasWebhook = (integration?.isConnected && integration.webhookUrl) || config.slack.webhookUrl;

    if (!hasWebhook) {
      console.log(`[Slack] Rate limit reached for ${params.senderEmail}, but Slack is not connected. Skipping notification.`);
      return false;
    }

    const payload = {
      text: `🚨 Rate Limit Reached for Sender: ${params.senderEmail}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ ReachInbox Scheduler: Hourly Rate Limit Reached!',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Sender *<mailto:${params.senderEmail}|${params.senderEmail}>* has hit their maximum hourly email sending quota.\nAll subsequent emails for this sender are being *automatically rescheduled* to protect sender reputation.`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Hourly Quota:*\n${params.hourlyLimit} emails/hr`,
            },
            {
              type: 'mrkdwn',
              text: `*Sent this Window:*\n${params.currentCount} emails`,
            },
            {
              type: 'mrkdwn',
              text: `*Window Start:*\n${params.windowStart.toLocaleTimeString()} UTC`,
            },
            {
              type: 'mrkdwn',
              text: `*Rescheduled Next Run:*\n${params.nextAvailableWindow.toLocaleTimeString()} UTC`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🛡️ *Zero Dropped Jobs*: Remaining jobs deferred to next window preserving order | ReachInbox Job Worker`,
            },
          ],
        },
      ],
    };

    const sent = await this.sendMessage(payload, tenantId);
    if (sent) {
      await prisma.slackIntegration.updateMany({
        where: { tenantId },
        data: { lastNotifiedAt: new Date() },
      });
      console.log(`[Slack] Dispatched live rate limit alert to Slack for sender ${params.senderEmail}`);
    }
    return sent;
  }
}

export const slackService = new SlackService();
