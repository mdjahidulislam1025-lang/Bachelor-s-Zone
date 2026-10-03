import crypto from 'crypto';
import { Request, Response } from 'express';
import { AuthSession, UserRole, Member, AdminProfile, MemberCredentials } from '../src/types.js';
import { normalizeBangladeshPhone, isValidBangladeshPhone } from '../src/utils/phoneUtils.js';

// Constant Primary Admin verified identifier
export const PRIMARY_ADMIN_PHONE = '01516528497';
export const PRIMARY_ADMIN_NAME = 'Jahidul Islam';
export const PRIMARY_ADMIN_EMAIL = 'mdjahidulislam1025@gmail.com';

/**
 * Roles
 */
export type SystemRole = 'PRIMARY_ADMIN' | 'ADMIN' | 'MEMBER';

export function normalizeRole(role?: string | null): SystemRole {
  if (!role) return 'MEMBER';
  const r = role.toUpperCase();
  if (r === 'PRIMARY_ADMIN' || r === 'SUPER_ADMIN') return 'PRIMARY_ADMIN';
  if (r === 'ADMIN' || r === 'TREASURER') return 'ADMIN';
  return 'MEMBER';
}

/**
 * Verifies if user is the permanent Primary Admin (Jahidul Islam)
 */
export function isPrimaryAdmin(user?: { id?: string; name?: string; phone?: string; email?: string; role?: string } | null): boolean {
  if (!user) return false;
  const normalizedPhone = normalizeBangladeshPhone(user.phone);
  const normalizedName = (user.name || '').trim().toLowerCase();
  const normalizedEmail = (user.email || '').trim().toLowerCase();
  const role = (user.role || '').toUpperCase();

  const isJahidulPhone = normalizedPhone === PRIMARY_ADMIN_PHONE;
  const isJahidulEmail = normalizedEmail === PRIMARY_ADMIN_EMAIL;
  const isJahidulName = normalizedName.includes('jahidul') || normalizedName.includes('জাহিদুল');
  const isJahidulId = user.id === 'm1' || user.id === 'admin_m1';

  return (isJahidulPhone || isJahidulEmail || isJahidulId) && (isJahidulName || isJahidulPhone || role === 'PRIMARY_ADMIN');
}

/**
 * Cryptographic salted password hash
 * Format: scrypt:<salt>:<derivedKeyHex>
 */
