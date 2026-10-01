import { MessDatabaseState, MonthlyAccount, MonthlyAccountSnapshot } from '../src/types.js';
import {
  getCurrentDhakaPeriod,
  getPreviousMonthPeriod,
  getNextMonthPeriod,
  getMonthNameBengali,
} from '../src/utils/monthlyPeriodUtils.js';
import { calculateMonthlyAccount } from '../src/utils/calculator.js';
import { logAudit, notify, saveDatabase } from './db.js';

export function isPermanentAdmin(user?: { id?: string; name?: string; phone?: string; email?: string } | null): boolean {
  if (!user) return false;
  const name = (user.name || '').toLowerCase();
  const phone = (user.phone || '').replace(/[\s\-\+]/g, '');
  const email = (user.email || '').toLowerCase();
  return (
    user.id === 'm1' ||
    user.id === 'admin_m1' ||
    name.includes('jahidul') ||
    name.includes('জাহিদুল') ||
    phone === '8801711234567' ||
    phone === '01711234567' ||
    phone === '8801516528497' ||
    phone === '01516528497' ||
    email === 'mdjahidulislam1025@gmail.com'
  );
}

/**
 * Ensures that the database always has the active calendar month accounting period opened,
 * preserving previous months and creating a fresh period for the new month automatically.
 */
export function ensureCurrentMonthPeriod(db: MessDatabaseState): MonthlyAccount {
  const dhaka = getCurrentDhakaPeriod();
  const currentPeriod = dhaka.periodId; // e.g. "2026-10"
  const prevPeriod = getPreviousMonthPeriod(currentPeriod); // e.g. "2026-09"

  if (!Array.isArray(db.monthlyAccounts)) {
    db.monthlyAccounts = [];
  }

  // Ensure previous month (e.g. 2026-09) is archived in monthlyAccounts
  let prevMonthAccount = db.monthlyAccounts.find(a => a.month === prevPeriod);
  if (!prevMonthAccount) {
    // Generate previous month account from historical records
    prevMonthAccount = calculateMonthlyAccount(db, prevPeriod, 'open');
    db.monthlyAccounts.unshift(prevMonthAccount);
  }

  // Check if current month period already exists
  let currentMonthAccount = db.monthlyAccounts.find(a => a.month === currentPeriod);

  if (!currentMonthAccount) {
    console.log(`[MonthlyAccounting] Automatically opening new month: ${currentPeriod} (${dhaka.monthName})`);

    // Create fresh accounting period for the new month
    currentMonthAccount = calculateMonthlyAccount(db, currentPeriod, 'open');
    currentMonthAccount.id = `acc_${currentPeriod}`;
    currentMonthAccount.accounting_period_id = currentPeriod;
    currentMonthAccount.monthName = dhaka.monthName;
    currentMonthAccount.status = 'open';

    // Insert at front of monthly accounts
    db.monthlyAccounts.unshift(currentMonthAccount);
    db.currentMonthCalculation = currentMonthAccount;

    // Log audit for automatic new month opening
    logAudit(
      'System (Auto-Detector)',
      'AUTO_NEW_MONTH_OPENED',
      'monthly',
      `নতুন হিসাব মাস স্বয়ংক্রিয়ভাবে উন্মুক্ত করা হয়েছে: ${dhaka.monthName} (Period: ${currentPeriod})। পূর্বের সকল মাসের ডাটা অক্ষত ও সংরক্ষিত রয়েছে।`,
      `Previous Period: ${prevPeriod}`,
      `New Period: ${currentPeriod} (OPEN 🟢)`,
      'system',
      'MonthlyAccount',
      currentMonthAccount.id,
      '127.0.0.1'
    );

    // Create In-App Notification
    notify(
      `নতুন মাস শুরু — ${dhaka.monthName.split('(')[0].trim()}`,
      `${dhaka.monthName} মাসের হিসাব স্বয়ংক্রিয়ভাবে চালু হয়েছে। পূর্বের সকল মাসের হিসাব ও রিপোর্ট সংরক্ষিত রয়েছে।`,
      'info',
      'monthly'
    );

    // Optional SMS Announcement if configured
    if (db.settings?.accountingConfig?.sendNewMonthSms && Array.isArray(db.members)) {
      const activeMembers = db.members.filter(m => m.status === 'active' && m.phone);
      const smsTemplate =
        db.settings.accountingConfig.newMonthSmsTemplate ||
        `Bachelor Zone: নতুন মাস শুরু হয়েছে — ${dhaka.monthName.split('(')[0].trim()}। নতুন মাসের Meal, Bazar ও হিসাব এখন থেকে নতুনভাবে গণনা হবে।`;

      activeMembers.forEach(m => {
        db.smsLogs.unshift({
          id: `sms-newmonth-${Date.now()}-${m.id}`,
          timestamp: new Date().toISOString(),
          recipientId: m.id,
          recipientName: m.name,
          phone: m.phone,
          type: 'custom',
          message: smsTemplate,
          status: 'sent',
          provider: db.settings.smsGateway?.providerName || 'Bachelor Zone SMS',
          refId: `SMS-MONTH-${Date.now().toString().slice(-6)}`,
        });
      });
    }

    saveDatabase(db);
  } else {
    // Current month already exists: recalculate to make sure latest changes reflect
    const recalculated = calculateMonthlyAccount(db, currentPeriod, currentMonthAccount.status, currentMonthAccount.closedBy);
    const idx = db.monthlyAccounts.findIndex(a => a.month === currentPeriod);
    if (idx >= 0) {
      db.monthlyAccounts[idx] = { ...currentMonthAccount, ...recalculated };
      currentMonthAccount = db.monthlyAccounts[idx];
    }
    db.currentMonthCalculation = currentMonthAccount;
  }

  return currentMonthAccount;
}

