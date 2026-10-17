import axios from 'axios';
import { EmailItem, SenderAccount, DashboardStats, SlackStatus } from '../types/index.js';

const API_BASE = '/api';

export const api = {
  // Emails
  async getScheduledEmails(page = 1, limit = 50): Promise<{ data: EmailItem[]; total: number }> {
    const res = await axios.get(`${API_BASE}/emails/scheduled?page=${page}&limit=${limit}`);
    return { data: res.data.data, total: res.data.pagination?.total || 0 };
  },

  async getSentEmails(page = 1, limit = 50): Promise<{ data: EmailItem[]; total: number }> {
    const res = await axios.get(`${API_BASE}/emails/sent?page=${page}&limit=${limit}`);
    return { data: res.data.data, total: res.data.pagination?.total || 0 };
  },

  async searchEmails(query: string, status?: string): Promise<{ data: EmailItem[]; source: string; total: number }> {
    const res = await axios.get(`${API_BASE}/emails/search`, {
      params: { q: query, status },
    });
    return { data: res.data.data, source: res.data.source, total: res.data.total };
  },

  async scheduleEmails(payload: {
    fromEmail: string;
    toEmails: string[];
    subject: string;
    body: string;
    startTime?: string;
    delaySeconds?: number;
    hourlyLimit?: number;
  }): Promise<{ success: boolean; count: number; batchId: string }> {
    const res = await axios.post(`${API_BASE}/emails/schedule`, payload);
    return res.data;
  },

  async getStats(): Promise<DashboardStats> {
    const res = await axios.get(`${API_BASE}/emails/stats`);
    return res.data.stats;
  },

  // Senders
  async getSenders(): Promise<SenderAccount[]> {
    const res = await axios.get(`${API_BASE}/senders`);
    return res.data.senders;
  },

  async createSender(data: { name: string; hourlyLimit?: number; delaySeconds?: number }): Promise<any> {
    const res = await axios.post(`${API_BASE}/senders`, data);
    return res.data.sender;
  },

  // Slack
  async getSlackStatus(): Promise<SlackStatus> {
    const res = await axios.get(`${API_BASE}/slack/status`);
    return res.data;
  },

  async connectSlackWebhook(webhookUrl: string): Promise<any> {
    const res = await axios.post(`${API_BASE}/slack/connect`, { webhookUrl });
    return res.data;
  },

  async disconnectSlack(): Promise<any> {
    const res = await axios.delete(`${API_BASE}/slack/disconnect`);
    return res.data;
  },

  async triggerTestSlackAlert(): Promise<any> {
    const res = await axios.post(`${API_BASE}/slack/test-alert`);
    return res.data;
  },
};
