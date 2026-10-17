import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { ScheduledTable } from './components/ScheduledTable.js';
import { SentTable } from './components/SentTable.js';
import { SendersView } from './components/SendersView.js';
import { ComposeModal } from './components/ComposeModal.js';
import { SlackModal } from './components/SlackModal.js';
import { QueueStatsModal } from './components/QueueStatsModal.js';
import { LoginView } from './components/LoginView.js';
import { api } from './services/api.js';
import { EmailItem, SenderAccount, DashboardStats, UserProfile, SlackStatus } from './types/index.js';

export const App: React.FC = () => {
  // Authentication State
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('reachinbox_user');
    return saved
      ? JSON.parse(saved)
      : {
          name: '',
          email: '',
          picture: '',
          isAuthenticated: false,
        };
  });

  // UI State
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'senders'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Data State
  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [slackStatus, setSlackStatus] = useState<SlackStatus>({
    isConnected: false,
    webhookUrl: null,
    lastNotifiedAt: null,
  });

  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [isLoadingSent, setIsLoadingSent] = useState(false);
  const [isLoadingSenders, setIsLoadingSenders] = useState(false);
  const [searchSource, setSearchSource] = useState<string | null>(null);

  // Load Senders
  const loadSenders = useCallback(async () => {
    setIsLoadingSenders(true);
    try {
      const data = await api.getSenders();
      setSenders(data);
    } catch (err) {
      console.error('Failed to load senders:', err);
    } finally {
      setIsLoadingSenders(false);
    }
  }, []);

  // Load Stats
  const loadStats = useCallback(async () => {
    try {
      const s = await api.getStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  // Load Slack Status
  const loadSlackStatus = useCallback(async () => {
    try {
      const status = await api.getSlackStatus();
      setSlackStatus(status);
    } catch (err) {
      console.error('Failed to load slack status:', err);
    }
  }, []);

  // Load Scheduled Emails
  const loadScheduled = useCallback(async () => {
    setIsLoadingScheduled(true);
    try {
      if (searchQuery.trim()) {
        const res = await api.searchEmails(searchQuery.trim(), 'SCHEDULED');
        setScheduledEmails(res.data);
        setSearchSource(res.source);
      } else {
        const res = await api.getScheduledEmails();
        setScheduledEmails(res.data);
        setSearchSource(null);
      }
    } catch (err) {
      console.error('Failed to load scheduled:', err);
    } finally {
      setIsLoadingScheduled(false);
    }
  }, [searchQuery]);

  // Load Sent Emails
  const loadSent = useCallback(async () => {
    setIsLoadingSent(true);
    try {
      if (searchQuery.trim()) {
        const res = await api.searchEmails(searchQuery.trim(), 'SENT');
        setSentEmails(res.data);
        setSearchSource(res.source);
      } else {
        const res = await api.getSentEmails();
        setSentEmails(res.data);
        setSearchSource(null);
      }
    } catch (err) {
      console.error('Failed to load sent:', err);
    } finally {
      setIsLoadingSent(false);
    }
  }, [searchQuery]);

  // Initial and reactive fetch
  useEffect(() => {
    if (!user.isAuthenticated) return;
    loadSenders();
    loadStats();
    loadSlackStatus();
  }, [user.isAuthenticated, loadSenders, loadStats, loadSlackStatus]);

  useEffect(() => {
    if (!user.isAuthenticated) return;
    if (activeTab === 'scheduled') {
      loadScheduled();
    } else if (activeTab === 'sent') {
      loadSent();
    } else if (activeTab === 'senders') {
      loadSenders();
    }
  }, [user.isAuthenticated, activeTab, loadScheduled, loadSent, loadSenders]);

  // Periodic polling for live BullMQ progress (every 4 seconds)
  useEffect(() => {
    if (!user.isAuthenticated) return;
    const interval = setInterval(() => {
      loadStats();
      if (activeTab === 'scheduled' && !searchQuery) {
        loadScheduled();
      } else if (activeTab === 'sent' && !searchQuery) {
        loadSent();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user.isAuthenticated, activeTab, searchQuery, loadStats, loadScheduled, loadSent]);

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('reachinbox_user', JSON.stringify(profile));
  };

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_user');
    setUser({ name: '', email: '', picture: '', isAuthenticated: false });
  };

  if (!user.isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlackModal={() => setIsSlackOpen(true)}
        onOpenQueueModal={() => setIsQueueOpen(true)}
        stats={stats}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          user={user}
          slackStatus={slackStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSlackModal={() => setIsSlackOpen(true)}
          onOpenQueueModal={() => setIsQueueOpen(true)}
          onLogout={handleLogout}
        />

        {/* Dashboard Content Container */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Elasticsearch Search Banner (when active) */}
          {searchQuery && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <span className="font-bold">Elasticsearch Active Query:</span>
                <span>Searching for &quot;{searchQuery}&quot;</span>
                {searchSource && (
                  <span className="bg-emerald-200/70 text-emerald-800 px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase">
                    Source: {searchSource}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSearchQuery('')}
                className="text-emerald-700 hover:text-emerald-900 font-semibold underline"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Active View */}
          {activeTab === 'scheduled' && (
            <ScheduledTable
              emails={scheduledEmails}
              isLoading={isLoadingScheduled}
              onRefresh={loadScheduled}
              onOpenCompose={() => setIsComposeOpen(true)}
              isSearchActive={!!searchQuery}
            />
          )}

          {activeTab === 'sent' && (
            <SentTable
              emails={sentEmails}
              isLoading={isLoadingSent}
              onRefresh={loadSent}
              onOpenCompose={() => setIsComposeOpen(true)}
              isSearchActive={!!searchQuery}
            />
          )}

          {activeTab === 'senders' && (
            <SendersView
              senders={senders}
              isLoading={isLoadingSenders}
              onRefresh={loadSenders}
            />
          )}
        </main>
      </div>

      {/* Compose New Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onScheduledSuccess={() => {
          loadScheduled();
          loadStats();
          setActiveTab('scheduled');
        }}
      />

      {/* Slack Integration Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        slackStatus={slackStatus}
        onStatusUpdated={loadSlackStatus}
      />

      {/* BullMQ Live Queue Stats Modal */}
      <QueueStatsModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        metrics={stats?.queue}
        onRefresh={loadStats}
      />
    </div>
  );
};
