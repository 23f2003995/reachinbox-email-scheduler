import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log('[Prisma] Database connected successfully.');
  } catch (error) {
    console.error('[Prisma Error] Failed to connect to database:', error);
  }
}
