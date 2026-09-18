import React, { useState, useMemo } from 'react';
import {
  UtensilsCrossed,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  History,
  Coffee,
  Sun,
  Moon,
  Info,
  CalendarDays,
  ListFilter,
  ShieldAlert,
} from 'lucide-react';
import {
  Member,
  MealType,
  MealStatus,
  MealLockStatus,
  MemberMealSelection,
  MealChangeLog,
  MealMenu,
  MealCutoffSettings,
  DailyMealEntry,
} from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { checkMealLock, formatCutoffTime, getDhakaTime } from '../utils/cutoffUtils.js';

interface MyMealsViewProps {
  currentMember: Member;
  members: Member[];
  mealSelections: MemberMealSelection[];
  dailyMeals: DailyMealEntry[];
  mealMenus: MealMenu[];
  changeLogs: MealChangeLog[];
  cutoffSettings: MealCutoffSettings;
  language: Language;
  onToggleMeal: (
    memberId: string,
    date: string,
    mealType: MealType,
    status: MealStatus,
    isOverride?: boolean,
    reason?: string
  ) => Promise<boolean>;
  onBatchSavePlan?: (
    memberId: string,
    plans: Array<{ date: string; breakfast?: MealStatus; lunch?: MealStatus; dinner?: MealStatus }>
  ) => Promise<boolean>;
}

