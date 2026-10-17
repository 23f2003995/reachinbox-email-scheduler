import React, { useState } from 'react';
import { Users, Plus, ShieldCheck, Mail, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { SenderAccount } from '../types/index.js';
import { api } from '../services/api.js';

interface SendersViewProps {
  senders: SenderAccount[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const SendersView: React.FC<SendersViewProps> = ({
  senders,
  isLoading,
  onRefresh,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState(20);

  const handleCreateSender = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await api.createSender({
        name: newName || 'Outreach Specialist',
        hourlyLimit: Number(newLimit),
        delaySeconds: 2,
      });
      setNewName('');
      onRefresh();
    } catch (err) {
      console.error('Failed to create sender:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Senders Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Multi-Sender SMTP Identities</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Each sender operates with independent Ethereal SMTP credentials, isolated hourly rate limit counters, and automatic Slack alerts.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Refresh senders"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Senders Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {senders.map((sender) => {
          const usagePercent = Math.min(100, Math.round((sender.currentHourUsage / sender.hourlyLimit) * 100));
          const isNearLimit = usagePercent >= 80;

          return (
            <div
              key={sender.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{sender.name}</span>
                        {sender.isDefault && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            DEFAULT
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">{sender.email}</p>
                    </div>
                  </div>
                </div>

                {/* Quota Progress */}
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Hourly Rate Limit:</span>
                    <span className="font-mono text-slate-900 font-bold">
                      {sender.currentHourUsage} / {sender.hourlyLimit} emails
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{sender.remainingQuota} slots remaining this hour</span>
                    <span>{usagePercent}% utilized</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Pacing: {sender.delaySeconds}s delay</span>
                </span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Ethereal SMTP Ready</span>
                </span>
              </div>
            </div>
          );
        })}

        {/* Add New Sender Identity Form Card */}
        <div className="bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 p-5 flex flex-col justify-center">
          <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Add New Ethereal Sender</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Provision a new fake SMTP sender identity with separate quota.
          </p>

          <form onSubmit={handleCreateSender} className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Sender Name (e.g. Jordan - Partnerships)"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="5000"
                value={newLimit}
                onChange={(e) => setNewLimit(parseInt(e.target.value, 10) || 20)}
                placeholder="Limit"
                className="w-32 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isCreating ? 'Provisioning...' : 'Provision Identity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
