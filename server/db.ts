import fs from 'fs';
import path from 'path';
import { MessDatabaseState, MonthlyAccount, MemberMonthlyStatement } from '../src/types.js';
import { getInitialMessData } from './demoData.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'mess_db.json');

let inMemoryState: MessDatabaseState | null = null;

export function initDatabase(): MessDatabaseState {
  if (inMemoryState) return inMemoryState;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
      inMemoryState = JSON.parse(fileContent);
      console.log('Loaded existing Mess database from', DATA_FILE);

      // Backfill new features if not present in saved disk file
      const initial = getInitialMessData();
      if (!inMemoryState!.memberMealSelections || inMemoryState!.memberMealSelections.length === 0) {
        inMemoryState!.memberMealSelections = initial.memberMealSelections;
      }
      if (!inMemoryState!.mealChangeLogs) {
        inMemoryState!.mealChangeLogs = initial.mealChangeLogs;
      }
      if (!inMemoryState!.settings?.mealCutoffSettings) {
        if (!inMemoryState!.settings) inMemoryState!.settings = initial.settings;
        inMemoryState!.settings.mealCutoffSettings = initial.settings.mealCutoffSettings;
      }
      if (!inMemoryState!.adminProfile) {
        inMemoryState!.adminProfile = initial.adminProfile;
      }
      if (!inMemoryState!.memberCredentials) {
        inMemoryState!.memberCredentials = initial.memberCredentials;
      }
    } else {
      inMemoryState = getInitialMessData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(inMemoryState, null, 2), 'utf-8');
      console.log('Initialized fresh Mess database with demo data at', DATA_FILE);
    }
  } catch (err) {
    console.error('Error reading database file, falling back to fresh demo data:', err);
    inMemoryState = getInitialMessData();
  }

  return inMemoryState!;
}

export function getDatabase(): MessDatabaseState {
  if (!inMemoryState) {
    initDatabase();
  }
  const initial = getInitialMessData();
  if (!inMemoryState!.memberMealSelections || inMemoryState!.memberMealSelections.length === 0) {
    inMemoryState!.memberMealSelections = initial.memberMealSelections;
  }
  if (!inMemoryState!.mealChangeLogs || inMemoryState!.mealChangeLogs.length === 0) {
    inMemoryState!.mealChangeLogs = initial.mealChangeLogs;
  }
  if (!inMemoryState!.settings?.mealCutoffSettings) {
    if (!inMemoryState!.settings) inMemoryState!.settings = initial.settings;
    inMemoryState!.settings.mealCutoffSettings = initial.settings.mealCutoffSettings;
  }
  return inMemoryState!;
}

export function saveDatabase(state: MessDatabaseState): void {
  inMemoryState = state;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database to disk:', err);
  }
}

export function logAudit(
  userName: string,
  action: string,
  module: any,
  details: string,
  previousValue?: string,
  newValue?: string,
  userId: string = 'm1',
  recordType?: string,
  recordId?: string,
  ipAddress?: string
) {
  const db = getDatabase();
  const newAudit = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId: userId || 'm1',
    userName: userName || 'Admin',
    action,
    recordType: recordType || module,
    recordId: recordId || '',
    module,
    details,
    previousValue,
    newValue,
    ipAddress,
  };
  db.auditLogs.unshift(newAudit);
  if (db.auditLogs.length > 300) {
    db.auditLogs.pop();
  }
  saveDatabase(db);
  return newAudit;
}

export function isMonthClosed(dateOrMonth: string): boolean {
  if (!dateOrMonth) return false;
  const db = getDatabase();
  const month = dateOrMonth.slice(0, 7); // 'YYYY-MM'
  const account = db.monthlyAccounts?.find(m => m.month === month);
  if (account && account.status === 'closed') return true;
  if (month === '2026-09' && db.currentMonthCalculation?.status === 'closed') return true;
  return false;
}

