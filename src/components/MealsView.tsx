import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Calendar,
  Save,
  CheckCircle,
  Plus,
  Minus,
  Search,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Trash2,
  Lock,
  Eye,
  ShieldCheck,
  Clock,
  Settings,
  Bell,
  Send,
  Sparkles,
  ShoppingBag,
  ChefHat,
  X,
} from 'lucide-react';
import {
  Member,
  DailyMealEntry,
  MealRecord,
  MemberMealSelection,
  MealCutoffSettings,
} from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.js';
import { ClosedMonthAlert } from './ClosedMonthAlert.js';

interface MealsViewProps {
  members: Member[];
  dailyMeals: DailyMealEntry[];
  currentMember: Member;
  language: Language;
  isMonthClosed?: boolean;
  memberMealSelections?: MemberMealSelection[];
  cutoffSettings?: MealCutoffSettings;
  onSaveDailyMeals: (date: string, records: Record<string, MealRecord>, notes?: string) => Promise<void>;
  onDeleteMealRecord?: (date: string) => Promise<void>;
  onSaveCutoffSettings?: (settings: MealCutoffSettings) => Promise<boolean>;
  onSendCutoffReminders?: (date: string) => Promise<boolean>;
  isSaving: boolean;
}

export const MealsView: React.FC<MealsViewProps> = ({
  members,
  dailyMeals,
  currentMember,
  language,
  isMonthClosed = false,
  memberMealSelections = [],
  cutoffSettings,
  onSaveDailyMeals,
  onDeleteMealRecord,
  onSaveCutoffSettings,
  onSendCutoffReminders,
  isSaving,
}) => {
  const t = translations[language];
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-18');
  const [searchTerm, setSearchTerm] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Cutoff settings modal state
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [cutoffDraft, setCutoffDraft] = useState<MealCutoffSettings>(() => ({
    breakfastCutoff: cutoffSettings?.breakfastCutoff || '06:00',
    lunchCutoff: cutoffSettings?.lunchCutoff || '10:00',
    dinnerCutoff: cutoffSettings?.dinnerCutoff || '16:00',
    timezone: cutoffSettings?.timezone || 'Asia/Dhaka',
    enableReminders: cutoffSettings?.enableReminders ?? true,
    enableSmsNotification: cutoffSettings?.enableSmsNotification ?? false,
    sendSmsOnStatusChange: cutoffSettings?.sendSmsOnStatusChange ?? true,
  }));

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permissions
  const isAdmin = currentMember.role === 'admin';
  const canEdit = isAdmin && !isMonthClosed;

  // Active members
  const activeMembers = members.filter(m => m.status === 'active');

  // Find existing meal entry or initialize empty records
  const currentEntry = dailyMeals.find(dm => dm.date === selectedDate);

  // Local draft state for records on this selected date
  const [draftRecords, setDraftRecords] = useState<Record<string, MealRecord>>(() => {
    const initial: Record<string, MealRecord> = {};
    activeMembers.forEach(m => {
      const rec = currentEntry?.records?.[m.id];
      initial[m.id] = rec
        ? { ...rec }
        : { memberId: m.id, breakfast: 0, lunch: 1, dinner: 1, total: 2 };
    });
    return initial;
  });

  // Keep draft updated when selectedDate changes
  React.useEffect(() => {
    const entry = dailyMeals.find(dm => dm.date === selectedDate);
    const updated: Record<string, MealRecord> = {};
    activeMembers.forEach(m => {
      const rec = entry?.records?.[m.id];
      updated[m.id] = rec
        ? { ...rec }
        : { memberId: m.id, breakfast: 0, lunch: 1, dinner: 1, total: 2 };
    });
    setDraftRecords(updated);
    setSaveSuccessMessage(null);
  }, [selectedDate, dailyMeals]);

  // Adjust meal count helper
  const handleMealChange = (memberId: string, type: 'breakfast' | 'lunch' | 'dinner', delta: number) => {
    if (!canEdit) return;
    setDraftRecords(prev => {
      const current = prev[memberId] || { memberId, breakfast: 0, lunch: 0, dinner: 0, total: 0 };
      const val = Math.max(0, parseFloat(((current[type] || 0) + delta).toFixed(1)));
      const updated = {
        ...current,
        [type]: val,
      };
      updated.total = updated.breakfast + updated.lunch + updated.dinner;
      return {
        ...prev,
        [memberId]: updated,
      };
    });
  };

  // Direct toggle between 0 and 1
  const handleToggle = (memberId: string, type: 'breakfast' | 'lunch' | 'dinner') => {
    if (!canEdit) return;
    setDraftRecords(prev => {
      const current = prev[memberId] || { memberId, breakfast: 0, lunch: 0, dinner: 0, total: 0 };
      const val = current[type] > 0 ? 0 : 1;
      const updated = {
        ...current,
        [type]: val,
      };
      updated.total = updated.breakfast + updated.lunch + updated.dinner;
      return {
        ...prev,
        [memberId]: updated,
      };
    });
  };

  // Quick action: Set all lunch & dinner to 1
  const handleSetStandardAll = () => {
    if (!canEdit) return;
    setDraftRecords(prev => {
      const updated: Record<string, MealRecord> = {};
      activeMembers.forEach(m => {
        const cur = prev[m.id] || { memberId: m.id, breakfast: 0, lunch: 0, dinner: 0, total: 0 };
        updated[m.id] = {
          ...cur,
          lunch: 1,
          dinner: 1,
          total: (cur.breakfast || 0) + 2,
        };
      });
      return updated;
    });
  };

  // Daily totals calculation
  let dailyBreakfast = 0;
  let dailyLunch = 0;
  let dailyDinner = 0;
  Object.values(draftRecords).forEach(r => {
    dailyBreakfast += r.breakfast || 0;
    dailyLunch += r.lunch || 0;
    dailyDinner += r.dinner || 0;
  });
  const dailyTotal = dailyBreakfast + dailyLunch + dailyDinner;

  // Monthly totals across all dates for each member
  const memberMonthlyMeals: Record<string, number> = {};
  activeMembers.forEach(m => {
    memberMonthlyMeals[m.id] = 0;
  });
  dailyMeals.forEach(day => {
    Object.entries(day.records).forEach(([mId, rec]) => {
      memberMonthlyMeals[mId] = (memberMonthlyMeals[mId] || 0) + (rec.total || 0);
    });
  });

  const handleSave = async () => {
    if (!canEdit) return;
    await onSaveDailyMeals(selectedDate, draftRecords);
    setSaveSuccessMessage(`${selectedDate} তারিখের মিল সফলভাবে সংরক্ষিত হয়েছে!`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  const handleConfirmDelete = async () => {
    if (!onDeleteMealRecord) return;
    try {
      setIsDeleting(true);
      await onDeleteMealRecord(selectedDate);
      setShowDeleteModal(false);
      setSaveSuccessMessage(`${selectedDate} তারিখের মিল রেকর্ড সফলভাবে মুছে ফেলা হয়েছে`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMembers = activeMembers.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.roomNo && m.roomNo.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Closed Month Banner */}
      {isMonthClosed && <ClosedMonthAlert month="সেপ্টেম্বর" />}

      {/* Non-Admin Banner */}
      {!isAdmin && (
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-slate-700">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Eye className="h-4 w-4 text-slate-500" />
            <span>সদস্য ভিউ (শুধুমাত্র পাঠযোগ্য) — মিল এন্ট্রি, এডিট ও ডিলিট শুধুমাত্র মেস এডমিনের আওতাভুক্ত</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
            Read-Only
          </span>
        </div>
      )}

      {/* Header & Date Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  দৈনিক মিল এন্ট্রি ও পরিচালনা (Daily Meal Tracking)
                </h2>
                <p className="text-xs text-slate-500">
                  তারিখ অনুযায়ী সদস্যদের সকাল, দুপুর ও রাতের মিল হিসাব সংরক্ষণ করুন
                </p>
              </div>
            </div>
          </div>

          {/* Date Picker & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            />

            {canEdit && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'মিল সেভ করুন'}</span>
                </button>

                {currentEntry && onDeleteMealRecord && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    title="এই তারিখের মিল রেকর্ড মুছে ফেলুন"
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">মুছে ফেলুন</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Live Daily Stats Ticker */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">সকালের নাস্তা</span>
            <div className="text-lg font-extrabold text-slate-800">{dailyBreakfast} টি</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">দুপুরের খাবার</span>
            <div className="text-lg font-extrabold text-slate-800">{dailyLunch} টি</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium">রাতের খাবার</span>
            <div className="text-lg font-extrabold text-slate-800">{dailyDinner} টি</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] text-emerald-700 font-medium">আজকের মোট মিল</span>
            <div className="text-lg font-extrabold text-emerald-700">{dailyTotal} টি</div>
          </div>
        </div>

        {/* Expected Meals for Bazar & Cook Helper Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-emerald-50/80 border border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  বাজার ও রান্নার প্রত্যাশিত খাবার (Kitchen & Bazar Guidance)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {selectedDate}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                নাস্তা: <span className="font-bold text-slate-900">{dailyBreakfast} জন</span> | 
                দুপুর: <span className="font-bold text-slate-900"> {dailyLunch} জন</span> | 
                রাত: <span className="font-bold text-slate-900"> {dailyDinner} জন</span> — সদস্যদের মিল ON/OFF স্ট্যাটাসের উপর ভিত্তি করে রান্নার পরিমাণ নির্ধারণ করুন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {isAdmin && onSendCutoffReminders && (
              <button
                type="button"
                disabled={isSendingReminders}
                onClick={async () => {
                  setIsSendingReminders(true);
                  try {
                    await onSendCutoffReminders(selectedDate);
                  } finally {
                    setIsSendingReminders(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="সদস্যদের মিল অন/অফ করার রিমাইন্ডার পাঠান"
              >
                <Bell className={`h-3.5 w-3.5 text-amber-600 ${isSendingReminders ? 'animate-bounce' : ''}`} />
                <span>{isSendingReminders ? 'পাঠানো হচ্ছে...' : 'রিমাইন্ডার পাঠান'}</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowCutoffModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="মিল বন্ধ হওয়ার সময় নির্ধারণ করুন"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>কাট-অফ সময়</span>
              </button>
            )}
          </div>
        </div>

        {saveSuccessMessage && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Action Bar: Search & Quick Batch Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSetStandardAll}
              className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              সবার দুপুর+রাত (১+১) মিল সেট করুন
            </button>
          </div>
        )}
      </div>

      {/* Member-wise Meal Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">সদস্যের নাম</th>
                <th className="py-3 px-4 text-center">সকাল (Breakfast)</th>
                <th className="py-3 px-4 text-center">দুপুর (Lunch)</th>
                <th className="py-3 px-4 text-center">রাত (Dinner)</th>
                <th className="py-3 px-4 text-center bg-slate-100/50">আজকের মোট</th>
                <th className="py-3 px-4 text-center">সেপ্টেম্বর মোট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredMembers.map(m => {
                const rec = draftRecords[m.id] || { memberId: m.id, breakfast: 0, lunch: 0, dinner: 0, total: 0 };
                const monthlyTotal = (memberMonthlyMeals[m.id] || 0) + (rec.total - (currentEntry?.records?.[m.id]?.total || 0));

                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Member Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 ${m.avatarColor}`}>
                          {m.nickname.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{m.name}</div>
                          <span className="text-[11px] text-slate-400">
                            রুম {m.roomNo || 'N/A'} • {m.phone}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Breakfast toggle / counter */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleMealChange(m.id, 'breakfast', -0.5)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleToggle(m.id, 'breakfast')}
                          className={`w-10 py-1 rounded-lg text-xs font-bold transition-all ${
                            canEdit ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            rec.breakfast > 0
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {rec.breakfast}
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleMealChange(m.id, 'breakfast', 0.5)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Lunch toggle / counter */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleMealChange(m.id, 'lunch', -1)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleToggle(m.id, 'lunch')}
                          className={`w-10 py-1 rounded-lg text-xs font-bold transition-all ${
                            canEdit ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            rec.lunch > 0
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {rec.lunch}
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleMealChange(m.id, 'lunch', 1)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Dinner toggle / counter */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleMealChange(m.id, 'dinner', -1)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => handleToggle(m.id, 'dinner')}
                          className={`w-10 py-1 rounded-lg text-xs font-bold transition-all ${
                            canEdit ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            rec.dinner > 0
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {rec.dinner}
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleMealChange(m.id, 'dinner', 1)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Today's total for this member */}
                    <td className="py-3 px-4 text-center font-extrabold text-slate-900 bg-slate-50/50">
                      <span className="px-2.5 py-1 rounded-full bg-slate-200/80 text-xs">
                        {rec.total}
                      </span>
                    </td>

                    {/* Member's month-to-date total */}
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">
                      {monthlyTotal} মিল
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Meal Record Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        title="দৈনিক মিল রেকর্ড মুছে ফেলার নিশ্চিতকরণ"
        message={`আপনি কি নিশ্চিত যে ${selectedDate} তারিখের সম্পূর্ণ মিল রেকর্ড মুছে ফেলতে চান?`}
        itemName={`${selectedDate} তারিখের মোট মিল: ${dailyTotal} টি`}
        itemDetails={`সকালের নাস্তা: ${dailyBreakfast} | দুপুর: ${dailyLunch} | রাত: ${dailyDinner}`}
        isFinancial={true}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setShowDeleteModal(false)}
      />

      {/* Meal Cutoff Settings Modal (Admin) */}
      {showCutoffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    মিল কাট-অফ সময় নির্ধারণ (Cut-off Management)
                  </h3>
                  <p className="text-xs text-slate-500">
                    কাট-অফ সময়ের পর সদস্যরা তাদের মিল অন/অফ করতে পারবে না
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCutoffModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <span>🌅 সকালের নাস্তা</span>
                  </label>
                  <input
                    type="time"
                    value={cutoffDraft.breakfastCutoff}
                    onChange={e =>
                      setCutoffDraft(prev => ({ ...prev, breakfastCutoff: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">সকাল ৬:০০ AM</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <span>☀️ দুপুরের খাবার</span>
                  </label>
                  <input
                    type="time"
                    value={cutoffDraft.lunchCutoff}
                    onChange={e =>
                      setCutoffDraft(prev => ({ ...prev, lunchCutoff: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">সকাল ১০:০০ AM</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <span>🌙 রাতের খাবার</span>
                  </label>
                  <input
                    type="time"
                    value={cutoffDraft.dinnerCutoff}
                    onChange={e =>
                      setCutoffDraft(prev => ({ ...prev, dinnerCutoff: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">বিকাল ৪:০০ PM</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 block">ইন-অ্যাপ ও পুশ রিমাইন্ডার</span>
                    <span className="text-[11px] text-slate-500">
                      কাট-অফের ৩০ মিনিট পূর্বে সদস্যদের নোটিফিকেশন প্রদান করুন
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={cutoffDraft.enableReminders}
                    onChange={e =>
                      setCutoffDraft(prev => ({ ...prev, enableReminders: e.target.checked }))
                    }
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <div>
                    <span className="font-bold text-slate-800 block">এসএমএস অ্যালার্ট</span>
                    <span className="text-[11px] text-slate-500">
                      মিল বন্ধ/চালু করলে সদস্যের ফোনে কনফার্মেশন এসএমএস পাঠানো
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={cutoffDraft.sendSmsOnStatusChange}
                    onChange={e =>
                      setCutoffDraft(prev => ({ ...prev, sendSmsOnStatusChange: e.target.checked }))
                    }
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>এডমিন ওভাররাইড নিয়ম:</strong> মেস এডমিন যেকোনো সময় যেকোনো সদস্যের লক হওয়া মিল স্ট্যাটাস বিশেষ প্রয়োজনে পরিবর্তন করতে পারেন। সাধারণ সদস্যরা কাট-অফ সময়ের পর আর মিল পরিবর্তন করতে পারবে না।
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCutoffModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onSaveCutoffSettings) {
                    await onSaveCutoffSettings(cutoffDraft);
                  }
                  setShowCutoffModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
              >
                কাট-অফ সংরক্ষণ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
