import React from 'react';
import { Clock, RefreshCw, Mail, AlertTriangle, ShieldCheck, Calendar } from 'lucide-react';
import { EmailItem } from '../types/index.js';
import { formatDistanceToNow, format } from 'date-fns';

interface ScheduledTableProps {
  emails: EmailItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCompose: () => void;
  isSearchActive: boolean;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
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
            <span>Scheduled Emails</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
              {emails.length} queued
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Jobs persisted in BullMQ + Redis. Will fire at the exact target time even after server restart.
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
          <p className="text-xs font-medium text-slate-500">Loading scheduled jobs from persistent queue...</p>
        </div>
      ) : emails.length === 0 ? (
        /* Empty State */
        <div className="p-16 text-center max-w-sm mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isSearchActive ? 'No matching scheduled emails found' : 'No emails currently scheduled'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isSearchActive
                ? 'Try refining your search terms or clearing the filter.'
                : 'Compose a new email campaign or upload a lead list to start scheduling jobs.'}
            </p>
          </div>
          {!isSearchActive && (
            <button
              onClick={onOpenCompose}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Compose First Campaign
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
                <th className="py-3 px-5">Sender</th>
                <th className="py-3 px-5">Scheduled For</th>
                <th className="py-3 px-5">Pacing</th>
                <th className="py-3 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {emails.map((email) => {
                const scheduledDate = new Date(email.scheduledAt);
                const isPast = scheduledDate.getTime() <= Date.now();

                return (
                  <tr key={email.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Recipient */}
                    <td className="py-3.5 px-5 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
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

                    {/* Scheduled Time */}
                    <td className="py-3.5 px-5 text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{format(scheduledDate, 'MMM d, h:mm:ss a')}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        ({isPast ? 'Processing shortly' : formatDistanceToNow(scheduledDate, { addSuffix: true })})
                      </span>
                    </td>

                    {/* Pacing Delay & Limit */}
                    <td className="py-3.5 px-5 text-slate-500 text-[11px]">
                      <span>{email.delaySeconds}s delay</span>
                      <span className="text-slate-300 mx-1">&bull;</span>
                      <span>{email.hourlyLimit}/hr</span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-5">
                      {email.status === 'RATE_LIMITED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>Deferred (Rate Limit)</span>
                        </span>
                      ) : email.status === 'PROCESSING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                          <span>Sending...</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>Scheduled</span>
                        </span>
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
