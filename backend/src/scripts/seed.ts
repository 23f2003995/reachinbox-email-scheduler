import { prisma } from '../db/prisma.js';
import { etherealService } from '../services/ethereal.js';
import { elasticsearchService } from '../services/elasticsearch.js';

async function seed() {
  console.log('[Seed] Seeding ReachInbox Email Scheduler database...');

  await etherealService.initialize();
  await elasticsearchService.initialize();

  const senders = await prisma.senderAccount.findMany();
  const primarySender = senders[0]?.email || 'alex.outreach@reachinbox.ai';
  const secondarySender = senders[1]?.email || 'sarah.growth@reachinbox.ai';

  // Seed sample sent emails
  const sampleSent = [
    {
      senderEmail: primarySender,
      recipientEmail: 'michael.scott@dundermifflin.com',
      subject: 'Scaling cold outreach with AI workflows at Dunder Mifflin',
      body: 'Hi Michael,\n\nNoticed Dunder Mifflin is expanding its B2B distribution. ReachInbox automates lead enrichment and multi-channel outreach in seconds.\n\nBest,\nAlex',
      status: 'SENT',
      scheduledAt: new Date(Date.now() - 3600 * 4000),
      sentAt: new Date(Date.now() - 3600 * 3990),
      etherealPreviewUrl: 'https://ethereal.email',
      delaySeconds: 2,
      hourlyLimit: 20,
    },
    {
      senderEmail: secondarySender,
      recipientEmail: 'pam.beesly@dundermifflin.com',
      subject: 'Quick question about lead gen workflows',
      body: 'Hi Pam,\n\nWanted to share how our team crafts personalized sequences that convert 3x higher without manual effort.\n\nCheers,\nSarah',
      status: 'SENT',
      scheduledAt: new Date(Date.now() - 3600 * 2000),
      sentAt: new Date(Date.now() - 3600 * 1990),
      etherealPreviewUrl: 'https://ethereal.email',
      delaySeconds: 2,
      hourlyLimit: 20,
    },
    {
      senderEmail: primarySender,
      recipientEmail: 'jim.halpert@athlead.com',
      subject: 'Partnership opportunities for sports marketing leads',
      body: 'Hey Jim,\n\nLove the growth at Athlead. Would love to show you how our scheduler handles 10,000+ outreach emails without triggering spam filters.\n\nBest,\nAlex',
      status: 'SENT',
      scheduledAt: new Date(Date.now() - 3600 * 1000),
      sentAt: new Date(Date.now() - 3600 * 980),
      etherealPreviewUrl: 'https://ethereal.email',
      delaySeconds: 2,
      hourlyLimit: 20,
    },
  ];

  for (const item of sampleSent) {
    const existing = await prisma.email.findFirst({
      where: { recipientEmail: item.recipientEmail, subject: item.subject },
    });
    if (!existing) {
      const email = await prisma.email.create({ data: item });
      await elasticsearchService.indexEmail({
        id: email.id,
        senderEmail: email.senderEmail,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt,
        etherealPreviewUrl: email.etherealPreviewUrl,
      });
    }
  }

  // Seed sample scheduled emails (for future run times)
  const sampleScheduled = [
    {
      senderEmail: primarySender,
      recipientEmail: 'dwight.schrute@schrutefarms.com',
      subject: 'B2B Wholesale beet distribution outreach',
      body: 'Dwight,\n\nLet us show you the most efficient lead generation technology for agricultural distribution.\n\nRegards,\nReachInbox Outreach',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins from now
      delaySeconds: 2,
      hourlyLimit: 20,
    },
    {
      senderEmail: secondarySender,
      recipientEmail: 'andy.bernard@cornellalumni.org',
      subject: 'A cappella networking made easy with AI workflows',
      body: 'Hi Andy,\n\nReachInbox helps alumni associations engage prospective partners seamlessly.\n\nBest,\nSarah',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 45 * 60 * 1000), // 45 mins from now
      delaySeconds: 2,
      hourlyLimit: 20,
    },
  ];

  for (const item of sampleScheduled) {
    const existing = await prisma.email.findFirst({
      where: { recipientEmail: item.recipientEmail, subject: item.subject },
    });
    if (!existing) {
      const email = await prisma.email.create({ data: item });
      await elasticsearchService.indexEmail({
        id: email.id,
        senderEmail: email.senderEmail,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
      });
    }
  }

  console.log('[Seed] Database seeded with initial sample sent & scheduled emails.');
}

seed().catch(console.error).finally(() => process.exit(0));
