import React, { useState, useRef } from 'react';
import { X, Upload, Calendar, Clock, AlertCircle, CheckCircle2, ChevronDown, Sparkles, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';
import { SenderAccount } from '../types/index.js';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduledSuccess: () => void;
  senders: SenderAccount[];
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onScheduledSuccess,
  senders,
}) => {
  const [fromEmail, setFromEmail] = useState<string>(senders[0]?.email || '');
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [recipientsList, setRecipientsList] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(20);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Selected sender details
  const selectedSender = senders.find((s) => s.email === fromEmail) || senders[0];

  // Helper to extract valid emails
  const extractEmails = (text: string): string[] => {
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const matches = text.match(emailRegex) || [];
    // Deduplicate and trim
    return Array.from(new Set(matches.map((m) => m.toLowerCase().trim())));
  };

  // Handle manual recipient input change
  const handleRecipientBlur = () => {
    if (!recipientInput.trim()) return;
    const extracted = extractEmails(recipientInput);
    if (extracted.length > 0) {
      const merged = Array.from(new Set([...recipientsList, ...extracted]));
      setRecipientsList(merged);
      setRecipientInput('');
    }
  };

  // Handle CSV/text file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const found = extractEmails(content);
        if (found.length > 0) {
          const merged = Array.from(new Set([...recipientsList, ...found]));
          setRecipientsList(merged);
          setErrorMessage(null);
        } else {
          setErrorMessage('No valid email addresses found in the uploaded file.');
        }
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read the uploaded file.');
    };

    reader.readAsText(file);
  };

  const removeRecipient = (indexToRemove: number) => {
    setRecipientsList(recipientsList.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Ensure we gather any typed recipients
    let allRecipients = [...recipientsList];
    if (recipientInput.trim()) {
      const typed = extractEmails(recipientInput);
      allRecipients = Array.from(new Set([...allRecipients, ...typed]));
    }

    if (!fromEmail && senders[0]) {
      setFromEmail(senders[0].email);
    }

    if (allRecipients.length === 0) {
      setErrorMessage('Please provide at least one valid recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Subject cannot be empty.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Email body cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.scheduleEmails({
        fromEmail: fromEmail || senders[0]?.email || 'outreach@reachinbox.ai',
        toEmails: allRecipients,
        subject,
        body,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
      });

      // Celebration burst
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      onScheduledSuccess();
      onClose();
    } catch (err: any) {
      console.error('Schedule failed:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to schedule emails.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
              ReachInbox Outreach
            </span>
            <h2 className="text-base font-bold text-slate-900">Compose New Email Sequence</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sender Identity (Multi-sender support) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              From Sender Identity (Multi-Sender Support)
            </label>
            <div className="relative">
              <select
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none transition-all cursor-pointer"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.email}>
                    {s.name} ({s.email}) &bull; Limit: {s.hourlyLimit}/hr
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Recipients / Leads Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                To Recipients ({recipientsList.length} detected)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV / Leads Text File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Recipient Input */}
            <div className="border border-slate-200 rounded-xl bg-slate-50 p-2 focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              {/* Chips for parsed emails */}
              {recipientsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2 max-h-28 overflow-y-auto p-1">
                  {recipientsList.slice(0, 20).map((email, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-xs font-medium"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(idx)}
                        className="text-emerald-600 hover:text-emerald-900 ml-0.5"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {recipientsList.length > 20 && (
                    <span className="text-xs text-slate-500 font-semibold self-center px-1">
                      +{recipientsList.length - 20} more leads
                    </span>
                  )}
                </div>
              )}

              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onBlur={handleRecipientBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleRecipientBlur();
                  }
                }}
                placeholder={
                  recipientsList.length === 0
                    ? 'Enter email address(es) separated by commas, or click Upload CSV above'
                    : 'Type another email and press Enter...'
                }
                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 px-1 py-0.5"
              />
            </div>

            {uploadFileName && (
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Uploaded: {uploadFileName} ({recipientsList.length} leads extracted)</span>
              </p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scaling outbound lead gen with AI workflows"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Email Body</label>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>Supports HTML & plain text</span>
              </div>
            </div>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi there,&#10;&#10;Wanted to share how ReachInbox helps teams scale outbound pipelines effortlessly..."
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Scheduling & Throttling Options Grid */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Throughput & Delay Parameters</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Start Time */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Start Sending At (Delay)
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:border-emerald-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">Leave blank to start immediately</span>
              </div>

              {/* Delay Between Emails */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delay Between Sends (sec)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:border-emerald-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">Pacing (mimics throttling)</span>
              </div>

              {/* Hourly Limit */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Hourly Rate Limit
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:border-emerald-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">Auto-defers if hit (Slack alert)</span>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Scheduling via BullMQ...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>
                  Schedule {recipientsList.length > 0 ? `${recipientsList.length} Emails` : 'Email'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
