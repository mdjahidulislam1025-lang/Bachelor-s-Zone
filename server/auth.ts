import crypto from 'crypto';
import { Request, Response } from 'express';
import { AuthSession, UserRole, Member, AdminProfile, MemberCredentials } from '../src/types.js';
import { normalizeBangladeshPhone, isValidBangladeshPhone } from '../src/utils/phoneUtils.js';

// Constant Primary Admin verified identifier (Permanent Primary Admin: Jahidul Islam)
export const PRIMARY_ADMIN_PHONE = '01516528497';
export const PRIMARY_ADMIN_PHONE_ALT = '01711234567';
export const PRIMARY_ADMIN_NAME = 'Jahidul Islam';
export const PRIMARY_ADMIN_EMAIL = 'mdjahidulislam1025@gmail.com';

const SESSION_SECRET = process.env.SESSION_SECRET || 'bachelor_zone_hmac_secret_key_prod_2026';

/**
 * Three Strict System Roles:
 * 1. PRIMARY_ADMIN: Jahidul Islam only.
 * 2. ADMIN: Other users explicitly authorized by Jahidul Islam.
 * 3. MEMBER: Regular mess members.
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

  const isJahidulPhone = normalizedPhone === PRIMARY_ADMIN_PHONE || normalizedPhone === PRIMARY_ADMIN_PHONE_ALT;
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
 * Tamper-proof HMAC-SHA256 Signed Session Tokens
 */
export interface SessionPayload {
  sessionId: string;
  userId: string;
  role: SystemRole;
  name: string;
  phone: string;
  email?: string;
  createdAt: number;
  expiresAt: number;
}

export function createSessionToken(payload: SessionPayload): string {
  const jsonStr = JSON.stringify(payload);
  const data = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * In-memory revocation tracking: maps userId to the timestamp of revocation
 */
export const userSessionRevokedAt = new Map<string, number>();

export function revokeUserSessions(userId: string): void {
  const now = Date.now();
  userSessionRevokedAt.set(userId, now);
  // Also delete from activeSessions Map
  for (const [token, sess] of activeSessions.entries()) {
    if (sess.userId === userId) {
      activeSessions.delete(token);
    }
  }
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null;
    }
    // Check if user sessions were revoked after token creation
    if (payload.userId && userSessionRevokedAt.has(payload.userId)) {
      const revokedAt = userSessionRevokedAt.get(payload.userId)!;
      if (payload.createdAt <= revokedAt) {
        return null;
      }
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Cookie Helpers
 */
export function setSessionCookie(res: Response, token: string, isProduction: boolean = false): void {
  res.cookie('bz_session', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie('bz_session', { path: '/' });
}

/**
 * In-memory fallback map of active sessions
 */
export const activeSessions = new Map<string, AuthSession>();

/**
 * In-memory rate limiting map for login attempts
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
 * Extracts authenticated session strictly from token or cookie
 */
export function getAuthenticatedUser(req: Request): AuthSession | null {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  const cookieToken = req.cookies?.bz_session;

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (authHeader) {
    token = authHeader.trim();
  } else if (cookieToken) {
    token = cookieToken.trim();
  }

  if (!token) return null;

  // 1. Verify signed token
  const verifiedPayload = verifySessionToken(token);
  if (verifiedPayload) {
    const isSuper = isPrimaryAdmin({
      id: verifiedPayload.userId,
      name: verifiedPayload.name,
      phone: verifiedPayload.phone,
      email: verifiedPayload.email,
      role: verifiedPayload.role,
    });

    const finalRole: SystemRole = isSuper ? 'PRIMARY_ADMIN' : verifiedPayload.role;

    return {
      token,
      userId: verifiedPayload.userId,
      role: finalRole as any,
      name: verifiedPayload.name,
      phone: verifiedPayload.phone,
      email: verifiedPayload.email,
      avatarColor: 'bg-emerald-600',
      loginTime: new Date(verifiedPayload.createdAt).toISOString(),
    };
  }

  // 2. Check activeSessions Map
  const session = activeSessions.get(token);
  if (!session) return null;

  // Session timeout: 7 days
  const loginTime = new Date(session.loginTime).getTime();
  if (Date.now() - loginTime > 7 * 24 * 60 * 60 * 1000) {
    activeSessions.delete(token);
    return null;
  }

  // Check if session was revoked
  if (session.userId && userSessionRevokedAt.has(session.userId)) {
    const revokedAt = userSessionRevokedAt.get(session.userId)!;
    if (loginTime <= revokedAt) {
      activeSessions.delete(token);
      return null;
    }
  }

  const isSuper = isPrimaryAdmin(session);
  const role: SystemRole = isSuper ? 'PRIMARY_ADMIN' : normalizeRole(session.role);

  return {
    ...session,
    role: role as any,
  };
}

/**
 * Middleware / helper to require authentication (Returns 401 if missing)
 */
export function requireAuth(req: Request, res: Response): AuthSession | null {
  const session = getAuthenticatedUser(req);
  if (!session) {
    res.status(401).json({
      success: false,
      error: 'অনুগ্রহ করে প্রথমে লগইন করুন (401 Unauthorized - Authentication required).',
    });
    return null;
  }
  return session;
}

/**
 * Middleware / helper to require Admin or Primary Admin role (Returns 401 if unauth, 403 if forbidden)
 */
export function requireAdmin(req: Request, res: Response): AuthSession | null {
  const session = requireAuth(req, res);
  if (!session) return null;

  const role = normalizeRole(session.role);
  const isSuper = isPrimaryAdmin(session);

  if (!isSuper && role !== 'PRIMARY_ADMIN' && role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'নিরাপত্তা নিষেধাজ্ঞা: শুধুমাত্র অনুমোদিত এডমিন (Admin) এই কার্য সম্পাদন করতে পারেন (403 Forbidden).',
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
      error: 'নিরাপত্তা নিষেধাজ্ঞা: শুধুমাত্র স্থায়ী প্রধান এডমিন জাহিদুল ইসলাম (Jahidul Islam) এই কার্য সম্পাদন করতে পারেন (403 Forbidden - Primary Admin only).',
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
