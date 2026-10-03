import React, { useState, useMemo } from 'react';
import {
  ChefHat,
  Calendar,
  Utensils,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Eye,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Member, MealMenu, CookingDuty } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.js';
import {
  getTodayDhakaDate,
  getTomorrowDhakaDate,
  getYesterdayDhakaDate,
  formatBengaliFullDate,
  getMonthNameBengali,
  toBengaliNumber,
  getCurrentDhakaPeriod,
} from '../utils/monthlyPeriodUtils.js';

interface CookingMenuViewProps {
  members: Member[];
  mealMenus: MealMenu[];
  cookingDuties: CookingDuty[];
  currentMember: Member;
  language: Language;
  onSaveMenu: (menu: Partial<MealMenu>) => Promise<void>;
  onSaveDuty: (duty: Partial<CookingDuty>) => Promise<void>;
  onDeleteDuty?: (id: string) => Promise<void>;
  onTriggerCookingSms: (duty: CookingDuty) => void;
}

const BENGALI_SHORT_DAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

export const CookingMenuView: React.FC<CookingMenuViewProps> = ({
  members,
  mealMenus,
  cookingDuties,
  currentMember,
  language,
  onSaveMenu,
  onSaveDuty,
  onDeleteDuty,
  onTriggerCookingSms,
}) => {
  const t = translations[language];
  const activeMembers = members.filter(m => m.status === 'active');

  const todayStr = useMemo(() => getTodayDhakaDate(), []);
  const tomorrowStr = useMemo(() => getTomorrowDhakaDate(todayStr), [todayStr]);
  const yesterdayStr = useMemo(() => getYesterdayDhakaDate(todayStr), [todayStr]);

  const currentPeriod = useMemo(() => todayStr.slice(0, 7), [todayStr]); // e.g. "2026-10"

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>(currentPeriod);
  const [showDutyModal, setShowDutyModal] = useState(false);
  const [editingDuty, setEditingDuty] = useState<CookingDuty | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);

  // Deletion modal state
  const [deleteDutyTarget, setDeleteDutyTarget] = useState<CookingDuty | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states for menu
  const currentMenu = mealMenus.find(m => m.date === selectedDate);
  const [lunchMenu, setLunchMenu] = useState(currentMenu?.lunch || 'সাদা ভাত + রুই মাছ ভুনা + ডাল + সালাদ');
  const [dinnerMenu, setDinnerMenu] = useState(currentMenu?.dinner || 'সাদা ভাত + মুরগির মাংসের ঝোল + আলুভর্তা + ঘন ডাল');
  const [specialEvent, setSpecialEvent] = useState(currentMenu?.specialEvent || '');

  // Form states for duty
  const currentDuty = cookingDuties.find(d => d.date === selectedDate);
  const [assignedMemberId, setAssignedMemberId] = useState(currentDuty?.memberId || activeMembers[0]?.id || '');
  const [dutyMealType, setDutyMealType] = useState<'all_day' | 'lunch' | 'dinner'>(
    currentDuty?.mealType === 'breakfast' ? 'all_day' : (currentDuty?.mealType as any) || 'all_day'
  );
  const [dutyStatus, setDutyStatus] = useState<'scheduled' | 'completed' | 'swapped'>(currentDuty?.status || 'scheduled');
  const [dutyNotes, setDutyNotes] = useState(currentDuty?.notes || '');

  const isAdmin = currentMember.role === 'admin';

  // Today and Tomorrow cook & menu lookups
  const todayCook = cookingDuties.find(d => d.date === todayStr);
  const tomorrowCook = cookingDuties.find(d => d.date === tomorrowStr);
  const todayMenu = mealMenus.find(m => m.date === todayStr);
  const tomorrowMenu = mealMenus.find(m => m.date === tomorrowStr);

  // Selected date cook lookup
  const selectedDateCook = cookingDuties.find(d => d.date === selectedDate);

  // Update form inputs when selectedDate changes
  React.useEffect(() => {
    const m = mealMenus.find(menu => menu.date === selectedDate);
    setLunchMenu(m?.lunch || '');
    setDinnerMenu(m?.dinner || '');
    setSpecialEvent(m?.specialEvent || '');

    const d = cookingDuties.find(duty => duty.date === selectedDate);
    setAssignedMemberId(d?.memberId || activeMembers[0]?.id || '');
    setDutyMealType(d?.mealType === 'breakfast' ? 'all_day' : (d?.mealType as any) || 'all_day');
    setDutyStatus(d?.status || 'scheduled');
    setDutyNotes(d?.notes || '');
  }, [selectedDate, mealMenus, cookingDuties]);

  // Compute days in the active month for the horizontal quick date strip
  const monthDaysList = useMemo(() => {
    const targetPeriod = selectedMonthFilter === 'all' ? currentPeriod : selectedMonthFilter;
    const [yStr, mStr] = targetPeriod.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(y) || isNaN(m)) return [];
    const count = new Date(y, m, 0).getDate();
    const days: Array<{
      dateStr: string;
      dayNumber: number;
      dayName: string;
      cookName: string;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    for (let d = 1; d <= count; d++) {
      const dStr = `${targetPeriod}-${String(d).padStart(2, '0')}`;
      const dt = new Date(y, m - 1, d);
      const dayOfWeek = dt.getDay();
      const existingDuty = cookingDuties.find(cd => cd.date === dStr);
      // Fallback rotation if not yet explicitly saved
      const rotatingCook = activeMembers.length > 0 ? activeMembers[(d - 1) % activeMembers.length] : null;

      days.push({
        dateStr: dStr,
        dayNumber: d,
        dayName: BENGALI_SHORT_DAYS[dayOfWeek] || '',
        cookName: existingDuty?.memberName || rotatingCook?.name || 'নির্ধারিত',
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
      });
    }
    return days;
  }, [selectedMonthFilter, currentPeriod, cookingDuties, activeMembers, todayStr, selectedDate]);

  // Filtered & sorted cooking duties list for the table
  const filteredDuties = useMemo(() => {
    let list = [...cookingDuties];
    if (selectedMonthFilter !== 'all') {
      list = list.filter(d => d.date && d.date.startsWith(selectedMonthFilter));
    }
    // Sort ascending by date
    list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return list;
  }, [cookingDuties, selectedMonthFilter]);

  // Quick day step navigation
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const prevStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
    setSelectedDate(prevStr);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextStr);
  };

  const handleSaveMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveMenu({
      date: selectedDate,
      breakfast: '',
      lunch: lunchMenu,
      dinner: dinnerMenu,
      specialEvent,
    });
    setShowMenuModal(false);
  };

  const openAddDutyModal = () => {
    setEditingDuty(null);
    setAssignedMemberId(activeMembers[0]?.id || '');
    setDutyMealType('all_day');
    setDutyStatus('scheduled');
    setDutyNotes('');
    setShowDutyModal(true);
  };

  const openEditDutyModal = (duty: CookingDuty) => {
    setEditingDuty(duty);
    setSelectedDate(duty.date);
    setAssignedMemberId(duty.memberId);
    setDutyMealType(duty.mealType === 'breakfast' ? 'all_day' : (duty.mealType as any));
    setDutyStatus(duty.status);
    setDutyNotes(duty.notes || '');
    setShowDutyModal(true);
  };

  const handleSaveDutySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assigned = members.find(m => m.id === assignedMemberId);
    await onSaveDuty({
      id: editingDuty ? editingDuty.id : undefined,
      date: selectedDate,
      mealType: dutyMealType,
      memberId: assignedMemberId,
      memberName: assigned?.name || 'Member',
      status: dutyStatus,
      notes: dutyNotes,
    });
    setShowDutyModal(false);
    setEditingDuty(null);
  };

  const handleConfirmDeleteDuty = async () => {
    if (!deleteDutyTarget || !onDeleteDuty) return;
    try {
      setIsDeleting(true);
      await onDeleteDuty(deleteDutyTarget.id);
      setDeleteDutyTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Active Month & Today's Cooking Information */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/40 border border-amber-300/40 text-white text-xs font-bold">
                <ChefHat className="h-3.5 w-3.5 text-amber-200" />
                <span>রান্নার শিডিউল ও দায়িত্ব (Cooking Duties)</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                চলতি মাস: {getMonthNameBengali(currentPeriod)}
              </span>
            </div>

            {/* Prominent Header for Today's Cook */}
            <div className="pt-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex flex-wrap items-baseline gap-2">
                <span>আজ রান্না করবে:</span>
                <span className="text-amber-200 underline decoration-amber-300 decoration-2 underline-offset-4">
                  {todayCook ? todayCook.memberName : (activeMembers[0]?.name || 'নির্ধারিত হয়নি')}
                </span>
              </h2>
              <p className="text-xs text-amber-100 font-medium mt-1">
                📅 আজকের তারিখ: <strong className="text-white font-bold">{formatBengaliFullDate(todayStr)}</strong>
              </p>
              <p className="text-xs text-amber-200/90 font-medium">
                🍲 আজকের মেনু: {todayMenu?.lunch ? `${todayMenu.lunch} (দুপুর) | ${todayMenu.dinner} (রাত)` : 'সাদা ভাত + রুই মাছ ভুনা + চিকেন কারি'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (todayCook) {
                  onTriggerCookingSms(todayCook);
                } else if (activeMembers[0]) {
                  onTriggerCookingSms({
                    id: `cd-${todayStr}`,
                    date: todayStr,
                    memberId: activeMembers[0].id,
                    memberName: activeMembers[0].name,
                    mealType: 'all_day',
                    status: 'scheduled',
                  });
                }
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-amber-900 text-xs font-bold shadow-xs hover:bg-amber-50 transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4 text-amber-700" />
              <span>আজকের রাঁধুনিকে SMS পাঠান</span>
            </button>
          </div>
        </div>

        {/* Quick 2-Column Sub-Cards for Today and Tomorrow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15">
            <div className="flex items-center justify-between text-xs text-amber-200 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <ChefHat className="h-3.5 w-3.5" />
                <span>আজকের রাঁধুনি ({formatBengaliFullDate(todayStr)})</span>
              </span>
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold">
                {todayCook?.status === 'completed' ? 'সম্পন্ন' : 'আজকের শিফট'}
              </span>
            </div>
            <p className="text-sm font-bold text-white">
              {todayCook ? todayCook.memberName : (activeMembers[0]?.name || 'নির্ধারিত হয়নি')}
            </p>
            <p className="text-[11px] text-amber-100 truncate mt-0.5">
              মিলের শিফট: {todayCook?.mealType === 'all_day' || !todayCook?.mealType ? 'সারাদিন (দুপুর ও রাত)' : todayCook?.mealType}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15">
            <div className="flex items-center justify-between text-xs text-amber-200 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>আগামীকাল রান্না করবে ({formatBengaliFullDate(tomorrowStr)})</span>
              </span>
              <span className="px-2 py-0.2 rounded-full bg-amber-400/30 text-amber-200 text-[10px] font-bold">
                নির্ধারিত
              </span>
            </div>
            <p className="text-sm font-bold text-white">
              {tomorrowCook ? tomorrowCook.memberName : (activeMembers[1]?.name || 'নির্ধারিত হয়নি')}
            </p>
            <p className="text-[11px] text-amber-100 truncate mt-0.5">
              মেনু: {tomorrowMenu?.lunch || 'সাদা ভাত + মুরগি ঝোল + সালাদ'}
            </p>
          </div>
        </div>
      </div>

      {/* Selected Date Callout (If a date other than today is selected) */}
      {selectedDate !== todayStr && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-black text-sm shrink-0">
              {toBengaliNumber(parseInt(selectedDate.split('-')[2], 10))}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  নির্বাচিত তারিখ: {formatBengaliFullDate(selectedDate)}
                </span>
                <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                  {selectedDate > todayStr ? 'ভবিষ্যৎ তারিখ' : 'অতীত তারিখ'}
                </span>
              </div>
              <p className="text-xs text-amber-900 font-bold mt-0.5">
                এই তারিখে রান্না করবেন: <span className="text-emerald-800">{selectedDateCook?.memberName || 'নির্ধারিত হয়নি'}</span>
                {selectedDateCook?.notes ? ` (${selectedDateCook.notes})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate(todayStr)}
            className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            আজকের তারিখে ফিরুন
          </button>
        </div>
      )}

      {/* Date Navigation, Month Selector & Action Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Month Tab Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> ফিল্টার:
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonthFilter(currentPeriod)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                selectedMonthFilter === currentPeriod
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              চলতি মাস: {getMonthNameBengali(currentPeriod).split('(')[0].trim()}
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonthFilter('2026-09')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                selectedMonthFilter === '2026-09'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              সেপ্টেম্বর ২০২৬ (পূর্ববর্তী মাস)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonthFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                selectedMonthFilter === 'all'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              সব শিডিউল
            </button>
          </div>

          {/* Action Buttons for Admin */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {isAdmin ? (
              <>
                <button
                  onClick={openAddDutyModal}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ChefHat className="h-4 w-4 text-emerald-600" />
                  <span>রান্নার দায়িত্ব নির্ধারণ</span>
                </button>
                <button
                  onClick={() => setShowMenuModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>খাবার মেনু পরিবর্তন</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
                <Eye className="h-4 w-4 text-slate-500" />
                <span>সদস্য ভিউ (শুধুমাত্র পাঠযোগ্য)</span>
              </div>
            )}
          </div>
        </div>

        {/* Date Selector and Step Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="পূর্বের দিন"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl outline-none cursor-pointer"
            />

            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="পরের দিন"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Quick Jumper to Today */}
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              আজ (Today)
            </button>

            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                selectedDate === tomorrowStr
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              আগামীকাল
            </button>

            <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              {formatBengaliFullDate(selectedDate)}
            </span>
          </div>

          <span className="text-xs text-slate-400">
            মোট শিডিউল: {filteredDuties.length} টি
          </span>
        </div>

        {/* Horizontal Calendar Strip for Current Month */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600">
              📅 {getMonthNameBengali(selectedMonthFilter === 'all' ? currentPeriod : selectedMonthFilter)} এর দৈনিক শিডিউল ক্যালেন্ডার:
            </span>
            <span className="text-[11px] text-slate-400">তারিখ চাপুন বিস্তারিত দেখতে</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {monthDaysList.map(item => (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => setSelectedDate(item.dateStr)}
                className={`flex flex-col items-center justify-center min-w-[56px] py-2 px-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                  item.isSelected
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs scale-105'
                    : item.isToday
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span className={`text-[10px] font-semibold ${item.isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                  {item.dayName}
                </span>
                <span className="text-sm font-black my-0.5">
                  {toBengaliNumber(item.dayNumber)}
                </span>
                <span
                  className={`text-[9px] font-bold truncate max-w-[50px] ${
                    item.isSelected ? 'text-amber-200' : 'text-slate-500'
                  }`}
                  title={item.cookName}
                >
                  {item.isToday ? '★ আজ' : item.cookName.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Menu Details Card for Selected Date */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {formatBengaliFullDate(selectedDate)} এর খাবার মেনু
              </h3>
              {selectedDate === todayStr && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  আজকের মেনু
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">মেস সদস্যদের জন্য নির্ধারিত দৈনিক খাবার তালিকা</p>
          </div>
          {currentMenu?.specialEvent && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              ★ {currentMenu.specialEvent}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lunch */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                দুপুরের খাবার (Lunch)
              </span>
              <Utensils className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              {currentMenu?.lunch || 'সাদা ভাত + রুই মাছ ভুনা + ডাল + সালাদ'}
            </p>
          </div>

          {/* Dinner */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                রাতের খাবার (Dinner)
              </span>
              <Utensils className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              {currentMenu?.dinner || 'সাদা ভাত + সোনালী মুরগির কারি + ঘন ডাল'}
            </p>
          </div>
        </div>
      </div>

      {/* Cooking Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-amber-600" />
              <span>রান্নার দায়িত্ব তালিকা (Cooking Duties Roster)</span>
            </h3>
            <p className="text-xs text-slate-400">
              {selectedMonthFilter === 'all'
                ? 'সকল মাসের দায়িত্ব তালিকা'
                : `${getMonthNameBengali(selectedMonthFilter)} মাসের পরিক্রমা`}
            </p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            প্রদর্শিত: {filteredDuties.length} টি দায়িত্ব
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-4">রাঁধুনির নাম</th>
                <th className="py-3 px-4">মিলের পরিধি</th>
                <th className="py-3 px-4">স্ট্যাটাস</th>
                <th className="py-3 px-4">মেনু প্রিভিউ</th>
                <th className="py-3 px-4">মন্তব্য</th>
                <th className="py-3 px-4 text-center">এসএমএস</th>
                {isAdmin && <th className="py-3 px-4 text-center">অ্যাকশন (এডমিন)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDuties.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-400 text-xs">
                    এই মাসে কোনো রান্নার শিডিউল পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredDuties.map(d => {
                  const isRowToday = d.date === todayStr;
                  const isRowSelected = d.date === selectedDate;
                  const rowMenu = mealMenus.find(m => m.date === d.date);

                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDate(d.date)}
                      className={`cursor-pointer transition-colors ${
                        isRowSelected
                          ? 'bg-amber-50/80 font-semibold'
                          : isRowToday
                          ? 'bg-emerald-50/60 font-semibold'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{d.date}</span>
                          {isRowToday && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black">
                              আজ
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {formatBengaliFullDate(d.date).split('(')[1]?.replace(')', '') || ''}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {d.memberName.slice(0, 1)}
                          </div>
                          <span>{d.memberName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {d.mealType === 'all_day' || !d.mealType ? 'সারাদিন' : d.mealType === 'lunch' ? 'দুপুর' : 'রাত'}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            d.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.status === 'completed' ? 'সম্পন্ন' : 'নির্ধারিত'}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-[200px] truncate text-[11px] text-slate-600">
                        {rowMenu?.lunch ? rowMenu.lunch : '—'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-[150px] truncate">
                        {d.notes || '—'}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onTriggerCookingSms(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-semibold transition-colors cursor-pointer"
                          title="Send SMS"
                        >
                          <Send className="h-3 w-3" />
                          <span>SMS</span>
                        </button>
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditDutyModal(d)}
                              title="সম্পাদনা করুন"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteDutyTarget(d)}
                              title="মুছে ফেলুন"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Meal Menu */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              খাবার মেনু হালনাগাদ ({formatBengaliFullDate(selectedDate)})
            </h3>
            <form onSubmit={handleSaveMenuSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  দুপুরের খাবার (Lunch)
                </label>
                <input
                  type="text"
                  value={lunchMenu}
                  onChange={e => setLunchMenu(e.target.value)}
                  placeholder="উদা: সাদা ভাত + রুই মাছ ভুনা + ডাল + সালাদ"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রাতের খাবার (Dinner)
                </label>
                <input
                  type="text"
                  value={dinnerMenu}
                  onChange={e => setDinnerMenu(e.target.value)}
                  placeholder="উদা: সাদা ভাত + মুরগির মাংসের ঝোল + আলুভর্তা"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  বিশেষ ইভেন্ট / উপলক্ষ্য (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={specialEvent}
                  onChange={e => setSpecialEvent(e.target.value)}
                  placeholder="উদা: শুক্রবারের স্পেশাল বিরিয়ানি ফেস্ট বা মেস পিকনিক"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMenuModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  মেনু সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Set/Edit Cooking Duty */}
      {showDutyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingDuty ? 'রান্নার দায়িত্ব শিডিউল সম্পাদনা' : `রান্নার দায়িত্ব নির্ধারণ (${selectedDate})`}
            </h3>
            <form onSubmit={handleSaveDutySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">রাঁধুনির নাম (সদস্য)</label>
                <select
                  value={assignedMemberId}
                  onChange={e => setAssignedMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                  required
                >
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.nickname}) - রুম {m.roomNo || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মিলের পরিধি</label>
                <select
                  value={dutyMealType}
                  onChange={e => setDutyMealType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                >
                  <option value="all_day">সারাদিন (দুপুর + রাত)</option>
                  <option value="lunch">শুধু দুপুরের খাবার</option>
                  <option value="dinner">শুধু রাতের খাবার</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">স্ট্যাটাস</label>
                <select
                  value={dutyStatus}
                  onChange={e => setDutyStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                >
                  <option value="scheduled">নির্ধারিত (Scheduled)</option>
                  <option value="completed">সম্পন্ন (Completed)</option>
                  <option value="swapped">বদল করা হয়েছে (Swapped)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নোট / বিশেষ তথ্য</label>
                <input
                  type="text"
                  value={dutyNotes}
                  onChange={e => setDutyNotes(e.target.value)}
                  placeholder="উদা: বিকেলে হেল্পার হিসেবে অন্য সদস্য থাকবেন"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowDutyModal(false);
                    setEditingDuty(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingDuty ? 'পরিবর্তন সংরক্ষণ করুন' : 'দায়িত্ব সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Cooking Duty Deletion */}
      <ConfirmDeleteModal
        isOpen={!!deleteDutyTarget}
        title="রান্নার দায়িত্ব মুছে ফেলার নিশ্চিতকরণ"
        message="আপনি কি নিশ্চিত যে এই রান্নার দায়িত্ব শিডিউলটি মুছে ফেলতে চান?"
        itemName={deleteDutyTarget ? `${deleteDutyTarget.date} তারিখে ${deleteDutyTarget.memberName}-এর দায়িত্ব` : ''}
        itemDetails={deleteDutyTarget ? `মিলের পরিধি: ${deleteDutyTarget.mealType === 'all_day' ? 'সারাদিন' : deleteDutyTarget.mealType} | অবস্থা: ${deleteDutyTarget.status}` : ''}
        isFinancial={false}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteDuty}
        onClose={() => setDeleteDutyTarget(null)}
      />
    </div>
  );
};
