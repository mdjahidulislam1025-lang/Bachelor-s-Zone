import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  PieChart,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  DailyMealEntry,
  BazarRecord,
  ExpenseRecord,
  PaymentRecord,
  MonthlyAccount,
  Member,
} from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { downloadCsv } from '../utils/exportUtils.js';
import { BachelorZoneLogo } from './BachelorZoneLogo.js';

interface ReportsViewProps {
  currentMonthCalc: MonthlyAccount;
  dailyMeals: DailyMealEntry[];
  bazarRecords: BazarRecord[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
  members: Member[];
  language: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentMonthCalc,
  dailyMeals,
  bazarRecords,
  expenses,
  payments,
  members,
  language,
}) => {
  const t = translations[language];
  const [reportType, setReportType] = useState<'meals' | 'expenses' | 'balances'>('meals');

  // Top meal eaters
  const topMealMembers = Object.values(currentMonthCalc.statements || {})
    .sort((a, b) => b.totalMeals - a.totalMeals);

  // Category expense breakdown
  const expenseCategories: Record<string, number> = {
    'বাজার খরচ': currentMonthCalc.totalBazarExpense,
  };
  expenses.forEach(e => {
    let catName = 'অন্যান্য খরচ';
    if (e.category === 'rent') catName = 'বাসা ভাড়া';
    else if (e.category === 'electricity') catName = 'বিদ্যুৎ বিল';
    else if (e.category === 'gas') catName = 'গ্যাস বিল';
    else if (e.category === 'maid_salary') catName = 'বুয়ার বেতন';
    else if (e.category === 'internet') catName = 'ইন্টারনেট বিল';
    else if (e.category === 'cleaning') catName = 'ক্লিনিং ও ময়লা বিল';
    expenseCategories[catName] = (expenseCategories[catName] || 0) + e.amount;
  });

  const totalAllExpenses = Object.values(expenseCategories).reduce((s, v) => s + v, 0);

  const handleExportSummaryCsv = () => {
    const headers = ['ক্যাটাগরি / বিষয়', 'টাকার পরিমাণ (৳)', 'শতাংশ (%)'];
    const rows = Object.entries(expenseCategories).map(([cat, amt]) => [
      cat,
      amt,
      totalAllExpenses > 0 ? ((amt / totalAllExpenses) * 100).toFixed(1) + '%' : '0%',
    ]);
    downloadCsv(`Bachelor_Zone_Expense_Report_${currentMonthCalc.month}.csv`, [headers, ...rows]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Report Header */}
      <div className="hidden print:block text-center pb-4 border-b-2 border-slate-900 mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bachelor Zone</h1>
        <h2 className="text-sm font-bold text-slate-700 mt-1">Monthly Mess Account — {currentMonthCalc.monthName}</h2>
        <p className="text-xs text-slate-500">শান্তিনগর মেস • ঢাকা | মেস আর্থিক ও মিল বিশ্লেষণ রিপোর্ট</p>
      </div>

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BachelorZoneLogo size="sm" theme="white" subtitle="Monthly Mess Account Reports" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            {currentMonthCalc.monthName} আর্থিক সারসংক্ষেপ
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            মিল ভলিউম, বাজার প্রবণতা এবং ব্যালান্স শিট অ্যানালিটিক্স
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>প্রিন্ট রিপোর্ট</span>
          </button>
          <button
            onClick={handleExportSummaryCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>রিপোর্ট ডাউনলোড (CSV)</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setReportType('meals')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            reportType === 'meals'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          মিল বিশ্লেষণ (Meal Statistics)
        </button>
        <button
          onClick={() => setReportType('expenses')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            reportType === 'expenses'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          খরচের অনুপাত (Expense Breakdown)
        </button>
        <button
          onClick={() => setReportType('balances')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            reportType === 'balances'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          জমা ও বকেয়া চার্ট (Collections vs Dues)
        </button>
      </div>

      {/* Tab 1: Meal Statistics */}
      {reportType === 'meals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              সদস্যভিত্তিক মিল সংখ্যা তুলনা (Member Meal Distribution)
            </h3>
            <div className="space-y-3">
              {topMealMembers.map(stmt => {
                const maxMeals = topMealMembers[0]?.totalMeals || 1;
                const percent = Math.round((stmt.totalMeals / maxMeals) * 100);
                return (
                  <div key={stmt.memberId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800">{stmt.memberName}</span>
                      <span className="text-emerald-700 font-bold">{stmt.totalMeals} টি মিল</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Expense Breakdown */}
      {reportType === 'expenses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                সেপ্টেম্বর সর্বমোট মেস খরচের বিন্যাস (৳{totalAllExpenses.toLocaleString()})
              </h3>
              <span className="text-xs font-semibold text-slate-500">বাজার + ফিক্সড বিল</span>
            </div>

            <div className="space-y-3 pt-2">
              {Object.entries(expenseCategories)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amt]) => {
                  const percent = totalAllExpenses > 0 ? Math.round((amt / totalAllExpenses) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-800">{cat}</span>
                        <span className="text-slate-900 font-extrabold">
                          ৳{amt.toLocaleString()} ({percent}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Balances & Collections */}
      {reportType === 'balances' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              <span>বকেয়া রয়েছে এমন সদস্যবৃন্দ (Due Members)</span>
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {topMealMembers
                .filter(s => s.netBalance > 0)
                .map(s => (
                  <div key={s.memberId} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{s.memberName}</span>
                      <span className="text-[11px] text-slate-400 block">রুম {s.roomNo || 'N/A'}</span>
                    </div>
                    <span className="font-bold text-rose-600 text-sm">
                      ৳{s.netBalance.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
              <span>অগ্রিম / উদ্বৃত্ত রয়েছে এমন সদস্যবৃন্দ (Advance Credit)</span>
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {topMealMembers
                .filter(s => s.netBalance <= 0)
                .map(s => (
                  <div key={s.memberId} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{s.memberName}</span>
                      <span className="text-[11px] text-slate-400 block">রুম {s.roomNo || 'N/A'}</span>
                    </div>
                    <span className="font-bold text-emerald-600 text-sm">
                      +৳{Math.abs(s.netBalance).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
