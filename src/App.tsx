import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { BottomNav } from './components/BottomNav.js';
import { DashboardView } from './components/DashboardView.js';
import { MealsView } from './components/MealsView.js';
import { MyMealsView } from './components/MyMealsView.js';
import { CookingMenuView } from './components/CookingMenuView.js';
import { BazarView } from './components/BazarView.js';
import { ExpensesView } from './components/ExpensesView.js';
import { PaymentsView } from './components/PaymentsView.js';
import { MonthlyCalculationView } from './components/MonthlyCalculationView.js';
import { MembersView } from './components/MembersView.js';
import { ReportsView } from './components/ReportsView.js';
import { SmsAndSettingsView } from './components/SmsAndSettingsView.js';
import { AiAssistantModal } from './components/AiAssistantModal.js';
import { StatementVoucherModal } from './components/StatementVoucherModal.js';
import { SendSmsModal } from './components/SendSmsModal.js';
import { AdminLoginModal } from './components/AdminLoginModal.js';
import { AdminProfileModal } from './components/AdminProfileModal.js';
import { AdminDataManagementModal } from './components/AdminDataManagementModal.js';
import { useAuth } from './context/AuthContext.js';
import {
  MessDatabaseState,
  Member,
  MemberMonthlyStatement,
  MealRecord,
  MealMenu,
  CookingDuty,
  BazarDuty,
  BazarRecord,
  MarketItem,
  ExpenseRecord,
  PaymentRecord,
  MessSettings,
  SmsType,
  MealType,
  MealStatus,
  MealCutoffSettings,
} from './types.js';
import { Language } from './utils/translations.js';

interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export function App() {
  const [dbState, setDbState] = useState<MessDatabaseState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<Language>('bn');

  // Active logged-in user simulation (defaults to Rahim Uddin - Manager/Admin)
  const [currentMemberId, setCurrentMemberId] = useState<string>('m1');

  // Auth context
  const { session, isAdmin, adminProfile } = useAuth();
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showAdminProfileModal, setShowAdminProfileModal] = useState(false);
  const [showDataManagementModal, setShowDataManagementModal] = useState(false);

  // Synchronize currentMemberId with session if logged in
  useEffect(() => {
    if (session?.userId) {
      setCurrentMemberId(session.userId);
    }
  }, [session]);

  const getAuthHeaders = (extraHeaders: Record<string, string> = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': currentMemberId,
      ...extraHeaders,
    };
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
    return headers;
  };

  const getDeleteHeaders = () => {
    const headers: Record<string, string> = {
      'x-user-id': currentMemberId,
    };
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
    return headers;
  };

  // Global feedback toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    title?: string
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(prev => [...prev, { id, message, type, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Modals state
  const [showAiModal, setShowAiModal] = useState(false);
  const [statementVoucher, setStatementVoucher] = useState<MemberMonthlyStatement | null>(null);
  const [smsModalState, setSmsModalState] = useState<{
    isOpen: boolean;
    recipientId?: string;
    type?: SmsType;
    message?: string;
  }>({ isOpen: false });

  // Fetch mess data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/mess-data', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDbState(data.data);
      } else {
        showToast(data.error || 'ডেটা লোড করতে ব্যর্থ হয়েছে', 'error');
      }
    } catch (err) {
      console.error('Failed to load mess data:', err);
      showToast('সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading || !dbState) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="h-12 w-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-slate-800">শান্তিনগর মেস ডেটা লোড হচ্ছে...</h2>
        <p className="text-xs text-slate-500 mt-1">দয়া করে অপেক্ষা করুন (Loading Mess Manager)</p>
      </div>
    );
  }

  const currentMember =
    dbState.members.find(m => m.id === currentMemberId) || dbState.members[0];

  const currentMonthCalc =
    dbState.currentMonthCalculation ||
    dbState.monthlyAccounts.find(m => m.month === '2026-09') ||
    dbState.monthlyAccounts[0];

  const isMonthClosed = currentMonthCalc?.status === 'closed';

  const actingUserLabel = `${currentMember.name} (${currentMember.role === 'admin' ? 'Admin' : currentMember.role === 'treasurer' ? 'Treasurer' : 'Member'})`;

  // Standard response processor for API calls
  const handleApiResponse = async (res: Response, successMsg?: string) => {
    try {
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'অনুরোধটি সম্পন্ন করা যায়নি';
        if (res.status === 403) {
          showToast(errMsg, 'warning', 'অনুমতি অস্বীকৃত (403 Forbidden)');
        } else if (res.status === 400) {
          showToast(errMsg, 'error', 'ভুল তথ্য বা বিধিনিষেধ (400 Bad Request)');
        } else {
          showToast(errMsg, 'error', 'সার্ভার ত্রুটি');
        }
        return false;
      }
      if (successMsg) {
        showToast(data.message || successMsg, 'success');
      }
      await fetchData();
      return true;
    } catch (err: any) {
      showToast('সার্ভার রেসপন্স প্রক্রিয়াকরণে ত্রুটি হয়েছে', 'error');
      return false;
    }
  };

  // --- API Handlers ---

  // Meals
  const handleSaveDailyMeals = async (
    date: string,
    records: Record<string, MealRecord>,
    notes?: string
  ) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/meals/batch', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, records, notes, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, `${date} তারিখের মিল সফলভাবে সংরক্ষিত হয়েছে`);
    } catch (err) {
      showToast('মিল সংরক্ষণে নেটওয়ার্ক ত্রুটি', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDailyMeal = async (date: string) => {
    try {
      const res = await fetch(`/api/meals/${date}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
        method: 'DELETE',
        headers: getDeleteHeaders(),
      });
      await handleApiResponse(res, `${date} তারিখের মিল রেকর্ড মুছে ফেলা হয়েছে`);
    } catch (err) {
      showToast('মিল মুছতে নেটওয়ার্ক ত্রুটি', 'error');
    }
  };

  // Member Meal ON/OFF Toggle
  const handleToggleMemberMeal = async (
    memberId: string,
    date: string,
    mealType: MealType,
    status: MealStatus,
    isOverride?: boolean,
    reason?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/meals/toggle-status', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          memberId,
          date,
          mealType,
          status,
          isOverride,
          reason,
          actingUser: actingUserLabel,
        }),
      });
      const mealNameBn = mealType === 'breakfast' ? 'সকালের নাস্তা' : mealType === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';
      const statusBn = status === 'ON' ? 'চালু (ON)' : 'বন্ধ (OFF)';
      return await handleApiResponse(res, `${date}: ${mealNameBn} ${statusBn} করা হয়েছে`);
    } catch (err) {
      showToast('মিল স্ট্যাটাস হালনাগাদে নেটওয়ার্ক ত্রুটি', 'error');
      return false;
    }
  };

  // Weekly / Batch Plan
  const handleBatchSavePlan = async (
    memberId: string,
    plans: Array<{ date: string; breakfast?: MealStatus; lunch?: MealStatus; dinner?: MealStatus }>
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/meals/batch-member-plan', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          memberId,
          plans,
          actingUser: actingUserLabel,
        }),
      });
      return await handleApiResponse(res, 'সাপ্তাহিক মিল পরিকল্পনা সফলভাবে সংরক্ষিত হয়েছে');
    } catch (err) {
      showToast('সাপ্তাহিক পরিকল্পনা সংরক্ষণে নেটওয়ার্ক ত্রুটি', 'error');
      return false;
    }
  };

  // Save Cutoff Settings
  const handleSaveCutoffSettings = async (settings: MealCutoffSettings): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings/meal-cutoff', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          mealCutoffSettings: settings,
          actingUser: actingUserLabel,
        }),
      });
      return await handleApiResponse(res, 'মিল কাট-অফ সময় ও নিয়মাবলি সফলভাবে হালনাগাদ হয়েছে');
    } catch (err) {
      showToast('কাট-অফ সংরক্ষণে সমস্যা হয়েছে', 'error');
      return false;
    }
  };

  // Send Cutoff Reminders
  const handleSendCutoffReminders = async (date: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/meals/send-cutoff-reminders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date,
          actingUser: actingUserLabel,
        }),
      });
      return await handleApiResponse(res, `${date} তারিখের মিল রিমাইন্ডার সফলভাবে পাঠানো হয়েছে`);
    } catch (err) {
      showToast('রিমাইন্ডার পাঠাতে সমস্যা হয়েছে', 'error');
      return false;
    }
  };

  // Menu
  const handleSaveMenu = async (menu: Partial<MealMenu>) => {
    try {
      const res = await fetch('/api/menus', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ menu, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, 'খাবার মেনু সফলভাবে হালনাগাদ হয়েছে');
    } catch (err) {
      showToast('মেনু সংরক্ষণে সমস্যা হয়েছে', 'error');
    }
  };

  // Cooking Duties
  const handleSaveDuty = async (duty: Partial<CookingDuty>) => {
    try {
      const res = await fetch('/api/cooking-duty', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ duty, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, 'রান্নার দায়িত্ব সফলভাবে সংরক্ষিত হয়েছে');
    } catch (err) {
      showToast('রান্নার দায়িত্ব সংরক্ষণে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDeleteCookingDuty = async (id: string) => {
    try {
      const res = await fetch(`/api/cooking-duty/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
        method: 'DELETE',
        headers: getDeleteHeaders(),
      });
      await handleApiResponse(res, 'রান্নার দায়িত্ব শিডিউল মুছে ফেলা হয়েছে');
    } catch (err) {
      showToast('রান্নার দায়িত্ব মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  // Bazar Records
  const handleSaveBazarRecord = async (bazar: Partial<BazarRecord>) => {
    try {
      const res = await fetch('/api/bazar', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ bazar, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, 'বাজার খরচ সফলভাবে সংরক্ষিত হয়েছে');
    } catch (err) {
      showToast('বাজার খরচ সংরক্ষণে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDeleteBazarRecord = async (id: string) => {
    try {
      const res = await fetch(`/api/bazar/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
        method: 'DELETE',
        headers: getDeleteHeaders(),
      });
      await handleApiResponse(res, 'বাজার রেকর্ড মুছে ফেলা হয়েছে');
    } catch (err) {
      showToast('বাজার রেকর্ড মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  // Bazar Duty
  const handleSaveBazarDuty = async (duty: Partial<BazarDuty>) => {
    try {
      const res = await fetch('/api/bazar-duty', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ duty, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, 'বাজার দায়িত্ব নির্ধারিত হয়েছে');
    } catch (err) {
      showToast('বাজার দায়িত্ব সংরক্ষণে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDeleteBazarDuty = async (id: string) => {
    try {
      const res = await fetch(`/api/bazar-duty/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
        method: 'DELETE',
        headers: getDeleteHeaders(),
      });
      await handleApiResponse(res, 'বাজার দায়িত্ব শিডিউল মুছে ফেলা হয়েছে');
    } catch (err) {
      showToast('বাজার দায়িত্ব মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  // Market Items
  const handleSaveMarketItem = async (item: Partial<MarketItem>) => {
    try {
      const res = await fetch('/api/market-list', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ item, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, 'বাজার তালিকার আইটেম সংরক্ষিত হয়েছে');
    } catch (err) {
      showToast('বাজার তালিকা সংরক্ষণে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDeleteMarketItem = async (id: string) => {
    try {
      const res = await fetch(`/api/market-list/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
        method: 'DELETE',
        headers: getDeleteHeaders(),
      });
      await handleApiResponse(res, 'আইটেম মুছে ফেলা হয়েছে');
    } catch (err) {
      showToast('আইটেম মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  // General Expenses
  const handleSaveExpense = async (expense: Partial<ExpenseRecord>) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ expense, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, 'খরচের হিসাব সংরক্ষিত হয়েছে');
    } catch (err) {
      showToast('খরচ সংরক্ষণে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
        method: 'DELETE',
        headers: getDeleteHeaders(),
      });
      await handleApiResponse(res, 'খরচের রেকর্ড মুছে ফেলা হয়েছে');
    } catch (err) {
      showToast('খরচ মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  // Payments / Deposits
  const handleSavePayment = async (payment: Partial<PaymentRecord>) => {
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ payment, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, 'জমা রেকর্ড সফলভাবে সংরক্ষিত হয়েছে');
    } catch (err) {
      showToast('জমা সংরক্ষণে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      const res = await fetch(`/api/payments/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
        method: 'DELETE',
        headers: getDeleteHeaders(),
      });
      await handleApiResponse(res, 'জমার রেকর্ড মুছে ফেলা হয়েছে');
    } catch (err) {
      showToast('জমা রেকর্ড মুছতে সমস্যা হয়েছে', 'error');
    }
  };

  // Monthly Close, Reopen, Recalculate
  const handleCloseMonth = async (month: string, sendSms: boolean) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/month/close', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          month,
          actingUser: actingUserLabel,
          sendMonthEndSms: sendSms,
        }),
      });
      await handleApiResponse(res, `${month} মাসের হিসাব চূড়ান্ত ও বন্ধ (Locked) করা হয়েছে`);
    } catch (err) {
      showToast('মাস বন্ধ করতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopenMonth = async (month: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/month/reopen', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ month, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, `${month} মাসের হিসাব সফলভাবে পুনঃউন্মুক্ত (Reopened) করা হয়েছে`);
    } catch (err) {
      showToast('মাস পুনঃউন্মুক্ত করতে সমস্যা হয়েছে', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecalculateMonth = async (month: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/month/recalculate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ month, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, `${month} মাসের হিসাব ও মিল রেট পুনর্গণনা সম্পন্ন হয়েছে`);
    } catch (err) {
      showToast('পুনর্গণনায় সমস্যা হয়েছে', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Members
  const handleSaveMember = async (member: Partial<Member>) => {
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ member, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, 'সদস্যের তথ্য সফলভাবে সংরক্ষিত হয়েছে');
    } catch (err) {
      showToast('সদস্য সংরক্ষণে সমস্যা হয়েছে', 'error');
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      const res = await fetch(`/api/members/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
        method: 'DELETE',
        headers: getDeleteHeaders(),
      });
      await handleApiResponse(res, 'সদস্য মেস তালিকা থেকে সফলভাবে অপসারিত হয়েছে');
    } catch (err) {
      showToast('সদস্য অপসারণে সমস্যা হয়েছে', 'error');
    }
  };

  // Settings
  const handleSaveSettings = async (settings: MessSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ settings, actingUser: actingUserLabel }),
      });
      await handleApiResponse(res, 'মেস সেটিংস ও ক্যাশিয়ার অনুমতি হালনাগাদ করা হয়েছে');
    } catch (err) {
      showToast('সেটিংস সংরক্ষণে সমস্যা হয়েছে', 'error');
    }
  };

  // SMS
  const handleSendSms = async (
    recipientId: string,
    phone: string,
    message: string,
    type: SmsType = 'custom'
  ) => {
    try {
      const recipient = dbState.members.find(m => m.id === recipientId);
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recipientId,
          recipientName: recipient?.name || 'Member',
          phone,
          type,
          message,
          actingUser: actingUserLabel,
        }),
      });
      await handleApiResponse(res, `${phone} নম্বরে এসএমএস সফলভাবে পাঠানো হয়েছে`);
    } catch (err) {
      showToast('এসএমএস পাঠাতে সমস্যা হয়েছে', 'error');
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে ডেমো ডেটা রিসেট করতে চান?')) return;
    try {
      const res = await fetch('/api/reset-demo', { method: 'POST' });
      await handleApiResponse(res, 'ডেমো ডেটা সফলভাবে রিসেট করা হয়েছে');
    } catch (err) {
      showToast('ডেমো ডেটা রিসেট করতে সমস্যা হয়েছে', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased selection:bg-emerald-500 selection:text-white pb-16 lg:pb-0 relative">
      {/* Global Feedback Floating Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 ${
              toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-900'
                : toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
                : 'bg-indigo-50/95 border-indigo-200 text-indigo-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600" />}
              {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {toast.type === 'info' && <Info className="h-5 w-5 text-indigo-600" />}
            </div>
            <div className="flex-1 text-xs">
              {toast.title && <h4 className="font-bold mb-0.5">{toast.title}</h4>}
              <p className="leading-relaxed font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Top Navigation Bar */}
      <Navbar
        messName={dbState.settings.messName}
        messAddress={dbState.settings.messAddress}
        language={language}
        onToggleLanguage={() => setLanguage(l => (l === 'bn' ? 'en' : 'bn'))}
        members={dbState.members}
        currentMember={currentMember}
        onChangeCurrentMember={setCurrentMemberId}
        notifications={dbState.notifications}
        onOpenAi={() => setShowAiModal(true)}
        onRefresh={fetchData}
        isLoading={isLoading}
        onTabSelect={setActiveTab}
        onOpenAdminLogin={() => setShowAdminLoginModal(true)}
        onOpenAdminProfile={() => setShowAdminProfileModal(true)}
        onOpenDataManagement={() => setShowDataManagementModal(true)}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          language={language}
          userRole={currentMember.role}
          onOpenAdminLogin={() => setShowAdminLoginModal(true)}
          onOpenAdminProfile={() => setShowAdminProfileModal(true)}
        />

        {/* Dynamic Main View Area */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              members={dbState.members}
              dailyMeals={dbState.dailyMeals}
              mealMenus={dbState.mealMenus}
              cookingDuties={dbState.cookingDuties}
              bazarDuties={dbState.bazarDuties}
              bazarRecords={dbState.bazarRecords}
              expenses={dbState.expenses}
              payments={dbState.payments}
              currentMonthCalc={currentMonthCalc}
              currentMember={currentMember}
              language={language}
              onOpenQuickMeal={() => setActiveTab('meals')}
              onOpenQuickBazar={() => setActiveTab('bazar')}
              onOpenQuickExpense={() => setActiveTab('expenses')}
              onOpenQuickPayment={() => setActiveTab('payments')}
              onOpenSendSms={() => setSmsModalState({ isOpen: true, type: 'custom' })}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'my-meals' && (
            <MyMealsView
              currentMember={currentMember}
              members={dbState.members}
              mealSelections={dbState.memberMealSelections || []}
              dailyMeals={dbState.dailyMeals}
              mealMenus={dbState.mealMenus}
              changeLogs={dbState.mealChangeLogs || []}
              cutoffSettings={
                dbState.settings.mealCutoffSettings || {
                  breakfastCutoff: '06:00',
                  lunchCutoff: '10:00',
                  dinnerCutoff: '16:00',
                  timezone: 'Asia/Dhaka',
                  enableReminders: true,
                  enableSmsNotification: false,
                  sendSmsOnStatusChange: true,
                }
              }
              language={language}
              onToggleMeal={handleToggleMemberMeal}
              onBatchSavePlan={handleBatchSavePlan}
            />
          )}

          {activeTab === 'meals' && (
            <MealsView
              members={dbState.members}
              dailyMeals={dbState.dailyMeals}
              currentMember={currentMember}
              language={language}
              isMonthClosed={isMonthClosed}
              memberMealSelections={dbState.memberMealSelections}
              cutoffSettings={dbState.settings.mealCutoffSettings}
              onSaveDailyMeals={handleSaveDailyMeals}
              onDeleteMealRecord={handleDeleteDailyMeal}
              onSaveCutoffSettings={handleSaveCutoffSettings}
              onSendCutoffReminders={handleSendCutoffReminders}
              isSaving={isProcessing}
            />
          )}

          {activeTab === 'cooking' && (
            <CookingMenuView
              members={dbState.members}
              mealMenus={dbState.mealMenus}
              cookingDuties={dbState.cookingDuties}
              currentMember={currentMember}
              language={language}
              onSaveMenu={handleSaveMenu}
              onSaveDuty={handleSaveDuty}
              onDeleteDuty={handleDeleteCookingDuty}
              onTriggerCookingSms={duty =>
                setSmsModalState({
                  isOpen: true,
                  recipientId: duty.memberId,
                  type: 'cooking_reminder',
                  message: `আসসালামু আলাইকুম ${duty.memberName}। আজ শান্তিনগর মেসে আপনার রান্নার দায়িত্ব। নির্ধারিত সময় অনুযায়ী রান্না প্রস্তুত রাখুন। - Mess Manager`,
                })
              }
            />
          )}

          {activeTab === 'bazar' && (
            <BazarView
              members={dbState.members}
              bazarDuties={dbState.bazarDuties}
              bazarRecords={dbState.bazarRecords}
              marketList={dbState.marketList}
              currentMember={currentMember}
              language={language}
              isMonthClosed={isMonthClosed}
              onSaveBazarRecord={handleSaveBazarRecord}
              onDeleteBazarRecord={handleDeleteBazarRecord}
              onSaveBazarDuty={handleSaveBazarDuty}
              onDeleteBazarDuty={handleDeleteBazarDuty}
              onSaveMarketItem={handleSaveMarketItem}
              onDeleteMarketItem={handleDeleteMarketItem}
              onTriggerBazarSms={duty =>
                setSmsModalState({
                  isOpen: true,
                  recipientId: duty.memberId,
                  type: 'bazar_reminder',
                  message: `আসসালামু আলাইকুম ${duty.memberName}। আজ আপনার বাজার করার দায়িত্ব। বাজেট: ৳${duty.expectedBudget}। অ্যাপে প্রয়োজনীয় পণ্যের তালিকা দেখে নিন। - Mess Manager`,
                })
              }
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              expenses={dbState.expenses}
              currentMember={currentMember}
              language={language}
              isMonthClosed={isMonthClosed}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              payments={dbState.payments}
              members={dbState.members}
              currentMember={currentMember}
              language={language}
              isMonthClosed={isMonthClosed}
              onSavePayment={handleSavePayment}
              onDeletePayment={handleDeletePayment}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyCalculationView
              currentMonthCalc={currentMonthCalc}
              historicalAccounts={dbState.monthlyAccounts}
              members={dbState.members}
              currentMember={currentMember}
              language={language}
              onCloseMonth={handleCloseMonth}
              onReopenMonth={handleReopenMonth}
              onRecalculateMonth={handleRecalculateMonth}
              onOpenStatementVoucher={stmt => setStatementVoucher(stmt)}
              onTriggerMemberSms={stmt => {
                const balanceText =
                  stmt.netBalance > 0 ? `বকেয়া: ৳${stmt.netBalance}` : `উদ্বৃত্ত: ৳${Math.abs(stmt.netBalance)}`;
                setSmsModalState({
                  isOpen: true,
                  recipientId: stmt.memberId,
                  type: 'monthly_account',
                  message: `আসসালামু আলাইকুম ${stmt.memberName}। চলতি মাসের মেস হিসাব: মোট মিল ${stmt.totalMeals}, মিল খরচ ৳${stmt.mealCost}, ফিক্সড শেয়ার ৳${stmt.sharedCostsShare}, জমা ৳${stmt.totalPaid}, ${balanceText}। - Mess Manager`,
                });
              }}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'members' && (
            <MembersView
              members={dbState.members}
              currentMember={currentMember}
              language={language}
              onSaveMember={handleSaveMember}
              onDeleteMember={handleDeleteMember}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              currentMonthCalc={currentMonthCalc}
              dailyMeals={dbState.dailyMeals}
              bazarRecords={dbState.bazarRecords}
              expenses={dbState.expenses}
              payments={dbState.payments}
              members={dbState.members}
              language={language}
            />
          )}

          {activeTab === 'settings' && (
            <SmsAndSettingsView
              settings={dbState.settings}
              smsLogs={dbState.smsLogs}
              auditLogs={dbState.auditLogs}
              members={dbState.members}
              currentMember={currentMember}
              language={language}
              onSaveSettings={handleSaveSettings}
              onSendCustomSms={handleSendSms}
              onResetDemo={handleResetDemo}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        language={language}
      />

      {/* Grounded Server-Side Gemini AI Chatbot */}
      <AiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        currentMember={currentMember}
      />

      {/* Printable Monthly Statement Voucher */}
      <StatementVoucherModal
        isOpen={!!statementVoucher}
        onClose={() => setStatementVoucher(null)}
        statement={statementVoucher}
        messName={dbState.settings.messName}
        messAddress={dbState.settings.messAddress}
        monthName={currentMonthCalc.monthName}
      />

      {/* Direct / Template SMS Sender Modal */}
      <SendSmsModal
        isOpen={smsModalState.isOpen}
        onClose={() => setSmsModalState({ isOpen: false })}
        members={dbState.members}
        onSendSms={handleSendSms}
        initialRecipientId={smsModalState.recipientId}
        initialType={smsModalState.type}
        initialMessage={smsModalState.message}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        onLoginSuccess={async () => {
          await fetchData();
          showToast('এডমিন অ্যাকাউন্টে সফলভাবে লগইন হয়েছে', 'success');
        }}
      />

      {/* Admin Profile Modal */}
      <AdminProfileModal
        isOpen={showAdminProfileModal}
        onClose={() => setShowAdminProfileModal(false)}
      />

      {/* Admin Data Management (Backup, Restore & Member Credentials) Modal */}
      <AdminDataManagementModal
        isOpen={showDataManagementModal}
        onClose={() => setShowDataManagementModal(false)}
        onDataRestored={async () => {
          await fetchData();
          showToast('মেস ডাটাবেজ ব্যাকআপ সফলভাবে রিস্টোর হয়েছে', 'success');
        }}
        onMemberAdded={async () => {
          await fetchData();
          showToast('নতুন সদস্য ও লগইন তথ্য যুক্ত হয়েছে', 'success');
        }}
      />
    </div>
  );
}

export default App;
