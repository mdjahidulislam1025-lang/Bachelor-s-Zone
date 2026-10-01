import React, { useState } from 'react';
import {
  Calculator,
  Lock,
  Unlock,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Search,
  ArrowRight,
  Send,
  Eye,
  RefreshCw,
  Calendar,
  History,
  ShieldCheck,
  ShieldAlert,
  Users,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
} from 'lucide-react';
import { MonthlyAccount, MemberMonthlyStatement, Member } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { downloadCsv } from '../utils/exportUtils.js';
import { isPermanentAdminUser } from '../utils/authUtils.js';
import { getCurrentDhakaPeriod } from '../utils/monthlyPeriodUtils.js';

interface MonthlyCalculationViewProps {
  currentMonthCalc: MonthlyAccount;
  historicalAccounts: MonthlyAccount[];
  members: Member[];
  currentMember: Member;
  language: Language;
  onCloseMonth: (month: string, sendSms: boolean) => Promise<void>;
  onReopenMonth: (month: string) => Promise<void>;
  onRecalculateMonth?: (month: string) => Promise<void>;
  onOpenStatementVoucher: (statement: MemberMonthlyStatement) => void;
  onTriggerMemberSms: (statement: MemberMonthlyStatement) => void;
  onSendNewMonthAnnouncement?: (monthName: string) => Promise<void>;
  isProcessing: boolean;
}

