import React, { useState } from 'react';
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
} from 'lucide-react';
import { Member, MealMenu, CookingDuty } from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { ConfirmDeleteModal } from './ConfirmDeleteModal.js';

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

  const [selectedDate, setSelectedDate] = useState<string>('2026-09-17');
  const [showDutyModal, setShowDutyModal] = useState(false);
  const [editingDuty, setEditingDuty] = useState<CookingDuty | null>(null);
  const [showMenuModal, setShowMenuModal] = useState(false);

  // Deletion modal state
  const [deleteDutyTarget, setDeleteDutyTarget] = useState<CookingDuty | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states for menu
  const currentMenu = mealMenus.find(m => m.date === selectedDate);
  const [breakfastMenu, setBreakfastMenu] = useState(currentMenu?.breakfast || 'ডিম ভুনা + পাতলা ডাল + পরোটা');
  const [lunchMenu, setLunchMenu] = useState(currentMenu?.lunch || 'সাদা ভাত + রুই মাছ ভুনা + ডাল + সালাদ');
  const [dinnerMenu, setDinnerMenu] = useState(currentMenu?.dinner || 'সাদা ভাত + মুরগির মাংসের ঝোল + আলুভর্তা + ঘন ডাল');
  const [specialEvent, setSpecialEvent] = useState(currentMenu?.specialEvent || '');

  // Form states for duty
  const currentDuty = cookingDuties.find(d => d.date === selectedDate);
  const [assignedMemberId, setAssignedMemberId] = useState(currentDuty?.memberId || activeMembers[0]?.id || '');
  const [dutyMealType, setDutyMealType] = useState<'all_day' | 'breakfast' | 'lunch' | 'dinner'>(currentDuty?.mealType || 'all_day');
  const [dutyStatus, setDutyStatus] = useState<'scheduled' | 'completed' | 'swapped'>(currentDuty?.status || 'scheduled');
  const [dutyNotes, setDutyNotes] = useState(currentDuty?.notes || '');

  const isAdmin = currentMember.role === 'admin';

  // Update form inputs when selectedDate changes
  React.useEffect(() => {
    const m = mealMenus.find(menu => menu.date === selectedDate);
    setBreakfastMenu(m?.breakfast || '');
    setLunchMenu(m?.lunch || '');
    setDinnerMenu(m?.dinner || '');
    setSpecialEvent(m?.specialEvent || '');

    const d = cookingDuties.find(duty => duty.date === selectedDate);
    setAssignedMemberId(d?.memberId || activeMembers[0]?.id || '');
    setDutyMealType(d?.mealType || 'all_day');
    setDutyStatus(d?.status || 'scheduled');
    setDutyNotes(d?.notes || '');
  }, [selectedDate, mealMenus, cookingDuties]);

  const handleSaveMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveMenu({
      date: selectedDate,
      breakfast: breakfastMenu,
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
    setDutyMealType(duty.mealType);
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
      {/* Top Banner with Today & Tomorrow Cooks */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-200 text-xs font-semibold">
              <ChefHat className="h-4 w-4" />
              <span>রান্নার শিডিউল ও দায়িত্ব (Cooking Duties)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold mt-1">
              আজ রান্না করবে: {cookingDuties.find(d => d.date === '2026-09-17')?.memberName || 'রহিম উদ্দিন'}
            </h2>
            <p className="text-xs text-amber-100 mt-1">
              আগামীকাল রান্না করবে: {cookingDuties.find(d => d.date === '2026-09-18')?.memberName || 'সাকিব আল আমিন'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = cookingDuties.find(duty => duty.date === '2026-09-17');
                if (d) onTriggerCookingSms(d);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-amber-900 text-xs font-bold shadow-xs hover:bg-amber-50 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-amber-700" />
              <span>আজকের রাঁধুনিকে SMS রিমাইন্ডার</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Navigation & Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">তারিখ নির্বাচন:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl outline-none cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
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

      {/* Daily Menu Details Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {selectedDate} তারিখের খাবার মেনু
            </h3>
            <p className="text-xs text-slate-500">মেস সদস্যদের জন্য নির্ধারিত দৈনিক খাবার তালিকা</p>
          </div>
          {currentMenu?.specialEvent && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              ★ {currentMenu.specialEvent}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Breakfast */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                সকালের নাস্তা (Breakfast)
              </span>
              <Utensils className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              {currentMenu?.breakfast || 'এখনো কোন মেনু সেট করা হয়নি'}
            </p>
          </div>

          {/* Lunch */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                দুপুরের খাবার (Lunch)
              </span>
              <Utensils className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              {currentMenu?.lunch || 'সাদা ভাত + ডাল'}
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
              {currentMenu?.dinner || 'সাদা ভাত + তরকারি + ডাল'}
            </p>
          </div>
        </div>
      </div>

      {/* Cooking Schedule Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            আসন্ন রান্নার দায়িত্ব তালিকা (Upcoming Cooking Roster)
          </h3>
          <span className="text-xs text-slate-400">সদস্যদের দায়িত্ব পরিক্রমা</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-4">রাঁধুনির নাম</th>
                <th className="py-3 px-4">মিলের ধরন</th>
                <th className="py-3 px-4">স্ট্যাটাস</th>
                <th className="py-3 px-4">মন্তব্য</th>
                <th className="py-3 px-4 text-center">এসএমএস</th>
                {isAdmin && <th className="py-3 px-4 text-center">অ্যাকশন (এডমিন)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {cookingDuties.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{d.date}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800">{d.memberName}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {d.mealType === 'all_day' ? 'সারাদিন' : d.mealType}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        d.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.status === 'completed' ? 'সম্পন্ন' : 'নির্ধারিত'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{d.notes || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onTriggerCookingSms(d)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-semibold transition-colors cursor-pointer"
                      title="Send SMS"
                    >
                      <Send className="h-3 w-3" />
                      <span>SMS পাঠান</span>
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="py-3 px-4 text-center whitespace-nowrap">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Meal Menu */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              খাবার মেনু হালনাগাদ ({selectedDate})
            </h3>
            <form onSubmit={handleSaveMenuSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  সকালের নাস্তা (Breakfast)
                </label>
                <input
                  type="text"
                  value={breakfastMenu}
                  onChange={e => setBreakfastMenu(e.target.value)}
                  placeholder="উদা: পরোটা + ডিম ভুনা + ডাল"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none"
                />
              </div>

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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
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
                  <option value="all_day">সারাদিন (সকাল + দুপুর + রাত)</option>
                  <option value="breakfast">শুধু সকালের নাস্তা</option>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
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
