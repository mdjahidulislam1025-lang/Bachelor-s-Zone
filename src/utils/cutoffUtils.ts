import { MealCutoffSettings, MealType } from '../types.js';

export interface DhakaTimeInfo {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:MM (24h)
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  rawDate: Date;
}

/**
 * Returns current Date & Time according to configured timezone (default Asia/Dhaka).
 */
export function getDhakaTime(timezone: string = 'Asia/Dhaka'): DhakaTimeInfo {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getVal = (type: string) => parts.find(p => p.type === type)?.value || '00';

    const year = parseInt(getVal('year'), 10);
    const month = parseInt(getVal('month'), 10);
    const day = parseInt(getVal('day'), 10);
    const hour = parseInt(getVal('hour'), 10);
    const minute = parseInt(getVal('minute'), 10);

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    return {
      dateStr,
      timeStr,
      year,
      month,
      day,
      hour,
      minute,
      rawDate: now,
    };
  } catch (err) {
    // Fallback if timezone unsupported
    const iso = now.toISOString();
    return {
      dateStr: iso.slice(0, 10),
      timeStr: iso.slice(11, 16),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      rawDate: now,
    };
  }
}

export interface MealLockCheckResult {
  isLocked: boolean;
  reason?: string;
  cutoffTime: string;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  timeRemaining?: string;
}

/**
 * Evaluates whether a member can turn a meal ON/OFF for a given date.
 */
export function checkMealLock(
  date: string,
  mealType: MealType,
  settings?: MealCutoffSettings,
  forcedDhakaTime?: DhakaTimeInfo
): MealLockCheckResult {
  const cutoffConfig: MealCutoffSettings = settings || {
    breakfastCutoff: '06:00',
    lunchCutoff: '10:00',
    dinnerCutoff: '16:00',
    timezone: 'Asia/Dhaka',
    enableReminders: true,
    enableSmsNotification: false,
  };

  const dhaka = forcedDhakaTime || getDhakaTime(cutoffConfig.timezone);
  const cutoffTime =
    mealType === 'breakfast'
      ? cutoffConfig.breakfastCutoff
      : mealType === 'lunch'
      ? cutoffConfig.lunchCutoff
      : cutoffConfig.dinnerCutoff;

  // Past date
  if (date < dhaka.dateStr) {
    return {
      isLocked: true,
      reason: 'অতীতের তারিখের মিল স্বয়ংক্রিয়ভাবে বন্ধ রয়েছে (Past date locked).',
      cutoffTime,
      isPast: true,
      isToday: false,
      isFuture: false,
    };
  }

  // Future date: Always unlocked
  if (date > dhaka.dateStr) {
    return {
      isLocked: false,
      cutoffTime,
      isPast: false,
      isToday: false,
      isFuture: true,
    };
  }

  // Today's date: check against HH:MM cutoff
  const [cutHour, cutMinute] = cutoffTime.split(':').map(n => parseInt(n, 10));
  const currentMinutes = dhaka.hour * 60 + dhaka.minute;
  const cutoffMinutes = cutHour * 60 + cutMinute;

  if (currentMinutes >= cutoffMinutes) {
    return {
      isLocked: true,
      reason: 'Meal change time has ended for this meal. (কাট-অফ সময় শেষ হয়ে গেছে)',
      cutoffTime,
      isPast: false,
      isToday: true,
      isFuture: false,
    };
  }

  const diffMinutes = cutoffMinutes - currentMinutes;
  const diffHours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const remainingStr =
    diffHours > 0 ? `${diffHours} ঘণ্টা ${mins} মিনিট বাকি` : `${mins} মিনিট বাকি`;

  return {
    isLocked: false,
    cutoffTime,
    isPast: false,
    isToday: true,
    isFuture: false,
    timeRemaining: remainingStr,
  };
}

/**
 * Format 24-hour cutoff time into user-friendly 12-hour Bangla/English string.
 */
export function formatCutoffTime(timeStr: string, language: 'bn' | 'en' = 'bn'): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const periodEn = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;

  if (language === 'en') {
    return `${h12}:${m} ${periodEn}`;
  }

  // Bangla formatting
  let periodBn = 'সকাল';
  if (h >= 12 && h < 15) periodBn = 'দুপুর';
  else if (h >= 15 && h < 18) periodBn = 'বিকাল';
  else if (h >= 18 && h < 20) periodBn = 'সন্ধ্যা';
  else if (h >= 20 || h < 5) periodBn = 'রাত';

  const bnNumbers: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  const toBn = (str: string | number) =>
    String(str)
      .split('')
      .map(ch => bnNumbers[ch] || ch)
      .join('');

  return `${periodBn} ${toBn(h12)}:${toBn(m)} মিনিট`;
}
