/**
 * Bangladesh Phone Number Utilities
 * Supports formats:
 * - 01712345678
 * - 8801712345678
 * - +8801712345678
 * - 017 1234 5678, 017-1234-5678, etc.
 * Normalizes to standard 11 digits: '01XXXXXXXXX'
 */

export function normalizeBangladeshPhone(input?: string | null): string {
  if (!input) return '';
  // Remove all non-digit characters
  let digits = input.replace(/\D/g, '');

  // If starts with 8801, strip 88
  if (digits.startsWith('8801') && digits.length >= 13) {
    digits = digits.slice(2);
  }

  // If starts with 880 (without 1 directly, or length 13)
  if (digits.startsWith('880') && digits.length === 13) {
    digits = digits.slice(2);
  }

  // Trim to standard 11 digits if has prefix leftovers
  if (digits.length > 11 && digits.startsWith('01')) {
    digits = digits.slice(0, 11);
  }

  return digits;
}

/**
 * Validates whether string is a valid Bangladesh mobile number:
 * Starts with 013, 014, 015, 016, 017, 018, 019 and is exactly 11 digits
 */
export function isValidBangladeshPhone(input?: string | null): boolean {
  if (!input) return false;
  const normalized = normalizeBangladeshPhone(input);
  return /^01[3-9]\d{8}$/.test(normalized);
}

/**
 * Formats a normalized phone for display: 01712-345678
 */
export function formatBangladeshPhone(input?: string | null): string {
  const norm = normalizeBangladeshPhone(input);
  if (norm.length === 11) {
    return `${norm.slice(0, 5)}-${norm.slice(5)}`;
  }
  return input || '';
}
