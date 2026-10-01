import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  DoorOpen,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  FileText,
  UtensilsCrossed,
  Wallet,
  Receipt,
  AlertCircle,
  Save,
  Check,
} from 'lucide-react';
import { Member, MemberMonthlyStatement, DailyMealEntry } from '../types.js';
import { Language, translations } from '../utils/translations.js';

interface MyProfileViewProps {
  currentMember: Member;
  currentStatement?: MemberMonthlyStatement | null;
  dailyMeals: DailyMealEntry[];
  language: Language;
  onOpenStatementVoucher?: (stmt: MemberMonthlyStatement) => void;
  onUpdateMemberInfo?: (updated: Partial<Member>) => Promise<void>;
  onTabSelect: (tab: string) => void;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({
  currentMember,
  currentStatement,
  dailyMeals,
  language,
  onOpenStatementVoucher,
  onUpdateMemberInfo,
  onTabSelect,
}) => {
  const t = translations[language];
  const [nickname, setNickname] = useState(currentMember.nickname || '');
  const [roomNo, setRoomNo] = useState(currentMember.roomNo || '');
  const [phone, setPhone] = useState(currentMember.phone || '');
  const [email, setEmail] = useState(currentMember.email || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Calculate member's total meal count for this month
  const totalMealsThisMonth = dailyMeals.reduce((acc, dm) => {
    const rec = dm.records[currentMember.id];
    if (rec) {
      return acc + (rec.breakfast || 0) + (rec.lunch || 0) + (rec.dinner || 0);
    }
    return acc;
  }, 0);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateMemberInfo) return;
    try {
      setIsUpdating(true);
      setErrorFeedback(null);
      await onUpdateMemberInfo({
        id: currentMember.id,
        nickname: nickname.trim(),
        roomNo: roomNo.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      });
      setFeedback('প্রোফাইল তথ্য সফলভাবে আপডেট করা হয়েছে!');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setErrorFeedback(err.message || 'আপডেট করতে ব্যর্থ হয়েছে');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass || newPass.length < 4) {
      setErrorFeedback('নতুন পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      return;
    }
    if (newPass !== confirmPass) {
      setErrorFeedback('নতুন পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড মেলেনি।');
      return;
    }

    try {
      setIsUpdating(true);
      setErrorFeedback(null);
      // Attempt backend password change
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentMember.id,
        },
        body: JSON.stringify({
          memberId: currentMember.id,
          currentPassword: currentPass,
          newPassword: newPass,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setTimeout(() => setFeedback(null), 4000);
      } else {
        setErrorFeedback(data.error || 'পাসওয়ার্ড পরিবর্তনে ত্রুটি হয়েছে');
      }
    } catch (err: any) {
      setErrorFeedback('পাসওয়ার্ড পরিবর্তনে ত্রুটি: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-2xl text-white text-2xl font-black flex items-center justify-center shadow-md ${currentMember.avatarColor}`}>
              {currentMember.nickname ? currentMember.nickname.slice(0, 1) : currentMember.name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">{currentMember.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase border border-white/30">
                  {currentMember.role === 'admin' ? 'এডমিন (Admin)' : 'সদস্য (Member)'}
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-1 flex items-center gap-3">
                <span>মোবাইল: {currentMember.phone}</span>
                {currentMember.roomNo && <span>• রুম {currentMember.roomNo}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onTabSelect('my-meals')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <UtensilsCrossed className="h-4 w-4 text-emerald-700" />
              <span>আমার মিল অন/অফ</span>
            </button>
          </div>
        </div>

        {/* Quick Month Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-emerald-700/40 text-xs">
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-emerald-200 text-[11px]">চলতি মাসে মোট মিল</span>
            <div className="text-lg font-bold text-white mt-0.5">
              {currentStatement?.totalMeals ?? totalMealsThisMonth} টি
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-emerald-200 text-[11px]">মোট খরচ (চলতি মাস)</span>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">
              ৳{currentStatement?.totalCost?.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-emerald-200 text-[11px]">মোট জমা প্রদান</span>
            <div className="text-lg font-bold text-white mt-0.5">
              ৳{currentStatement?.totalPaid?.toLocaleString() ?? 0}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 border border-white/10">
            <span className="text-emerald-200 text-[11px]">হিসাব স্ট্যাটাস</span>
            <div className={`text-lg font-black mt-0.5 ${
              (currentStatement?.netBalance || 0) > 0 ? 'text-rose-300' : 'text-emerald-300'
            }`}>
              {(currentStatement?.netBalance || 0) > 0
                ? `বকেয়া: ৳${currentStatement?.netBalance}`
                : `উদ্বৃত্ত: ৳${Math.abs(currentStatement?.netBalance || 0)}`}
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {errorFeedback && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorFeedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Financial Statement Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <Receipt className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">আমার চলতি মাসের মেস হিসাব বিবরণী</h3>
            </div>
            {currentStatement && onOpenStatementVoucher && (
              <button
                onClick={() => onOpenStatementVoucher(currentStatement)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>ভাউচার দেখুন</span>
              </button>
            )}
          </div>

          {currentStatement ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-500 text-[11px]">মিল রেট (Meal Rate):</span>
                  <div className="font-bold text-slate-800">৳{currentStatement.mealRate.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">মিল খরচ:</span>
                  <div className="font-bold text-slate-800">৳{currentStatement.mealCost.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">ফিক্সড শেয়ার (ভাড়া/বিল):</span>
                  <div className="font-bold text-slate-800">৳{currentStatement.sharedCostsShare.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px]">মোট খরচ:</span>
                  <div className="font-black text-slate-900">৳{currentStatement.totalCost.toLocaleString()}</div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-700 font-semibold">আমার পরিশোধিত জমা</span>
                  <div className="text-base font-black text-emerald-900">৳{currentStatement.totalPaid.toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-semibold">নেট স্থিতি</span>
                  <div className={`text-base font-black ${
                    currentStatement.netBalance > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}>
                    {currentStatement.netBalance > 0
                      ? `৳${currentStatement.netBalance} (বকেয়া)`
                      : `৳${Math.abs(currentStatement.netBalance)} (উদ্বৃত্ত)`}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              চলতি মাসের হিসাব বিবরণী এখনও প্রস্তুত হয়নি।
            </div>
          )}
        </div>

        {/* Right: Security & Password Update */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <KeyRound className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">পাসওয়ার্ড পরিবর্তন (Security)</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">বর্তমান পাসওয়ার্ড (Current Password)</label>
              <input
                type="password"
                value={currentPass}
                onChange={e => setCurrentPass(e.target.value)}
                placeholder="বর্তমান পাসওয়ার্ড দিন"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষর"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">কনফার্ম পাসওয়ার্ড</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>পাসওয়ার্ড আপডেট করুন</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
