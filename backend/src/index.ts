import { createApp } from './app.js';
import { config } from './config/env.js';
import { connectDB } from './db/prisma.js';
import { etherealService } from './services/ethereal.js';
import { elasticsearchService } from './services/elasticsearch.js';
import { createEmailWorker } from './workers/emailWorker.js';

async function bootstrap() {
  console.log('--------------------------------------------------');
  console.log('  ReachInbox Full-stack Email Job Scheduler');
  console.log('--------------------------------------------------');

  // 1. Database Connection
  await connectDB();

  // 2. Initialize Ethereal SMTP multi-senders
  await etherealService.initialize();

  // 3. Initialize Elasticsearch indexing
  await elasticsearchService.initialize();

  // 4. Start BullMQ Email Worker
  const worker = createEmailWorker();

  // 5. Start Express API Server
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[ReachInbox API] Server running at http://localhost:${config.port}`);
    console.log(`[Bull-Board UI] Queue Dashboard live at http://localhost:${config.port}/admin/queues`);
    console.log(`[Throughput] Worker Concurrency: ${config.bullmq.concurrency} | Delay: ${config.scheduler.defaultDelaySeconds}s | Hourly Limit: ${config.scheduler.defaultMaxEmailsPerHour}/hr`);
    console.log('--------------------------------------------------');
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Shutdown] Stopping ReachInbox Scheduler gracefully...');
    server.close();
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Fatal Bootstrap Error]', err);
  process.exit(1);
});
