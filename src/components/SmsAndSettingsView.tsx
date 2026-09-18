import React, { useState } from 'react';
import {
  Settings,
  MessageSquare,
  ShieldCheck,
  Send,
  Save,
  CheckCircle2,
  Clock,
  History,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { MessSettings, SmsLog, AuditLog, Member } from '../types.js';
import { Language, translations } from '../utils/translations.js';

interface SmsAndSettingsViewProps {
  settings: MessSettings;
  smsLogs: SmsLog[];
  auditLogs: AuditLog[];
  members: Member[];
  currentMember: Member;
  language: Language;
  onSaveSettings: (settings: MessSettings) => Promise<void>;
  onSendCustomSms: (recipientId: string, phone: string, message: string, type?: any) => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export const SmsAndSettingsView: React.FC<SmsAndSettingsViewProps> = ({
  settings,
  smsLogs,
  auditLogs,
  members,
  currentMember,
  language,
  onSaveSettings,
  onSendCustomSms,
  onResetDemo,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'gateway' | 'logs' | 'audit'>('gateway');

  // Gateway form states
  const [providerName, setProviderName] = useState(settings.smsGateway.providerName);
  const [apiUrl, setApiUrl] = useState(settings.smsGateway.apiUrl || '');
  const [senderId, setSenderId] = useState(settings.smsGateway.senderId || 'MESS-MGR');
  const [enableCookingReminder, setEnableCookingReminder] = useState(settings.smsGateway.enableCookingReminder);
  const [enableBazarReminder, setEnableBazarReminder] = useState(settings.smsGateway.enableBazarReminder);
  const [enableMonthEndSummary, setEnableMonthEndSummary] = useState(settings.smsGateway.enableMonthEndSummary);
  const [messName, setMessName] = useState(settings.messName);
  const [messAddress, setMessAddress] = useState(settings.messAddress);

  // Quick SMS form
  const [targetMemberId, setTargetMemberId] = useState(members[0]?.id || '');
  const [customPhone, setCustomPhone] = useState(members[0]?.phone || '');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSaveAllSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: MessSettings = {
      ...settings,
      messName,
      messAddress,
      smsGateway: {
        ...settings.smsGateway,
        providerName,
        apiUrl,
        senderId,
        enableCookingReminder,
        enableBazarReminder,
        enableMonthEndSummary,
      },
    };
    await onSaveSettings(updated);
    setFeedback('সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSendSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhone || !customMessage) return;
    setIsSending(true);
    const m = members.find(mem => mem.id === targetMemberId);
    await onSendCustomSms(targetMemberId, customPhone, customMessage, 'custom');
    setIsSending(false);
    setCustomMessage('');
    setFeedback(`${customPhone} নম্বরে SMS পাঠানো হয়েছে!`);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
            <Settings className="h-4 w-4 text-emerald-400" />
            <span>এসএমএস গেটওয়ে ও মেস কনফিগারেশন (SMS Gateway & Settings)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
            সিস্টেম প্রশাসন ও অডিট লগ
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            এসএমএস নোটিফিকেশন গেটওয়ে, মেস প্রোফাইল এবং আর্থিক পরিবর্তনের অপরিবর্তনীয় অডিট ট্রেইল
          </p>
        </div>

        <button
          onClick={onResetDemo}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          <span>ডেমো ডেটা রিসেট</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('gateway')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'gateway'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          এসএমএস গেটওয়ে ও সেটিংস
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          এসএমএস ডেলিভারি লগ ({smsLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          হিসাব অডিট হিস্ট্রি ({auditLogs.length})
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tab 1: SMS Gateway Settings & Quick Sender */}
      {activeTab === 'gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Gateway Settings Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span>এসএমএস প্রোভাইডার কনফিগারেশন (SMS Gateway Setup)</span>
            </h3>

            <form onSubmit={handleSaveAllSettings} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মেসের নাম
                </label>
                <input
                  type="text"
                  value={messName}
                  onChange={e => setMessName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মেসের ঠিকানা
                </label>
                <input
                  type="text"
                  value={messAddress}
                  onChange={e => setMessAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    এসএমএস গেটওয়ে
                  </label>
                  <select
                    value={providerName}
                    onChange={e => setProviderName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  >
                    <option value="Greenweb SMS Gateway">Greenweb (বাংলাদেশ)</option>
                    <option value="BulkSMS BD">BulkSMS BD</option>
                    <option value="Alpha Net SMS">Alpha Net</option>
                    <option value="Onnorokom SMS">অন্যরকম এসএমএস</option>
                    <option value="Mock SMS Gateway (Test Mode)">মক টেস্ট গেটওয়ে (ডেমো)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    সেন্ডার আইডি (Sender ID)
                  </label>
                  <input
                    type="text"
                    value={senderId}
                    onChange={e => setSenderId(e.target.value)}
                    placeholder="MESS-MGR"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Automatic SMS Triggers */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block">স্বয়ংক্রিয় নোটিফিকেশন ট্রিগার</span>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={enableCookingReminder}
                    onChange={e => setEnableCookingReminder(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
                  />
                  <span>সকাল ৭টায় রাঁধুনিকে রিমাইন্ডার এসএমএস পাঠানো হবে</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={enableBazarReminder}
                    onChange={e => setEnableBazarReminder(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
                  />
                  <span>বাজারে যাওয়ার পূর্বে বাজারকারীকে আইটেম লিস্ট এসএমএস পাঠানো হবে</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={enableMonthEndSummary}
                    onChange={e => setEnableMonthEndSummary(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
                  />
                  <span>মাস শেষ হলে চূড়ান্ত বিল ও ব্যালান্স শিট সকল সদস্যকে স্বয়ংক্রিয় এসএমএস হবে</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>সেটিংস সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>
          </div>

          {/* Direct SMS Dispatcher */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Send className="h-4 w-4 text-emerald-600" />
              <span>সরাসরি সদস্যকে এসএমএস পাঠান (Send Instant SMS)</span>
            </h3>

            <form onSubmit={handleSendSmsSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রাপক নির্বাচন করুন
                </label>
                <select
                  value={targetMemberId}
                  onChange={e => {
                    setTargetMemberId(e.target.value);
                    const found = members.find(m => m.id === e.target.value);
                    if (found) setCustomPhone(found.phone);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone}) - রুম {m.roomNo || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মোবাইল নম্বর
                </label>
                <input
                  type="tel"
                  value={customPhone}
                  onChange={e => setCustomPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  এসএমএস বার্তা (টেক্সট)
                </label>
                <textarea
                  rows={4}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="মেসের জরুরি বার্তা, বকেয়া টাকার রিমাইন্ডার বা নোটিশ লিখুন..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
                <span className="text-[10px] text-slate-400">
                  অক্ষর সংখ্যা: {customMessage.length} | ১ এসএমএস = ১৬০ ইংরেজি অথবা ৭০ বাংলা ক্যারেক্টার
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSending ? 'পাঠানো হচ্ছে...' : 'এসএমএস পাঠান'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: SMS Delivery Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">এসএমএস আদান-প্রদান লগ</h3>
            <span className="text-xs text-slate-400">সর্বশেষ প্রেরিত বার্তাসমূহ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">তারিখ ও সময়</th>
                  <th className="py-3 px-4">প্রাপক</th>
                  <th className="py-3 px-4">মোবাইল</th>
                  <th className="py-3 px-4">ধরন</th>
                  <th className="py-3 px-4">বার্তার বিবরণ</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4 text-right">রেফারেন্স</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {smsLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {new Date(log.timestamp).toLocaleString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.recipientName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{log.phone}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={log.message}>
                      {log.message}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>প্রেরিত</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[10px] text-slate-400">
                      {log.refId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Financial & Audit Trail Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">মেস হিসাব অডিট লগ ও ইতিহাস</h3>
              <p className="text-xs text-slate-400">কে কখন কোন হিসাব পরিবর্তন করেছেন তার অপরিবর্তনীয় রেকর্ড</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              স্বচ্ছ মেস হিসাব
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">তারিখ ও সময়</th>
                  <th className="py-3 px-4">ব্যবহারকারী</th>
                  <th className="py-3 px-4">অ্যাকশন</th>
                  <th className="py-3 px-4">মডিউল</th>
                  <th className="py-3 px-4">বিস্তারিত তথ্য</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.userName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-semibold">{log.module}</td>
                    <td className="py-3 px-4 text-slate-800">
                      <div>{log.details}</div>
                      {log.previousValue && log.newValue && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          পূর্বে: {log.previousValue} → বর্তমানে: {log.newValue}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
