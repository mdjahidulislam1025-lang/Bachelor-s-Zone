import { MessDatabaseState } from '../types.js';
import { getInitialMessData } from './initialData.js';
import { calculateMonthlyAccount } from '../utils/calculator.js';

const STORAGE_KEY = 'bachelor_zone_mess_db_v2';

export function getInitialOrSavedState(): MessDatabaseState {
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
          // Ensure current month calculation is up to date
          if (!parsed.currentMonthCalculation) {
            parsed.currentMonthCalculation = calculateMonthlyAccount(parsed, '2026-09', 'open');
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial dataset', e);
    }
  }

  // Fall back to clean initial data
  const initial = getInitialMessData();
  initial.currentMonthCalculation = calculateMonthlyAccount(initial, '2026-09', 'open');
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
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Re-calculate current month calculation so all views reflect latest numbers
      const updated = {
        ...state,
        currentMonthCalculation: calculateMonthlyAccount(state, '2026-09', state.currentMonthCalculation?.status || 'open'),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }
}

export function resetLocalState(): MessDatabaseState {
  const initial = getInitialMessData();
  initial.currentMonthCalculation = calculateMonthlyAccount(initial, '2026-09', 'open');
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {
      // ignore
    }
  }
  return initial;
}
