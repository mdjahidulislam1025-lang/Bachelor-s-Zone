import React, { useState } from 'react';
import {
  Calculator,
  Lock,
  Unlock,
  FileSpreadsheet,
  Printer,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Search,
  ArrowRight,
  Send,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { MonthlyAccount, MemberMonthlyStatement, Member } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { downloadCsv } from '../utils/exportUtils.js';

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
  isProcessing,
}) => {
  const t = translations[language];
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [sendMonthEndSms, setSendMonthEndSms] = useState(true);

  // Pick active calculation view (current active vs historical)
  const activeAccount =
    selectedMonth === '2026-09'
      ? currentMonthCalc
      : historicalAccounts.find(h => h.month === selectedMonth) || currentMonthCalc;

  const isClosed = activeAccount.status === 'closed';
  const isAdmin = currentMember.role === 'admin';

  const statementsList = Object.values(activeAccount.statements || {});
  const filteredStatements = statementsList.filter(s =>
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
      'মোট খরচ (৳)',
      'মোট জমা (৳)',
      'হিসাব স্থিতি (বকেয়া/উদ্বৃত্ত ৳)',
      'অবস্থা',
    ];

    const rows = statementsList.map(s => [
      s.memberName,
      s.roomNo || '',
      s.totalMeals,
      s.mealRate,
      s.mealCost,
      s.sharedCostsShare,
      s.totalCost,
      s.totalPaid,
      s.netBalance,
      s.netBalance > 0 ? 'বকেয়া' : 'উদ্বৃত্ত',
    ]);

    downloadCsv(`Mess_Account_${activeAccount.month}.csv`, [headers, ...rows]);
  };

  const handleConfirmClose = async () => {
    await onCloseMonth(activeAccount.month, sendMonthEndSms);
    setShowCloseModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
              <Calculator className="h-4 w-4" />
              <span>স্বচ্ছ মাসিক মেস হিসাব ও ফাইনাল ব্যালান্স (Monthly Transparent Accounts)</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {activeAccount.monthName}
              </h2>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                  isClosed
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isClosed ? '🔒 মাস সমাপ্ত ও লককৃত' : '🟢 হিসাব চলমান (Open)'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {activeAccount.formulaNote || 'স্বচ্ছ হিসাব নীতি ও সুষম বণ্টন'}
            </p>
          </div>

          {/* Month Selector & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-2 text-xs font-bold bg-white/10 text-white border border-white/20 rounded-xl outline-none cursor-pointer"
            >
              <option value="2026-09" className="bg-slate-900 text-white">
                সেপ্টেম্বর ২০২৬ (চলতি মাস)
              </option>
              <option value="2026-08" className="bg-slate-900 text-white">
                আগস্ট ২০২৬ (আর্কাইভ)
              </option>
            </select>

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
                    title="সকল মিল ও খরচের ভিত্তিতে বর্তমান মাসের হিসাব পুনরায় গণনা করুন"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>পুনর্গণনা (Recalculate)</span>
                  </button>
                )}

                {isClosed ? (
                  <button
                    onClick={() => onReopenMonth(activeAccount.month)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Unlock className="h-4 w-4" />
                    <span>হিসাব পুনঃউন্মুক্ত করুন</span>
                  </button>
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
      </div>

      {/* Core Formula Calculation Box */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <HelpCircle className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            মিল রেট ও খরচের হিসাব সূত্র (Transparent Calculation Formula)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">
              ১. মোট বাজার খরচ (Total Bazar)
            </span>
            <div className="text-2xl font-extrabold text-slate-900">
              ৳{activeAccount.totalBazarExpense.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">সবজির বাজার, মাছ, মাংস ও মুদি</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">
              ২. মেসের মোট মিল (Total Meals)
            </span>
            <div className="text-2xl font-extrabold text-slate-900">
              {activeAccount.totalMeals} টি
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">সকল সক্রিয় সদস্যের মোট মিল</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-xs text-emerald-800 font-bold block mb-1">
              ৩. চূড়ান্ত মিল রেট (Meal Rate)
            </span>
            <div className="text-2xl font-extrabold text-emerald-700">
              ৳{activeAccount.mealRate.toFixed(2)}
            </div>
            <span className="text-[11px] text-emerald-600 mt-1 block">
              মোট বাজার ÷ মোট মিল = ৳{activeAccount.mealRate.toFixed(2)} / মিল
            </span>
          </div>
        </div>

        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
          <strong>শেয়ার খরচ নীতি:</strong> বাসা ভাড়া, বুয়ার বেতন, গ্যাস, কারেন্ট, ওয়াইফাই ও ক্লিনিং বিল
          (মোট ৳{activeAccount.totalSharedExpenses.toLocaleString()}) সকল সক্রিয় সদস্যদের মাঝে সমান ভাগে বণ্টিত।
          প্রত্যেক সদস্যের মোট খরচ = (তার মোট মিল × মিল রেট) + শেয়ার খরচ।
        </div>
      </div>

      {/* Member-wise Final Statement Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              সদস্যভিত্তিক হিসাব লেজার ও ব্যালান্স শিট
            </h3>
            <p className="text-xs text-slate-500">
              প্রত্যেক সদস্যের মিল সংখ্যা, খরচ, জমা এবং বকেয়া/উদ্বৃত্ত হিসাব
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
                <th className="py-3 px-4 text-center">মিল সংখ্যা</th>
                <th className="py-3 px-4 text-right">মিল খরচ (৳)</th>
                <th className="py-3 px-4 text-right">শেয়ার খরচ (৳)</th>
                <th className="py-3 px-4 text-right">মোট খরচ (৳)</th>
                <th className="py-3 px-4 text-right text-emerald-700">মোট জমা (৳)</th>
                <th className="py-3 px-4 text-right">হিসাব স্থিতি</th>
                <th className="py-3 px-4 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStatements.map(stmt => {
                const isDue = stmt.netBalance > 0;
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
                    <td className="py-3.5 px-4 text-center font-semibold">
                      {stmt.totalMeals} টি
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      ৳{stmt.mealCost.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      ৳{stmt.sharedCostsShare.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ৳{stmt.totalCost.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                      ৳{stmt.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isDue ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                          বকেয়া ৳{stmt.netBalance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          উদ্বৃত্ত ৳{Math.abs(stmt.netBalance).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenStatementVoucher(stmt)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="View Statement Voucher"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onTriggerMemberSms(stmt)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 cursor-pointer"
                          title="Send Statement SMS"
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

      {/* Close Month Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 mb-2">
              <Lock className="h-5 w-5" />
              <h3 className="text-base font-bold text-slate-900">
                {activeAccount.monthName} এর মেস হিসাব বন্ধ (Close Month)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              মাস সমাপ্ত করলে এই মাসের মিল, বাজার ও খরচের রেকর্ড চূড়ান্তভাবে লক করা হবে।
              সদস্যদের ফাইনাল ব্যালান্স শিট নির্ধারিত হবে।
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">মোট মিল:</span>
                <span className="font-bold text-slate-800">{activeAccount.totalMeals} টি</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">মোট বাজার:</span>
                <span className="font-bold text-slate-800">৳{activeAccount.totalBazarExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">চূড়ান্ত মিল রেট:</span>
                <span className="font-bold text-emerald-600">৳{activeAccount.mealRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">মোট বকেয়া:</span>
                <span className="font-bold text-rose-600">৳{activeAccount.totalDue.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="sendSmsCheck"
                checked={sendMonthEndSms}
                onChange={e => setSendMonthEndSms(e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
              />
              <label htmlFor="sendSmsCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                হিসাব বন্ধের সাথে সাথে সকল সদস্যকে SMS নোটিফিকেশন পাঠান
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                হ্যাঁ, হিসাব চূড়ান্ত ও বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