export const MonthlyCalculationView: React.FC<MonthlyCalculationViewProps> = ({
  currentMonthCalc,
  historicalAccounts,
  members,
  currentMember,
  language,
  onCloseMonth,
  onReopenMonth,
  onRecalculateMonth,
  onOpenStatementVoucher,
  onTriggerMemberSms,
  onSendNewMonthAnnouncement,
  isProcessing,
}) => {
  const t = translations[language];
  const dhaka = getCurrentDhakaPeriod();

  // Selected period to inspect (defaults to current active month)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    currentMonthCalc?.month || dhaka.periodId
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [sendMonthEndSms, setSendMonthEndSms] = useState(true);
  const [activeTabSection, setActiveTabSection] = useState<'current' | 'history' | 'rules'>('current');
  const [smsAnnouncementSent, setSmsAnnouncementSent] = useState(false);

  // Combine and deduplicate historical accounts list
  const allAccountsMap = new Map<string, MonthlyAccount>();
  if (currentMonthCalc) {
    allAccountsMap.set(currentMonthCalc.month, currentMonthCalc);
  }
  (historicalAccounts || []).forEach(acc => {
    if (!allAccountsMap.has(acc.month)) {
      allAccountsMap.set(acc.month, acc);
    }
  });

  const allAccountsList = Array.from(allAccountsMap.values()).sort(
    (a, b) => b.month.localeCompare(a.month)
  );

  const activeAccount =
    allAccountsMap.get(selectedMonth) || currentMonthCalc || allAccountsList[0];

  const isCurrentCalendarMonth = activeAccount.month === dhaka.periodId;
  const isClosed = activeAccount.status === 'closed';
  const isJahidulAdmin = isPermanentAdminUser(currentMember);
  const isAdmin = currentMember.role === 'admin';

  const statementsList = Object.values(activeAccount.statements || {});
  const filteredStatements = statementsList.filter(
    s =>
      s.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.roomNo && s.roomNo.includes(searchTerm))
  );

  const handleExportCsv = () => {
    const headers = [
      'সদস্যের নাম',
      'রুম নং',
      'মোট মিল',
      'মিল রেট (৳)',
      'মিল খরচ (৳)',
      'ফিক্সড ও শেয়ার খরচ (৳)',
      'ব্যক্তিগত খরচ (৳)',
      'চলতি খরচ (৳)',
      'পূর্বের ব্যালান্স (৳)',
      'চলতি জমা (৳)',
      'অবশিষ্ট স্থিতি (৳)',
      'অবস্থা',
    ];

    const rows = statementsList.map(s => [
      s.memberName,
      s.roomNo || '',
      s.totalMeals,
      s.mealRate,
      s.mealCost,
      s.sharedCostsShare,
      s.individualCosts || 0,
      s.currentMonthCost || s.totalCost,
      s.previousBalance || 0,
      s.totalPaid,
      s.netBalance,
      s.netBalance > 0 ? 'বকেয়া' : 'উদ্বৃত্ত',
    ]);

    downloadCsv(`Bachelor_Zone_Account_${activeAccount.month}.csv`, [headers, ...rows]);
  };

  const handleConfirmClose = async () => {
    await onCloseMonth(activeAccount.month, sendMonthEndSms);
    setShowCloseModal(false);
  };

  const handleConfirmReopen = async () => {
    await onReopenMonth(activeAccount.month);
    setShowReopenModal(false);
  };

  const handleTriggerNewMonthSms = async () => {
    if (onSendNewMonthAnnouncement) {
      await onSendNewMonthAnnouncement(activeAccount.monthName);
    } else {
      // Direct call fallback
      try {
        await fetch('/api/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentMember.id,
            'x-user-role': currentMember.role,
          },
          body: JSON.stringify({
            recipientId: 'active_members',
            recipientName: 'All Active Members',
            phone: '01711234567',
            type: 'custom',
            message: `Bachelor Zone: নতুন মাস শুরু হয়েছে — ${activeAccount.monthName}। নতুন মাসের Meal, Bazar ও হিসাব এখন থেকে নতুনভাবে গণনা হবে।`,
          }),
        });
      } catch (e) {
        // ignore
      }
    }
    setSmsAnnouncementSent(true);
    setTimeout(() => setSmsAnnouncementSent(false), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Section 14: CURRENT MONTH DASHBOARD CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-900/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
              <Calculator className="h-4 w-4 text-emerald-400" />
              <span>স্বয়ংক্রিয় মাসিক মেস হিসাব ও ব্যালান্স শিট (Asia/Dhaka)</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {activeAccount.monthName}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-extrabold border ${
                  isClosed
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                }`}
              >
                {isClosed ? (
                  <>
                    <Lock className="w-3.5 h-3.5" /> মাস সমাপ্ত ও লককৃত (CLOSED 🔒)
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    হিসাব চলমান (OPEN 🟢)
                  </>
                )}
              </span>
              {isCurrentCalendarMonth && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[11px] font-bold">
                  চলতি ক্যালেন্ডার মাস
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              {activeAccount.formulaNote || 'স্বচ্ছ হিসাব নীতি ও সুষম বণ্টন'}
            </p>
          </div>

          {/* Month Selector & Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-3.5 py-2 text-xs font-bold bg-white/10 text-white border border-white/20 rounded-xl outline-none cursor-pointer hover:bg-white/15"
              >
                {allAccountsList.map(a => (
                  <option key={a.month} value={a.month} className="bg-slate-900 text-white">
                    {a.monthName} {a.status === 'closed' ? '(লককৃত 🔒)' : '(চলমান 🟢)'}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>এক্সেল/CSV</span>
            </button>

            {isAdmin && (
              <>
                {!isClosed && onRecalculateMonth && (
                  <button
                    onClick={() => onRecalculateMonth(activeAccount.month)}
                    disabled={isProcessing}
                    title="মিল ও খরচের ভিত্তিতে হিসাব পুনর্গণনা করুন"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>পুনর্গণনা</span>
                  </button>
                )}

                {isClosed ? (
                  isJahidulAdmin ? (
                    <button
                      onClick={() => setShowReopenModal(true)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
                    >
                      <Unlock className="h-4 w-4" />
                      <span>হিসাব পুনঃউন্মুক্ত (Jahidul Islam)</span>
                    </button>
                  ) : (
                    <div
                      title="শুধুমাত্র স্থায়ী প্রধান এডমিন জাহিদুল ইসলাম (Jahidul Islam) বন্ধ হিসাব পুনরায় খুলতে পারেন।"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 text-slate-400 border border-slate-700 text-xs font-medium cursor-not-allowed"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>লককৃত (Reopen Jahidul Only)</span>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => setShowCloseModal(true)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Lock className="h-4 w-4" />
                    <span>মাস সমাপ্ত করুন (লক)</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Section 14: Month Core Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] text-slate-300 font-medium block">সক্রিয় সদস্য</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {activeAccount.activeMembers || members.filter(m => m.status === 'active').length} জন
            </div>
            <span className="text-[10px] text-indigo-300 mt-0.5 block">মেস ধারণক্ষমতা অনুযায়ী</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] text-slate-300 font-medium block">মোট মিল সংখ্যা</span>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              {activeAccount.totalMeals} টি
            </div>
            <span className="text-[10px] text-indigo-300 mt-0.5 block">চলতি মাসের হিসাব</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] text-slate-300 font-medium block">মোট মেস খরচ</span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-1">
              ৳{activeAccount.totalMessExpense.toLocaleString()}
            </div>
            <span className="text-[10px] text-indigo-300 mt-0.5 block">বাজার + ফিক্সড খরচ</span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-3.5">
            <span className="text-[11px] text-emerald-300 font-medium block">চলতি মিল রেট</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {activeAccount.totalMeals > 0 ? `৳${activeAccount.mealRate.toFixed(2)}` : '—'}
            </div>
            <span className="text-[10px] text-emerald-300/80 mt-0.5 block">
              {activeAccount.totalMeals > 0 ? 'বাজার ÷ মোট মিল' : 'মিলের অপেক্ষা'}
            </span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5">
            <span className="text-[11px] text-slate-300 font-medium block">মোট জমা আদায়</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-1">
              ৳{activeAccount.totalCollected.toLocaleString()}
            </div>
            <span className="text-[10px] text-indigo-300 mt-0.5 block">সদস্যদের পরিশোধকৃত</span>
          </div>

          <div className="bg-rose-500/10 border border-rose-400/20 rounded-2xl p-3.5">
            <span className="text-[11px] text-rose-300 font-medium block">মোট বকেয়া</span>
            <div className="text-xl sm:text-2xl font-black text-rose-300 mt-1">
              ৳{activeAccount.totalDue.toLocaleString()}
            </div>
            <span className="text-[10px] text-rose-300/80 mt-0.5 block">আদায়যোগ্য অবশিষ্ট</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTabSection('current')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTabSection === 'current'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>সদস্যভিত্তিক হিসাব লেজার ({activeAccount.month})</span>
        </button>

        <button
          onClick={() => setActiveTabSection('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTabSection === 'history'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>মাসিক হিস্টোরি ও আর্কাইভ ({allAccountsList.length} মাস)</span>
        </button>

        <button
          onClick={() => setActiveTabSection('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTabSection === 'rules'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>হিসাব নীতি ও স্বয়ংক্রিয় মাস পরিবর্তন</span>
        </button>

        {isAdmin && !isClosed && (
          <div className="ml-auto hidden sm:flex items-center gap-2">
            <button
              onClick={handleTriggerNewMonthSms}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 text-indigo-600" />
              <span>{smsAnnouncementSent ? 'এসএমএস পাঠানো হয়েছে ✓' : 'নতুন মাস ঘোষণা SMS পাঠান'}</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW SECTION: 1. Current Month Statement Ledger */}
      {activeTabSection === 'current' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>সদস্যভিত্তিক হিসাব লেজার ও ব্যালান্স শিট</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
                    {activeAccount.monthName}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  মিল খরচ, ফিক্সড শেয়ার, পূর্বের বকেয়া ও জমার ভিত্তিতে চূড়ান্ত হিসাব স্থিতি
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="সদস্যের নাম দিয়ে খুঁজুন..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                    <th className="py-3 px-4">সদস্যের নাম</th>
                    <th className="py-3 px-3 text-center">মোট মিল</th>
                    <th className="py-3 px-3 text-right">মিল খরচ (৳)</th>
                    <th className="py-3 px-3 text-right">ফিক্সড শেয়ার (৳)</th>
                    <th className="py-3 px-3 text-right font-bold text-slate-900">চলতি বিল (৳)</th>
                    <th className="py-3 px-3 text-right text-indigo-700">পূর্বের স্থিতি (৳)</th>
                    <th className="py-3 px-3 text-right text-emerald-700">জমা (৳)</th>
                    <th className="py-3 px-4 text-right">চূড়ান্ত স্থিতি</th>
                    <th className="py-3 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStatements.map(stmt => {
                    const isDue = stmt.netBalance > 0;
                    const prevBal = stmt.previousBalance || 0;
                    return (
                      <tr key={stmt.memberId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{stmt.memberName}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              (রুম {stmt.roomNo || 'N/A'})
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-semibold">
                          {stmt.totalMeals} টি
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium">
                          ৳{stmt.mealCost.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium">
                          ৳{stmt.sharedCostsShare.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                          ৳{(stmt.currentMonthCost || stmt.totalCost).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {prevBal !== 0 ? (
                            <span
                              className={`font-semibold ${
                                prevBal > 0 ? 'text-rose-600' : 'text-emerald-600'
                              }`}
                            >
                              {prevBal > 0 ? `+৳${prevBal.toLocaleString()}` : `-৳${Math.abs(prevBal).toLocaleString()}`}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">৳০</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right font-extrabold text-emerald-600">
                          ৳{stmt.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isDue ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                              বকেয়া ৳{stmt.netBalance.toLocaleString()}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              উদ্বৃত্ত ৳{Math.abs(stmt.netBalance).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onOpenStatementVoucher(stmt)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              title="মাসিক ভাউচার দেখুন"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onTriggerMemberSms(stmt)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 cursor-pointer"
                              title="ব্যক্তিগত হিসাব SMS পাঠান"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SECTION: 2. Monthly History & Archive (Section 15) */}
      {activeTabSection === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>মাসিক হিসাব আর্কাইভ ও পূর্বের মাসের ইতিহাস (Monthly History)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  যে কোনো মাসের উপর ক্লিক করে তার সম্পূর্ণ সংরক্ষিত হিসাব, মিল রেট ও ভাউচার দেখতে পারবেন।
                </p>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                    <th className="py-3 px-4">মাস (Month)</th>
                    <th className="py-3 px-4 text-center">মোট মিল (Meals)</th>
                    <th className="py-3 px-4 text-right">মোট মেস খরচ (Expense)</th>
                    <th className="py-3 px-4 text-right">মিল রেট (Meal Rate)</th>
                    <th className="py-3 px-4 text-right">মোট জমা (Paid)</th>
                    <th className="py-3 px-4 text-center">অবস্থা (Status)</th>
                    <th className="py-3 px-4 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {allAccountsList.map(item => {
                    const isSelected = item.month === activeAccount.month;
                    const isItemClosed = item.status === 'closed';
                    return (
                      <tr
                        key={item.month}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-indigo-50/70 font-semibold' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedMonth(item.month)}
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{item.monthName}</span>
                            {item.month === dhaka.periodId && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                চলতি মাস
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {item.totalMeals} টি
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          ৳{item.totalMessExpense.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                          {item.totalMeals > 0 ? `৳${item.mealRate.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-800">
                          ৳{item.totalCollected.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                              isItemClosed
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isItemClosed ? 'CLOSED 🔒' : 'OPEN 🟢'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedMonth(item.month);
                              setActiveTabSection('current');
                            }}
                            className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs"
                          >
                            রিপোর্ট দেখুন →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW SECTION: 3. Rules & Explanation (Section 4, 9, 23) */}
      {activeTabSection === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>স্বয়ংক্রিয় নতুন মাস নির্ধারণ ও পৃথক হিসাব পদ্ধতি</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>১. বাংলাদেশ টাইমজোন (Asia/Dhaka):</strong> রাত ১২:০১ মিনিটে তারিখ পরিবর্তনের সাথে সাথে সিস্টেম নতুন মাসের হিসাব স্বয়ংক্রিয়ভাবে চালু করে। এডমিনকে ম্যানুয়ালি মাস তৈরি করতে হয় না।
              </p>
              <p>
                <strong>২. বিগত মাসের তথ্য সুরক্ষা:</strong> নতুন মাস শুরু হলেও পূর্ববর্তী কোনো মাসের মিল, বাজার খরচ, জমা বা ভাউচার মোছা হয় না। এগুলো স্থায়ীভাবে সংরক্ষিত থাকে।
              </p>
              <p>
                <strong>৩. স্বতন্ত্র মিল রেট:</strong> নতুন মাসের মিল গণনা শুরু হয় শূন্য (০) থেকে। পূর্বের মাসের কোনো মিল নতুন মাসের রেট গণনায় যোগ হয় না।
              </p>
              <p>
                <strong>৪. পূর্বের বকেয়া ও চলতি হিসাবের স্বাতন্ত্র্য:</strong> পূর্বের বকেয়া বা উদ্বৃত্তকে চলতি খরচের সাথে গুলিয়ে ফেলা হয় না। পৃথক কলামে স্বচ্ছভাবে দেখানো হয়।
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>স্থায়ী প্রধান এডমিন (Jahidul Islam) এর ক্ষমতা ও নিরাপত্তা</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong>১. ক্লোজড মাস লক:</strong> একবার মাস সমাপ্ত (Closed 🔒) করা হলে সাধারণ এডমিন বা সদস্যরা আর্থিক রেকর্ড পরিবর্তন করতে পারেন না।
              </p>
              <p>
                <strong>২. শুধুমাত্র জাহিদুল ইসলাম কর্তৃক আনলক:</strong> কোনো অনিবার্য সংশোধনের প্রয়োজন হলে শুধুমাত্র মেসের স্থায়ী প্রধান এডমিন <strong>Jahidul Islam</strong> মাস পুনঃউন্মুক্ত (Reopen) করতে পারেন।
              </p>
              <p>
                <strong>৩. অডিট লগ নিরাপত্তা:</strong> প্রতিটি মাস ক্লোজ, রিওপেন, সংশোধন ও পুনর্গণনার রেকর্ড অপরিবর্তনীয় অডিট লগে সংরক্ষণ করা হয়।
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Close Month Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <Lock className="h-6 w-6" />
              <h3 className="text-lg font-black text-slate-900">
                {activeAccount.monthName} এর মেস হিসাব বন্ধ (Close Month)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              হিসাব সমাপ্ত করলে এই মাসের মিল, বাজার ও খরচের রেকর্ড চূড়ান্তভাবে লক করা হবে এবং একটি স্থায়ী স্ন্যাপশট সংরক্ষিত হবে।
            </p>

            <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">মোট সক্রিয় সদস্য:</span>
                <span className="font-bold text-slate-800">{activeAccount.activeMembers || 5} জন</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">মোট মিল:</span>
                <span className="font-bold text-slate-800">{activeAccount.totalMeals} টি</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">মোট বাজার খরচ:</span>
                <span className="font-bold text-slate-800">৳{activeAccount.totalBazarExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">চূড়ান্ত মিল রেট:</span>
                <span className="font-black text-emerald-700">৳{activeAccount.mealRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-600 font-bold">মোট বকেয়া:</span>
                <span className="font-black text-rose-600">৳{activeAccount.totalDue.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <input
                type="checkbox"
                id="sendSmsCheck"
                checked={sendMonthEndSms}
                onChange={e => setSendMonthEndSms(e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
              />
              <label htmlFor="sendSmsCheck" className="text-xs font-semibold text-indigo-950 cursor-pointer">
                হিসাব বন্ধের সাথে সাথে সকল সদস্যকে তাদের ব্যক্তিগত হিসাব SMS পাঠান
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-5 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
              >
                {isProcessing ? 'লক করা হচ্ছে...' : 'হ্যাঁ, চূড়ান্ত হিসাব লক করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Month Modal (Jahidul Islam Protected) */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Unlock className="h-6 w-6" />
              <h3 className="text-lg font-black text-slate-900">
                {activeAccount.monthName} এর হিসাব পুনঃউন্মুক্ত (Reopen Month)
              </h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed mb-4">
              <strong>নিরাপত্তা অনুমতি:</strong> আপনি স্থায়ী প্রধান এডমিন <strong>Jahidul Islam</strong> হিসেবে এই মাসের হিসাব পুনরায় খোলার অনুমতিপ্রাপ্ত। হিসাব সংশোধন শেষে আবার “মাস সমাপ্ত করুন” ক্লিক করে লক করবেন।
            </div>
            <p className="text-xs text-slate-600">
              আপনি কি নিশ্চিতভাবে <strong>{activeAccount.monthName}</strong> এর হিসাব আনলক করতে চান?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-5 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmReopen}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
              >
                {isProcessing ? 'উন্মুক্ত হচ্ছে...' : 'হ্যাঁ, হিসাব পুনঃউন্মুক্ত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
