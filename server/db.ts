import fs from 'fs';
import path from 'path';
import { MessDatabaseState, MonthlyAccount, MemberMonthlyStatement } from '../src/types.js';
import { getInitialMessData } from './demoData.js';
import { calculateMonthlyAccount } from '../src/utils/calculator.js';
import { ensureCurrentMonthPeriod } from './monthlyAccounting.js';

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
  // Automatic new month detection and isolation
  ensureCurrentMonthPeriod(inMemoryState!);
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
  const db = inMemoryState || initDatabase();
  const month = dateOrMonth.slice(0, 7); // 'YYYY-MM'
  const account = db.monthlyAccounts?.find(m => m.month === month);
  if (account && account.status === 'closed') return true;
  if (db.currentMonthCalculation?.month === month && db.currentMonthCalculation?.status === 'closed') return true;
  return false;
}

export function recalculateMonthlyAccount(month?: string) {
  const db = inMemoryState || initDatabase();
  const targetMonth = month || db.currentMonthCalculation?.month || '2026-10';
  const existingIdx = db.monthlyAccounts.findIndex(m => m.month === targetMonth);
  const existingStatus = existingIdx >= 0 ? db.monthlyAccounts[existingIdx].status : 'open';
  const closedBy = existingIdx >= 0 ? db.monthlyAccounts[existingIdx].closedBy : undefined;

  const recalculated = calculateMonthlyAccount(db, targetMonth, existingStatus, closedBy);
  if (existingIdx >= 0) {
    db.monthlyAccounts[existingIdx] = recalculated;
  } else {
    db.monthlyAccounts.unshift(recalculated);
  }
  if (!db.currentMonthCalculation || db.currentMonthCalculation.month === targetMonth) {
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
      if ((rec.lunch || 0) < 0 || (rec.dinner || 0) < 0) {
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

export function calculateMonthlyAccountWrapper(month: string, closeStatus: 'open' | 'closed' = 'open', closedBy?: string): MonthlyAccount {
  const db = getDatabase();
  return calculateMonthlyAccount(db, month, closeStatus, closedBy);
}

export { calculateMonthlyAccountWrapper as calculateMonthlyAccount };
