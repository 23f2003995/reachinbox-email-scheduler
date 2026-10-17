import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import emailRoutes from './routes/emailRoutes.js';
import senderRoutes from './routes/senderRoutes.js';
import slackRoutes from './routes/slackRoutes.js';
import { serverAdapter } from './queues/bullBoard.js';

export function createApp(): Express {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Live BullMQ Dashboard UI
  app.use('/admin/queues', serverAdapter.getRouter());

  // API Routes
  app.use('/api/emails', emailRoutes);
  app.use('/api/senders', senderRoutes);
  app.use('/api/slack', slackRoutes);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'reachinbox-email-scheduler',
      timestamp: new Date().toISOString(),
    });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error',
    });
  });

  return app;
}
