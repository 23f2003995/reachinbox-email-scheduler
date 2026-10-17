import { Client } from '@elastic/elasticsearch';
import { config } from '../config/env.js';
import { prisma } from '../db/prisma.js';

export interface EmailDocument {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  delaySeconds?: number;
  hourlyLimit?: number;
  etherealPreviewUrl?: string | null;
  errorMessage?: string | null;
  createdAt?: Date | string;
}

class ElasticsearchService {
  private client: Client;
  private isConnected: boolean = false;
  private indexName: string = config.elasticsearch.index;

  constructor() {
    this.client = new Client({
      node: config.elasticsearch.node,
      requestTimeout: 2500, // Short timeout for rapid fallback
      maxRetries: 1,
    });
  }

  public async initialize(): Promise<void> {
    try {
      const ping = await this.client.ping();
      this.isConnected = ping;
      if (this.isConnected) {
        console.log(`[Elasticsearch] Connected to node at ${config.elasticsearch.node}`);
        await this.ensureIndexExists();
      }
    } catch (error) {
      this.isConnected = false;
      console.warn(
        `[Elasticsearch] Node unreachable at ${config.elasticsearch.node}. Running in database-fallback mode. (Start Elasticsearch via docker-compose for live ES cluster)`
      );
    }
  }

  private async ensureIndexExists(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (!exists) {
        console.log(`[Elasticsearch] Creating index "${this.indexName}" with mappings...`);
        await this.client.indices.create({
          index: this.indexName,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                senderEmail: { type: 'keyword' },
                recipientEmail: { type: 'keyword' },
                subject: { type: 'text', analyzer: 'standard' },
                body: { type: 'text', analyzer: 'standard' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                etherealPreviewUrl: { type: 'keyword' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        console.log(`[Elasticsearch] Index "${this.indexName}" created successfully.`);
      }
    } catch (error: any) {
      console.warn(`[Elasticsearch] Error ensuring index exists:`, error.message);
    }
  }

  public async indexEmail(email: EmailDocument): Promise<void> {
    if (!this.isConnected) {
      // Attempt silent ping if was offline
      try {
        await this.initialize();
      } catch {
        return;
      }
    }

    if (!this.isConnected) return;

    try {
      await this.client.index({
        index: this.indexName,
        id: email.id,
        document: {
          id: email.id,
          senderEmail: email.senderEmail,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: new Date(email.scheduledAt).toISOString(),
          sentAt: email.sentAt ? new Date(email.sentAt).toISOString() : null,
          etherealPreviewUrl: email.etherealPreviewUrl || null,
          createdAt: email.createdAt ? new Date(email.createdAt).toISOString() : new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.warn(`[Elasticsearch] Failed to index document ${email.id}:`, error.message);
    }
  }

  public async searchEmails(query: string, statusFilter?: string): Promise<{
    results: any[];
    source: 'elasticsearch' | 'database';
    total: number;
  }> {
    // If Elasticsearch is connected, search via Elasticsearch Query DSL
    if (this.isConnected && query.trim()) {
      try {
        const mustClauses: any[] = [
          {
            multi_match: {
              query,
              fields: ['subject^3', 'body^2', 'recipientEmail^4', 'senderEmail^2'],
              fuzziness: 'AUTO',
            },
          },
        ];

        if (statusFilter && statusFilter !== 'ALL') {
          mustClauses.push({
            term: { status: statusFilter },
          });
        }

        const response = await this.client.search({
          index: this.indexName,
          body: {
            query: {
              bool: {
                must: mustClauses,
              },
            },
            sort: [{ scheduledAt: { order: 'desc' } }],
            size: 50,
          },
        });

        const hits = response.hits.hits.map((h: any) => h._source);
        const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;

        return {
          results: hits,
          source: 'elasticsearch',
          total,
        };
      } catch (error: any) {
        console.warn('[Elasticsearch] Search query failed, falling back to database:', error.message);
      }
    }

    // Fallback search in Database
    const whereClause: any = {};
    if (query.trim()) {
      whereClause.OR = [
        { subject: { contains: query } },
        { body: { contains: query } },
        { recipientEmail: { contains: query } },
        { senderEmail: { contains: query } },
      ];
    }
    if (statusFilter && statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }

    const emails = await prisma.email.findMany({
      where: whereClause,
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });

    return {
      results: emails,
      source: 'database',
      total: emails.length,
    };
  }
}

export const elasticsearchService = new ElasticsearchService();
