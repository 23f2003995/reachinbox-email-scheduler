import React from 'react';
import { X, Activity, ExternalLink, RefreshCw, Layers, ShieldCheck, Zap } from 'lucide-react';
import { QueueMetrics } from '../types/index.js';

interface QueueStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics?: QueueMetrics | null;
  onRefresh: () => void;
}

export const QueueStatsModal: React.FC<QueueStatsModalProps> = ({
  isOpen,
  onClose,
  metrics,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">BullMQ Live Queue Monitor</h2>
              <p className="text-xs text-slate-500">Real-time persistent Redis queue metrics</p>
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
          {/* Metrics Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
              <span className="text-[11px] font-semibold text-blue-700 block mb-1">Active</span>
              <span className="text-2xl font-black text-blue-900">
                {metrics?.active ?? 0}
              </span>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-xl">
              <span className="text-[11px] font-semibold text-amber-700 block mb-1">Delayed</span>
              <span className="text-2xl font-black text-amber-900">
                {metrics?.delayed ?? 0}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-600 block mb-1">Waiting</span>
              <span className="text-2xl font-black text-slate-800">
                {metrics?.waiting ?? 0}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-700 block mb-1">Completed</span>
              <span className="text-2xl font-black text-emerald-900">
                {metrics?.completed ?? 0}
              </span>
            </div>

            <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-xl">
              <span className="text-[11px] font-semibold text-rose-700 block mb-1">Failed</span>
              <span className="text-2xl font-black text-rose-900">
                {metrics?.failed ?? 0}
              </span>
            </div>

            <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-xl">
              <span className="text-[11px] font-semibold text-purple-700 block mb-1">Total Jobs</span>
              <span className="text-2xl font-black text-purple-900">
                {metrics?.total ?? 0}
              </span>
            </div>
          </div>

          {/* Architecture Resilience Info */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Persistence & Restart Guarantees</span>
            </div>
            <p className="leading-relaxed">
              Jobs are stored in Redis using BullMQ sorted sets and streams. When the backend server or worker is stopped and restarted:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-500">
              <li>Pending and delayed jobs are restored directly from Redis</li>
              <li>Future scheduled emails fire at their exact specified timestamp</li>
              <li>Sent emails are idempotent and will never be re-dispatched</li>
            </ul>
          </div>

          {/* Launch Bull-Board Full Dashboard */}
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Open Bull-Board Admin Dashboard in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={onRefresh}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Stats</span>
          </button>
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
