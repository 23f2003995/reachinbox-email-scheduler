import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../db/prisma.js';
import { slackService } from '../services/slack.js';
import { config } from '../config/env.js';

export class SlackController {
  public static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const integration = await slackService.getIntegration();
      const isConnected = !!(integration?.isConnected || config.slack.webhookUrl);
      const maskedWebhook = integration?.webhookUrl
        ? integration.webhookUrl.replace(/(hooks\.slack\.com\/services\/[^\/]+\/[^\/]+\/).+/, '$1****')
        : config.slack.webhookUrl
        ? 'Configured via .env'
        : null;

      res.json({
        success: true,
        isConnected,
        webhookUrl: maskedWebhook,
        lastNotifiedAt: integration?.lastNotifiedAt || null,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async connectWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://hooks.slack.com/')) {
        res.status(400).json({
          success: false,
          message: 'Invalid Slack Incoming Webhook URL. Format: https://hooks.slack.com/services/...',
        });
        return;
      }

      await slackService.connectWebhook(webhookUrl.trim());

      res.json({
        success: true,
        message: 'Slack Incoming Webhook connected successfully. A test ping has been posted to your channel!',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async disconnect(req: Request, res: Response): Promise<void> {
    try {
      await slackService.disconnect();
      res.json({
        success: true,
        message: 'Slack integration disconnected.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async startOAuth(req: Request, res: Response): Promise<void> {
    if (!config.slack.clientId) {
      // Fallback redirect to frontend with prompt
      res.redirect('http://localhost:3000/?slack_oauth_error=no_client_id');
      return;
    }

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.slack.clientId}&scope=incoming-webhook&redirect_uri=${encodeURIComponent(
      config.slack.redirectUri
    )}`;

    res.redirect(slackAuthUrl);
  }

  public static async oauthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.query;
      if (!code) {
        res.redirect('http://localhost:3000/?slack=error');
        return;
      }

      const response = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        null,
        {
          params: {
            client_id: config.slack.clientId,
            client_secret: config.slack.clientSecret,
            code,
            redirect_uri: config.slack.redirectUri,
          },
        }
      );

      if (response.data?.ok) {
        const webhookUrl = response.data.incoming_webhook?.url;
        const accessToken = response.data.access_token;
        const channel = response.data.incoming_webhook?.channel;

        await prisma.slackIntegration.upsert({
          where: { tenantId: 'default-tenant' },
          update: {
            isConnected: true,
            webhookUrl,
            accessToken,
            channel,
          },
          create: {
            tenantId: 'default-tenant',
            isConnected: true,
            webhookUrl,
            accessToken,
            channel,
          },
        });

        // Send welcome message
        if (webhookUrl) {
          await slackService.connectWebhook(webhookUrl);
        }

        res.redirect('http://localhost:3000/?slack=connected');
      } else {
        res.redirect(`http://localhost:3000/?slack_error=${encodeURIComponent(response.data?.error || 'failed')}`);
      }
    } catch (error: any) {
      console.error('[Slack OAuth Error]', error);
      res.redirect('http://localhost:3000/?slack=error');
    }
  }

  public static async testAlert(req: Request, res: Response): Promise<void> {
    try {
      const now = new Date();
      const nextWindow = new Date(now.getTime() + 60 * 60 * 1000);
      nextWindow.setMinutes(0, 0, 0);

      const sent = await slackService.notifyRateLimitHit({
        senderEmail: 'alex.outreach@reachinbox.ai',
        currentCount: 20,
        hourlyLimit: 20,
        windowStart: now,
        nextAvailableWindow: nextWindow,
      });

      if (sent) {
        res.json({
          success: true,
          message: 'Live test alert dispatched to your Slack channel!',
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Slack is not connected. Connect a Slack Webhook or OAuth first.',
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
