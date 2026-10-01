import {
  MessDatabaseState,
  MonthlyAccount,
  MemberMonthlyStatement,
} from '../types.js';
import {
  getMonthNameBengali,
  getPreviousMonthPeriod,
  getCurrentDhakaPeriod,
} from './monthlyPeriodUtils.js';

export function calculateMonthlyAccount(
  db: MessDatabaseState,
  month?: string,
  closeStatus: 'open' | 'closed' = 'open',
  closedBy?: string
): MonthlyAccount {
  const currentDhaka = getCurrentDhakaPeriod();
  const targetMonth = month || currentDhaka.periodId;

  // Filter records belonging to this accounting period
  const mealsInMonth = (db.dailyMeals || []).filter(
    m => m.date.startsWith(targetMonth) || (m as any).periodId === targetMonth
  );
  const bazarInMonth = (db.bazarRecords || []).filter(
    b => b.date.startsWith(targetMonth) || (b as any).periodId === targetMonth
  );
  const expensesInMonth = (db.expenses || []).filter(
    e => e.date.startsWith(targetMonth) || e.periodId === targetMonth
  );
  const paymentsInMonth = (db.payments || []).filter(
    p => (p.date.startsWith(targetMonth) || p.periodId === targetMonth) && p.status === 'verified'
  );

  // Sum total bazar
  const totalBazarExpense = bazarInMonth.reduce(
    (sum, b) => sum + (Number(b.totalAmount) || 0),
    0
  );

  // Classify expenses
  let mealRelatedFromExpenses = 0;
  let rentTotal = 0;
  let gasTotal = 0;
  let electricityTotal = 0;
  let maidSalaryTotal = 0;
  let internetTotal = 0;
  let cleaningTotal = 0;
  let otherSharedTotal = 0;
  const memberIndividualCosts: Record<string, number> = {};

  (db.members || []).forEach(m => {
    memberIndividualCosts[m.id] = 0;
  });

  expensesInMonth.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    const classification = exp.expenseClassification;

    if (classification === 'excluded') {
      return;
    }

    if (classification === 'individual' && exp.targetMemberId) {
      memberIndividualCosts[exp.targetMemberId] =
        (memberIndividualCosts[exp.targetMemberId] || 0) + amt;
      return;
    }

    if (classification === 'meal_related' || exp.category === 'bazar') {
      mealRelatedFromExpenses += amt;
      return;
    }

    // Shared equal expenses
    switch (exp.category) {
      case 'rent':
        rentTotal += amt;
        break;
      case 'gas':
        gasTotal += amt;
        break;
      case 'electricity':
        electricityTotal += amt;
        break;
      case 'maid_salary':
        maidSalaryTotal += amt;
        break;
      case 'internet':
        internetTotal += amt;
        break;
      case 'cleaning':
        cleaningTotal += amt;
        break;
      default:
        otherSharedTotal += amt;
        break;
    }
  });

  const totalMealRelatedExpense = totalBazarExpense + mealRelatedFromExpenses;

  // Sum total meals and member meals
  const memberMealCounts: Record<string, number> = {};
  let totalMeals = 0;

  (db.members || []).forEach(m => {
    memberMealCounts[m.id] = 0;
  });

  mealsInMonth.forEach(dm => {
    Object.entries(dm.records || {}).forEach(([memberId, rec]: [string, any]) => {
      const mealSum = (rec.breakfast || 0) + (rec.lunch || 0) + (rec.dinner || 0);
      memberMealCounts[memberId] = (memberMealCounts[memberId] || 0) + mealSum;
      totalMeals += mealSum;
    });
  });

  // Calculate meal rate: Total Meal-related expense ÷ Total Meals (0 if no meals)
  const mealRate =
    totalMeals > 0 ? parseFloat((totalMealRelatedExpense / totalMeals).toFixed(2)) : 0;

  // Active members for this accounting period
  const activeMembers = (db.members || []).filter(m => m.status === 'active');
  const activeCount = Math.max(activeMembers.length, 1);

  const rentShare = Math.round(rentTotal / activeCount);
  const gasShare = Math.round(gasTotal / activeCount);
  const electricityShare = Math.round(electricityTotal / activeCount);
  const maidSalaryShare = Math.round(maidSalaryTotal / activeCount);
  const internetShare = Math.round(internetTotal / activeCount);
  const cleaningShare = Math.round(cleaningTotal / activeCount);
  const otherShared = Math.round(otherSharedTotal / activeCount);

  const totalSharedPerMember =
    rentShare +
    gasShare +
    electricityShare +
    maidSalaryShare +
    internetShare +
    cleaningShare +
    otherShared;

  const totalSharedExpenses =
    rentTotal +
    gasTotal +
    electricityTotal +
    maidSalaryTotal +
    internetTotal +
    cleaningTotal +
    otherSharedTotal;

  const totalIndividualExpenses = Object.values(memberIndividualCosts).reduce(
    (a, b) => a + b,
    0
  );

  const totalMessExpense =
    totalMealRelatedExpense + totalSharedExpenses + totalIndividualExpenses;

  // Payments per member in this period
  const memberPayments: Record<string, number> = {};
  (db.members || []).forEach(m => {
    memberPayments[m.id] = 0;
  });
  paymentsInMonth.forEach(p => {
    memberPayments[p.memberId] =
      (memberPayments[p.memberId] || 0) + (Number(p.amount) || 0);
  });

  // Check previous month balance carry forward
  const shouldCarryForward =
    db.settings?.accountingConfig?.carryForwardPreviousBalance !== false;
  const prevMonthPeriod = getPreviousMonthPeriod(targetMonth);
  const prevMonthAccount = (db.monthlyAccounts || []).find(
    a => a.month === prevMonthPeriod
  );

  // Build statement for each member
  const statements: Record<string, MemberMonthlyStatement> = {};
  let totalCollected = 0;
  let totalDue = 0;
  let totalAdvance = 0;

  (db.members || []).forEach(m => {
    const isMemberActive = m.status === 'active';
    const mMeals = memberMealCounts[m.id] || 0;
    const mMealCost = Math.round(mMeals * mealRate);
    const mSharedShare = isMemberActive ? totalSharedPerMember : 0;
    const mIndividual = memberIndividualCosts[m.id] || 0;
    const mCurrentCost = mMealCost + mSharedShare + mIndividual;

    // Previous balance carry-forward
    let previousBalance = 0;
    if (shouldCarryForward && prevMonthAccount?.statements?.[m.id]) {
      previousBalance = prevMonthAccount.statements[m.id].netBalance || 0;
    }

    const mPaid = memberPayments[m.id] || 0;
    const netBalance = previousBalance + mCurrentCost - mPaid;

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
      individualCosts: mIndividual,
      currentMonthCost: mCurrentCost,
      previousBalance,
      totalCost: mCurrentCost,
      totalPaid: mPaid,
      currentMonthPaid: mPaid,
      netBalance,
      breakdown: {
        rentShare: isMemberActive ? rentShare : 0,
        gasShare: isMemberActive ? gasShare : 0,
        electricityShare: isMemberActive ? electricityShare : 0,
        maidSalaryShare: isMemberActive ? maidSalaryShare : 0,
        internetShare: isMemberActive ? internetShare : 0,
        cleaningShare: isMemberActive ? cleaningShare : 0,
        otherShared: isMemberActive ? otherShared : 0,
      },
    };
  });

  const monthName = getMonthNameBengali(targetMonth);
  const formulaNote =
    totalMeals > 0
      ? `মিল রেট = মোট মিল খরচ (৳${totalMealRelatedExpense.toLocaleString()}) ÷ মোট মিল (${totalMeals} টি) = ৳${mealRate.toFixed(2)}। ফিক্সড খরচাদি ${activeCount} জন সক্রিয় সদস্যের মাঝে সমবণ্টন।`
      : `এখনও কোন মিল যুক্ত হয়নি। মোট মিল খরচ: ৳${totalMealRelatedExpense.toLocaleString()}। নতুন মাসের মিল চালু হলে স্বয়ংক্রিয় মিল রেট তৈরি হবে।`;

  return {
    id: `acc_${targetMonth}`,
    month: targetMonth,
    accounting_period_id: targetMonth,
    monthName,
    status: closeStatus,
    closedAt: closeStatus === 'closed' ? new Date().toISOString() : undefined,
    closedBy: closeStatus === 'closed' ? closedBy || 'Admin' : undefined,
    totalMembers: (db.members || []).length,
    activeMembers: activeCount,
    totalMeals,
    totalBazarExpense,
    totalMealRelatedExpense,
    mealRate,
    totalSharedExpenses,
    totalIndividualExpenses,
    totalMessExpense,
    totalCollected,
    totalDue,
    totalAdvance,
    statements,
    formulaNote,
  };
}
