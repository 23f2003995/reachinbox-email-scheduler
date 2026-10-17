import React from 'react';
import { Mail, Clock, Send, Plus, Users, MessageSquare, Activity, ShieldCheck } from 'lucide-react';
import { DashboardStats } from '../types/index.js';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent' | 'senders';
  onTabChange: (tab: 'scheduled' | 'sent' | 'senders') => void;
  onOpenCompose: () => void;
  onOpenSlackModal: () => void;
  onOpenQueueModal: () => void;
  stats?: DashboardStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenCompose,
  onOpenSlackModal,
  onOpenQueueModal,
  stats,
}) => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 z-20 flex-shrink-0">
      {/* Brand Logo */}
      <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
          <Mail className="w-4 h-4 text-white" />
        </div>
        <span className="font-extrabold text-lg tracking-tight text-slate-900">
          Reach<span className="text-emerald-600">Inbox</span>
        </span>
      </div>

      {/* Primary Compose Action Button */}
      <div className="p-4">
        <button
          onClick={onOpenCompose}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Compose New Email</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        <button
          onClick={() => onTabChange('scheduled')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'scheduled'
              ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Clock className={`w-4 h-4 ${activeTab === 'scheduled' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Scheduled Emails</span>
          </div>
          {typeof stats?.scheduled === 'number' && (
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                activeTab === 'scheduled' ? 'bg-emerald-200/70 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {stats.scheduled}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('sent')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'sent'
              ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Send className={`w-4 h-4 ${activeTab === 'sent' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Sent Emails</span>
          </div>
          {typeof stats?.sent === 'number' && (
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                activeTab === 'sent' ? 'bg-emerald-200/70 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {stats.sent}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange('senders')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'senders'
              ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <Users className={`w-4 h-4 ${activeTab === 'senders' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Sender Accounts</span>
          </div>
        </button>

        <div className="pt-4 pb-1">
          <p className="px-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Integrations & Monitoring
          </p>
        </div>

        <button
          onClick={onOpenSlackModal}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all text-left"
        >
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span>Slack Notifications</span>
        </button>

        <button
          onClick={onOpenQueueModal}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all text-left"
        >
          <Activity className="w-4 h-4 text-slate-400" />
          <span>Live Queue Monitor</span>
        </button>

        <a
          href="/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Bull-Board Dashboard</span>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
            LIVE
          </span>
        </a>
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Persistent Queue</span>
            <span className="text-emerald-600 font-bold">BullMQ</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            Protected against server restarts. Zero duplicate sends.
          </p>
        </div>
      </div>
    </aside>
  );
};
