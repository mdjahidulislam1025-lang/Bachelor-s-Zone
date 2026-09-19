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
import { BachelorZoneLogo } from './components/BachelorZoneLogo.js';
import { useAuth } from './context/AuthContext.js';
import { getInitialOrSavedState, saveLocalState, resetLocalState } from './data/localDatabase.js';
import { calculateMonthlyAccount } from './utils/calculator.js';
import {
  MessDatabaseState,
  Member,
  MemberRole,
  UserRole,
  MemberMonthlyStatement,
  DailyMealEntry,
  MealRecord,
  MealMenu,
  CookingDuty,
  BazarDuty,
  BazarRecord,
  MarketItem,
  MarketListItem,
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
  const [dbState, setDbState] = useState<MessDatabaseState>(() => getInitialOrSavedState());
  const [isLoading, setIsLoading] = useState(false);
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
      const res = await fetch('/api/mess-data', {
        headers: getAuthHeaders(),
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && data.data) {
          setDbState(data.data);
          saveLocalState(data.data);
        }
      }
    } catch (err) {
      // Backend unavailable (static hosting or offline), continuing seamlessly with local data
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentMember =
    dbState.members.find(m => m.id === currentMemberId) || dbState.members[0];

  const currentMonthCalc =
    dbState.currentMonthCalculation ||
    dbState.monthlyAccounts.find(m => m.month === '2026-09') ||
    dbState.monthlyAccounts[0];

  const isMonthClosed = currentMonthCalc?.status === 'closed';

  const actingUserLabel = `${currentMember.name} (${currentMember.role === 'admin' ? 'Admin' : currentMember.role === 'treasurer' ? 'Treasurer' : 'Member'})`;

  // Standard response processor & offline mutation executor
  const executeMutation = async (
    apiCall: () => Promise<Response>,
    localUpdate: (prev: MessDatabaseState) => MessDatabaseState,
    successMsg: string
  ): Promise<boolean> => {
    setIsProcessing(true);
    let apiSucceeded = false;
    try {
      const res = await apiCall();
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          apiSucceeded = true;
          showToast(data.message || successMsg, 'success');
          await fetchData();
          return true;
        } else {
          showToast(data.error || 'অনুরোধটি সম্পন্ন করা যায়নি', 'error');
          return false;
        }
      }
    } catch (err) {
      // API call failed (offline / static host)
    } finally {
      setIsProcessing(false);
    }

    // Fallback: apply mutation to local database state & persist
    if (!apiSucceeded) {
      setDbState(prev => {
        const next = localUpdate(prev);
        const activeStatus = next.currentMonthCalculation?.status || 'open';
        const recalculated = {
          ...next,
          currentMonthCalculation: calculateMonthlyAccount(next, '2026-09', activeStatus),
        };
        saveLocalState(recalculated);
        return recalculated;
      });
      showToast(successMsg, 'success');
      return true;
    }
    return true;
  };

  // --- API & Local Handlers ---

  // Meals
  const handleSaveDailyMeals = async (
    date: string,
    records: Record<string, MealRecord>,
    notes?: string
  ): Promise<void> => {
    await executeMutation(
      () =>
        fetch('/api/meals/batch', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ date, records, notes, actingUser: actingUserLabel }),
        }),
      prev => {
        const existingIdx = prev.dailyMeals.findIndex(m => m.date === date);
        const updated = [...prev.dailyMeals];
        let totalBreakfast = 0;
        let totalLunch = 0;
        let totalDinner = 0;
        Object.values(records).forEach(r => {
          totalBreakfast += r.breakfast || 0;
          totalLunch += r.lunch || 0;
          totalDinner += r.dinner || 0;
        });
        const entry: DailyMealEntry = {
          id: existingIdx >= 0 ? updated[existingIdx].id : `dme_${date}`,
          date,
          totalBreakfast,
          totalLunch,
          totalDinner,
          totalMeals: totalBreakfast + totalLunch + totalDinner,
          records,
          notes: notes || '',
          updatedBy: actingUserLabel,
          updatedAt: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          updated[existingIdx] = entry;
        } else {
          updated.push(entry);
        }
        return { ...prev, dailyMeals: updated };
      },
      `${date} তারিখের মিল সফলভাবে সংরক্ষিত হয়েছে`
    );
  };

  const handleDeleteDailyMeal = async (date: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch(`/api/meals/${date}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
          method: 'DELETE',
          headers: getDeleteHeaders(),
        }),
      prev => ({
        ...prev,
        dailyMeals: prev.dailyMeals.filter(m => m.date !== date),
      }),
      `${date} তারিখের মিল রেকর্ড মুছে ফেলা হয়েছে`
    );
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
    const mealNameBn = mealType === 'breakfast' ? 'সকালের নাস্তা' : mealType === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';
    const statusBn = status === 'ON' ? 'চালু (ON)' : 'বন্ধ (OFF)';
    return executeMutation(
      () =>
        fetch('/api/meals/toggle-status', {
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
        }),
      prev => {
        const existingIdx = prev.dailyMeals.findIndex(m => m.date === date);
        const updatedDailyMeals = [...prev.dailyMeals];
        const val = status === 'ON' ? 1 : 0;
        if (existingIdx >= 0) {
          const day = updatedDailyMeals[existingIdx];
          const prevRec = day.records[memberId] || {
            memberId,
            breakfast: 1,
            lunch: 1,
            dinner: 1,
            guestMeals: 0,
            total: 3,
          };
          const newBreakfast = mealType === 'breakfast' ? val : prevRec.breakfast;
          const newLunch = mealType === 'lunch' ? val : prevRec.lunch;
          const newDinner = mealType === 'dinner' ? val : prevRec.dinner;
          const newMemRec: MealRecord = {
            memberId,
            breakfast: newBreakfast,
            lunch: newLunch,
            dinner: newDinner,
            guestMeals: prevRec.guestMeals || 0,
            total: newBreakfast + newLunch + newDinner + (prevRec.guestMeals || 0),
          };
          const newRecords = {
            ...day.records,
            [memberId]: newMemRec,
          };
          let totalBreakfast = 0;
          let totalLunch = 0;
          let totalDinner = 0;
          Object.values(newRecords).forEach(r => {
            totalBreakfast += r.breakfast || 0;
            totalLunch += r.lunch || 0;
            totalDinner += r.dinner || 0;
          });
          updatedDailyMeals[existingIdx] = {
            ...day,
            totalBreakfast,
            totalLunch,
            totalDinner,
            totalMeals: totalBreakfast + totalLunch + totalDinner,
            records: newRecords,
            updatedBy: actingUserLabel,
            updatedAt: new Date().toISOString(),
          };
        } else {
          const rec: Record<string, MealRecord> = {};
          prev.members.forEach(m => {
            rec[m.id] = {
              memberId: m.id,
              breakfast: 1,
              lunch: 1,
              dinner: 1,
              guestMeals: 0,
              total: 3,
            };
          });
          const prevRec = rec[memberId] || {
            memberId,
            breakfast: 1,
            lunch: 1,
            dinner: 1,
            guestMeals: 0,
            total: 3,
          };
          const newBreakfast = mealType === 'breakfast' ? val : prevRec.breakfast;
          const newLunch = mealType === 'lunch' ? val : prevRec.lunch;
          const newDinner = mealType === 'dinner' ? val : prevRec.dinner;
          rec[memberId] = {
            memberId,
            breakfast: newBreakfast,
            lunch: newLunch,
            dinner: newDinner,
            guestMeals: prevRec.guestMeals || 0,
            total: newBreakfast + newLunch + newDinner + (prevRec.guestMeals || 0),
          };
          let totalBreakfast = 0;
          let totalLunch = 0;
          let totalDinner = 0;
          Object.values(rec).forEach(r => {
            totalBreakfast += r.breakfast || 0;
            totalLunch += r.lunch || 0;
            totalDinner += r.dinner || 0;
          });
          updatedDailyMeals.push({
            id: `dme_${date}`,
            date,
            totalBreakfast,
            totalLunch,
            totalDinner,
            totalMeals: totalBreakfast + totalLunch + totalDinner,
            records: rec,
            updatedBy: actingUserLabel,
            updatedAt: new Date().toISOString(),
          });
        }
        return { ...prev, dailyMeals: updatedDailyMeals };
      },
      `${date}: ${mealNameBn} ${statusBn} করা হয়েছে`
    );
  };

  // Weekly / Batch Plan
  const handleBatchSavePlan = async (
    memberId: string,
    plans: Array<{ date: string; breakfast?: MealStatus; lunch?: MealStatus; dinner?: MealStatus }>
  ): Promise<boolean> => {
    return executeMutation(
      () =>
        fetch('/api/meals/batch-member-plan', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            memberId,
            plans,
            actingUser: actingUserLabel,
          }),
        }),
      prev => {
        const updatedDailyMeals = [...prev.dailyMeals];
        plans.forEach(plan => {
          const idx = updatedDailyMeals.findIndex(m => m.date === plan.date);
          const currentRec = updatedDailyMeals[idx]?.records?.[memberId] || {
            memberId,
            breakfast: 1,
            lunch: 1,
            dinner: 1,
            guestMeals: 0,
            total: 3,
          };
          const b = plan.breakfast ? (plan.breakfast === 'ON' ? 1 : 0) : currentRec.breakfast;
          const l = plan.lunch ? (plan.lunch === 'ON' ? 1 : 0) : currentRec.lunch;
          const d = plan.dinner ? (plan.dinner === 'ON' ? 1 : 0) : currentRec.dinner;
          const newRec: MealRecord = {
            memberId,
            breakfast: b,
            lunch: l,
            dinner: d,
            guestMeals: currentRec.guestMeals || 0,
            total: b + l + d + (currentRec.guestMeals || 0),
          };
          if (idx >= 0) {
            const day = updatedDailyMeals[idx];
            const newRecords = { ...day.records, [memberId]: newRec };
            let totalBreakfast = 0;
            let totalLunch = 0;
            let totalDinner = 0;
            Object.values(newRecords).forEach(r => {
              totalBreakfast += r.breakfast || 0;
              totalLunch += r.lunch || 0;
              totalDinner += r.dinner || 0;
            });
            updatedDailyMeals[idx] = {
              ...day,
              totalBreakfast,
              totalLunch,
              totalDinner,
              totalMeals: totalBreakfast + totalLunch + totalDinner,
              records: newRecords,
              updatedBy: actingUserLabel,
              updatedAt: new Date().toISOString(),
            };
          } else {
            const rec: Record<string, MealRecord> = { [memberId]: newRec };
            let totalBreakfast = b;
            let totalLunch = l;
            let totalDinner = d;
            updatedDailyMeals.push({
              id: `dme_${plan.date}`,
              date: plan.date,
              totalBreakfast,
              totalLunch,
              totalDinner,
              totalMeals: totalBreakfast + totalLunch + totalDinner,
              records: rec,
              updatedBy: actingUserLabel,
              updatedAt: new Date().toISOString(),
            });
          }
        });
        return { ...prev, dailyMeals: updatedDailyMeals };
      },
      'সাপ্তাহিক মিল পরিকল্পনা সফলভাবে সংরক্ষিত হয়েছে'
    );
  };

  // Save Cutoff Settings
  const handleSaveCutoffSettings = async (settings: MealCutoffSettings): Promise<boolean> => {
    return executeMutation(
      () =>
        fetch('/api/settings/meal-cutoff', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            mealCutoffSettings: settings,
            actingUser: actingUserLabel,
          }),
        }),
      prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          mealCutoffSettings: settings,
        },
      }),
      'মিল কাট-অফ সময় ও নিয়মাবলি সফলভাবে হালনাগাদ হয়েছে'
    );
  };

  // Send Cutoff Reminders
  const handleSendCutoffReminders = async (date: string): Promise<boolean> => {
    return executeMutation(
      () =>
        fetch('/api/meals/send-cutoff-reminders', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            date,
            actingUser: actingUserLabel,
          }),
        }),
      prev => prev,
      `${date} তারিখের মিল রিমাইন্ডার সফলভাবে পাঠানো হয়েছে`
    );
  };

  // Menu
  const handleSaveMenu = async (menu: Partial<MealMenu>): Promise<void> => {
    await executeMutation(
      () =>
        fetch('/api/menus', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ menu, actingUser: actingUserLabel }),
        }),
      prev => {
        const idx = prev.mealMenus.findIndex(m => m.date === menu.date);
        const list = [...prev.mealMenus];
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...menu } as MealMenu;
        } else {
          list.push(menu as MealMenu);
        }
        return { ...prev, mealMenus: list };
      },
      'খাবার মেনু সফলভাবে হালনাগাদ হয়েছে'
    );
  };

  // Cooking Duties
  const handleSaveDuty = async (duty: Partial<CookingDuty>): Promise<void> => {
    const dutyId = duty.id || `duty_${Date.now()}`;
    await executeMutation(
      () =>
        fetch('/api/cooking-duty', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ duty, actingUser: actingUserLabel }),
        }),
      prev => {
        const idx = prev.cookingDuties.findIndex(d => d.id === duty.id);
        const list = [...prev.cookingDuties];
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...duty } as CookingDuty;
        } else {
          list.push({ ...duty, id: dutyId } as CookingDuty);
        }
        return { ...prev, cookingDuties: list };
      },
      'রান্নার দায়িত্ব সফলভাবে সংরক্ষিত হয়েছে'
    );
  };

  const handleDeleteCookingDuty = async (id: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch(`/api/cooking-duty/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
          method: 'DELETE',
          headers: getDeleteHeaders(),
        }),
      prev => ({
        ...prev,
        cookingDuties: prev.cookingDuties.filter(d => d.id !== id),
      }),
      'রান্নার দায়িত্ব শিডিউল মুছে ফেলা হয়েছে'
    );
  };

  // Bazar Records
  const handleSaveBazarRecord = async (bazar: Partial<BazarRecord>): Promise<void> => {
    const bazId = bazar.id || `bz_${Date.now()}`;
    await executeMutation(
      () =>
        fetch('/api/bazar', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ bazar, actingUser: actingUserLabel }),
        }),
      prev => {
        const idx = prev.bazarRecords.findIndex(b => b.id === bazar.id);
        const list = [...prev.bazarRecords];
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...bazar } as BazarRecord;
        } else {
          list.push({ ...bazar, id: bazId } as BazarRecord);
        }
        return { ...prev, bazarRecords: list };
      },
      'বাজার খরচ সফলভাবে সংরক্ষিত হয়েছে'
    );
  };

  const handleDeleteBazarRecord = async (id: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch(`/api/bazar/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
          method: 'DELETE',
          headers: getDeleteHeaders(),
        }),
      prev => ({
        ...prev,
        bazarRecords: prev.bazarRecords.filter(b => b.id !== id),
      }),
      'বাজার রেকর্ড মুছে ফেলা হয়েছে'
    );
  };

  // Bazar Duty
  const handleSaveBazarDuty = async (duty: Partial<BazarDuty>): Promise<void> => {
    const dutyId = duty.id || `bd_${Date.now()}`;
    await executeMutation(
      () =>
        fetch('/api/bazar-duty', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ duty, actingUser: actingUserLabel }),
        }),
      prev => {
        const idx = prev.bazarDuties.findIndex(d => d.id === duty.id);
        const list = [...prev.bazarDuties];
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...duty } as BazarDuty;
        } else {
          list.push({ ...duty, id: dutyId } as BazarDuty);
        }
        return { ...prev, bazarDuties: list };
      },
      'বাজার দায়িত্ব নির্ধারিত হয়েছে'
    );
  };

  const handleDeleteBazarDuty = async (id: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch(`/api/bazar-duty/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
          method: 'DELETE',
          headers: getDeleteHeaders(),
        }),
      prev => ({
        ...prev,
        bazarDuties: prev.bazarDuties.filter(d => d.id !== id),
      }),
      'বাজার দায়িত্ব শিডিউল মুছে ফেলা হয়েছে'
    );
  };

  // Market Items
  const handleSaveMarketItem = async (item: Partial<MarketListItem>): Promise<void> => {
    const itemId = item.id || `mi_${Date.now()}`;
    await executeMutation(
      () =>
        fetch('/api/market-list', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ item, actingUser: actingUserLabel }),
        }),
      prev => {
        const idx = prev.marketList.findIndex(i => i.id === item.id);
        const list = [...prev.marketList];
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...item } as MarketListItem;
        } else {
          list.push({ ...item, id: itemId } as MarketListItem);
        }
        return { ...prev, marketList: list };
      },
      'বাজার তালিকার আইটেম সংরক্ষিত হয়েছে'
    );
  };

  const handleDeleteMarketItem = async (id: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch(`/api/market-list/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
          method: 'DELETE',
          headers: getDeleteHeaders(),
        }),
      prev => ({
        ...prev,
        marketList: prev.marketList.filter(i => i.id !== id),
      }),
      'আইটেম মুছে ফেলা হয়েছে'
    );
  };

  // General Expenses
  const handleSaveExpense = async (expense: Partial<ExpenseRecord>): Promise<void> => {
    const expId = expense.id || `exp_${Date.now()}`;
    await executeMutation(
      () =>
        fetch('/api/expenses', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ expense, actingUser: actingUserLabel }),
        }),
      prev => {
        const idx = prev.expenses.findIndex(e => e.id === expense.id);
        const list = [...prev.expenses];
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...expense } as ExpenseRecord;
        } else {
          list.push({ ...expense, id: expId } as ExpenseRecord);
        }
        return { ...prev, expenses: list };
      },
      'খরচের হিসাব সংরক্ষিত হয়েছে'
    );
  };

  const handleDeleteExpense = async (id: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch(`/api/expenses/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
          method: 'DELETE',
          headers: getDeleteHeaders(),
        }),
      prev => ({
        ...prev,
        expenses: prev.expenses.filter(e => e.id !== id),
      }),
      'খরচের রেকর্ড মুছে ফেলা হয়েছে'
    );
  };

  // Payments / Deposits
  const handleSavePayment = async (payment: Partial<PaymentRecord>): Promise<void> => {
    const payId = payment.id || `pay_${Date.now()}`;
    await executeMutation(
      () =>
        fetch('/api/payments', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ payment, actingUser: actingUserLabel }),
        }),
      prev => {
        const idx = prev.payments.findIndex(p => p.id === payment.id);
        const list = [...prev.payments];
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...payment } as PaymentRecord;
        } else {
          list.push({ ...payment, id: payId } as PaymentRecord);
        }
        return { ...prev, payments: list };
      },
      'জমা রেকর্ড সফলভাবে সংরক্ষিত হয়েছে'
    );
  };

  const handleDeletePayment = async (id: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch(`/api/payments/${id}?actingUser=${encodeURIComponent(actingUserLabel)}`, {
          method: 'DELETE',
          headers: getDeleteHeaders(),
        }),
      prev => ({
        ...prev,
        payments: prev.payments.filter(p => p.id !== id),
      }),
      'জমার রেকর্ড মুছে ফেলা হয়েছে'
    );
  };

  // Monthly Close, Reopen, Recalculate
  const handleCloseMonth = async (month: string, sendSms: boolean): Promise<void> => {
    await executeMutation(
      () =>
        fetch('/api/month/close', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            month,
            actingUser: actingUserLabel,
            sendMonthEndSms: sendSms,
          }),
        }),
      prev => {
        const closedCalc = calculateMonthlyAccount(prev, month, 'closed');
        const updatedAccounts = [...prev.monthlyAccounts.filter(a => a.month !== month), closedCalc];
        return {
          ...prev,
          currentMonthCalculation: closedCalc,
          monthlyAccounts: updatedAccounts,
        };
      },
      `${month} মাসের হিসাব চূড়ান্ত ও বন্ধ (Locked) করা হয়েছে`
    );
  };

  const handleReopenMonth = async (month: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch('/api/month/reopen', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ month, actingUser: actingUserLabel }),
        }),
      prev => {
        const reopenedCalc = calculateMonthlyAccount(prev, month, 'open');
        const updatedAccounts = [...prev.monthlyAccounts.filter(a => a.month !== month), reopenedCalc];
        return {
          ...prev,
          currentMonthCalculation: reopenedCalc,
          monthlyAccounts: updatedAccounts,
        };
      },
      `${month} মাসের হিসাব সফলভাবে পুনঃউন্মুক্ত (Reopened) করা হয়েছে`
    );
  };

  const handleRecalculateMonth = async (month: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch('/api/month/recalculate', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ month, actingUser: actingUserLabel }),
        }),
      prev => {
        const activeStatus = prev.currentMonthCalculation?.status || 'open';
        const recalculated = calculateMonthlyAccount(prev, month, activeStatus);
        return {
          ...prev,
          currentMonthCalculation: recalculated,
        };
      },
      `${month} মাসের হিসাব ও মিল রেট পুনর্গণনা সম্পন্ন হয়েছে`
    );
  };

  // Members
  const handleSaveMember = async (member: Partial<Member>): Promise<void> => {
    const memId = member.id || `m_${Date.now()}`;
    await executeMutation(
      () =>
        fetch('/api/members', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ member, actingUser: actingUserLabel }),
        }),
      prev => {
        const idx = prev.members.findIndex(m => m.id === member.id);
        const list = [...prev.members];
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...member } as Member;
        } else {
          list.push({ ...member, id: memId, status: member.status || 'active' } as Member);
        }
        return { ...prev, members: list };
      },
      'সদস্যের তথ্য সফলভাবে সংরক্ষিত হয়েছে'
    );
  };

  const handleChangeMemberRole = async (memberId: string, newRole: MemberRole): Promise<void> => {
    await executeMutation(
      () =>
        fetch('/api/members/change-role', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ memberId, newRole, actingUser: actingUserLabel }),
        }),
      prev => ({
        ...prev,
        members: prev.members.map(m => (m.id === memberId ? { ...m, role: newRole } : m)),
      }),
      'সদস্যের রোল সফলভাবে পরিবর্তন করা হয়েছে'
    );
  };

  const handleRemoveMember = async (id: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch('/api/members/remove', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ memberId: id, actingUser: actingUserLabel }),
        }),
      prev => ({
        ...prev,
        members: prev.members.map(m => (m.id === id ? { ...m, status: 'left' } : m)),
      }),
      'সদস্য অপসারিত হয়েছে এবং আর্থিক ইতিহাস অক্ষত সংরক্ষিত রয়েছে'
    );
  };

  const handleReactivateMember = async (id: string): Promise<void> => {
    await executeMutation(
      () =>
        fetch('/api/members/reactivate', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ memberId: id, actingUser: actingUserLabel }),
        }),
      prev => ({
        ...prev,
        members: prev.members.map(m => (m.id === id ? { ...m, status: 'active' } : m)),
      }),
      'সদস্য সফলভাবে পুনরায় সক্রিয় করা হয়েছে'
    );
  };

  const handleDeleteMember = async (id: string): Promise<void> => {
    await handleRemoveMember(id);
  };

  // Settings
  const handleSaveSettings = async (settings: MessSettings): Promise<void> => {
    await executeMutation(
      () =>
        fetch('/api/settings', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ settings, actingUser: actingUserLabel }),
        }),
      prev => ({
        ...prev,
        settings,
      }),
      'মেস সেটিংস ও ক্যাশিয়ার অনুমতি হালনাগাদ করা হয়েছে'
    );
  };

  // SMS
  const handleSendSms = async (
    recipientId: string,
    phone: string,
    message: string,
    type: SmsType = 'custom'
  ): Promise<void> => {
    await executeMutation(
      () => {
        const recipient = dbState.members.find(m => m.id === recipientId);
        return fetch('/api/sms/send', {
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
      },
      prev => prev,
      `${phone} নম্বরে এসএমএস সফলভাবে পাঠানো হয়েছে`
    );
  };

  const handleResetDemo = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে ডেমো ডেটা রিসেট করতে চান?')) return;
    try {
      await fetch('/api/reset-demo', { method: 'POST' });
    } catch {}
    const fresh = resetLocalState();
    setDbState(fresh);
    showToast('ডেমো ডেটা সফলভাবে রিসেট করা হয়েছে', 'success');
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
                  message: `আসসালামু আলাইকুম ${duty.memberName}। আজ মেসে আপনার রান্নার দায়িত্ব। নির্ধারিত সময় অনুযায়ী রান্না প্রস্তুত রাখুন। - Bachelor Zone`,
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
                  message: `আসসালামু আলাইকুম ${duty.memberName}। আজ আপনার বাজার করার দায়িত্ব। বাজেট: ৳${duty.expectedBudget}। অ্যাপে প্রয়োজনীয় পণ্যের তালিকা দেখে নিন। - Bachelor Zone`,
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
                  message: `আসসালামু আলাইকুম ${stmt.memberName}। চলতি মাসের মেস হিসাব: মোট মিল ${stmt.totalMeals}, মিল খরচ ৳${stmt.mealCost}, ফিক্সড শেয়ার ৳${stmt.sharedCostsShare}, জমা ৳${stmt.totalPaid}, ${balanceText}। - Bachelor Zone`,
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
              onChangeRole={handleChangeMemberRole}
              onRemoveMember={handleRemoveMember}
              onReactivateMember={handleReactivateMember}
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

      {/* Admin Login & Member Login Modal */}
      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        members={dbState.members}
        currentMemberId={currentMemberId}
        onSelectMember={id => {
          setCurrentMemberId(id);
          showToast('সদস্য প্রোফাইলে স্যুইচ করা হয়েছে', 'info');
        }}
        onLoginSuccess={async () => {
          await fetchData();
          showToast('সফলভাবে লগইন সম্পন্ন হয়েছে', 'success');
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
