import React, { useState, useEffect, useMemo } from 'react';
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
  Clock,
  XCircle,
  CreditCard,
  Building,
  Smartphone,
  Banknote,
  Filter,
  Eye,
  EyeOff,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  Member,
  MemberMonthlyStatement,
  DailyMealEntry,
  PaymentRecord,
  MonthlyAccount,
  MemberFinancialProfile,
} from '../types.js';
import { Language, translations } from '../utils/translations.js';
import { useAuth } from '../context/AuthContext.js';
import { getTodayDhakaDate, getCurrentDhakaPeriod, getMonthNameBengali } from '../utils/monthlyPeriodUtils.js';

interface MyProfileViewProps {
  currentMember: Member;
  currentStatement?: MemberMonthlyStatement | null;
  dailyMeals: DailyMealEntry[];
  language: Language;
  payments?: PaymentRecord[];
  monthlyAccounts?: MonthlyAccount[];
  onOpenStatementVoucher?: (stmt: MemberMonthlyStatement) => void;
  onUpdateMemberInfo?: (updated: Partial<Member>) => Promise<void>;
  onTabSelect: (tab: string) => void;
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({
  currentMember,
  currentStatement,
  dailyMeals,
  language,
  payments = [],
  monthlyAccounts = [],
  onOpenStatementVoucher,
  onUpdateMemberInfo,
  onTabSelect,
}) => {
  const t = translations[language];
  const { session, token } = useAuth();

  // Active Dhaka month as default (e.g., "2026-10")
  const currentDhakaMonth = useMemo(() => getCurrentDhakaPeriod().periodId, []);
  const prevDhakaMonth = useMemo(() => {
    const [year, month] = currentDhakaMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const py = prevDate.getFullYear();
    const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
    return `${py}-${pm}`;
  }, [currentDhakaMonth]);

  // Server-fetched Financial Profile state
  const [serverProfile, setServerProfile] = useState<MemberFinancialProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileFetchError, setProfileFetchError] = useState<string | null>(null);

  // Form states for profile update
  const [nickname, setNickname] = useState(currentMember.nickname || '');
  const [roomNo, setRoomNo] = useState(currentMember.roomNo || '');
  const [phone, setPhone] = useState(currentMember.phone || '');
  const [email, setEmail] = useState(currentMember.email || '');

  // Password change form states
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Filter state for "My Payment History"
  // Options: 'current' | 'previous' | 'specific' | 'all'
  const [paymentFilter, setPaymentFilter] = useState<'current' | 'previous' | 'specific' | 'all'>('current');
  const [selectedSpecificMonth, setSelectedSpecificMonth] = useState<string>(currentDhakaMonth);

  // Selected statement month for "My Monthly Statement"
  const [selectedStatementMonth, setSelectedStatementMonth] = useState<string>(currentDhakaMonth);