export function hashPasswordSecure(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password.trim(), salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against stored hash (supporting scrypt and legacy hashes)
 */
export function verifyPasswordSecure(password: string, storedHash?: string | null): boolean {
  if (!storedHash || !password) return false;

  const cleanPass = password.trim();

  // 1. Scrypt salted hash format
  if (storedHash.startsWith('scrypt:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, expectedHashHex] = parts;
    const derivedKey = crypto.scryptSync(cleanPass, salt, 64);
    const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
    const expectedBuffer = Buffer.from(expectedHashHex, 'hex');
    if (keyBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(keyBuffer, expectedBuffer);
  }

  // 2. Legacy hash format: h_<hex>
  if (storedHash.startsWith('h_')) {
    let hash = 5381;
    const salted = cleanPass + '_mess_2026';
    for (let i = 0; i < salted.length; i++) {
      hash = ((hash << 5) + hash) + salted.charCodeAt(i);
    }
    const computedLegacy = 'h_' + (hash >>> 0).toString(16);
    return computedLegacy === storedHash;
  }

  // 3. Direct SHA256 fallback
  const sha256 = crypto.createHash('sha256').update(cleanPass + '_mess_salt_2026').digest('hex');
  if (sha256 === storedHash) return true;

  return false;
}

/**
 * In-memory active sessions store
 */
export const activeSessions = new Map<string, AuthSession>();

/**
 * In-memory rate limiting map for login attempts
 * Key: ip + ':' + normalizedPhone
 */
interface RateLimitAttempt {
  count: number;
  lastTime: number;
  lockUntil?: number;
}
export const loginRateLimiter = new Map<string, RateLimitAttempt>();

export function checkLoginRateLimit(ip: string, identifier: string): { isBlocked: boolean; retryAfterMinutes?: number } {
  const key = `${ip}:${identifier}`;
  const now = Date.now();
  const attempt = loginRateLimiter.get(key);

  if (!attempt) return { isBlocked: false };

  // If locked
  if (attempt.lockUntil && now < attempt.lockUntil) {
    const remainingMinutes = Math.ceil((attempt.lockUntil - now) / 60000);
    return { isBlocked: true, retryAfterMinutes: remainingMinutes };
  }

  // If previous window expired (> 5 minutes), reset
  if (now - attempt.lastTime > 5 * 60 * 1000) {
    loginRateLimiter.delete(key);
    return { isBlocked: false };
  }

  // If 5 attempts within 5 minutes, lock for 10 minutes
  if (attempt.count >= 5) {
    attempt.lockUntil = now + 10 * 60 * 1000;
    return { isBlocked: true, retryAfterMinutes: 10 };
  }

  return { isBlocked: false };
}

export function recordFailedLogin(ip: string, identifier: string): void {
  const key = `${ip}:${identifier}`;
  const now = Date.now();
  const attempt = loginRateLimiter.get(key);
  if (!attempt) {
    loginRateLimiter.set(key, { count: 1, lastTime: now });
  } else {
    attempt.count += 1;
    attempt.lastTime = now;
    if (attempt.count >= 5) {
      attempt.lockUntil = now + 10 * 60 * 1000; // 10 minutes lockout
    }
  }
}

export function resetFailedLogin(ip: string, identifier: string): void {
  loginRateLimiter.delete(`${ip}:${identifier}`);
}

/**
 * Extracts authenticated session from request
 */
export function getAuthenticatedUser(req: Request): AuthSession | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const session = activeSessions.get(token);
  if (!session) return null;

  // Session timeout: 30 days
  const loginTime = new Date(session.loginTime).getTime();
  if (Date.now() - loginTime > 30 * 24 * 60 * 60 * 1000) {
    activeSessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Middleware / helper to require authentication
 */
export function requireAuth(req: Request, res: Response): AuthSession | null {
  const session = getAuthenticatedUser(req);
  if (!session) {
    res.status(401).json({
      success: false,
      error: 'অননুমোদিত প্রবেশাধিকার। অনুগ্রহ করে পুনরায় লগইন করুন (Unauthorized)',
    });
    return null;
  }
  return session;
}

/**
 * Middleware / helper to require Admin or Primary Admin role
 */
export function requireAdmin(req: Request, res: Response): AuthSession | null {
  const session = requireAuth(req, res);
  if (!session) return null;

  const isSuper = isPrimaryAdmin(session);
  const role = normalizeRole(session.role);

  if (!isSuper && role !== 'PRIMARY_ADMIN' && role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'এই কাজটি করার জন্য এডমিন অনুমতি প্রয়োজন (403 Forbidden)',
    });
    return null;
  }

  return session;
}

/**
 * Middleware / helper to strictly require Permanent Primary Admin (Jahidul Islam)
 */
export function requirePrimaryAdmin(req: Request, res: Response): AuthSession | null {
  const session = requireAuth(req, res);
  if (!session) return null;

  if (!isPrimaryAdmin(session)) {
    res.status(403).json({
      success: false,
      error: 'শুধুমাত্র স্থায়ী প্রধান এডমিন (Jahidul Islam) এই কাজটি সম্পাদন করতে পারেন (403 Forbidden)',
    });
    return null;
  }

  return session;
}

/**
 * Sanitizes member records by stripping passwords, hashes, and sensitive internal fields
 */
export function sanitizeMember(m: Member): Omit<Member, 'passwordHash' | 'salt'> {
  const copy: any = { ...m };
  delete copy.passwordHash;
  delete copy.salt;
  delete copy.password;
  return copy;
}