/**
 * Closes a monthly account, generates permanent immutable snapshot, and locks period.
 */
export function closeMonthAccount(
  db: MessDatabaseState,
  month: string,
  user: { id: string; name: string; ipAddress?: string },
  sendMonthEndSms: boolean = true
): MonthlyAccount {
  const recalculated = calculateMonthlyAccount(db, month, 'closed', user.name);

  // Generate permanent immutable snapshot
  const activeMembers = (db.members || []).filter(m => m.status === 'active');
  const memberWiseBills: Record<string, any> = {};

  Object.entries(recalculated.statements || {}).forEach(([mId, stmt]) => {
    memberWiseBills[mId] = {
      totalMeals: stmt.totalMeals,
      mealCost: stmt.mealCost,
      sharedCosts: stmt.sharedCostsShare,
      individualCosts: stmt.individualCosts,
      totalCost: stmt.totalCost,
      paid: stmt.totalPaid,
      previousBalance: stmt.previousBalance || 0,
      balance: stmt.netBalance,
    };
  });

  const snapshot: MonthlyAccountSnapshot = {
    totalMembers: (db.members || []).length,
    activeMembers: activeMembers.length,
    totalMeals: recalculated.totalMeals,
    totalMealRelatedExpenses: recalculated.totalBazarExpense + (recalculated.totalMealRelatedExpense || 0),
    totalOtherExpenses: recalculated.totalSharedExpenses,
    finalMealRate: recalculated.mealRate,
    totalPayments: recalculated.totalCollected,
    memberWiseBills,
    bazarTotal: recalculated.totalBazarExpense,
    expenseTotal: recalculated.totalMessExpense,
    closedAt: new Date().toISOString(),
    closedBy: user.name,
  };

  recalculated.snapshot = snapshot;
  recalculated.status = 'closed';
  recalculated.closedAt = snapshot.closedAt;
  recalculated.closedBy = user.name;

  const existingIdx = db.monthlyAccounts.findIndex(a => a.month === month);
  if (existingIdx >= 0) {
    db.monthlyAccounts[existingIdx] = recalculated;
  } else {
    db.monthlyAccounts.unshift(recalculated);
  }

  if (db.currentMonthCalculation && db.currentMonthCalculation.month === month) {
    db.currentMonthCalculation = recalculated;
  }

  logAudit(
    user.name,
    'CLOSE_MONTH',
    'monthly',
    `${recalculated.monthName} এর মেস হিসাব চূড়ান্তভাবে সম্পন্ন ও লক (Closed 🔒) করা হয়েছে। মিল রেট: ৳${recalculated.mealRate}, মোট মিল: ${recalculated.totalMeals}, মোট খরচ: ৳${recalculated.totalMessExpense}`,
    'Status: OPEN',
    'Status: CLOSED 🔒 (Snapshot Stored)',
    user.id,
    'MonthlyAccount',
    recalculated.id,
    user.ipAddress
  );

  notify(
    'মাসিক হিসাব সম্পন্ন ও লক',
    `${recalculated.monthName} এর মেস হিসাব চূড়ান্তভাবে ক্লোজ করা হয়েছে। মিল রেট: ৳${recalculated.mealRate}।`,
    'success',
    'monthly'
  );

  // Send individualized SMS to each active member
  if (sendMonthEndSms && Array.isArray(db.members)) {
    Object.values(recalculated.statements || {}).forEach(stmt => {
      const member = db.members.find(m => m.id === stmt.memberId);
      if (member && member.phone) {
        const balanceText =
          stmt.netBalance > 0
            ? `বকেয়া: ৳${stmt.netBalance.toLocaleString()}`
            : `উদ্বৃত্ত: ৳${Math.abs(stmt.netBalance).toLocaleString()}`;

        const msg = `${recalculated.monthName} হিসাব: মোট মিল: ${stmt.totalMeals}, মিল খরচ: ৳${stmt.mealCost.toLocaleString()}, শেয়ার: ৳${stmt.sharedCostsShare.toLocaleString()}, জমা: ৳${stmt.totalPaid.toLocaleString()}, ${balanceText}। বিস্তারিত Bachelor Zone অ্যাপে দেখুন।`;

        db.smsLogs.unshift({
          id: `sms-stmt-${Date.now()}-${stmt.memberId}`,
          timestamp: new Date().toISOString(),
          recipientId: stmt.memberId,
          recipientName: stmt.memberName,
          phone: member.phone,
          type: 'monthly_account',
          message: msg,
          status: 'sent',
          provider: db.settings?.smsGateway?.providerName || 'Bachelor Zone SMS',
          refId: `SMS-STMT-${Date.now().toString().slice(-6)}`,
        });
      }
    });
  }

  // Propagate updated closing balances to next month if open
  const nextMonthPeriod = getNextMonthPeriod(month);
  const nextMonthIdx = db.monthlyAccounts.findIndex(a => a.month === nextMonthPeriod);
  if (nextMonthIdx >= 0) {
    const updatedNext = calculateMonthlyAccount(
      db,
      nextMonthPeriod,
      db.monthlyAccounts[nextMonthIdx].status,
      db.monthlyAccounts[nextMonthIdx].closedBy
    );
    db.monthlyAccounts[nextMonthIdx] = updatedNext;
    if (db.currentMonthCalculation && db.currentMonthCalculation.month === nextMonthPeriod) {
      db.currentMonthCalculation = updatedNext;
    }
  }

  saveDatabase(db);
  return recalculated;
}

