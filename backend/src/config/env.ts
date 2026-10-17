import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  
  bullmq: {
    queueName: process.env.EMAIL_QUEUE_NAME || 'reachinbox-email-queue',
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  },
  
  scheduler: {
    defaultDelaySeconds: parseInt(process.env.DEFAULT_DELAY_BETWEEN_EMAILS_SECONDS || '2', 10),
    defaultMaxEmailsPerHour: parseInt(process.env.DEFAULT_MAX_EMAILS_PER_HOUR || '20', 10),
  },
  
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    index: process.env.ELASTICSEARCH_INDEX || 'reachinbox_emails',
  },
  
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/oauth/callback',
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  },
  
  ethereal: {
    user: process.env.ETHEREAL_USER || '',
    pass: process.env.ETHEREAL_PASS || '',
  }
};
