import React, { useState } from 'react';
import { Search, LogOut, MessageSquare, Activity, User, Bell, ExternalLink } from 'lucide-react';
import { UserProfile, SlackStatus } from '../types/index.js';

interface NavbarProps {
  user: UserProfile;
  slackStatus: SlackStatus;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSlackModal: () => void;
  onOpenQueueModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  slackStatus,
  searchQuery,
  onSearchChange,
  onOpenSlackModal,
  onOpenQueueModal,
  onLogout,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Search Bar (Elasticsearch powered) */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails via Elasticsearch (recipient, sender, subject, body)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-900 rounded-xl border border-transparent focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions, Slack status, Queue status, Profile */}
      <div className="flex items-center gap-3">
        {/* Slack Status Pill */}
        <button
          onClick={onOpenSlackModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            slackStatus.isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
          title="Click to configure Slack webhook/OAuth notifications"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{slackStatus.isConnected ? 'Slack: Connected' : 'Connect Slack'}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              slackStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </button>

        {/* Live BullMQ Queue Monitor Link */}
        <button
          onClick={onOpenQueueModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg text-xs font-medium transition-all"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span>Queue Monitor</span>
        </button>

        <a
          href="/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          title="Open Bull-Board in new tab"
        >
          <span>Bull-Board</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition-all focus:outline-none"
          >
            <img
              src={user.picture}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/30"
              onError={(e) => {
                // Fallback avatar if external image fails
                (e.target as any).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name);
              }}
            />
            <div className="hidden lg:block text-left text-xs pr-1">
              <span className="block font-semibold text-slate-900 leading-tight">{user.name}</span>
              <span className="block text-slate-400 text-[11px] leading-tight">{user.email}</span>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenSlackModal();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Slack Rate Limit Alerts</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenQueueModal();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                  <span>Live Queue Metrics</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
