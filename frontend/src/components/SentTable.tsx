import React from 'react';
import { Send, RefreshCw, ExternalLink, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { EmailItem } from '../types/index.js';
import { format } from 'date-fns';

interface SentTableProps {
  emails: EmailItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCompose: () => void;
  isSearchActive: boolean;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  isLoading,
  onRefresh,
  onOpenCompose,
  isSearchActive,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Sent Emails History</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
              {emails.length} dispatched
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dispatched via Ethereal Fake SMTP. Click &quot;View in Ethereal&quot; on any email to open the rendered message.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
          title="Refresh table"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-500">Loading sent history...</p>
        </div>
      ) : emails.length === 0 ? (
        /* Empty State */
        <div className="p-16 text-center max-w-sm mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Send className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isSearchActive ? 'No matching sent emails found' : 'No sent emails yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isSearchActive
                ? 'Try refining your query or check your scheduled tab.'
                : 'Emails will appear here automatically once processed by BullMQ workers.'}
            </p>
          </div>
          {!isSearchActive && (
            <button
              onClick={onOpenCompose}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Send Your First Email
            </button>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Recipient Lead</th>
                <th className="py-3 px-5">Subject Line</th>
                <th className="py-3 px-5">Sender Identity</th>
                <th className="py-3 px-5">Sent At</th>
                <th className="py-3 px-5">Delivery Status</th>
                <th className="py-3 px-5 text-right">Ethereal Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {emails.map((email) => {
                const sentDate = email.sentAt ? new Date(email.sentAt) : new Date(email.createdAt);
                const isSent = email.status === 'SENT';

                return (
                  <tr key={email.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Recipient */}
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {email.recipientEmail.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[180px]">{email.recipientEmail}</span>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="py-3.5 px-5 text-slate-700">
                      <p className="font-semibold text-slate-900 truncate max-w-[240px]">
                        {email.subject}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        {email.body.substring(0, 45)}...
                      </p>
                    </td>

                    {/* Sender */}
                    <td className="py-3.5 px-5 text-slate-500 truncate max-w-[160px]">
                      {email.senderEmail}
                    </td>

                    {/* Sent At */}
                    <td className="py-3.5 px-5 text-slate-600 font-medium">
                      {format(sentDate, 'MMM d, h:mm:ss a')}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-5">
                      {isSent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Sent Successfully</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                          title={email.errorMessage || 'Failed delivery'}
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    {/* Ethereal Preview Button */}
                    <td className="py-3.5 px-5 text-right">
                      {email.etherealPreviewUrl ? (
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 transition-all shadow-2xs"
                        >
                          <span>View in Ethereal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No preview</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
