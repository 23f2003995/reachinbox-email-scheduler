import { connectDB } from './db/prisma.js';
import { etherealService } from './services/ethereal.js';
import { elasticsearchService } from './services/elasticsearch.js';
import { createEmailWorker } from './workers/emailWorker.js';

async function runWorker() {
  console.log('[Standalone Worker] Starting BullMQ Worker Process...');
  await connectDB();
  await etherealService.initialize();
  await elasticsearchService.initialize();
  createEmailWorker();
}

runWorker().catch((err) => {
  console.error('[Fatal Worker Error]', err);
  process.exit(1);
});
