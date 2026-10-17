import React, { useState } from 'react';
import { X, MessageSquare, CheckCircle2, AlertTriangle, Send, Link, ExternalLink, Unlink } from 'lucide-react';
import { api } from '../services/api.js';
import { SlackStatus } from '../types/index.js';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackStatus: SlackStatus;
  onStatusUpdated: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  slackStatus,
  onStatusUpdated,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid Slack incoming webhook URL (starts with https://hooks.slack.com/)',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.connectSlackWebhook(webhookUrl.trim());
      setFeedback({
        type: 'success',
        message: res.message || 'Slack webhook connected! A welcome test message was sent to your channel.',
      });
      setWebhookUrl('');
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to connect Slack webhook.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await api.disconnectSlack();
      setFeedback({
        type: 'success',
        message: 'Slack disconnected successfully.',
      });
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to disconnect.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const res = await api.triggerTestSlackAlert();
      setFeedback({
        type: 'success',
        message: res.message || 'Live rate limit alert dispatched to your Slack channel! Check your Slack app.',
      });
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to trigger Slack alert.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Slack Notifications Integration</h2>
              <p className="text-xs text-slate-500">Live hourly rate-limit alert dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">Current Integration Status:</span>
              {slackStatus.isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Connected & Active</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
                  <span>Disconnected</span>
                </span>
              )}
            </div>

            {slackStatus.isConnected && (
              <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                <p>
                  <span className="font-semibold text-slate-700">Webhook Target:</span>{' '}
                  <span className="font-mono text-[11px] text-slate-500">{slackStatus.webhookUrl || 'Active'}</span>
                </p>
                {slackStatus.lastNotifiedAt && (
                  <p>
                    <span className="font-semibold text-slate-700">Last Alert Sent:</span>{' '}
                    <span>{new Date(slackStatus.lastNotifiedAt).toLocaleTimeString()}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Connected Actions vs Connect Form */}
          {slackStatus.isConnected ? (
            <div className="space-y-3">
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <p className="font-semibold mb-1">✅ Live Verification Ready</p>
                Click the button below to test a live rate-limit alert right now into your Slack channel.
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={isTesting}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTesting ? 'Dispatching...' : 'Send Live Test Slack Alert'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Slack Incoming Webhook URL
                </label>
                <div className="relative">
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T.../B.../..."
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                  <span>Create a webhook in your Slack workspace</span>
                  <a
                    href="https://api.slack.com/messaging/webhooks"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>Slack docs</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !webhookUrl.trim()}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Connecting...' : 'Connect Slack Webhook'}</span>
                </button>

                <a
                  href="/api/slack/oauth/start"
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-center"
                >
                  <span>OAuth Flow</span>
                </a>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