  // Fetch verified server-side financial profile strictly for the authenticated user
  const fetchMyFinancialProfile = async () => {
    try {
      setIsLoadingProfile(true);
      setProfileFetchError(null);
      const res = await fetch('/api/members/me/financial-profile', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-user-id': currentMember.id,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile) {
          setServerProfile(data.profile);
        }
      } else if (res.status === 403 || res.status === 401) {
        setProfileFetchError('গোপনীয়তা নিশ্চিতকরণ: আপনি শুধুমাত্র নিজের আর্থিক রেকর্ড দেখতে পারবেন।');
      }
    } catch (e: any) {
      // Offline fallback
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchMyFinancialProfile();
  }, [currentMember.id, token]);

  // Compute local fallback amounts from actual records strictly for currentMember
  const memberPaymentsAll = useMemo(() => {
    if (serverProfile?.paymentHistory) {
      return serverProfile.paymentHistory;
    }
    return payments
      .filter(p => p.memberId === currentMember.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [serverProfile, payments, currentMember.id]);

  // Filtered payment history based on active filter
  const filteredPaymentHistory = useMemo(() => {
    return memberPaymentsAll.filter(p => {
      const pMonth = p.periodId || p.date.slice(0, 7);
      if (paymentFilter === 'current') {
        return pMonth === currentDhakaMonth;
      }
      if (paymentFilter === 'previous') {
        return pMonth === prevDhakaMonth;
      }
      if (paymentFilter === 'specific') {
        return pMonth === selectedSpecificMonth;
      }
      return true; // 'all'
    });
  }, [memberPaymentsAll, paymentFilter, currentDhakaMonth, prevDhakaMonth, selectedSpecificMonth]);

  // Available months from payment history for specific selection
  const availablePaymentMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentDhakaMonth);
    set.add(prevDhakaMonth);
    memberPaymentsAll.forEach(p => {
      const m = p.periodId || p.date.slice(0, 7);
      if (m) set.add(m);
    });
    return Array.from(set).sort().reverse();
  }, [currentDhakaMonth, prevDhakaMonth, memberPaymentsAll]);

  // Calculations for current month payment summary (from serverProfile or local actual records)
  const currentMonthPayments = useMemo(() => {
    return memberPaymentsAll.filter(p => (p.periodId || p.date.slice(0, 7)) === currentDhakaMonth);
  }, [memberPaymentsAll, currentDhakaMonth]);

  const depositedThisMonth = serverProfile?.paymentSummary?.depositedThisMonth ??
    currentMonthPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const verifiedPaymentsThisMonth = serverProfile?.paymentSummary?.verifiedPaymentsThisMonth ??
    currentMonthPayments.filter(p => p.status === 'verified').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const pendingPaymentsThisMonth = serverProfile?.paymentSummary?.pendingPaymentsThisMonth ??
    currentMonthPayments.filter(p => p.status === 'pending').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const rejectedPaymentsThisMonth = serverProfile?.paymentSummary?.rejectedPaymentsThisMonth ??
    currentMonthPayments.filter(p => p.status === 'rejected').reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  const totalMealExpensesThisMonth = serverProfile?.paymentSummary?.totalMealExpensesThisMonth ??
    (currentStatement?.mealCost || 0);

  const otherAllocatedExpensesThisMonth = serverProfile?.paymentSummary?.otherAllocatedExpensesThisMonth ??
    ((currentStatement?.sharedCostsShare || 0) + (currentStatement?.individualCosts || 0));

  const previousMonthBalance = serverProfile?.paymentSummary?.previousMonthBalance ?? 0;

  const currentMonthBalance = serverProfile?.paymentSummary?.currentMonthBalance ??
    ((totalMealExpensesThisMonth + otherAllocatedExpensesThisMonth) - verifiedPaymentsThisMonth);

  const totalOutstandingBalance = serverProfile?.paymentSummary?.totalOutstandingBalance ??
    Math.max(0, currentMonthBalance + previousMonthBalance);

  const advanceBalance = serverProfile?.paymentSummary?.advanceBalance ??
    Math.max(0, -(currentMonthBalance + previousMonthBalance));

  // Month-wise statement selection
  const activeStatement = useMemo(() => {
    if (serverProfile?.statements) {
      const found = serverProfile.statements.find(s => s.month === selectedStatementMonth);
      if (found) return found;
    }
    // Fallback to monthlyAccounts
    if (selectedStatementMonth === currentDhakaMonth && currentStatement) {
      return {
        month: currentDhakaMonth,
        monthName: getMonthNameBengali(currentDhakaMonth),
        status: 'open',
        openingBalance: previousMonthBalance,
        totalMeals: currentStatement.totalMeals,
        mealRate: currentStatement.mealRate,
        mealCost: currentStatement.mealCost,
        sharedCostsShare: currentStatement.sharedCostsShare,
        individualCosts: currentStatement.individualCosts || 0,
        totalCost: currentStatement.totalCost,
        totalPaid: currentStatement.totalPaid,
        netBalance: currentStatement.netBalance,
        outstandingAmount: Math.max(0, currentStatement.netBalance),
        advanceAmount: Math.max(0, -currentStatement.netBalance),
        calculationBreakdown: `পূর্ববর্তী ব্যালেন্স (৳${previousMonthBalance.toLocaleString()}) + মিল খরচ (৳${currentStatement.mealCost.toLocaleString()}) + শেয়ার খরচ (৳${currentStatement.sharedCostsShare.toLocaleString()}) - মোট জমা (৳${currentStatement.totalPaid.toLocaleString()}) = ${currentStatement.netBalance > 0 ? 'বকেয়া' : 'উদ্বৃত্ত'} ৳${Math.abs(currentStatement.netBalance).toLocaleString()}`,
      };
    }
    const acc = monthlyAccounts.find(a => a.month === selectedStatementMonth);
    const stmt = acc?.statements?.[currentMember.id];
    if (stmt) {
      return {
        month: acc!.month,
        monthName: getMonthNameBengali(acc!.month),
        status: acc!.status || 'closed',
        openingBalance: 0,
        totalMeals: stmt.totalMeals,
        mealRate: stmt.mealRate,
        mealCost: stmt.mealCost,
        sharedCostsShare: stmt.sharedCostsShare,
        individualCosts: stmt.individualCosts || 0,
        totalCost: stmt.totalCost,
        totalPaid: stmt.totalPaid,
        netBalance: stmt.netBalance,
        outstandingAmount: Math.max(0, stmt.netBalance),
        advanceAmount: Math.max(0, -stmt.netBalance),
        calculationBreakdown: `মিল খরচ (৳${stmt.mealCost.toLocaleString()}) + শেয়ার খরচ (৳${stmt.sharedCostsShare.toLocaleString()}) - মোট জমা (৳${stmt.totalPaid.toLocaleString()}) = ${stmt.netBalance > 0 ? 'বকেয়া' : 'উদ্বৃত্ত'} ৳${Math.abs(stmt.netBalance).toLocaleString()}`,
      };
    }
    return null;
  }, [serverProfile, selectedStatementMonth, currentDhakaMonth, currentStatement, previousMonthBalance, monthlyAccounts, currentMember.id]);

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
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    <div className="space-y-6 animate-in fade-in">
      {/* SECTION A: Personal Information & Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Member Identity & Avatar */}
          <div className="flex items-center gap-4">
            <div
              className={`h-20 w-20 rounded-2xl text-white text-3xl font-black flex items-center justify-center shadow-lg border-2 border-white/20 ${
                serverProfile?.personalInfo?.avatarColor || currentMember.avatarColor || 'bg-emerald-600'
              }`}
            >
              {currentMember.nickname
                ? currentMember.nickname.slice(0, 1).toUpperCase()
                : currentMember.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{currentMember.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 uppercase border border-emerald-400/30">
                  {currentMember.role === 'admin' ? 'এডমিন (Admin)' : 'সদস্য (Member)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase border border-white/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  <span>{currentMember.status === 'active' ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}</span>
                </span>
              </div>

              {/* Detailed Personal Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-emerald-200">
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>মোবাইল: <strong className="font-mono text-white">{currentMember.phone}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>মেম্বার আইডি: <strong className="font-mono text-white">{currentMember.id}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>রুম নম্বর: <strong className="text-white">{currentMember.roomNo || 'নির্ধারিত নয়'}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>যোগদানের তারিখ: <strong className="text-white">{currentMember.joiningDate || '2026-01-01'}</strong></span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onTabSelect('my-meals')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer"
            >
              <UtensilsCrossed className="h-4 w-4 text-emerald-300" />
              <span>আমার মিল অন/অফ</span>
            </button>
            <button
              onClick={() => onTabSelect('payments')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Wallet className="h-4 w-4" />
              <span>টাকা জমা দিন</span>
            </button>
          </div>
        </div>

        {/* Refresh Sync Indicator */}
        <div className="mt-4 pt-3 border-t border-emerald-700/40 flex items-center justify-between text-[11px] text-emerald-300">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>সার্ভার-সাইড ভেরিফাইড ব্যক্তিগত আর্থিক হিসাব বিবরণী (Strict Member Privacy Protected)</span>
          </div>
          <button
            onClick={fetchMyFinancialProfile}
            disabled={isLoadingProfile}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            title="সার্ভার থেকে হিসাব রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingProfile ? 'animate-spin' : ''}`} />
            <span>হিসাব রিফ্রেশ</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
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

      {profileFetchError && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Info className="h-4 w-4 text-amber-600 shrink-0" />
          <span>{profileFetchError}</span>
        </div>
      )}

      {/* SECTION B: My Payment Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                আমার পেমেন্ট সারাংশ (My Payment Summary)
              </h2>
              <p className="text-xs text-slate-500">
                হিসাব মাস: <strong className="text-slate-800">{getMonthNameBengali(currentDhakaMonth)} ({currentDhakaMonth})</strong> • প্রকৃত ডাটাবেজ রেকর্ড থেকে হিসাবকৃত
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              টাইমজোন: Asia/Dhaka
            </span>
          </div>
        </div>

        {/* 10 Value Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* 1. Total Deposited This Month */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="text-[11px] text-slate-500 font-medium">চলতি মাসে জমাকৃত</div>
            <div className="text-lg font-black text-slate-900 mt-1">
              ৳{depositedThisMonth.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">সব জমা আবেদন</div>
          </div>

          {/* 2. Total Verified Payments */}
          <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-200/80">
            <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>অনুমোদিত/ভেরিফাইড</span>
            </div>
            <div className="text-lg font-black text-emerald-700 mt-1">
              ৳{verifiedPaymentsThisMonth.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 mt-0.5">মেসে কার্যকর জমা</div>
          </div>

          {/* 3. Pending Payments */}
          <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/80">
            <div className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>পেন্ডিং জমা</span>
            </div>
            <div className="text-lg font-black text-amber-700 mt-1">
              ৳{pendingPaymentsThisMonth.toLocaleString()}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5">এডমিন অনুমোদনের অপেক্ষায়</div>
          </div>

          {/* 4. Rejected Payments */}
          <div className="bg-rose-50/60 rounded-xl p-3.5 border border-rose-200/80">
            <div className="text-[11px] text-rose-800 font-semibold flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-600" />
              <span>বাতিলকৃত জমা</span>
            </div>
            <div className="text-lg font-black text-rose-700 mt-1">
              ৳{rejectedPaymentsThisMonth.toLocaleString()}
            </div>
            <div className="text-[10px] text-rose-600 mt-0.5">প্রত্যাখ্যাত আবেদন</div>
          </div>

          {/* 5. Total Meal Expenses */}
          <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-200/80">
            <div className="text-[11px] text-blue-800 font-semibold">চলতি মাসের মিল খরচ</div>
            <div className="text-lg font-black text-blue-700 mt-1">
              ৳{totalMealExpensesThisMonth.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-600 mt-0.5">
              মিল রেট: ৳{currentStatement?.mealRate ? currentStatement.mealRate.toFixed(1) : '০.০'}
            </div>
          </div>

          {/* 6. Other Allocated Expenses */}
          <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-200/80">
            <div className="text-[11px] text-indigo-800 font-semibold">অন্যান্য শেয়ার খরচ</div>
            <div className="text-lg font-black text-indigo-700 mt-1">
              ৳{otherAllocatedExpensesThisMonth.toLocaleString()}
            </div>
            <div className="text-[10px] text-indigo-600 mt-0.5">ভাড়া, গ্যাস, খালা বিল ইত্যাদি</div>
          </div>

          {/* 7. Previous Month Outstanding */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="text-[11px] text-slate-500 font-medium">পূর্ববর্তী মাসের বকেয়া</div>
            <div className={`text-lg font-black mt-1 ${previousMonthBalance > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              ৳{previousMonthBalance.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">পূর্বের মাস থেকে ক্যারিফরওয়ার্ড</div>
          </div>

          {/* 8. Current Month Outstanding */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="text-[11px] text-slate-500 font-medium">চলতি মাসের বকেয়া</div>
            <div className={`text-lg font-black mt-1 ${currentMonthBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              ৳{Math.max(0, currentMonthBalance).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">চলতি খরচ - ভেরিফাইড জমা</div>
          </div>

          {/* 9. Total Outstanding Balance */}
          <div className="bg-rose-50 rounded-xl p-3.5 border-2 border-rose-300">
            <div className="text-[11px] text-rose-800 font-bold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              <span>সর্বমোট বকেয়া (Due)</span>
            </div>
            <div className="text-xl font-black text-rose-700 mt-1">
              ৳{totalOutstandingBalance.toLocaleString()}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              {totalOutstandingBalance > 0 ? 'মেসে পরিশোধযোগ্য বকেয়া' : 'কোন বকেয়া নেই'}
            </div>
          </div>

          {/* 10. Advance or Extra Balance */}
          <div className="bg-emerald-50 rounded-xl p-3.5 border-2 border-emerald-300">
            <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>অগ্রিম / অতিরিক্ত ব্যালেন্স</span>
            </div>
            <div className="text-xl font-black text-emerald-700 mt-1">
              ৳{advanceBalance.toLocaleString()}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
              {advanceBalance > 0 ? 'আপনার পক্ষে উদ্বৃত্ত জমা' : 'অগ্রিম জমা নেই'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C: My Payment History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                আমার জমার ইতিহাস (My Payment History)
              </h2>
              <p className="text-xs text-slate-500">
                শুধুমাত্র আপনার ব্যক্তিগত পেমেন্ট ও জমা রেকর্ড প্রদর্শিত হচ্ছে (Private Records)
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => setPaymentFilter('current')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                paymentFilter === 'current'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              চলতি মাস ({getMonthNameBengali(currentDhakaMonth)})
            </button>
            <button
              onClick={() => setPaymentFilter('previous')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                paymentFilter === 'previous'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              পূর্ববর্তী মাস ({getMonthNameBengali(prevDhakaMonth)})
            </button>
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                paymentFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              সকল ইতিহাস
            </button>

            {/* Select Specific Month dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={paymentFilter === 'specific' ? selectedSpecificMonth : ''}
                onChange={e => {
                  setSelectedSpecificMonth(e.target.value);
                  setPaymentFilter('specific');
                }}
                className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer font-bold ${
                  paymentFilter === 'specific'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <option value="" disabled>
                  নির্দিষ্ট মাস নির্বাচন...
                </option>
                {availablePaymentMonths.map(m => (
                  <option key={m} value={m} className="text-slate-900 bg-white">
                    {getMonthNameBengali(m)} ({m})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table / List */}
        {filteredPaymentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-2.5 px-3">তারিখ (Date)</th>
                  <th className="py-2.5 px-3">পরিমাণ (Amount)</th>
                  <th className="py-2.5 px-3">পেমেন্ট মাধ্যম (Method)</th>
                  <th className="py-2.5 px-3">ট্রানজেকশন আইডি / রেফারেন্স</th>
                  <th className="py-2.5 px-3">হিসাব মাস</th>
                  <th className="py-2.5 px-3">স্ট্যাটাস (Status)</th>
                  <th className="py-2.5 px-3">অনুমোদন / বাতিল সংক্রান্ত তথ্য</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPaymentHistory.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-slate-700">{p.date}</td>
                    <td className="py-3 px-3 font-black text-slate-900 text-sm">৳{p.amount.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                        {(p.paymentMethod === 'bKash' || p.paymentMethod === 'Nagad') && <Smartphone className="w-3 h-3 text-pink-600" />}
                        {(p.paymentMethod === 'cash' || (p.paymentMethod as string) === 'Cash') && <Banknote className="w-3 h-3 text-emerald-600" />}
                        {(p.paymentMethod === 'bank' || (p.paymentMethod as string) === 'Bank') && <Building className="w-3 h-3 text-blue-600" />}
                        <span>{p.paymentMethod}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {p.transactionRef || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {getMonthNameBengali(p.periodId || p.date.slice(0, 7))}
                    </td>
                    <td className="py-3 px-3">
                      {p.status === 'verified' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>অনুমোদিত (Verified)</span>
                        </span>
                      )}
                      {p.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>পেন্ডিং (Pending)</span>
                        </span>
                      )}
                      {p.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>বাতিলকৃত (Rejected)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-500">
                      {p.status === 'verified' && (
                        <div>
                          <span>অনুমোদনকারী: <strong className="text-slate-700">{p.verifiedBy || p.receivedBy || 'মেস এডমিন'}</strong></span>
                          {p.verifiedAt && <div className="text-[10px] text-slate-400 font-mono">{p.verifiedAt.slice(0, 10)}</div>}
                        </div>
                      )}
                      {p.status === 'rejected' && (
                        <div className="text-rose-600">
                          <span>বাতিলের কারণ: <strong>{p.rejectionReason || 'তথ্য অমিল'}</strong></span>
                        </div>
                      )}
                      {p.status === 'pending' && (
                        <span className="text-amber-700">প্রধান এডমিন যাচাই করছেন</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            নির্বাচিত ফিল্টারে আপনার কোনো জমার রেকর্ড নেই।
          </div>
        )}
      </div>

      {/* SECTION D: My Monthly Statement */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                আমার মাসিক মেস হিসাব বিবরণী (My Monthly Statement)
              </h2>
              <p className="text-xs text-slate-500">
                মাস অনুযায়ী বিশদ হিসাব, মিল খরচ, শেয়ার খরচ ও সমাপনী ব্যালেন্স
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Statement Month Picker */}
            <select
              value={selectedStatementMonth}
              onChange={e => setSelectedStatementMonth(e.target.value)}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-slate-900"
            >
              {availablePaymentMonths.map(m => (
                <option key={m} value={m}>
                  {getMonthNameBengali(m)} ({m})
                </option>
              ))}
            </select>

            {activeStatement && onOpenStatementVoucher && (
              <button
                onClick={() =>
                  onOpenStatementVoucher({
                    memberId: currentMember.id,
                    memberName: currentMember.name,
                    totalMeals: activeStatement.totalMeals,
                    mealRate: activeStatement.mealRate,
                    mealCost: activeStatement.mealCost,
                    sharedCostsShare: activeStatement.sharedCostsShare,
                    individualCosts: activeStatement.individualCosts,
                    totalCost: activeStatement.totalCost,
                    totalPaid: activeStatement.totalPaid,
                    netBalance: activeStatement.netBalance,
                    breakdown: {
                      rentShare: 0,
                      gasShare: 0,
                      electricityShare: 0,
                      maidSalaryShare: 0,
                      internetShare: 0,
                      cleaningShare: 0,
                      otherShared: activeStatement.sharedCostsShare,
                    },
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <Receipt className="h-3.5 w-3.5" />
                <span>ভাউচার ভিউ ও প্রিন্ট</span>
              </button>
            )}
          </div>
        </div>

        {activeStatement ? (
          <div className="space-y-4">
            {/* Statement Line-Item Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[11px]">প্রারম্ভিক বকেয়া / স্থিতি</span>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  ৳{activeStatement.openingBalance.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[11px]">মোট মিল ও মিল রেট</span>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {activeStatement.totalMeals} টি মিল (রেট: ৳{activeStatement.mealRate.toFixed(2)})
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[11px]">মিল বাবদ মোট খরচ</span>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  ৳{activeStatement.mealCost.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[11px]">শেয়ার খরচ (ভাড়া/বিল/খালা)</span>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  ৳{activeStatement.sharedCostsShare.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[11px]">অন্যান্য চার্জ / সমন্বয়</span>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  ৳{(activeStatement.individualCosts || 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 text-[11px]">মাসের সর্বমোট খরচ</span>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  ৳{activeStatement.totalCost.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 text-[11px] font-semibold">অনুমোদিত পরিশোধিত জমা</span>
                <div className="text-base font-black text-emerald-800 mt-0.5">
                  ৳{activeStatement.totalPaid.toLocaleString()}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  activeStatement.netBalance > 0
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-emerald-50 border-emerald-300'
                }`}
              >
                <span
                  className={`text-[11px] font-bold ${
                    activeStatement.netBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  সমাপনী ব্যালেন্স (Closing Balance)
                </span>
                <div
                  className={`text-base font-black mt-0.5 ${
                    activeStatement.netBalance > 0 ? 'text-rose-700' : 'text-emerald-800'
                  }`}
                >
                  {activeStatement.netBalance > 0
                    ? `বকেয়া: ৳${activeStatement.netBalance.toLocaleString()}`
                    : `উদ্বৃত্ত: ৳${Math.abs(activeStatement.netBalance).toLocaleString()}`}
                </div>
              </div>
            </div>

            {/* Calculation Formula Breakdown Explanation */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900">হিসাব গণনার সূত্র (Calculation Breakdown):</span>
                <p className="mt-0.5 text-slate-600 leading-relaxed font-mono">
                  {activeStatement.calculationBreakdown}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  * পূর্ববর্তী মাসের ক্লোজড স্টেটমেন্ট অপরিবর্তিত রাখা হয়েছে। সকল তথ্য ডাটাবেজের প্রকৃত হিসাবভুক্ত রেকর্ড থেকে যাচাইকৃত।
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            এই মাসের হিসাব বিবরণী এখনও তৈরি হয়নি।
          </div>
        )}
      </div>

      {/* SECTION E: Settings, Security & Password Change */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-700">
              <User className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">ব্যক্তিগত প্রোফাইল ও যোগাযোগ তথ্য</h3>
          </div>

          <form onSubmit={handleSaveContact} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">ডাকনাম (Nickname)</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="যেমন: তানভীর"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">রুম নম্বর</label>
              <input
                type="text"
                value={roomNo}
                onChange={e => setRoomNo(e.target.value)}
                placeholder="যেমন: 302"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">রেজিস্টার্ড ফোন নম্বর</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">ইমেইল (ঐচ্ছিক)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? 'আপডেট হচ্ছে...' : 'তথ্য সংরক্ষণ করুন'}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <KeyRound className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">পাসওয়ার্ড পরিবর্তন (Security & Privacy)</h3>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">বর্তমান পাসওয়ার্ড (Current Password)</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPass}
                  onChange={e => setCurrentPass(e.target.value)}
                  placeholder="বর্তমান গোপন পাসওয়ার্ড দিন"
                  className="w-full pl-3.5 pr-10 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">নতুন পাসওয়ার্ড (New Password)</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                  className="w-full pl-3.5 pr-10 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">কনফার্ম পাসওয়ার্ড (Confirm Password)</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                  className="w-full pl-3.5 pr-10 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>{isUpdating ? 'আপডেট হচ্ছে...' : 'পাসওয়ার্ড আপডেট করুন'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
