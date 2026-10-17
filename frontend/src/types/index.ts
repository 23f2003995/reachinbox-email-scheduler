export interface EmailItem {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'QUEUED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED';
  scheduledAt: string;
  sentAt?: string | null;
  delaySeconds: number;
  hourlyLimit: number;
  jobId?: string | null;
  etherealPreviewUrl?: string | null;
  errorMessage?: string | null;
  batchId?: string | null;
  retryCount: number;
  createdAt: string;
}

export interface SenderAccount {
  id: string;
  name: string;
  email: string;
  hourlyLimit: number;
  delaySeconds: number;
  isDefault: boolean;
  currentHourUsage: number;
  remainingQuota: number;
  windowStart: string;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
}

export interface DashboardStats {
  scheduled: number;
  sent: number;
  failed: number;
  rateLimited: number;
  queue: QueueMetrics;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  isAuthenticated: boolean;
}

export interface SlackStatus {
  isConnected: boolean;
  webhookUrl: string | null;
  lastNotifiedAt: string | null;
}
