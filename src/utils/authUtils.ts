import { AuthSession, UserRole, AdminProfile } from '../types.js';
import { normalizeBangladeshPhone } from './phoneUtils.js';

export const AUTH_STORAGE_KEY = 'mess_manager_auth_session_v1';
export const LOCAL_DB_STORAGE_KEY = 'mess_manager_local_cache_v1';

/**
 * Universal SHA-256 hashing supporting both browser and Node.js
 */
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText.trim() + '_mess_salt_2026');
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Pure fallback
    let hash = 0;
    for (let i = 0; i < plainText.length; i++) {
      hash = (hash << 5) - hash + plainText.charCodeAt(i);
      hash |= 0;
    }
    return 'fb_' + Math.abs(hash).toString(16);
  }
}

/**
 * Synchronous hash comparison helper (with salt)
 */
export function simpleHashSync(str: string): string {
  let hash = 5381;
  const salted = str.trim() + '_mess_2026';
  for (let i = 0; i < salted.length; i++) {
    hash = ((hash << 5) + hash) + salted.charCodeAt(i);
  }
  return 'h_' + (hash >>> 0).toString(16);
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }
}

export function getSavedAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return null;
    const session: AuthSession = JSON.parse(saved);
    // Expiration check: sessions valid for 30 days
    const loginTime = new Date(session.loginTime).getTime();
    const now = Date.now();
    if (now - loginTime > 30 * 24 * 60 * 60 * 1000) {
      clearAuthSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

/**
 * Checks if a member/user is the Permanent Primary Admin (Jahidul Islam)
 */
export function isPermanentAdminUser(user?: { id?: string; name?: string; phone?: string; email?: string; role?: string } | null): boolean {
  if (!user) return false;
  const name = (user.name || '').toLowerCase();
  const normalizedPhone = normalizeBangladeshPhone(user.phone);
  const email = (user.email || '').toLowerCase();
  const role = (user.role || '').toUpperCase();

  const isPrimaryRole = role === 'PRIMARY_ADMIN';
  const isJahidulPhone = normalizedPhone === '01516528497' || normalizedPhone === '01711234567';
  const isJahidulEmail = email === 'mdjahidulislam1025@gmail.com';
  const isJahidulName = name.includes('jahidul') || name.includes('জাহিদুল');
  const isJahidulId = user.id === 'm1' || user.id === 'admin_m1';

  return isPrimaryRole || ((isJahidulPhone || isJahidulEmail || isJahidulId) && (isJahidulName || isJahidulPhone));
}