export const MyMealsView: React.FC<MyMealsViewProps> = ({
  currentMember,
  members,
  mealSelections,
  dailyMeals,
  mealMenus,
  changeLogs,
  cutoffSettings,
  language,
  onToggleMeal,
  onBatchSavePlan,
}) => {
  const t = translations[language];
  const isAdmin = currentMember.role === 'admin';

  // Selected date state
  const dhakaNow = useMemo(() => getDhakaTime(cutoffSettings?.timezone || 'Asia/Dhaka'), [cutoffSettings]);
  const todayDate = dhakaNow.dateStr; // e.g. 2026-09-18
  
  // Calculate tomorrow's date
  const tomorrowDate = useMemo(() => {
    const d = new Date(dhakaNow.year, dhakaNow.month - 1, dhakaNow.day + 1);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }, [dhakaNow]);

  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [activeTab, setActiveTab] = useState<'single_day' | 'weekly_planner' | 'history' | 'logs'>('single_day');
  
  // For Admin: ability to switch viewed member (defaults to themselves)
  const [targetMemberId, setTargetMemberId] = useState<string>(currentMember.id);
  const targetMember = useMemo(
    () => members.find(m => m.id === targetMemberId) || currentMember,
    [members, targetMemberId, currentMember]
  );

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    mealType: MealType;
    currentStatus: MealStatus;
    newStatus: MealStatus;
    isLocked: boolean;
    date: string;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to find meal selection for a specific date and mealType
  const getMealStatus = (date: string, mealType: MealType): MealStatus => {
    const sel = mealSelections.find(
      s => s.memberId === targetMember.id && s.date === date && s.mealType === mealType
    );
    if (sel) return sel.plannedStatus;

    // Fallback to dailyMeals if available
    const dm = dailyMeals.find(d => d.date === date);
    const rec = dm?.records?.[targetMember.id];
    if (rec) {
      if (mealType === 'breakfast') return rec.breakfast > 0 ? 'ON' : 'OFF';
      if (mealType === 'lunch') return rec.lunch > 0 ? 'ON' : 'OFF';
      if (mealType === 'dinner') return rec.dinner > 0 ? 'ON' : 'OFF';
    }

    return 'OFF';
  };

  // Menu for the selected date
  const selectedDateMenu = useMemo(
    () => mealMenus.find(m => m.date === selectedDate),
    [mealMenus, selectedDate]
  );

  // Trigger Confirmation Modal for Toggle
  const handleInitiateToggle = (mealType: MealType) => {
    const lockInfo = checkMealLock(selectedDate, mealType, cutoffSettings);
    const currentStatus = getMealStatus(selectedDate, mealType);
    const newStatus: MealStatus = currentStatus === 'ON' ? 'OFF' : 'ON';

    // If locked and not admin, show warning immediately
    if (lockInfo.isLocked && !isAdmin) {
      showToast(
        lockInfo.reason || 'Meal change time has ended for this meal. (কাট-অফ সময় শেষ হয়ে গেছে)',
        'error'
      );
      return;
    }

    setConfirmModal({
      isOpen: true,
      mealType,
      currentStatus,
      newStatus,
      isLocked: lockInfo.isLocked,
      date: selectedDate,
    });
  };

  // Confirm Action execution
  const handleConfirmToggle = async () => {
    if (!confirmModal) return;
    setIsProcessing(true);
    const { mealType, newStatus, isLocked, date } = confirmModal;

    try {
      const success = await onToggleMeal(
        targetMember.id,
        date,
        mealType,
        newStatus,
        isLocked && isAdmin, // admin override flag
        isLocked && isAdmin ? 'এডমিন জরুরি সমন্বয়' : undefined
      );

      if (success) {
        const mealNameBn =
          mealType === 'breakfast' ? 'সকালের নাস্তা' : mealType === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';
        showToast(
          language === 'bn'
            ? `${mealNameBn} মিল সফলভাবে ${newStatus} করা হয়েছে!`
            : `${mealType.toUpperCase()} meal successfully turned ${newStatus}!`,
          'success'
        );
      } else {
        showToast('মিল পরিবর্তন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'ত্রুটি ঘটেছে', 'error');
    } finally {
      setIsProcessing(false);
      setConfirmModal(null);
    }
  };

  // Quick navigation helpers
  const handleShiftDate = (days: number) => {
    const parts = selectedDate.split('-').map(n => parseInt(n, 10));
    const d = new Date(parts[0], parts[1] - 1, parts[2] + days);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${m}-${day}`);
  };

  // Weekly Planner local state
  const next7Days = useMemo(() => {
    const list: string[] = [];
    const base = new Date(dhakaNow.year, dhakaNow.month - 1, dhakaNow.day);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      list.push(`${d.getFullYear()}-${m}-${day}`);
    }
    return list;
  }, [dhakaNow]);

  const [plannerDraft, setPlannerDraft] = useState<
    Record<string, { breakfast: MealStatus; lunch: MealStatus; dinner: MealStatus }>
  >({});

  // Initialize weekly planner draft when switching to planner tab
  React.useEffect(() => {
    if (activeTab === 'weekly_planner') {
      const initial: Record<string, { breakfast: MealStatus; lunch: MealStatus; dinner: MealStatus }> = {};
      next7Days.forEach(d => {
        initial[d] = {
          breakfast: getMealStatus(d, 'breakfast'),
          lunch: getMealStatus(d, 'lunch'),
          dinner: getMealStatus(d, 'dinner'),
        };
      });
      setPlannerDraft(initial);
    }
  }, [activeTab, next7Days, mealSelections]);

  const handleWeeklyPlanSave = async () => {
    if (!onBatchSavePlan) return;
    setIsProcessing(true);
    try {
      const plans = next7Days.map(d => ({
        date: d,
        breakfast: plannerDraft[d]?.breakfast || 'OFF',
        lunch: plannerDraft[d]?.lunch || 'OFF',
        dinner: plannerDraft[d]?.dinner || 'OFF',
      }));

      const ok = await onBatchSavePlan(targetMember.id, plans);
      if (ok) {
        showToast('সাপ্তাহিক মিল প্ল্যান সফলভাবে সংরক্ষিত হয়েছে!', 'success');
      } else {
        showToast('সাপ্তাহিক প্ল্যান সংরক্ষণে সমস্যা হয়েছে', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'ত্রুটি', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Member monthly history calculation
  const currentMonth = selectedDate.slice(0, 7); // e.g. "2026-09"
  const memberMonthHistory = useMemo(() => {
    // Filter days in selected month
    const datesInMonth = dailyMeals
      .filter(dm => dm.date.startsWith(currentMonth))
      .sort((a, b) => b.date.localeCompare(a.date));

    let totalB = 0;
    let totalL = 0;
    let totalD = 0;

    const rows = datesInMonth.map(dm => {
      const rec = dm.records?.[targetMember.id] || { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
      const b = rec.breakfast > 0 ? 1 : 0;
      const l = rec.lunch > 0 ? 1 : 0;
      const d = rec.dinner > 0 ? 1 : 0;
      const dayTotal = b + l + d;
      totalB += b;
      totalL += l;
      totalD += d;
      return {
        date: dm.date,
        breakfast: b > 0 ? 'ON' : 'OFF',
        lunch: l > 0 ? 'ON' : 'OFF',
        dinner: d > 0 ? 'ON' : 'OFF',
        total: dayTotal,
      };
    });

    return {
      month: currentMonth,
      totalBreakfast: totalB,
      totalLunch: totalL,
      totalDinner: totalD,
      totalMeals: totalB + totalL + totalD,
      rows,
    };
  }, [dailyMeals, currentMonth, targetMember.id]);

  // Filter change logs for this member
  const memberChangeLogs = useMemo(() => {
    return changeLogs
      .filter(l => l.memberId === targetMember.id)
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  }, [changeLogs, targetMember.id]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-800 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs px-2 py-1 rounded-md bg-black/20"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header / Member Profile & Mode Selection */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${targetMember.avatarColor || 'bg-emerald-600'}`}
          >
            {targetMember.name.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">
                {language === 'bn' ? 'আমার মিল ব্যবস্থাপনা' : 'My Meal Management'}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                {targetMember.name} ({targetMember.roomNo})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {language === 'bn' ? 'ঢাকা সময়:' : 'Dhaka Time:'} {dhakaNow.dateStr} | {dhakaNow.timeStr}
              </span>
            </p>
          </div>
        </div>

        {/* Member Selector (If Admin) or Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs">
              <span className="text-amber-800 font-bold">সদস্য নির্বাচন:</span>
              <select
                value={targetMemberId}
                onChange={e => setTargetMemberId(e.target.value)}
                className="bg-white text-slate-700 font-semibold rounded-lg px-2 py-1 border border-amber-300 text-xs focus:ring-1 focus:ring-amber-500"
              >
                {members
                  .filter(m => m.status === 'active')
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role === 'admin' ? 'এডমিন' : m.roomNo})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('single_day')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'single_day'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'bn' ? 'দৈনিক কার্ড' : 'Daily Card'}
            </button>
            <button
              onClick={() => setActiveTab('weekly_planner')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'weekly_planner'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'bn' ? 'সাপ্তাহিক প্ল্যানার' : 'Weekly Planner'}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'bn' ? 'মিল হিস্ট্রি' : 'History'}
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'bn' ? 'লগ' : 'Audit Logs'}
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SINGLE DAY CARD VIEW */}
      {activeTab === 'single_day' && (
        <div className="space-y-5">
          {/* Date Selector Navigation Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleShiftDate(-1)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="font-bold text-slate-800 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <button
                onClick={() => handleShiftDate(1)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Date Selectors: Today, Tomorrow */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setSelectedDate(todayDate)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  selectedDate === todayDate
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {language === 'bn' ? 'আজ (Today)' : 'Today'}
              </button>
              <button
                onClick={() => setSelectedDate(tomorrowDate)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  selectedDate === tomorrowDate
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {language === 'bn' ? 'আগামীকাল (Tomorrow)' : 'Tomorrow'}
              </button>
            </div>
          </div>

          {/* Date Header Badge and Summary Info */}
          <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase">
                  {selectedDate === todayDate
                    ? language === 'bn' ? 'আজকের মিল' : "Today's Meals"
                    : selectedDate === tomorrowDate
                    ? language === 'bn' ? 'আগামীকালের মিল' : "Tomorrow's Meals"
                    : language === 'bn' ? 'নির্ধারিত তারিখ' : 'Selected Date'}
                </span>
                <span className="text-emerald-200 text-xs font-medium">{selectedDate}</span>
              </div>
              <h2 className="text-xl font-bold mt-1">
                {targetMember.name} —{' '}
                {language === 'bn'
                  ? 'আপনার পছন্দ অনুযায়ী মিল চালু (ON) বা বন্ধ (OFF) করুন'
                  : 'Turn meals ON or OFF based on your schedule'}
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                {language === 'bn'
                  ? 'কাট-অফ সময়ের পূর্বে মিল পরিবর্তন করুন। কাট-অফ পার হলে মিল স্বয়ংক্রিয়ভাবে লক হয়ে যাবে।'
                  : 'Change before cutoff time. Meals lock automatically after deadline.'}
              </p>
            </div>

            {/* Daily Total for target member */}
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 px-4 border border-white/20 text-center shrink-0">
              <span className="text-[11px] uppercase tracking-wider text-emerald-100 font-bold block">
                {language === 'bn' ? 'এই দিনের মোট মিল' : 'Total Meals'}
              </span>
              <span className="text-2xl font-black text-white">
                {(getMealStatus(selectedDate, 'breakfast') === 'ON' ? 1 : 0) +
                  (getMealStatus(selectedDate, 'lunch') === 'ON' ? 1 : 0) +
                  (getMealStatus(selectedDate, 'dinner') === 'ON' ? 1 : 0)}{' '}
                <span className="text-xs font-normal text-emerald-200">{language === 'bn' ? 'টি' : 'meals'}</span>
              </span>
            </div>
          </div>

          {/* 3 Interactive Meal Cards: Breakfast, Lunch, Dinner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. BREAKFAST */}
            <MealCard
              mealType="breakfast"
              title={language === 'bn' ? 'সকালের নাস্তা' : 'Breakfast'}
              icon={Coffee}
              colorClass="from-amber-500/10 to-orange-500/5 border-amber-200/80"
              iconBg="bg-amber-100 text-amber-700"
              date={selectedDate}
              status={getMealStatus(selectedDate, 'breakfast')}
              lockInfo={checkMealLock(selectedDate, 'breakfast', cutoffSettings)}
              menuText={selectedDateMenu?.breakfast}
              cutoffSettings={cutoffSettings}
              isAdmin={isAdmin}
              language={language}
              onToggle={() => handleInitiateToggle('breakfast')}
            />

            {/* 2. LUNCH */}
            <MealCard
              mealType="lunch"
              title={language === 'bn' ? 'দুপুরের খাবার' : 'Lunch'}
              icon={Sun}
              colorClass="from-emerald-500/10 to-teal-500/5 border-emerald-200/80"
              iconBg="bg-emerald-100 text-emerald-700"
              date={selectedDate}
              status={getMealStatus(selectedDate, 'lunch')}
              lockInfo={checkMealLock(selectedDate, 'lunch', cutoffSettings)}
              menuText={selectedDateMenu?.lunch}
              cutoffSettings={cutoffSettings}
              isAdmin={isAdmin}
              language={language}
              onToggle={() => handleInitiateToggle('lunch')}
            />

            {/* 3. DINNER */}
            <MealCard
              mealType="dinner"
              title={language === 'bn' ? 'রাতের খাবার' : 'Dinner'}
              icon={Moon}
              colorClass="from-indigo-500/10 to-blue-500/5 border-indigo-200/80"
              iconBg="bg-indigo-100 text-indigo-700"
              date={selectedDate}
              status={getMealStatus(selectedDate, 'dinner')}
              lockInfo={checkMealLock(selectedDate, 'dinner', cutoffSettings)}
              menuText={selectedDateMenu?.dinner}
              cutoffSettings={cutoffSettings}
              isAdmin={isAdmin}
              language={language}
              onToggle={() => handleInitiateToggle('dinner')}
            />
          </div>

          {/* Extra Notice Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
            <Info className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold text-slate-800">
                {language === 'bn' ? 'জরুরি মিল নীতিমালা:' : 'Important Mess Meal Rules:'}
              </span>
              <p>
                {language === 'bn'
                  ? '১. আপনি শুধুমাত্র আপনার নিজের মিল চালু (ON) বা বন্ধ (OFF) করতে পারবেন। অন্য কোনো সদস্যের মিল পরিবর্তন করার অনুমতি নেই।'
                  : '1. You may only manage your own meal status. Modifying another member is strictly forbidden.'}
              </p>
              <p>
                {language === 'bn'
                  ? '২. কাট-অফ সময় অতিবাহিত হওয়ার পর মিল পরিবর্তনের সুযোগ বন্ধ হয়ে যাবে। বিশেষ প্রয়োজনে মেস এডমিনের সাথে যোগাযোগ করুন।'
                  : '2. After the cutoff deadline passes, status locks automatically. Contact the Admin for emergency overrides.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY PLANNER VIEW */}
      {activeTab === 'weekly_planner' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                <span>{language === 'bn' ? 'আগামী ৭ দিনের মিল প্ল্যানার' : 'Next 7 Days Meal Planner'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'bn'
                  ? 'আগামী সপ্তাহের মিল একনজরে নির্ধারণ করুন এবং একসাথে সেভ করুন।'
                  : 'Plan your meals for the coming week in one view and save with one click.'}
              </p>
            </div>

            <button
              onClick={handleWeeklyPlanSave}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isProcessing ? 'সংরক্ষণ হচ্ছে...' : language === 'bn' ? 'সাপ্তাহিক প্ল্যান সংরক্ষণ করুন' : 'Save Weekly Plan'}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'সকালের নাস্তা' : 'Breakfast'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'দুপুরের খাবার' : 'Lunch'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'রাতের খাবার' : 'Dinner'}</th>
                    <th className="py-3 px-4 text-center">{language === 'bn' ? 'দৈনিক মোট' : 'Day Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {next7Days.map(date => {
                    const isToday = date === todayDate;
                    const isTomorrow = date === tomorrowDate;
                    const currentPlan = plannerDraft[date] || { breakfast: 'OFF', lunch: 'OFF', dinner: 'OFF' };

                    const lockB = checkMealLock(date, 'breakfast', cutoffSettings);
                    const lockL = checkMealLock(date, 'lunch', cutoffSettings);
                    const lockD = checkMealLock(date, 'dinner', cutoffSettings);

                    const dayTotal =
                      (currentPlan.breakfast === 'ON' ? 1 : 0) +
                      (currentPlan.lunch === 'ON' ? 1 : 0) +
                      (currentPlan.dinner === 'ON' ? 1 : 0);

                    return (
                      <tr key={date} className={`hover:bg-slate-50/80 transition-colors ${isToday ? 'bg-emerald-50/40' : ''}`}>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span>{date}</span>
                            {isToday && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                {language === 'bn' ? 'আজ' : 'Today'}
                              </span>
                            )}
                            {isTomorrow && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                                {language === 'bn' ? 'আগামীকাল' : 'Tomorrow'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Breakfast Switch */}
                        <td className="py-3.5 px-4">
                          <PlannerSwitch
                            status={currentPlan.breakfast}
                            isLocked={lockB.isLocked && !isAdmin}
                            onChange={() =>
                              setPlannerDraft(prev => ({
                                ...prev,
                                [date]: {
                                  ...prev[date],
                                  breakfast: prev[date]?.breakfast === 'ON' ? 'OFF' : 'ON',
                                },
                              }))
                            }
                          />
                        </td>

                        {/* Lunch Switch */}
                        <td className="py-3.5 px-4">
                          <PlannerSwitch
                            status={currentPlan.lunch}
                            isLocked={lockL.isLocked && !isAdmin}
                            onChange={() =>
                              setPlannerDraft(prev => ({
                                ...prev,
                                [date]: {
                                  ...prev[date],
                                  lunch: prev[date]?.lunch === 'ON' ? 'OFF' : 'ON',
                                },
                              }))
                            }
                          />
                        </td>

                        {/* Dinner Switch */}
                        <td className="py-3.5 px-4">
                          <PlannerSwitch
                            status={currentPlan.dinner}
                            isLocked={lockD.isLocked && !isAdmin}
                            onChange={() =>
                              setPlannerDraft(prev => ({
                                ...prev,
                                [date]: {
                                  ...prev[date],
                                  dinner: prev[date]?.dinner === 'ON' ? 'OFF' : 'ON',
                                },
                              }))
                            }
                          />
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-slate-800 text-sm">
                          {dayTotal}
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

      {/* TAB 3: MEMBER MEAL HISTORY & BREAKDOWN (Section 12) */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* Summary Metric Cards for current month */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'bn' ? 'সকালের নাস্তা' : 'Breakfast Total'}
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {memberMonthHistory.totalBreakfast}{' '}
                <span className="text-xs font-normal text-slate-400">{language === 'bn' ? 'টি' : 'meals'}</span>
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'bn' ? 'দুপুরের খাবার' : 'Lunch Total'}
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {memberMonthHistory.totalLunch}{' '}
                <span className="text-xs font-normal text-slate-400">{language === 'bn' ? 'টি' : 'meals'}</span>
              </span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {language === 'bn' ? 'রাতের খাবার' : 'Dinner Total'}
              </span>
              <span className="text-2xl font-black text-indigo-600 mt-1 block">
                {memberMonthHistory.totalDinner}{' '}
                <span className="text-xs font-normal text-slate-400">{language === 'bn' ? 'টি' : 'meals'}</span>
              </span>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                {language === 'bn' ? 'মাসের সর্বমোট মিল' : 'Month Total'}
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                {memberMonthHistory.totalMeals}{' '}
                <span className="text-xs font-normal text-emerald-200">{language === 'bn' ? 'টি' : 'meals'}</span>
              </span>
            </div>
          </div>

          {/* Daily Table Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600" />
                <span>{language === 'bn' ? 'দৈনিক মিল হিসাব বিবরণী' : 'Daily Meal Statement'} ({memberMonthHistory.month})</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'সকাল' : 'Breakfast'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'দুপুর' : 'Lunch'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'রাত' : 'Dinner'}</th>
                    <th className="py-3 px-4 text-center">{language === 'bn' ? 'মোট মিল' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberMonthHistory.rows.map(row => (
                    <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">{row.date}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            row.breakfast === 'ON' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.breakfast}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            row.lunch === 'ON' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.lunch}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            row.dinner === 'ON' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {row.dinner}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800 text-sm">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MEMBER MEAL CHANGE AUDIT LOGS (Section 19) */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-600" />
              <span>{language === 'bn' ? 'মিল পরিবর্তনের হিস্ট্রি ও অডিট ট্রেইল' : 'Meal Change Audit Logs'}</span>
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              {memberChangeLogs.length} {language === 'bn' ? 'টি রেকর্ড' : 'entries'}
            </span>
          </div>

          {memberChangeLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {language === 'bn' ? 'এখনো কোনো মিল পরিবর্তনের রেকর্ড নেই।' : 'No meal change logs found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{language === 'bn' ? 'তারিখ ও সময়' : 'Time'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'মিলের তারিখ' : 'Meal Date'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'মিল' : 'Meal Type'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'পরিবর্তন' : 'Transition'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'কার দ্বারা' : 'Changed By'}</th>
                    <th className="py-3 px-4">{language === 'bn' ? 'মন্তব্য/কারণ' : 'Reason'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberChangeLogs.map(log => {
                    const mealBn =
                      log.mealType === 'breakfast'
                        ? 'সকাল'
                        : log.mealType === 'lunch'
                        ? 'দুপুর'
                        : 'রাত';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {new Date(log.changedAt).toLocaleString('en-GB', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{log.date}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700 capitalize">{mealBn}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className={log.previousStatus === 'ON' ? 'text-emerald-700' : 'text-slate-400'}>
                              {log.previousStatus}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className={log.newStatus === 'ON' ? 'text-emerald-700' : 'text-rose-600'}>
                              {log.newStatus}
                            </span>
                            {log.isOverride && (
                              <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-800 text-[10px] font-bold">
                                ওভাররাইড
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {log.changedByName} ({log.changedByRole})
                        </td>
                        <td className="py-3 px-4 text-slate-500">{log.reason || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL (Section 4 & 18) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'bn' ? 'মিল পরিবর্তনের নিশ্চয়তা' : 'Confirm Meal Change'}
                </h3>
                <p className="text-xs text-slate-500">
                  {confirmModal.date} |{' '}
                  {confirmModal.mealType === 'breakfast'
                    ? 'সকালের নাস্তা'
                    : confirmModal.mealType === 'lunch'
                    ? 'দুপুরের খাবার'
                    : 'রাতের খাবার'}
                </p>
              </div>
            </div>

            {confirmModal.isLocked && isAdmin && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>লক ওভাররাইড:</strong> এই মিলটির কাট-অফ সময় ইতিমধ্যে শেষ হয়ে গেছে। এডমিন অধিকার বলে আপনি এটি ওভাররাইড করছেন।
                </span>
              </div>
            )}

            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">সদস্যের নাম:</span>
                <span className="font-bold text-slate-800">{targetMember.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">বর্তমান স্ট্যাটাস:</span>
                <span className={`font-bold ${confirmModal.currentStatus === 'ON' ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {confirmModal.currentStatus}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-700 font-bold">পরিবর্তন হবে:</span>
                <span
                  className={`font-extrabold text-sm ${
                    confirmModal.newStatus === 'ON' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {confirmModal.newStatus}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              {confirmModal.newStatus === 'ON'
                ? 'আপনি কি এই মিলটি চালু (ON) করতে চান? নিশ্চিত করলে বাজার ও রান্নার তালিকায় আপনার খাবারের অংশ যোগ হবে।'
                : 'আপনি কি এই মিলটি বন্ধ (OFF) করতে চান? নিশ্চিত করলে এই মিলের কোনো হিসাব বা খরচ আপনার অ্যাকাউন্টে যোগ হবে না।'}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmToggle}
                disabled={isProcessing}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-sm transition-all cursor-pointer flex items-center gap-2 ${
                  confirmModal.newStatus === 'ON'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isProcessing ? (
                  <span>প্রসেসিং...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponent: MealCard for Single Day View
// -------------------------------------------------------------
interface MealCardProps {
  mealType: MealType;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  iconBg: string;
  date: string;
  status: MealStatus;
  lockInfo: { isLocked: boolean; reason?: string; cutoffTime: string; timeRemaining?: string };
  menuText?: string;
  cutoffSettings: MealCutoffSettings;
  isAdmin: boolean;
  language: Language;
  onToggle: () => void;
}

const MealCard: React.FC<MealCardProps> = ({
  mealType,
  title,
  icon: Icon,
  colorClass,
  iconBg,
  date,
  status,
  lockInfo,
  menuText,
  cutoffSettings,
  isAdmin,
  language,
  onToggle,
}) => {
  const isLocked = lockInfo.isLocked;
  const isMemberLocked = isLocked && !isAdmin;
  const isOn = status === 'ON';

  return (
    <div
      className={`bg-gradient-to-b ${colorClass} rounded-2xl p-5 border shadow-xs flex flex-col justify-between transition-all hover:shadow-sm`}
    >
      <div>
        {/* Card Top: Icon, Title, Lock/Status Badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>কাট-অফ: {formatCutoffTime(lockInfo.cutoffTime, language)}</span>
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {isLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/90 text-slate-700 text-[11px] font-bold">
                <Lock className="h-3 w-3 text-slate-500" />
                <span>লকড</span>
              </span>
            ) : isOn ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>চালু (ON)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                <XCircle className="h-3 w-3 text-rose-600" />
                <span>বন্ধ (OFF)</span>
              </span>
            )}
          </div>
        </div>

        {/* Menu Information for this meal */}
        <div className="mt-4 p-3 bg-white/80 rounded-xl border border-slate-200/60 text-xs">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
            {language === 'bn' ? 'আজকের নির্ধারিত মেনু:' : "Today's Menu:"}
          </span>
          <p className="text-slate-700 font-medium leading-relaxed">
            {menuText || (language === 'bn' ? 'মেনু এখনো নির্ধারিত হয়নি' : 'Menu not set yet')}
          </p>
        </div>

        {/* Cutoff Deadline Message */}
        {isLocked ? (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-700 flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-rose-600" />
            <span className="leading-tight">
              {language === 'bn'
                ? 'এই মিলের পরিবর্তনের সময় শেষ হয়ে গেছে।'
                : 'Meal change time has ended for this meal.'}
            </span>
          </div>
        ) : lockInfo.timeRemaining ? (
          <div className="mt-3 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-500" />
            <span>পরিবর্তনের শেষ সময়: {lockInfo.timeRemaining}</span>
          </div>
        ) : null}
      </div>

      {/* Big Tactile Interactive Toggle Button */}
      <div className="mt-6 pt-4 border-t border-slate-200/60">
        <button
          onClick={onToggle}
          disabled={isMemberLocked}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-between transition-all cursor-pointer shadow-xs ${
            isMemberLocked
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : isOn
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
          }`}
        >
          <span className="flex items-center gap-2">
            {isOn ? (
              <CheckCircle2 className="h-5 w-5 text-white" />
            ) : (
              <XCircle className="h-5 w-5 text-slate-400" />
            )}
            <span>
              {isOn
                ? language === 'bn'
                  ? 'মিল চালু আছে (ON)'
                  : 'Meal is ON'
                : language === 'bn'
                ? 'মিল বন্ধ আছে (OFF)'
                : 'Meal is OFF'}
            </span>
          </span>

          {/* Toggle pill appearance */}
          <div
            className={`w-12 h-6 rounded-full p-0.5 transition-colors relative flex items-center ${
              isOn ? 'bg-emerald-800' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                isOn ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </div>
        </button>

        {isLocked && isAdmin && (
          <p className="text-[10px] text-amber-700 font-semibold text-center mt-1.5">
            ★ এডমিন প্রিভিলেজ: আপনি চাইলে লক ওভাররাইড করতে পারেন
          </p>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponent: PlannerSwitch for weekly table view
// -------------------------------------------------------------
const PlannerSwitch: React.FC<{
  status: MealStatus;
  isLocked: boolean;
  onChange: () => void;
}> = ({ status, isLocked, onChange }) => {
  const isOn = status === 'ON';

  return (
    <button
      onClick={onChange}
      disabled={isLocked}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
        isLocked
          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          : isOn
          ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {isLocked ? (
        <Lock className="h-3 w-3" />
      ) : isOn ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-slate-400" />
      )}
      <span>{isLocked ? 'LOCKED' : isOn ? 'ON' : 'OFF'}</span>
    </button>
  );
};