export function recalculateMonthlyAccount(month: string = '2026-09') {
  const db = getDatabase();
  const existingIdx = db.monthlyAccounts.findIndex(m => m.month === month);
  const existingStatus = existingIdx >= 0 ? db.monthlyAccounts[existingIdx].status : 'open';
  const closedBy = existingIdx >= 0 ? db.monthlyAccounts[existingIdx].closedBy : undefined;

  const recalculated = calculateMonthlyAccount(month, existingStatus, closedBy);
  if (existingIdx >= 0) {
    db.monthlyAccounts[existingIdx] = recalculated;
  } else {
    db.monthlyAccounts.unshift(recalculated);
  }
  if (month === '2026-09' || !db.currentMonthCalculation || db.currentMonthCalculation.month === month) {
    db.currentMonthCalculation = recalculated;
  }
  saveDatabase(db);
  return recalculated;
}

export function notify(
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'alert' = 'info',
  linkTab?: string
) {
  const db = getDatabase();
  const newNotif = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    title,
    message,
    type,
    read: false,
    linkTab,
  };
  db.notifications.unshift(newNotif);
  if (db.notifications.length > 100) {
    db.notifications.pop();
  }
  saveDatabase(db);
}

export function validateMonthRecords(month: string): { isValid: boolean; errors: string[]; warnings: string[] } {
  const db = getDatabase();
  const errors: string[] = [];
  const warnings: string[] = [];

  const activeMembers = db.members.filter(m => m.status === 'active');
  if (activeMembers.length === 0) {
    errors.push('কোন সক্রিয় মেস সদস্য পাওয়া যায়নি (No active members found).');
  }

  // Filter daily meals in this month
  const mealsInMonth = db.dailyMeals.filter(m => m.date.startsWith(month));
  if (mealsInMonth.length === 0) {
    errors.push(`${month} মাসের কোন মিল রেকর্ড পাওয়া যায়নি (No daily meal records found for this month).`);
  }

  // Check for negative meal counts or negative expenses
  mealsInMonth.forEach(day => {
    Object.values(day.records).forEach(rec => {
      if (rec.breakfast < 0 || rec.lunch < 0 || rec.dinner < 0) {
        errors.push(`${day.date} তারিখে সদস্য (${rec.memberId}) এর মিলের সংখ্যা নেগেটিভ হতে পারবে না।`);
      }
    });
  });

  const bazarInMonth = db.bazarRecords.filter(b => b.date.startsWith(month));
  bazarInMonth.forEach(b => {
    if (b.totalAmount <= 0) {
      warnings.push(`${b.date} তারিখে বাজার খরচের পরিমাণ শূন্য বা অবৈধ।`);
    }
  });

  const expensesInMonth = db.expenses.filter(e => e.date.startsWith(month));
  expensesInMonth.forEach(e => {
    if (e.amount <= 0) {
      errors.push(`${e.date} তারিখে খরচের পরিমাণ নেগেটিভ বা শূন্য হতে পারবে না।`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function calculateMonthlyAccount(month: string, closeStatus: 'open' | 'closed' = 'open', closedBy?: string): MonthlyAccount {
  const db = getDatabase();

  const mealsInMonth = db.dailyMeals.filter(m => m.date.startsWith(month));
  const bazarInMonth = db.bazarRecords.filter(b => b.date.startsWith(month));
  const expensesInMonth = db.expenses.filter(e => e.date.startsWith(month));
  const paymentsInMonth = db.payments.filter(p => p.date.startsWith(month) && p.status === 'verified');

  // Sum total bazar
  const totalBazarExpense = bazarInMonth.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  // Sum total meals and member meals
  const memberMealCounts: Record<string, number> = {};
  let totalMeals = 0;

  db.members.forEach(m => {
    memberMealCounts[m.id] = 0;
  });

  mealsInMonth.forEach(dm => {
    Object.entries(dm.records).forEach(([memberId, rec]) => {
      const mealSum = (rec.breakfast || 0) + (rec.lunch || 0) + (rec.dinner || 0);
      memberMealCounts[memberId] = (memberMealCounts[memberId] || 0) + mealSum;
      totalMeals += mealSum;
    });
  });

  // Calculate meal rate
  const mealRate = totalMeals > 0 ? parseFloat((totalBazarExpense / totalMeals).toFixed(2)) : 0;

  // Shared expenses breakdown
  const activeMembers = db.members.filter(m => m.status === 'active');
  const activeCount = Math.max(activeMembers.length, 1);

  let rentTotal = 0;
  let gasTotal = 0;
  let electricityTotal = 0;
  let maidSalaryTotal = 0;
  let internetTotal = 0;
  let cleaningTotal = 0;
  let otherSharedTotal = 0;

  expensesInMonth.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    switch (exp.category) {
      case 'rent': rentTotal += amt; break;
      case 'gas': gasTotal += amt; break;
      case 'electricity': electricityTotal += amt; break;
      case 'maid_salary': maidSalaryTotal += amt; break;
      case 'internet': internetTotal += amt; break;
      case 'cleaning': cleaningTotal += amt; break;
      default: otherSharedTotal += amt; break;
    }
  });

  const rentShare = Math.round(rentTotal / activeCount);
  const gasShare = Math.round(gasTotal / activeCount);
  const electricityShare = Math.round(electricityTotal / activeCount);
  const maidSalaryShare = Math.round(maidSalaryTotal / activeCount);
  const internetShare = Math.round(internetTotal / activeCount);
  const cleaningShare = Math.round(cleaningTotal / activeCount);
  const otherShared = Math.round(otherSharedTotal / activeCount);

  const totalSharedPerMember = rentShare + gasShare + electricityShare + maidSalaryShare + internetShare + cleaningShare + otherShared;
  const totalSharedExpenses = rentTotal + gasTotal + electricityTotal + maidSalaryTotal + internetTotal + cleaningTotal + otherSharedTotal;
  const totalMessExpense = totalBazarExpense + totalSharedExpenses;

  // Payments per member
  const memberPayments: Record<string, number> = {};
  db.members.forEach(m => {
    memberPayments[m.id] = 0;
  });
  paymentsInMonth.forEach(p => {
    memberPayments[p.memberId] = (memberPayments[p.memberId] || 0) + (Number(p.amount) || 0);
  });

  // Build statement for each member
  const statements: Record<string, MemberMonthlyStatement> = {};
  let totalCollected = 0;
  let totalDue = 0;
  let totalAdvance = 0;

  db.members.forEach(m => {
    const isMemberActive = m.status === 'active';
    const mMeals = memberMealCounts[m.id] || 0;
    const mMealCost = Math.round(mMeals * mealRate);
    const mSharedShare = isMemberActive ? totalSharedPerMember : 0;
    const mTotalCost = mMealCost + mSharedShare;
    const mPaid = memberPayments[m.id] || 0;
    const netBalance = mTotalCost - mPaid;

    totalCollected += mPaid;
    if (netBalance > 0) {
      totalDue += netBalance;
    } else {
      totalAdvance += Math.abs(netBalance);
    }

    statements[m.id] = {
      memberId: m.id,
      memberName: m.name,
      roomNo: m.roomNo,
      totalMeals: mMeals,
      mealRate,
      mealCost: mMealCost,
      sharedCostsShare: mSharedShare,
      individualCosts: 0,
      totalCost: mTotalCost,
      totalPaid: mPaid,
      netBalance,
      breakdown: {
        rentShare: isMemberActive ? rentShare : 0,
        gasShare: isMemberActive ? gasShare : 0,
        electricityShare: isMemberActive ? electricityShare : 0,
        maidSalaryShare: isMemberActive ? maidSalaryShare : 0,
        internetShare: isMemberActive ? internetShare : 0,
        cleaningShare: isMemberActive ? cleaningShare : 0,
        otherShared: isMemberActive ? otherShared : 0,
      }
    };
  });

  const monthDate = new Date(`${month}-01T00:00:00Z`);
  const monthName = monthDate.toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' }) + ` (${monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`;

  const formulaNote = `মিল রেট = মোট বাজার খরচ (৳${totalBazarExpense.toLocaleString()}) ÷ মোট মিল (${totalMeals}) = ৳${mealRate.toFixed(2)}। ফিক্সড খরচাদি ${activeCount} জন সক্রিয় সদস্যের মধ্যে সুষমভাবে বণ্টন।`;

  return {
    id: `month-${month}`,
    month,
    monthName,
    status: closeStatus,
    closedAt: closeStatus === 'closed' ? new Date().toISOString() : undefined,
    closedBy,
    totalMeals,
    totalBazarExpense,
    mealRate,
    totalSharedExpenses,
    totalMessExpense,
    totalCollected,
    totalDue,
    totalAdvance,
    statements,
    formulaNote,
  };
}
