import { MessDatabaseState } from '../types.js';
import { getInitialMessData } from './initialData.js';
import { calculateMonthlyAccount } from '../utils/calculator.js';
import { getCurrentDhakaPeriod, getPreviousMonthPeriod } from '../utils/monthlyPeriodUtils.js';

const STORAGE_KEY = 'bachelor_zone_mess_db_v4';

export function getInitialOrSavedState(): MessDatabaseState {
  const dhaka = getCurrentDhakaPeriod();
  const currentPeriod = dhaka.periodId;
  const prevPeriod = getPreviousMonthPeriod(currentPeriod);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          Array.isArray(parsed.members) &&
          Array.isArray(parsed.dailyMeals) &&
          Array.isArray(parsed.bazarRecords) &&
          Array.isArray(parsed.expenses)
        ) {
          if (!Array.isArray(parsed.monthlyAccounts)) {
            parsed.monthlyAccounts = [];
          }
          // Ensure previous month is archived
          if (!parsed.monthlyAccounts.some((a: any) => a.month === prevPeriod)) {
            const prevAcc = calculateMonthlyAccount(parsed, prevPeriod, 'open');
            parsed.monthlyAccounts.unshift(prevAcc);
          }
          // Ensure current month calculation is up to date
          const activeStatus = parsed.currentMonthCalculation?.status || 'open';
          parsed.currentMonthCalculation = calculateMonthlyAccount(parsed, currentPeriod, activeStatus);

          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial dataset', e);
    }
  }

  // Fall back to clean initial data
  const initial = getInitialMessData();
  if (!Array.isArray(initial.monthlyAccounts)) {
    initial.monthlyAccounts = [];
  }
  // Ensure previous month account is calculated and archived
  if (!initial.monthlyAccounts.some(a => a.month === prevPeriod)) {
    const prevAcc = calculateMonthlyAccount(initial, prevPeriod, 'open');
    initial.monthlyAccounts.unshift(prevAcc);
  }
  // Current month calculation
  initial.currentMonthCalculation = calculateMonthlyAccount(initial, currentPeriod, 'open');

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {
      // ignore
    }
  }
  return initial;
}

export function saveLocalState(state: MessDatabaseState): void {
  const dhaka = getCurrentDhakaPeriod();
  const currentPeriod = dhaka.periodId;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const targetMonth = state.currentMonthCalculation?.month || currentPeriod;
      const targetStatus = state.currentMonthCalculation?.status || 'open';
      const updated = {
        ...state,
        currentMonthCalculation: calculateMonthlyAccount(state, targetMonth, targetStatus),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }
}

export function resetLocalState(): MessDatabaseState {
  const dhaka = getCurrentDhakaPeriod();
  const currentPeriod = dhaka.periodId;
  const prevPeriod = getPreviousMonthPeriod(currentPeriod);

  const initial = getInitialMessData();
  if (!Array.isArray(initial.monthlyAccounts)) {
    initial.monthlyAccounts = [];
  }
  if (!initial.monthlyAccounts.some(a => a.month === prevPeriod)) {
    const prevAcc = calculateMonthlyAccount(initial, prevPeriod, 'open');
    initial.monthlyAccounts.unshift(prevAcc);
  }
  initial.currentMonthCalculation = calculateMonthlyAccount(initial, currentPeriod, 'open');

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {
      // ignore
    }
  }
  return initial;
}
