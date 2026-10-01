/**
 * Monthly Accounting Period and Dhaka Timezone Utilities
 * Implements Bangladesh (Asia/Dhaka) timezone auto-detection and period calculations
 */

export interface DhakaPeriodInfo {
  dateStr: string; // "YYYY-MM-DD" e.g. "2026-10-01"
  periodId: string; // "YYYY-MM" e.g. "2026-10"
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  monthName: string; // e.g. "অক্টোবর ২০২৬ (October 2026)"
}

const BENGALI_MONTH_NAMES = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const ENGLISH_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliNumber(num: number | string): string {
  return String(num).replace(/[0-9]/g, d => BENGALI_DIGITS[parseInt(d, 10)]);
}

/**
 * Returns month title in Bengali + English format e.g. "অক্টোবর ২০২৬ (October 2026)"
 */
export function getMonthNameBengali(periodId: string): string {
  if (!periodId || !periodId.includes('-')) return periodId || '';
  const [yearStr, monthStr] = periodId.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return periodId;
  }
  const bnMonth = BENGALI_MONTH_NAMES[month - 1];
  const enMonth = ENGLISH_MONTH_NAMES[month - 1];
  const bnYear = toBengaliNumber(year);
  return `${bnMonth} ${bnYear} (${enMonth} ${year})`;
}

/**
 * Gets current date & accounting period using Asia/Dhaka timezone (UTC+6)
 */
export function getCurrentDhakaPeriod(date: Date = new Date()): DhakaPeriodInfo {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => parts.find(p => p.type === type)?.value || '00';

    const year = parseInt(getVal('year'), 10);
    const month = parseInt(getVal('month'), 10);
    const day = parseInt(getVal('day'), 10);

    const yearStr = String(year);
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');

    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    const periodId = `${yearStr}-${monthStr}`;

    return {
      dateStr,
      periodId,
      year,
      month,
      day,
      monthName: getMonthNameBengali(periodId),
    };
  } catch (e) {
    // Fallback if environment lacks timezone data
    const d = new Date(date.getTime() + 6 * 3600 * 1000); // approximate UTC+6
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const yearStr = String(year);
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    const periodId = `${yearStr}-${monthStr}`;
    return {
      dateStr,
      periodId,
      year,
      month,
      day,
      monthName: getMonthNameBengali(periodId),
    };
  }
}

/**
 * Returns the immediate preceding period string (e.g. "2026-10" -> "2026-09", "2027-01" -> "2026-12")
 */
export function getPreviousMonthPeriod(periodId: string): string {
  if (!periodId || !periodId.includes('-')) return '';
  const [yearStr, monthStr] = periodId.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Returns the immediate next period string (e.g. "2026-09" -> "2026-10", "2026-12" -> "2027-01")
 */
export function getNextMonthPeriod(periodId: string): string {
  if (!periodId || !periodId.includes('-')) return '';
  const [yearStr, monthStr] = periodId.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
