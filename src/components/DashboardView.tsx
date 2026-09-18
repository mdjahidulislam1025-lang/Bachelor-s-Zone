import React from 'react';
import {
  Users,
  UtensilsCrossed,
  ChefHat,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Wallet,
  AlertCircle,
  PlusCircle,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import {
  Member,
  DailyMealEntry,
  MealMenu,
  CookingDuty,
  BazarDuty,
  BazarRecord,
  ExpenseRecord,
  PaymentRecord,
  MonthlyAccount,
} from '../types.js';
import { Language, translations } from '../utils/translations.js';

interface DashboardViewProps {
  members: Member[];
  dailyMeals: DailyMealEntry[];
  mealMenus: MealMenu[];
  cookingDuties: CookingDuty[];
  bazarDuties: BazarDuty[];
  bazarRecords: BazarRecord[];
  expenses: ExpenseRecord[];
  payments: PaymentRecord[];
  currentMonthCalc: MonthlyAccount;
  currentMember: Member;
  language: Language;
  onOpenQuickMeal: () => void;
  onOpenQuickBazar: () => void;
  onOpenQuickExpense: () => void;
  onOpenQuickPayment: () => void;
  onOpenSendSms: () => void;
  onSelectTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  members,
  dailyMeals,
  mealMenus,
  cookingDuties,
  bazarDuties,
  bazarRecords,
  expenses,
  payments,
  currentMonthCalc,
  currentMember,
  language,
  onOpenQuickMeal,
  onOpenQuickBazar,
  onOpenQuickExpense,
  onOpenQuickPayment,
  onOpenSendSms,
  onSelectTab,
}) => {
  const t = translations[language];
  const activeMembers = members.filter(m => m.status === 'active');

  const todayStr = '2026-09-17';
  const tomorrowStr = '2026-09-18';

  // Today's specific data
  const todayMeals = dailyMeals.find(d => d.date === todayStr);
  const todayCook = cookingDuties.find(c => c.date === todayStr);
  const tomorrowCook = cookingDuties.find(c => c.date === tomorrowStr);
  const todayMenu = mealMenus.find(m => m.date === todayStr);
  const todayBazarDuty = bazarDuties.find(b => b.date === todayStr);
  const todayBazarRecord = bazarRecords.find(b => b.date === todayStr);

  // Member's personal statement
  const userStatement = currentMonthCalc.statements[currentMember.id];

  return (
    <div className="space-y-6">
      {/* Top Banner: Today's Overview & Personal Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Mess Quick Summary Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600/60 border border-emerald-400/30 text-emerald-100">
                  <Calendar className="h-3 w-3" />
                  ১৭ সেপ্টেম্বর ২০২৬ (বৃহস্পতিবার)
                </span>
                <h2 className="text-xl sm:text-2xl font-bold mt-2 text-white">
                  আজকের মেস সারসংক্ষেপ
                </h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-200 block">বর্তমান মিল রেট</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-amber-300">
                  ৳{currentMonthCalc.mealRate.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Today's 3 Key Roles / Duty Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium mb-1">
                  <ChefHat className="h-4 w-4 text-amber-300" />
                  <span>আজকের রাঁধুনি</span>
                </div>
                <p className="text-sm font-bold truncate text-white">
                  {todayCook ? todayCook.memberName : 'রহিম উদ্দিন'}
                </p>
                <span className="text-[11px] text-emerald-300">
                  {todayCook?.status === 'completed' ? '✓ রান্না সম্পন্ন' : 'সকাল ও দুপুরের দায়িত্ব'}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium mb-1">
                  <ShoppingBag className="h-4 w-4 text-amber-300" />
                  <span>আজকের বাজার</span>
                </div>
                <p className="text-sm font-bold truncate text-white">
                  {todayBazarDuty ? todayBazarDuty.memberName : 'ফয়সাল হোসেন'}
                </p>
                <span className="text-[11px] text-emerald-300">
                  {todayBazarRecord ? `খরচ: ৳${todayBazarRecord.totalAmount}` : 'তাজা সবজি ও মাছ বাজার'}
                </span>
              </div>

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium mb-1">
                  <UtensilsCrossed className="h-4 w-4 text-amber-300" />
                  <span>আজকের মিল সংখ্যা</span>
                </div>
                <p className="text-sm font-bold text-white">
                  {todayMeals ? `${todayMeals.totalMeals} টি মিল` : '২৪ টি মিল'}
                </p>
                <span className="text-[11px] text-emerald-300">
                  সকাল: {todayMeals?.totalBreakfast || 5} • দুপুর: {todayMeals?.totalLunch || 9} • রাত: {todayMeals?.totalDinner || 10}
                </span>
              </div>
            </div>

            {/* Quick Menu Ticker */}
            <div className="pt-2 border-t border-white/15 text-xs text-emerald-100 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-amber-300 shrink-0">আজকের মেনু:</span>
              <span className="truncate">
                {todayMenu ? `${todayMenu.lunch} (দুপুর) | ${todayMenu.dinner} (রাত)` : 'সাদা ভাত + রুই মাছ ভুনা + চিকেন কারি'}
              </span>
            </div>
          </div>
        </div>

        {/* Member's Personal Account Status Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full text-white text-xs font-bold flex items-center justify-center ${currentMember.avatarColor}`}>
                  {currentMember.nickname.slice(0, 1)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{currentMember.name}</h3>
                  <span className="text-xs text-slate-500">ব্যক্তিগত হিসাব • সেপ্টেম্বর</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                রুম {currentMember.roomNo || '101'}
              </span>
            </div>

            <div className="space-y-2.5 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">আপনার মোট মিল:</span>
                <span className="font-bold text-slate-800">{userStatement?.totalMeals || 0} টি</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">মিল বাবদ খরচ:</span>
                <span className="font-bold text-slate-800">৳{(userStatement?.mealCost || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">ভাড়া ও শেয়ার খরচ:</span>
                <span className="font-bold text-slate-800">৳{(userStatement?.sharedCostsShare || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">আপনার মোট জমা:</span>
                <span className="font-bold text-emerald-600">৳{(userStatement?.totalPaid || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">বর্তমান অবস্থা:</span>
              {userStatement && userStatement.netBalance > 0 ? (
                <span className="text-sm font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  বকেয়া ৳{userStatement.netBalance.toLocaleString()}
                </span>
              ) : (
                <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  উদ্বৃত্ত ৳{Math.abs(userStatement?.netBalance || 0).toLocaleString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => onSelectTab('my-meals')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>আমার মিল অন/অফ</span>
              </button>
              <button
                onClick={() => onSelectTab('monthly')}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>হিসাব বিবরণী</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          {t.quickActions}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <button
            onClick={() => onSelectTab('my-meals')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 hover:border-emerald-500 hover:shadow-xs transition-all text-emerald-900 cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
              <UtensilsCrossed className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-bold">আমার মিল (ON/OFF)</span>
          </button>

          <button
            onClick={onOpenQuickMeal}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all text-slate-700 cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UtensilsCrossed className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-semibold">{t.addMeal}</span>
          </button>

          <button
            onClick={onOpenQuickBazar}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-500 hover:shadow-xs transition-all text-slate-700 cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-semibold">{t.addBazar}</span>
          </button>

          <button
            onClick={onOpenQuickExpense}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-rose-500 hover:shadow-xs transition-all text-slate-700 cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Receipt className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-semibold">{t.addExpense}</span>
          </button>

          <button
            onClick={onOpenQuickPayment}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs transition-all text-slate-700 cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-semibold">{t.addPayment}</span>
          </button>

          <button
            onClick={() => onSelectTab('monthly')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-xs transition-all text-slate-700 cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Calculator className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-semibold">মাসিক হিসাব</span>
          </button>

          <button
            onClick={onOpenSendSms}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all text-slate-700 cursor-pointer group"
          >
            <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-2 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <Send className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-semibold">{t.sendSms}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{t.activeMembers}</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{activeMembers.length} জন</div>
          <span className="text-[11px] text-slate-400 mt-1 block">১০টি রুমে বিভক্ত</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{t.totalMealsMonth}</span>
            <UtensilsCrossed className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {currentMonthCalc.totalMeals} টি
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">১-১৮ সেপ্টেম্বর পর্যন্ত</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{t.totalMessExpense}</span>
            <Receipt className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ৳{currentMonthCalc.totalMessExpense.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            বাজার ৳{currentMonthCalc.totalBazarExpense.toLocaleString()} + ফিক্সড ৳{currentMonthCalc.totalSharedExpenses.toLocaleString()}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>{t.totalCollected}</span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            ৳{currentMonthCalc.totalCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            বাকি বকেয়া ৳{currentMonthCalc.totalDue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Two Column Section: Upcoming Duties & Recent Financial Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming Duties & Menus */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-emerald-600" />
              <span>রান্না ও বাজার শিডিউল (Cooking & Bazar Duty)</span>
            </h3>
            <button
              onClick={() => onSelectTab('cooking')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              সব দেখুন →
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  আজ
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    আজকের রাঁধুনি: {todayCook?.memberName || 'রহিম উদ্দিন'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    বাজারের দায়িত্বে: {todayBazarDuty?.memberName || 'ফয়সাল হোসেন'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                চলমান
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  কাল
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    আগামীকাল রান্না করবে: {tomorrowCook?.memberName || 'সাকিব আল আমিন'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    শুক্রবার জুম্মা স্পেশাল মেনু: খিচুড়ি + গরুর মাংস ভুনা
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                নির্ধারিত
              </span>
            </div>
          </div>
        </div>

        {/* Recent Financial Transactions */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-600" />
              <span>সাম্প্রতিক লেনদেন ও জমা (Recent Transactions)</span>
            </h3>
            <button
              onClick={() => onSelectTab('payments')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              সব দেখুন →
            </button>
          </div>

          <div className="space-y-2.5">
            {payments.slice(0, 4).map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{p.memberName}</p>
                    <span className="text-[11px] text-slate-500">
                      {p.date} • {p.paymentMethod} {p.transactionRef ? `(${p.transactionRef})` : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600 block">
                    +৳{p.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    রিসিভার: {p.receivedBy}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