/**
 * Reopens a closed monthly account for corrections.
 * Critical Rule: ONLY Jahidul Islam (Permanent Admin) can reopen a closed month!
 */
export function reopenMonthAccount(
  db: MessDatabaseState,
  month: string,
  user: { id: string; name: string; phone?: string; email?: string; ipAddress?: string }
): { success: boolean; error?: string; account?: MonthlyAccount } {
  if (!isPermanentAdmin(user)) {
    return {
      success: false,
      error: '403 — Permission Denied: শুধুমাত্র মেসের স্থায়ী প্রধান এডমিন জাহিদুল ইসলাম (Jahidul Islam) বন্ধ হিসাব পুনঃউন্মুক্ত (Reopen Month) করতে পারেন।',
    };
  }

  const existingIdx = db.monthlyAccounts.findIndex(a => a.month === month);
  if (existingIdx < 0) {
    return { success: false, error: 'নির্দিষ্ট মাসের মেস হিসাব পাওয়া যায়নি।' };
  }

  const target = db.monthlyAccounts[existingIdx];
  target.status = 'open';
  target.reopenedAt = new Date().toISOString();
  target.reopenedBy = user.name;

  if (db.currentMonthCalculation && db.currentMonthCalculation.month === month) {
    db.currentMonthCalculation.status = 'open';
  }

  logAudit(
    user.name,
    'REOPEN_MONTH',
    'monthly',
    `স্থায়ী প্রধান এডমিন জাহিদুল ইসলাম কর্তৃক ${target.monthName} এর মেস হিসাব পুনঃউন্মুক্ত (Reopened) করা হয়েছে। সংশোধনের পর পুনরায় হিসাব বন্ধ করুন।`,
    'Status: CLOSED 🔒',
    'Status: REOPENED 🟢',
    user.id,
    'MonthlyAccount',
    target.id,
    user.ipAddress
  );

  notify(
    'হিসাব পুনঃউন্মুক্ত',
    `${target.monthName} এর হিসাব প্রধান এডমিন কর্তৃক পুনরায় উন্মুক্ত করা হয়েছে।`,
    'warning',
    'monthly'
  );

  saveDatabase(db);
  return { success: true, account: target };
}
