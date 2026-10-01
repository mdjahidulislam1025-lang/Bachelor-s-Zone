import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  ArrowRight,
  Download,
} from 'lucide-react';
import { AuditLog } from '../types.js';
import { Language, translations } from '../utils/translations.js';

interface AuditLogsViewProps {
  auditLogs: AuditLog[];
  language: Language;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  auditLogs,
  language,
  onRefresh,
  isLoading = false,
}) => {
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = auditLogs.filter(log => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      log.userName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      (log.recordType && log.recordType.toLowerCase().includes(q)) ||
      (log.recordId && log.recordId.toLowerCase().includes(q)) ||
      (log.previousValue && log.previousValue.toLowerCase().includes(q)) ||
      (log.newValue && log.newValue.toLowerCase().includes(q));

    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    const matchesAction = actionFilter === 'all' || log.action.toUpperCase().includes(actionFilter.toUpperCase());

    return matchesSearch && matchesModule && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('ACCESS_DENIED') || act.includes('FAILED') || act.includes('DELETE') || act.includes('REMOVE')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (act.includes('ROLE') || act.includes('ADMIN')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (act.includes('ADD') || act.includes('REACTIVATE') || act.includes('CREATE') || act.includes('LOGIN')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (act.includes('CLOSE') || act.includes('LOCK')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Performed By', 'Module', 'Target / Data', 'Previous Value', 'New Value', 'Details', 'IP Address'];
    const rows = filteredLogs.map(log => [
      `"${log.timestamp}"`,
      `"${log.action}"`,
      `"${log.userName}"`,
      `"${log.module}"`,
      `"${log.recordType || ''} ${log.recordId || ''}"`.trim(),
      `"${(log.previousValue || '').replace(/"/g, '""')}"`,
      `"${(log.newValue || '').replace(/"/g, '""')}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      `"${log.ipAddress || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bachelor_zone_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4 text-emerald-400" />
              <span>Bachelor Zone • সিস্টেম অডিট লগ (Security & Audit Trail)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black mt-1.5 text-white tracking-tight">
              অডিট লগ ও অপরিবর্তনীয় ট্রেইল ({auditLogs.length} টি রেকর্ড)
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              সদস্য সংযোজন, অপসারণ, রোল পরিবর্তন, আর্থিক তথ্য ও এডমিন কার্যক্রমের স্বয়ংক্রিয় ও অপরিবর্তনীয় প্রমাণপত্র।
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>রিফ্রেশ</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              title="CSV ডাউনলোড করুন"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV এক্সপোর্ট</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-700/50 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 text-[11px]">মোট রেকর্ড</span>
            <div className="text-lg font-bold text-white mt-0.5">{auditLogs.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-purple-300 text-[11px]">সদস্য ও রোল পরিবর্তন</span>
            <div className="text-lg font-bold text-purple-300 mt-0.5">
              {auditLogs.filter(l => l.module === 'members' || l.action.includes('ROLE')).length}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-emerald-300 text-[11px]">আর্থিক ও মিল রেকর্ড</span>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">
              {auditLogs.filter(l => ['meals', 'bazar', 'expenses', 'payments', 'monthly'].includes(l.module)).length}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <span className="text-amber-300 text-[11px]">নিরাপত্তা ও অথেন্টিকেশন</span>
            <div className="text-lg font-bold text-amber-300 mt-0.5">
              {auditLogs.filter(l => ['security', 'auth', 'settings'].includes(l.module)).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="অ্যাকশন, ব্যবহারকারী, সদস্য নাম বা বিবরণ দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <select
              value={moduleFilter}
              onChange={e => setModuleFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">সকল মডিউল (All Modules)</option>
              <option value="members">সদস্য ব্যবস্থাপনা (Members)</option>
              <option value="monthly">মাসিক হিসাব (Monthly)</option>
              <option value="expenses">খরচ (Expenses)</option>
              <option value="payments">পেমেন্ট (Payments)</option>
              <option value="bazar">বাজার (Bazar)</option>
              <option value="meals">মিল (Meals)</option>
              <option value="security">নিরাপত্তা (Security)</option>
              <option value="settings">সেটিংস (Settings)</option>
            </select>

            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">সকল অ্যাকশন (All Actions)</option>
              <option value="ROLE_CHANGED">রোল পরিবর্তন (ROLE_CHANGED)</option>
              <option value="MEMBER_ADDED">সদস্য সংযোজন (MEMBER_ADDED)</option>
              <option value="MEMBER_REMOVED">সদস্য অপসারণ (MEMBER_REMOVED)</option>
              <option value="MEMBER_REACTIVATED">সদস্য পুনঃসক্রিয় (MEMBER_REACTIVATED)</option>
              <option value="ACCESS_DENIED">অনুমোদনহীন চেষ্টা (ACCESS_DENIED)</option>
              <option value="LOGIN">লগইন কার্যক্রম (LOGIN)</option>
              <option value="MONTH">মাস সমাপ্তি/উন্মুক্ত (MONTH)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500 text-[11px]">
                <th className="py-3 px-4">তারিখ ও সময় (Timestamp)</th>
                <th className="py-3 px-4">অ্যাকশন (Action)</th>
                <th className="py-3 px-4">কার্যকারী (Performed By)</th>
                <th className="py-3 px-4">টার্গেট / ডাটা (Target)</th>
                <th className="py-3 px-4">পূর্ববর্তী মান (Previous)</th>
                <th className="py-3 px-4">নতুন মান (New Value)</th>
                <th className="py-3 px-4">বিস্তারিত তথ্য (Details)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    কোনো অডিট লগ রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      <div>
                        {new Date(log.timestamp).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
                        {log.module}
                      </div>
                    </td>

                    {/* Performed By */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      {log.ipAddress && (
                        <div className="text-[10px] font-mono text-slate-400">IP: {log.ipAddress}</div>
                      )}
                    </td>

                    {/* Target / Data */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.recordType ? (
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {log.recordType}: {log.recordId || 'N/A'}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Previous Value */}
                    <td className="py-3 px-4 max-w-xs text-xs">
                      {log.previousValue ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-800 text-[11px] font-mono truncate max-w-[180px]" title={log.previousValue}>
                          {log.previousValue}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* New Value */}
                    <td className="py-3 px-4 max-w-xs text-xs">
                      {log.newValue ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] font-mono truncate max-w-[180px]" title={log.newValue}>
                          {log.newValue}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-sm">
                      <div className="leading-relaxed">{log.details}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
