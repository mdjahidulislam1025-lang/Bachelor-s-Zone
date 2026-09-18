import {
  MessDatabaseState,
  MonthlyAccount,
  MemberMonthlyStatement,
} from '../types.js';

export function calculateMonthlyAccount(
  db: MessDatabaseState,
  month: string = '2026-09',
  closeStatus: 'open' | 'closed' = 'open',
  closedBy?: string
): MonthlyAccount {
  const mealsInMonth = db.dailyMeals.filter(m => m.date.startsWith(month));
  const bazarInMonth = db.bazarRecords.filter(b => b.date.startsWith(month));
  const expensesInMonth = db.expenses.filter(e => e.date.startsWith(month));
  const paymentsInMonth = db.payments.filter(
    p => p.date.startsWith(month) && p.status === 'verified'
  );

  // Sum total bazar
  const totalBazarExpense = bazarInMonth.reduce(
    (sum, b) => sum + (Number(b.totalAmount) || 0),
    0
  );

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
  const mealRate =
    totalMeals > 0 ? parseFloat((totalBazarExpense / totalMeals).toFixed(2)) : 0;

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

  const totalMessExpense = totalBazarExpense + totalSharedExpenses;

  // Payments per member
  const memberPayments: Record<string, number> = {};
  db.members.forEach(m => {
    memberPayments[m.id] = 0;
  });
  paymentsInMonth.forEach(p => {
    memberPayments[p.memberId] =
      (memberPayments[p.memberId] || 0) + (Number(p.amount) || 0);
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

    const memberShare = (total: number) => (isMemberActive && activeMembers.length > 0 ? Math.round(total / activeMembers.length) : 0);

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
        rentShare: memberShare(rentTotal),
        gasShare: memberShare(gasTotal),
        electricityShare: memberShare(electricityTotal),
        maidSalaryShare: memberShare(maidSalaryTotal),
        internetShare: memberShare(internetTotal),
        cleaningShare: memberShare(cleaningTotal),
        otherShared: memberShare(otherSharedTotal),
      },
    };
  });

  const monthNames: Record<string, string> = {
    '2026-08': 'আগস্ট ২০২৬ (August 2026)',
    '2026-09': 'সেপ্টেম্বর ২০২৬ (September 2026)',
    '2026-10': 'অক্টোবর ২০২৬ (October 2026)',
  };

  return {
    id: `acc_${month}`,
    month,
    monthName: monthNames[month] || `${month} মেস হিসাব`,
    status: closeStatus,
    closedAt: closeStatus === 'closed' ? new Date().toISOString() : undefined,
    closedBy: closeStatus === 'closed' ? closedBy || 'Admin' : undefined,
    totalMeals,
    totalBazarExpense,
    mealRate,
    totalSharedExpenses,
    totalMessExpense,
    totalCollected,
    totalDue,
    totalAdvance,
    statements,
    formulaNote: 'মিল রেট = মোট বাজার খরচ ÷ মোট মিল সংখ্যা; মোট খরচ = (সদস্যের মিল × মিল রেট) + শেয়ার্ড খরচ',
  };
}
