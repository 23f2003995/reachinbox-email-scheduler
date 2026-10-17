import { redisConnection } from '../config/redis.js';
import { prisma } from '../db/prisma.js';
import { slackService } from './slack.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  hourlyLimit: number;
  retryDelayMs?: number;
  nextAvailableWindow?: Date;
}

class RateLimiterService {
  /**
   * Computes the beginning of the current 1-hour window (rounded down to :00:00.000)
   */
  public getCurrentHourWindow(now: Date = new Date()): { windowStart: Date; nextWindow: Date } {
    const windowStart = new Date(now);
    windowStart.setMinutes(0, 0, 0);

    const nextWindow = new Date(windowStart.getTime() + 60 * 60 * 1000);
    return { windowStart, nextWindow };
  }

  /**
   * Redis key for tracking sent count in the current hour window for a sender
   */
  private getWindowKey(senderEmail: string, windowStart: Date): string {
    const epochHour = Math.floor(windowStart.getTime() / 1000);
    return `ratelimit:hourly:${senderEmail.toLowerCase()}:${epochHour}`;
  }

  /**
   * Redis key for tracking Slack alert dispatch per sender window
   */
  private getAlertKey(senderEmail: string, windowStart: Date): string {
    const epochHour = Math.floor(windowStart.getTime() / 1000);
    return `ratelimit:alerted:${senderEmail.toLowerCase()}:${epochHour}`;
  }

  /**
   * Atomic check and reserve for sending an email under hourly quota
   */
  public async checkAndIncrement(
    senderEmail: string,
    hourlyLimit: number
  ): Promise<RateLimitCheckResult> {
    const now = new Date();
    const { windowStart, nextWindow } = this.getCurrentHourWindow(now);
    const windowKey = this.getWindowKey(senderEmail, windowStart);

    // Read current count
    const rawCount = await redisConnection.get(windowKey);
    const currentCount = rawCount ? parseInt(rawCount, 10) : 0;

    if (currentCount >= hourlyLimit) {
      // Limit exceeded for this hour window
      const remainingMsInHour = Math.max(1000, nextWindow.getTime() - now.getTime());
      
      // Check if we already alerted Slack for this window
      const alertKey = this.getAlertKey(senderEmail, windowStart);
      const alreadyAlerted = await redisConnection.get(alertKey);

      if (!alreadyAlerted) {
        // Set alert flag with 2 hour TTL
        await redisConnection.set(alertKey, '1', 'EX', 7200);

        // Record in DB history
        try {
          await prisma.rateLimitHistory.upsert({
            where: {
              senderEmail_windowStart: {
                senderEmail: senderEmail.toLowerCase(),
                windowStart,
              },
            },
            update: {
              count: currentCount,
              notifiedSlack: true,
            },
            create: {
              senderEmail: senderEmail.toLowerCase(),
              windowStart,
              count: currentCount,
              notifiedSlack: true,
            },
          });
        } catch (dbErr) {
          console.warn('[RateLimiter] Error logging rate limit history:', dbErr);
        }

        // Fire Slack notification asynchronously
        slackService.notifyRateLimitHit({
          senderEmail,
          currentCount,
          hourlyLimit,
          windowStart,
          nextAvailableWindow: nextWindow,
        }).catch((err) => {
          console.error('[RateLimiter] Error dispatching Slack rate limit alert:', err);
        });
      }

      return {
        allowed: false,
        currentCount,
        hourlyLimit,
        retryDelayMs: remainingMsInHour,
        nextAvailableWindow: nextWindow,
      };
    }

    // Atomically increment counter
    const newCount = await redisConnection.incr(windowKey);
    if (newCount === 1) {
      // Set 2 hours expiry to automatically clean up old window keys
      await redisConnection.expire(windowKey, 7200);
    }

    return {
      allowed: true,
      currentCount: newCount,
      hourlyLimit,
    };
  }

  /**
   * Helper to retrieve sender's current hourly usage stats
   */
  public async getSenderUsage(senderEmail: string, hourlyLimit: number): Promise<{
    currentCount: number;
    hourlyLimit: number;
    remaining: number;
    windowStart: Date;
    nextWindow: Date;
  }> {
    const { windowStart, nextWindow } = this.getCurrentHourWindow();
    const windowKey = this.getWindowKey(senderEmail, windowStart);
    const rawCount = await redisConnection.get(windowKey);
    const currentCount = rawCount ? parseInt(rawCount, 10) : 0;

    return {
      currentCount,
      hourlyLimit,
      remaining: Math.max(0, hourlyLimit - currentCount),
      windowStart,
      nextWindow,
    };
  }
}

export const rateLimiterService = new RateLimiterService();
