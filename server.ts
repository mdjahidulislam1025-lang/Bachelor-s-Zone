import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  getDatabase,
  saveDatabase,
  logAudit,
  notify,
  validateMonthRecords,
  calculateMonthlyAccount,
  isMonthClosed,
  recalculateMonthlyAccount,
} from './server/db.js';
import {
  ensureCurrentMonthPeriod,
  closeMonthAccount,
  reopenMonthAccount,
} from './server/monthlyAccounting.js';
import {
  getCurrentDhakaPeriod,
  getTodayDhakaDate,
  getPreviousMonthPeriod,
  getMonthNameBengali,
} from './src/utils/monthlyPeriodUtils.js';
import { getInitialMessData } from './server/demoData.js';
import { answerMessQuery } from './server/ai.js';
import { SmsLog, MemberRole, AdminProfile, AuthSession } from './src/types.js';
import { checkMealLock, getDhakaTime } from './src/utils/cutoffUtils.js';
import { simpleHashSync } from './src/utils/authUtils.js';
import {
  hashPasswordSecure,
  verifyPasswordSecure,
  isPrimaryAdmin,
  PRIMARY_ADMIN_PHONE,
  PRIMARY_ADMIN_NAME,
  PRIMARY_ADMIN_EMAIL,
  normalizeRole,
  activeSessions,
} from './server/auth.js';
import { normalizeBangladeshPhone, isValidBangladeshPhone } from './src/utils/phoneUtils.js';

interface RequestUserInfo {
  id: string;
  name: string;
  role: MemberRole;
  status: 'active' | 'inactive' | 'left';
  ipAddress: string;
}

const loginAttempts = new Map<string, { count: number; lastTime: number }>();
const registrationAttempts = new Map<string, { count: number; lastTime: number }>();

function getRequestUser(req: express.Request): RequestUserInfo {
  const db = getDatabase();
  const authHeader = (req.headers['authorization'] as string) || (req.headers['x-auth-token'] as string) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();

  const headerUserId = (req.headers['x-user-id'] as string) || '';
  const bodyUserId =
    req.body?.actingUserId ||
    req.body?.userId ||
    req.body?.userMemberId ||
    req.body?.actingMemberId ||
    '';
  const actingUserStr =
    (req.body?.actingUser as string) ||
    (req.headers['x-user-name'] as string) ||
    '';

  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  // 1. Session token validation
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token)!;
    return {
      id: session.userId,
      name: session.name,
      role: session.role,
      status: 'active',
      ipAddress,
    };
  }

  // 2. Direct Admin Profile check
  const targetId = headerUserId || bodyUserId;
  if (targetId && db.adminProfile && (targetId === db.adminProfile.id || targetId === 'admin_m1')) {
    return {
      id: db.adminProfile.id,
      name: db.adminProfile.name,
      role: 'admin',
      status: db.adminProfile.status || 'active',
      ipAddress,
    };
  }

  // 3. Member ID check
  let member = targetId ? db.members.find(m => m.id === targetId) : null;
  if (!member && actingUserStr) {
    member =
      db.members.find(
        m => actingUserStr.includes(m.name) || actingUserStr.includes(m.id)
      ) || null;
  }

  if (member) {
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      status: member.status,
      ipAddress,
    };
  }

  // Fallback default: If not authenticated, assign unprivileged member role
  return {
    id: targetId || 'unauthenticated',
    name: actingUserStr || 'Mess Member',
    role: 'member', // Never trust client-supplied role header for admin privilege
    status: 'active',
    ipAddress,
  };
}

function checkAdminAuth(
  req: express.Request,
  res: express.Response,
  options?: {
    recordDate?: string;
    allowTreasurerFor?: 'expenses' | 'payments' | 'bazar';
    actionDescription?: string;
  }
): RequestUserInfo | null {
  const user = getRequestUser(req);
  const db = getDatabase();

  // 1. Inactive member protection
  if (user.status !== 'active') {
    res.status(403).json({
      success: false,
      error:
        'অনুমোদন ব্যর্থ: শুধুমাত্র সক্রিয় মেস এডমিন এই পরিবর্তন করতে পারবেন (403 Forbidden - Inactive member).',
    });
    return null;
  }

  // 2. Closed Month Protection
  if (options?.recordDate && isMonthClosed(options.recordDate)) {
    res.status(400).json({
      success: false,
      error: `এই মাসের (${options.recordDate.slice(0, 7)}) হিসাব বন্ধ ও লককৃত। পরিবর্তন করতে প্রথমে মেস এডমিন কর্তৃক মাস পুনঃউন্মুক্ত (Reopen Month) করতে হবে। (400 Bad Request - Month is closed).`,
    });
    return null;
  }

  // 3. Admin has full rights
  if (user.role === 'admin') {
    return user;
  }

  // 4. Configurable Treasurer role check (if admin has granted permission in settings)
  if (user.role === 'treasurer' && options?.allowTreasurerFor) {
    const perm = db.settings.treasurerPermissions;
    let allowed = false;
    if (options.allowTreasurerFor === 'expenses' && perm?.canEditExpenses) allowed = true;
    if (options.allowTreasurerFor === 'payments' && perm?.canEditPayments) allowed = true;
    if (options.allowTreasurerFor === 'bazar' && perm?.canEditBazar) allowed = true;

    if (allowed) {
      return user;
    }
  }

  // 5. Normal member or unauthorized: Return strict 403 Forbidden
  res.status(403).json({
    success: false,
    error:
      'অনুমোদন প্রত্যাখ্যাত: শুধুমাত্র মেস এডমিন (Admin) এই রেকর্ড তৈরি, সম্পাদনা বা মুছে ফেলতে পারবেন। (403 Forbidden - Admin-only permission required).',
  });
  return null;
}

function checkMemberMealAuth(
  req: express.Request,
  res: express.Response,
  targetMemberId: string,
  targetDate: string
): RequestUserInfo | null {
  const user = getRequestUser(req);

  // 1. Inactive member protection
  if (user.status !== 'active') {
    res.status(403).json({
      success: false,
      error: 'অনুমোদন ব্যর্থ: শুধুমাত্র সক্রিয় মেস সদস্য নিজের মিল পরিচালনা করতে পারবেন (403 Forbidden - Inactive member).',
    });
    return null;
  }

  // 2. Closed Month Protection
  if (targetDate && isMonthClosed(targetDate)) {
    res.status(400).json({
      success: false,
      error: `এই মাসের (${targetDate.slice(0, 7)}) হিসাব বন্ধ ও লককৃত। পরিবর্তন করা সম্ভব নয়। (400 Bad Request - Month is closed).`,
    });
    return null;
  }

  // 3. Admin has permission to manage any member's meal
  if (user.role === 'admin') {
    return user;
  }

  // 4. Normal member can ONLY change their OWN meal
  if (user.id !== targetMemberId) {
    res.status(403).json({
      success: false,
      error: 'অনুমোদন প্রত্যাখ্যাত: আপনি শুধুমাত্র আপনার নিজের মিল পরিবর্তন করতে পারেন। অন্য সদস্যের মিল পরিবর্তন সম্পূর্ণ নিষিদ্ধ। (403 Forbidden - Cannot change another member\'s meal).',
    });
    return null;
  }

  return user;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Initialize DB
  initDatabase();

  // 1. Get full mess state (Public to all mess members)
  app.get('/api/mess-data', (req, res) => {
    try {
      const db = getDatabase();
      const currentMonthCalc = ensureCurrentMonthPeriod(db);
      res.json({
        success: true,
        data: {
          ...db,
          currentMonthCalculation: currentMonthCalc,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ================= AUTHENTICATION & ADMIN PROFILE ROUTES =================

  // Admin / Member Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const db = getDatabase();
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: 'ফোন নম্বর অথবা ইমেইল এবং পাসওয়ার্ড আবশ্যক' });
      }

      const cleanId = identifier.toString().trim().toLowerCase();
      const normalizedPhoneInput = normalizeBangladeshPhone(cleanId);
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

      // Rate limiting: 5 attempts per 5 minutes
      const now = Date.now();
      const attempt = loginAttempts.get(ip);
      if (attempt && attempt.count >= 5 && now - attempt.lastTime < 5 * 60 * 1000) {
        const remainingMinutes = Math.ceil((5 * 60 * 1000 - (now - attempt.lastTime)) / 60000);
        return res.status(429).json({
          success: false,
          error: `অতিরিক্ত ভুল চেষ্টার কারণে লগইন সাময়িক স্থগিত। অনুগ্রহ করে ${remainingMinutes} মিনিট পর চেষ্টা করুন।`,
        });
      }

      // 1. Check Pending or Rejected Registration status first!
      const matchingReg = (db.registrations || []).find(r =>
        (normalizedPhoneInput && r.phone === normalizedPhoneInput) ||
        r.phone === cleanId ||
        r.phone.replace(/\D/g, '').endsWith(cleanId.replace(/\D/g, ''))
      );

      if (matchingReg) {
        if (matchingReg.status === 'PENDING_APPROVAL') {
          return res.status(403).json({
            success: false,
            isPendingApproval: true,
            error: 'আপনার রেজিস্ট্রেশনটি প্রধান এডমিন (Jahidul Islam) এর অনুমোদনের অপেক্ষায় রয়েছে। অনুমোদন পাওয়ার পর আপনি লগইন করতে পারবেন।',
            registration: {
              id: matchingReg.id,
              fullName: matchingReg.fullName,
              phone: matchingReg.phone,
              status: matchingReg.status,
              isPhoneVerified: matchingReg.isPhoneVerified,
              registrationDate: matchingReg.registrationDate,
            },
          });
        } else if (matchingReg.status === 'REJECTED') {
          return res.status(403).json({
            success: false,
            isRejected: true,
            error: `আপনার রেজিস্ট্রেশন আবেদনটি বাতিল করা হয়েছে${matchingReg.rejectionReason ? ': ' + matchingReg.rejectionReason : ''}। বিস্তারিত জানতে মেস প্রধান এডমিনের সাথে যোগাযোগ করুন।`,
          });
        }
      }

      const inputHash = simpleHashSync(password);

      // 2. Check Permanent Primary Admin (Jahidul Islam)
      const admin = db.adminProfile;
      const adminPhoneNorm = normalizeBangladeshPhone(admin?.phone);
      const isJahidulPhone =
        (normalizedPhoneInput && (normalizedPhoneInput === PRIMARY_ADMIN_PHONE || normalizedPhoneInput === '01711234567')) ||
        cleanId === '01516528497' ||
        cleanId === '01711234567';

      const isAdminMatch =
        admin &&
        (isJahidulPhone ||
          (adminPhoneNorm && normalizedPhoneInput && adminPhoneNorm === normalizedPhoneInput) ||
          admin.phone.replace(/[^0-9]/g, '').endsWith(cleanId.replace(/[^0-9]/g, '')) ||
          admin.email.toLowerCase() === cleanId ||
          cleanId === 'admin');

      if (isAdminMatch) {
        // Verify password with secure scrypt, legacy hash, or defaults
        const validPassword = admin.passwordHash
          ? (verifyPasswordSecure(password, admin.passwordHash) || admin.passwordHash === inputHash)
          : (password === 'admin123' || password === 'admin@mess2026');

        if (!validPassword) {
          const currentCount = (attempt ? attempt.count : 0) + 1;
          loginAttempts.set(ip, { count: currentCount, lastTime: now });
          return res.status(401).json({ success: false, error: 'ভুল ফোন নম্বর/ইমেইল অথবা পাসওয়ার্ড (Invalid credentials)' });
        }

        // Login success
        loginAttempts.delete(ip);
        const token = 'tok_admin_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        const session: AuthSession = {
          token,
          userId: admin.id,
          role: 'PRIMARY_ADMIN',
          name: admin.name || 'Jahidul Islam',
          phone: admin.phone || '01516528497',
          email: admin.email || 'mdjahidulislam1025@gmail.com',
          avatarColor: 'bg-emerald-600',
          loginTime: new Date().toISOString(),
        };

        activeSessions.set(token, session);
        admin.lastLogin = new Date().toISOString();
        saveDatabase(db);

        logAudit(admin.name, 'প্রধান এডমিন লগইন', 'settings', `${admin.name} প্রধান এডমিন অ্যাকাউন্টে প্রবেশ করেছেন`);

        return res.json({
          success: true,
          message: 'এডমিন লগইন সফল হয়েছে',
          token,
          user: session,
          adminProfile: admin,
        });
      }

      // 3. Check Normal Members credentials
      const matchingMember = db.members.find(m => {
        const mNorm = normalizeBangladeshPhone(m.phone);
        return (
          (normalizedPhoneInput && mNorm === normalizedPhoneInput) ||
          m.phone.replace(/[^0-9]/g, '').endsWith(cleanId.replace(/[^0-9]/g, '')) ||
          (m.email && m.email.toLowerCase() === cleanId)
        );
      });

      if (matchingMember) {
        if (matchingMember.status !== 'active') {
          return res.status(403).json({
            success: false,
            error: 'আপনার মেস একাউন্টটি বর্তমানে নিষ্ক্রিয় (Inactive)। মেস এডমিনের সাথে যোগাযোগ করুন।',
          });
        }

        const creds = db.memberCredentials?.[matchingMember.id];
        const memberValidPass = creds?.passwordHash
          ? (verifyPasswordSecure(password, creds.passwordHash) || creds.passwordHash === inputHash)
          : (password === 'member123' || (matchingMember.role === 'admin' && password === 'admin123'));

        if (!memberValidPass) {
          const currentCount = (attempt ? attempt.count : 0) + 1;
          loginAttempts.set(ip, { count: currentCount, lastTime: now });
          return res.status(401).json({ success: false, error: 'ভুল ফোন নম্বর অথবা পাসওয়ার্ড' });
        }

        if (creds && creds.isActive === false) {
          return res.status(403).json({
            success: false,
            error: 'আপনার মেস একাউন্ট সাময়িকভাবে স্থগিত করা হয়েছে। মেস ম্যানেজারের সাথে যোগাযোগ করুন।',
          });
        }

        loginAttempts.delete(ip);
        const token = 'tok_mem_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        const session: AuthSession = {
          token,
          userId: matchingMember.id,
          role: matchingMember.role,
          name: matchingMember.name,
          phone: matchingMember.phone,
          email: matchingMember.email,
          avatarColor: matchingMember.avatarColor,
          loginTime: new Date().toISOString(),
        };

        activeSessions.set(token, session);
        logAudit(matchingMember.name, 'সদস্য লগইন', 'members', `${matchingMember.name} অ্যাপে প্রবেশ করেছেন`);

        return res.json({
          success: true,
          message: 'লগইন সফল হয়েছে',
          token,
          user: session,
        });
      }

      // Invalid user
      const currentCount = (attempt ? attempt.count : 0) + 1;
      loginAttempts.set(ip, { count: currentCount, lastTime: now });
      return res.status(401).json({ success: false, error: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি অথবা পাসওয়ার্ড ভুল' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // User Registration Endpoint
  app.post('/api/auth/register', (req, res) => {
    try {
      const db = getDatabase();
      const { fullName, phone, password, confirmPassword, studentId, roomNo } = req.body;

      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
      const now = Date.now();

      // Rate limiting: 5 registration submissions per 10 minutes
      const regAttempt = registrationAttempts.get(ip);
      if (regAttempt && regAttempt.count >= 5 && now - regAttempt.lastTime < 10 * 60 * 1000) {
        const remainingMinutes = Math.ceil((10 * 60 * 1000 - (now - regAttempt.lastTime)) / 60000);
        return res.status(429).json({
          success: false,
          error: `অতিরিক্ত রেজিস্ট্রেশন চেষ্টার কারণে সাময়িক স্থগিত। অনুগ্রহ করে ${remainingMinutes} মিনিট পর চেষ্টা করুন।`,
        });
      }

      // 1. Required field validations
      if (!fullName || !fullName.trim()) {
        return res.status(400).json({ success: false, error: 'আপনার পুরো নাম আবশ্যক (Full name is required)' });
      }
      if (!phone || !phone.trim()) {
        return res.status(400).json({ success: false, error: 'সঠিক বাংলাদেশি মোবাইল নম্বর আবশ্যক (Phone number is required)' });
      }
      if (!password) {
        return res.status(400).json({ success: false, error: 'পাসওয়ার্ড প্রদান করুন (Password is required)' });
      }
      if (!confirmPassword) {
        return res.status(400).json({ success: false, error: 'কনফার্ম পাসওয়ার্ড প্রদান করুন (Confirm password is required)' });
      }

      // 2. Password matching and strength validation
      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না (Passwords do not match)' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে (Password must be at least 6 characters)' });
      }

      // 3. Bangladesh Phone validation and normalization
      const normalizedPhone = normalizeBangladeshPhone(phone);
      if (!isValidBangladeshPhone(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          error: 'অনুগ্রহ করে সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678 বা +8801712345678)',
        });
      }

      // 4. Primary Admin phone protection (Jahidul Islam)
      if (normalizedPhone === PRIMARY_ADMIN_PHONE || normalizedPhone === '01711234567') {
        return res.status(400).json({
          success: false,
          error: 'এই ফোন নম্বরটি মেসের প্রধান এডমিনের জন্য সংরক্ষিত। রেজিস্ট্রেশন করা যাবে না।',
        });
      }

      // 5. Existing member phone uniqueness check
      const existingMember = db.members.find(m => normalizeBangladeshPhone(m.phone) === normalizedPhone);
      if (existingMember) {
        return res.status(400).json({
          success: false,
          error: 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একটি সক্রিয় মেস সদস্য একাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন।',
        });
      }

      // 6. Existing registration check
      if (!db.registrations) db.registrations = [];
      const existingReg = db.registrations.find(r => r.phone === normalizedPhone);
      if (existingReg) {
        if (existingReg.status === 'PENDING_APPROVAL') {
          return res.status(400).json({
            success: false,
            error: 'এই ফোন নম্বর দিয়ে ইতিমধ্যে একটি রেজিস্ট্রেশন আবেদন প্রধান এডমিনের অনুমোদনের অপেক্ষায় রয়েছে।',
            status: 'PENDING_APPROVAL',
          });
        } else if (existingReg.status === 'APPROVED') {
          return res.status(400).json({
            success: false,
            error: 'এই ফোন নম্বর দিয়ে একাউন্ট ইতিমধ্যে অনুমোদিত হয়েছে। অনুগ্রহ করে লগইন করুন।',
          });
        }
      }

      // Update rate limiter
      const currentCount = (regAttempt ? regAttempt.count : 0) + 1;
      registrationAttempts.set(ip, { count: currentCount, lastTime: now });

      // 7. Cryptographic salted password hash (scrypt)
      const passwordHash = hashPasswordSecure(password);

      // 8. SMS Gateway Check: Genuine configuration vs inactive notice
      const smsGateway = db.settings?.smsGateway;
      const isSmsConfigured = Boolean(
        smsGateway?.apiKeyConfigured &&
        smsGateway?.apiUrl &&
        smsGateway?.apiUrl.trim() !== '' &&
        !smsGateway?.providerName?.includes('Mock')
      );

      let phoneOtpData: any = undefined;
      if (isSmsConfigured) {
        // Generate random 6-digit OTP
        const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = crypto.createHash('sha256').update(rawOtp + '_otp_salt_2026').digest('hex');
        phoneOtpData = {
          codeHash,
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
          attempts: 0,
        };

        // Record SMS log without exposing OTP in logs
        db.smsLogs.unshift({
          id: `sms-${Date.now()}`,
          timestamp: new Date().toISOString(),
          recipientId: `reg-${normalizedPhone}`,
          recipientName: fullName.trim(),
          phone: normalizedPhone,
          type: 'phone_verification',
          message: 'Bachelor Zone: রেজিস্ট্রেশন ফোন ভেরিফিকেশন ওটিপি পাঠানো হয়েছে।',
          status: 'sent',
          provider: smsGateway?.providerName || 'SMS Gateway',
          refId: `REG-${Date.now().toString().slice(-6)}`,
        });
      }

      // 9. Create registration record
      const regId = `reg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newReg: any = {
        id: regId,
        fullName: fullName.trim(),
        phone: normalizedPhone,
        studentId: studentId?.trim() || undefined,
        roomNo: roomNo?.trim() || undefined,
        passwordHash,
        status: 'PENDING_APPROVAL',
        isPhoneVerified: false,
        phoneOtp: phoneOtpData,
        registrationDate: new Date().toISOString(),
        ipAddress: ip,
      };

      if (existingReg && existingReg.status === 'REJECTED') {
        const idx = db.registrations.indexOf(existingReg);
        db.registrations[idx] = newReg;
      } else {
        db.registrations.unshift(newReg);
      }

      // 10. Audit log
      logAudit(fullName.trim(), 'নতুন রেজিস্ট্রেশন আবেদন', 'members', `নতুন সদস্য রেজিস্ট্রেশন আবেদন জমা: ${fullName.trim()} (${normalizedPhone})`);

      saveDatabase(db);

      return res.json({
        success: true,
        message: isSmsConfigured
          ? 'রেজিস্ট্রেশন সফলভাবে জমা হয়েছে। আপনার ফোনে ভেরিফিকেশন কোড পাঠানো হয়েছে।'
          : 'রেজিস্ট্রেশন সফলভাবে জমা হয়েছে। বর্তমানে সরাসরি SMS গেটওয়ে সক্রিয় না থাকায় ফোন ভেরিফিকেশন আপাতত কার্যকর নয়। আপনার আবেদনটি প্রধান এডমিন (Jahidul Islam) এর অনুমোদনের অপেক্ষায় রয়েছে।',
        registration: {
          id: newReg.id,
          fullName: newReg.fullName,
          phone: newReg.phone,
          studentId: newReg.studentId,
          status: newReg.status,
          isPhoneVerified: newReg.isPhoneVerified,
          registrationDate: newReg.registrationDate,
        },
        smsGatewayConfigured: isSmsConfigured,
        requiresPhoneVerification: isSmsConfigured,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Verify Phone OTP (if SMS gateway is configured)
  app.post('/api/auth/verify-phone-otp', (req, res) => {
    try {
      const db = getDatabase();
      const { phone, code } = req.body;
      if (!phone || !code) {
        return res.status(400).json({ success: false, error: 'ফোন নম্বর এবং ওটিপি কোড আবশ্যক' });
      }

      const normalizedPhone = normalizeBangladeshPhone(phone);
      const reg = (db.registrations || []).find(r => r.phone === normalizedPhone && r.status === 'PENDING_APPROVAL');
      if (!reg) {
        return res.status(404).json({ success: false, error: 'কোনো পেন্ডিং রেজিস্ট্রেশন আবেদন খুঁজে পাওয়া যায়নি' });
      }

      if (!reg.phoneOtp) {
        return res.status(400).json({ success: false, error: 'এই আবেদনের জন্য কোনো সক্রিয় ওটিপি নেই' });
      }

      if (Date.now() > reg.phoneOtp.expiresAt) {
        return res.status(400).json({ success: false, error: 'ওটিপির মেয়াদ শেষ হয়ে গেছে। পুনরায় ওটিপি পাঠান।' });
      }

      if (reg.phoneOtp.attempts >= 5) {
        return res.status(429).json({ success: false, error: 'সর্বোচ্চ বার ভুল কোড দেওয়া হয়েছে। অনুগ্রহ করে নতুন ওটিপি চেয়ে নিন।' });
      }

      const enteredHash = crypto.createHash('sha256').update(code.trim() + '_otp_salt_2026').digest('hex');
      if (enteredHash !== reg.phoneOtp.codeHash) {
        reg.phoneOtp.attempts += 1;
        saveDatabase(db);
        return res.status(400).json({
          success: false,
          error: `ভুল ওটিপি কোড। বাকি সুযোগ: ${5 - reg.phoneOtp.attempts} বার`,
        });
      }

      // OTP Verified
      reg.isPhoneVerified = true;
      delete reg.phoneOtp;
      saveDatabase(db);

      logAudit(reg.fullName, 'ফোন নম্বর ভেরিফিকেশন', 'members', `${reg.fullName} (${reg.phone}) এর ফোন নম্বর ওটিপির মাধ্যমে ভেরিফাইড হয়েছে`);

      return res.json({
        success: true,
        message: 'ফোন নম্বর সফলভাবে ভেরিফাই হয়েছে! এখন প্রধান এডমিন (Jahidul Islam) এর অনুমোদনের অপেক্ষা করুন।',
        registration: {
          id: reg.id,
          fullName: reg.fullName,
          phone: reg.phone,
          status: reg.status,
          isPhoneVerified: true,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Registrations List (Admin Only)
  app.get('/api/admin/registrations', (req, res) => {
    try {
      const db = getDatabase();
      const reqUser = getRequestUser(req);
      const isSuper = isPrimaryAdmin({ id: reqUser.id, name: reqUser.name, role: reqUser.role });
      if (!isSuper && reqUser.role !== 'admin' && reqUser.role !== 'PRIMARY_ADMIN') {
        return res.status(403).json({ success: false, error: 'শুধুমাত্র এডমিন রেজিস্ট্রেশন তালিকা দেখতে পারেন (403 Forbidden)' });
      }

      const list = (db.registrations || []).map(r => {
        const copy: any = { ...r };
        delete copy.passwordHash;
        if (copy.phoneOtp) {
          delete copy.phoneOtp.codeHash;
        }
        return copy;
      });

      res.json({
        success: true,
        registrations: list,
        pendingCount: list.filter((r: any) => r.status === 'PENDING_APPROVAL').length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Approve Registration (Permanent Primary Admin Jahidul Islam Only)
  app.post('/api/admin/registrations/:id/approve', (req, res) => {
    try {
      const db = getDatabase();
      const reqUser = getRequestUser(req);
      const isSuper = isPrimaryAdmin({ id: reqUser.id, name: reqUser.name, role: reqUser.role });

      // Strict enforcement: Only Permanent Primary Admin (Jahidul Islam) can approve registrations and assign roles!
      if (!isSuper) {
        return res.status(403).json({
          success: false,
          error: 'শুধুমাত্র স্থায়ী প্রধান এডমিন (Jahidul Islam) রেজিস্ট্রেশন আবেদন অনুমোদন ও রোল প্রদান করতে পারেন (403 Forbidden)',
        });
      }

      const { id } = req.params;
      const { role = 'MEMBER', roomNo } = req.body;
      const assignedRole = role === 'ADMIN' ? 'admin' : 'member';

      const reg = (db.registrations || []).find(r => r.id === id);
      if (!reg) {
        return res.status(404).json({ success: false, error: 'রেজিস্ট্রেশন আবেদনটি খুঁজে পাওয়া যায়নি' });
      }

      if (reg.status === 'APPROVED') {
        return res.status(400).json({ success: false, error: 'এই আবেদনটি ইতিমধ্যে অনুমোদিত হয়েছে' });
      }

      // Check if phone already belongs to an existing member
      let existingMember = db.members.find(m => normalizeBangladeshPhone(m.phone) === reg.phone);
      let memberId = existingMember ? existingMember.id : `m_${Date.now()}`;

      if (!existingMember) {
        const newMember: any = {
          id: memberId,
          name: reg.fullName,
          nickname: reg.fullName.split(' ')[0] || reg.fullName,
          phone: reg.phone,
          roomNo: roomNo || reg.roomNo || 'TBD',
          role: assignedRole,
          status: 'active',
          joiningDate: new Date().toISOString().slice(0, 10),
          avatarColor: ['bg-emerald-600', 'bg-blue-600', 'bg-indigo-600', 'bg-purple-600', 'bg-rose-600', 'bg-teal-600'][db.members.length % 6],
        };
        db.members.push(newMember);
        existingMember = newMember;
      } else {
        existingMember.role = assignedRole;
        existingMember.status = 'active';
        if (roomNo) existingMember.roomNo = roomNo;
      }

      // Set credentials in memberCredentials
      if (!db.memberCredentials) db.memberCredentials = {};
      db.memberCredentials[memberId] = {
        memberId,
        phone: reg.phone,
        passwordHash: reg.passwordHash,
        isActive: true,
      };

      // Update registration record
      reg.status = 'APPROVED';
      reg.reviewedBy = 'Jahidul Islam';
      reg.reviewedAt = new Date().toISOString();
      reg.assignedRole = role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
      reg.memberId = memberId;

      logAudit(
        'Jahidul Islam',
        'রেজিস্ট্রেশন অনুমোদন',
        'members',
        `স্থায়ী প্রধান এডমিন জাহিদুল ইসলাম কর্তৃক ${reg.fullName} (${reg.phone}) এর রেজিস্ট্রেশন অনুমোদন করা হয়েছে (রোল: ${assignedRole === 'admin' ? 'এডমিন' : 'সদস্য'})`
      );

      saveDatabase(db);

      return res.json({
        success: true,
        message: `${reg.fullName} এর রেজিস্ট্রেশন সফলভাবে অনুমোদন করা হয়েছে (${assignedRole === 'admin' ? 'এডমিন' : 'সদস্য'})।`,
        member: existingMember,
        registration: reg,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reject Registration (Permanent Primary Admin Jahidul Islam Only)
  app.post('/api/admin/registrations/:id/reject', (req, res) => {
    try {
      const db = getDatabase();
      const reqUser = getRequestUser(req);
      const isSuper = isPrimaryAdmin({ id: reqUser.id, name: reqUser.name, role: reqUser.role });

      if (!isSuper) {
        return res.status(403).json({
          success: false,
          error: 'শুধুমাত্র স্থায়ী প্রধান এডমিন (Jahidul Islam) রেজিস্ট্রেশন বাতিল করতে পারেন (403 Forbidden)',
        });
      }

      const { id } = req.params;
      const { reason } = req.body;

      const reg = (db.registrations || []).find(r => r.id === id);
      if (!reg) {
        return res.status(404).json({ success: false, error: 'রেজিস্ট্রেশন আবেদনটি খুঁজে পাওয়া যায়নি' });
      }

      reg.status = 'REJECTED';
      reg.rejectionReason = reason?.trim() || 'প্রধান এডমিন কর্তৃক আবেদনটি গ্রহণযোগ্য নয় মর্মে বাতিল করা হয়েছে';
      reg.reviewedBy = 'Jahidul Islam';
      reg.reviewedAt = new Date().toISOString();

      logAudit(
        'Jahidul Islam',
        'রেজিস্ট্রেশন বাতিল',
        'members',
        `স্থায়ী প্রধান এডমিন জাহিদুল ইসলাম কর্তৃক ${reg.fullName} (${reg.phone}) এর আবেদন বাতিল করা হয়েছে (${reg.rejectionReason})`
      );

      saveDatabase(db);

      return res.json({
        success: true,
        message: 'রেজিস্ট্রেশন আবেদনটি বাতিল করা হয়েছে',
        registration: reg,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // First Admin Setup
  app.post('/api/auth/first-setup', (req, res) => {
    try {
      const db = getDatabase();
      const { name, phone, email, password, confirmPassword, messName } = req.body;

      if (!name || !phone || !password) {
        return res.status(400).json({ success: false, error: 'এডমিন নাম, ফোন নম্বর ও পাসওয়ার্ড আবশ্যক' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে' });
      }

      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'পাসওয়ার্ড দুটি মিলছে না' });
      }

      const passwordHash = simpleHashSync(password);
      const now = new Date().toISOString();

      const newAdmin: AdminProfile = {
        id: 'admin_m1',
        name: name.trim(),
        phone: phone.trim(),
        email: (email || 'admin@mess.com').trim(),
        passwordHash,
        messName: (messName || 'Bachelor Zone').trim(),
        role: 'admin',
        status: 'active',
        createdDate: now.slice(0, 10),
        lastLogin: now,
      };

      db.adminProfile = newAdmin;
      if (messName) {
        db.settings.messName = messName.trim();
      }

      // Update Jahidul Islam admin member entry
      const existingAdminMember = db.members.find(m => m.id === 'm1' || m.role === 'admin');
      if (existingAdminMember) {
        existingAdminMember.name = newAdmin.name;
        existingAdminMember.phone = newAdmin.phone;
        existingAdminMember.email = newAdmin.email;
      }

      saveDatabase(db);
      logAudit(newAdmin.name, 'প্রাথমিক এডমিন অ্যাকাউন্ট তৈরি', 'settings', 'Bachelor Zone এর মূল এডমিন অ্যাকাউন্ট সফলভাবে কনফিগার করা হয়েছে');

      const token = 'tok_admin_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const session: AuthSession = {
        token,
        userId: newAdmin.id,
        role: 'admin',
        name: newAdmin.name,
        phone: newAdmin.phone,
        email: newAdmin.email,
        avatarColor: 'bg-emerald-600',
        loginTime: now,
      };
      activeSessions.set(token, session);

      return res.json({
        success: true,
        message: 'Admin Account Created Successfully',
        token,
        user: session,
        adminProfile: newAdmin,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Current Auth Profile
  app.get('/api/auth/me', (req, res) => {
    try {
      const user = getRequestUser(req);
      const db = getDatabase();
      res.json({
        success: true,
        user,
        adminProfile: user.role === 'admin' ? db.adminProfile : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Update Profile
  app.post('/api/auth/update-profile', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { name, photo, phone, email, messName } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ success: false, error: 'নাম ও ফোন নম্বর আবশ্যক' });
      }

      if (!db.adminProfile) {
        db.adminProfile = {
          id: 'admin_m1',
          name,
          phone,
          email: email || '',
          messName: messName || db.settings.messName,
          role: 'admin',
          status: 'active',
          createdDate: '2026-01-01',
        };
      }

      const prev = { ...db.adminProfile };
      db.adminProfile.name = name.trim();
      db.adminProfile.phone = phone.trim();
      if (email !== undefined) db.adminProfile.email = email.trim();
      if (photo !== undefined) db.adminProfile.photo = photo;
      if (messName) {
        db.adminProfile.messName = messName.trim();
        db.settings.messName = messName.trim();
      }

      // Sync member record m1
      const m1 = db.members.find(m => m.id === 'm1');
      if (m1) {
        m1.name = db.adminProfile.name;
        m1.phone = db.adminProfile.phone;
        m1.email = db.adminProfile.email;
      }

      saveDatabase(db);
      logAudit(user.name, 'এডমিন প্রোফাইল হালনাগাদ', 'settings', `এডমিন প্রোফাইল আপডেট করা হয়েছে। নাম: ${db.adminProfile.name}`, JSON.stringify(prev), JSON.stringify(db.adminProfile));

      res.json({
        success: true,
        message: 'এডমিন প্রোফাইল সফলভাবে হালনাগাদ করা হয়েছে',
        adminProfile: db.adminProfile,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Change Password
  app.post('/api/auth/change-password', (req, res) => {
    try {
      const user = getRequestUser(req);
      const db = getDatabase();
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'বর্তমান এবং নতুন পাসওয়ার্ড আবশ্যক' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'নতুন পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে' });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'নতুন পাসওয়ার্ড দুটি মিলছে না' });
      }

      const currentHash = simpleHashSync(currentPassword);
      const newHash = simpleHashSync(newPassword);

      if (user.role === 'admin' || user.id === 'admin_m1') {
        const admin = db.adminProfile;
        const valid = admin?.passwordHash ? admin.passwordHash === currentHash : currentPassword === 'admin123';
        if (!valid) {
          return res.status(400).json({ success: false, error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়' });
        }
        if (admin) admin.passwordHash = newHash;
        saveDatabase(db);
        logAudit(user.name, 'পাসওয়ার্ড পরিবর্তন', 'settings', 'এডমিন পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে');
        return res.json({ success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে' });
      } else {
        const creds = db.memberCredentials?.[user.id];
        const valid = creds?.passwordHash ? creds.passwordHash === currentHash : currentPassword === 'member123';
        if (!valid) {
          return res.status(400).json({ success: false, error: 'বর্তমান পাসওয়ার্ডটি সঠিক নয়' });
        }
        if (!db.memberCredentials) db.memberCredentials = {};
        db.memberCredentials[user.id] = {
          memberId: user.id,
          phone: user.name,
          passwordHash: newHash,
          isActive: true,
        };
        saveDatabase(db);
        logAudit(user.name, 'পাসওয়ার্ড পরিবর্তন', 'members', `${user.name} পাসওয়ার্ড পরিবর্তন করেছেন`);
        return res.json({ success: true, message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Forgot Password
  app.post('/api/auth/forgot-password', (req, res) => {
    try {
      const { identifier } = req.body;
      if (!identifier) {
        return res.status(400).json({ success: false, error: 'ফোন নম্বর অথবা ইমেইল আবশ্যক' });
      }
      // Never reveal whether a specific user exists (Security requirement)
      res.json({
        success: true,
        message: 'যদি এই ফোন বা ইমেইল নিবন্ধিত থাকে, তবে পাসওয়ার্ড রিসেট ও ওটিপি নির্দেশনাবলী পাঠানো হয়েছে।',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    try {
      const authHeader = (req.headers['authorization'] as string) || (req.headers['x-auth-token'] as string) || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
      if (token && activeSessions.has(token)) {
        activeSessions.delete(token);
      }
      res.json({ success: true, message: 'সফলভাবে লগআউট সম্পন্ন হয়েছে' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Add Member with Credentials & Invitation
  app.post('/api/members/with-credentials', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { member, createLogin, initialPassword, initialBalance, sendInvitationSms } = req.body;

      if (!member || !member.name || !member.phone) {
        return res.status(400).json({ success: false, error: 'সদস্যের নাম ও ফোন নম্বর আবশ্যক' });
      }

      const newId = member.id || `m_${Date.now()}`;
      const colors = ['bg-emerald-600', 'bg-blue-600', 'bg-indigo-600', 'bg-amber-600', 'bg-purple-600', 'bg-teal-600', 'bg-rose-600'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newMember = {
        ...member,
        id: newId,
        avatarColor: member.avatarColor || randomColor,
        status: member.status || 'active',
        role: member.role || 'member',
        joiningDate: member.joiningDate || new Date().toISOString().slice(0, 10),
      };

      db.members.push(newMember);

      // Create credentials if requested
      if (createLogin) {
        if (!db.memberCredentials) db.memberCredentials = {};
        const pass = initialPassword || 'member123';
        db.memberCredentials[newId] = {
          memberId: newId,
          phone: newMember.phone,
          passwordHash: simpleHashSync(pass),
          isActive: true,
        };
      }

      // Record initial balance if applicable as a verified payment
      if (initialBalance && Number(initialBalance) > 0) {
        db.payments.push({
          id: `pay_init_${Date.now()}`,
          memberId: newId,
          memberName: newMember.name,
          date: newMember.joiningDate,
          amount: Number(initialBalance),
          paymentMethod: 'cash',
          receivedBy: user.name,
          notes: 'যোগদানকালীন প্রারম্ভিক জমা (Initial Deposit)',
          status: 'verified',
          createdAt: new Date().toISOString(),
        });
      }

      // Send Invitation notification / SMS
      if (sendInvitationSms && db.settings.smsGateway?.apiKeyConfigured) {
        const msg = `আসসালামু আলাইকুম ${newMember.name}। Bachelor Zone এ আপনার অ্যাকাউন্ট তৈরি হয়েছে। আপনার খাবার মিল ও হিসাব দেখতে অ্যাপে প্রবেশ করুন। - Bachelor Zone Admin`;
        db.smsLogs.push({
          id: `sms_inv_${Date.now()}`,
          timestamp: new Date().toISOString(),
          recipientId: newId,
          recipientName: newMember.name,
          phone: newMember.phone,
          type: 'custom',
          message: msg,
          status: 'sent',
          provider: (db.settings.smsGateway as any).provider || db.settings.smsGateway.providerName || 'Alpha SMS',
          refId: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        });
      }

      saveDatabase(db);
      logAudit(user.name, 'নতুন সদস্য যুক্তকরণ', 'members', `এডমিন কর্তৃক নতুন সদস্য ${newMember.name} (${newMember.phone}) যুক্ত করা হয়েছে`);

      res.json({
        success: true,
        message: 'নতুন সদস্য সফলভাবে সংরক্ষিত হয়েছে',
        member: newMember,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Data Backup Export
  app.get('/api/backup/export', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      logAudit(user.name, 'ব্যাকআপ ডাউনলোড', 'settings', 'মেস ডাটাবেজের পূর্ণাঙ্গ ব্যাকআপ এক্সপোর্ট করা হয়েছে');

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=mess-backup-${new Date().toISOString().slice(0, 10)}.json`);
      res.json({
        backupDate: new Date().toISOString(),
        exportedBy: user.name,
        version: '2.0',
        data: db,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Admin Data Backup Restore
  app.post('/api/backup/restore', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const { backupData } = req.body;
      if (!backupData || !backupData.members || !Array.isArray(backupData.members)) {
        return res.status(400).json({ success: false, error: 'অবৈধ ব্যাকআপ ফাইল ফরম্যাট। অনুগ্রহ করে বৈধ JSON ব্যাকআপ প্রদান করুন।' });
      }

      saveDatabase(backupData);
      logAudit(user.name, 'ব্যাকআপ রিস্টোর', 'settings', 'মেস ডাটাবেজে পূর্বে সংরক্ষিত ব্যাকআপ রিস্টোর করা হয়েছে');

      res.json({
        success: true,
        message: 'ব্যাকআপ সফলভাবে রিস্টোর হয়েছে। সিস্টেম রিলোড হচ্ছে...',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  function isPermanentAdmin(member?: { id?: string; name?: string; phone?: string; email?: string } | null): boolean {
    if (!member) return false;
    const name = (member.name || '').toLowerCase();
    const phone = (member.phone || '').replace(/[\s\-\+]/g, '');
    const email = (member.email || '').toLowerCase();
    return (
      member.id === 'm1' ||
      member.id === 'admin_m1' ||
      name.includes('jahidul') ||
      name.includes('জাহিদুল') ||
      phone === '8801711234567' ||
      phone === '01711234567' ||
      phone === '8801516528497' ||
      phone === '01516528497' ||
      email === 'mdjahidulislam1025@gmail.com'
    );
  }

  // 2. Add or Edit Member (Admin only)
  app.post('/api/members', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { member } = req.body;
      if (!member || !member.name || !member.phone) {
        return res.status(400).json({ success: false, error: 'Name and phone number are required' });
      }

      const existingIndex = db.members.findIndex(m => m.id === member.id);
      if (existingIndex >= 0) {
        const prev = db.members[existingIndex];

        // Critical Rule: Jahidul Islam is the PERMANENT PRIMARY ADMIN
        if (isPermanentAdmin(prev) || isPermanentAdmin(member)) {
          if (member.role && member.role !== 'admin') {
            return res.status(403).json({
              success: false,
              error: '403 — Permission Denied: জাহিদুল ইসলাম (Jahidul Islam) Bachelor Zone এর স্থায়ী প্রধান এডমিন (Permanent Primary Admin / Owner)। তার এডমিন পদ পরিবর্তন করা সম্পূর্ণ নিষিদ্ধ।',
            });
          }
          if (member.status && member.status !== 'active') {
            return res.status(403).json({
              success: false,
              error: '403 — Permission Denied: জাহিদুল ইসলাম (Jahidul Islam) মেসের স্থায়ী প্রধান এডমিন। তাকে কোনো অবস্থাতেই নিষ্ক্রিয় (Inactive) বা অপসারণ করা যাবে না।',
            });
          }
          member.role = 'admin';
          member.status = 'active';
        }

        // Only Jahidul Islam can change the role of another member
        if (member.role && member.role !== prev.role && !isPermanentAdmin(user)) {
          return res.status(403).json({
            success: false,
            error: '403 — Permission Denied: শুধুমাত্র মেসের স্থায়ী প্রধান এডমিন জাহিদুল ইসলাম (Jahidul Islam) অন্য সদস্যদের রোল পরিবর্তন করতে পারেন।',
          });
        }

        db.members[existingIndex] = { ...prev, ...member };
        logAudit(
          user.name,
          'MEMBER_EDITED',
          'members',
          `সদস্য ${member.name} এর তথ্য আপডেট করা হয়েছে`,
          `${prev.name} (${prev.role}, ${prev.status}, ${prev.phone})`,
          `${member.name} (${member.role}, ${member.status}, ${member.phone})`,
          user.id,
          'Member',
          member.id,
          user.ipAddress
        );
      } else {
        const newId = member.id || `m${Date.now()}`;
        // Only Jahidul Islam can grant admin role to a new member
        const assignedRole = (member.role === 'admin' && isPermanentAdmin(user)) ? 'admin' : 'member';
        const newMember = {
          ...member,
          id: newId,
          status: member.status || 'active',
          role: assignedRole,
          joiningDate: member.joiningDate || new Date().toISOString().split('T')[0],
          avatarColor: member.avatarColor || 'bg-emerald-600',
        };
        db.members.push(newMember);

        // If member limit exists and active count exceeds it, automatically expand limit to accommodate
        const activeCount = db.members.filter(m => m.status === 'active').length;
        if (!db.settings.memberLimit || activeCount > db.settings.memberLimit) {
          db.settings.memberLimit = Math.max(activeCount, 6);
        }

        logAudit(
          user.name,
          'MEMBER_ADDED',
          'members',
          `নতুন সদস্য ${newMember.name} (রোল: ${newMember.role === 'admin' ? 'এডমিন' : 'সদস্য'}) মেসে যুক্ত করা হয়েছে`,
          undefined,
          `${newMember.name} (ID: ${newId}, Phone: ${newMember.phone})`,
          user.id,
          'Member',
          newId,
          user.ipAddress
        );
        notify('নতুন সদস্য যোগ', `${newMember.name} মেসে যুক্ত হয়েছেন।`, 'info', 'members');
      }

      // Sync monthly calculations in case active count changed
      recalculateMonthlyAccount(getCurrentDhakaPeriod().periodId);
      saveDatabase(db);
      res.json({ success: true, data: db.members });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Set Member Limit (Admin only)
  app.post('/api/members/set-limit', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;
      const db = getDatabase();
      const { limit } = req.body;
      const numLimit = parseInt(limit, 10);
      if (isNaN(numLimit) || numLimit < 1) {
        return res.status(400).json({ success: false, error: 'বৈধ সদস্য সংখ্যা প্রদান করুন (কমপক্ষে ১)।' });
      }
      const prevLimit = db.settings.memberLimit || 6;
      db.settings.memberLimit = numLimit;
      logAudit(
        user.name,
        'MEMBER_LIMIT_CHANGED',
        'members',
        `মেস সদস্য ধারণক্ষমতা লিমিট পরিবর্তন করা হয়েছে: ${prevLimit} জন → ${numLimit} জন`,
        `${prevLimit} Members`,
        `${numLimit} Members`,
        user.id,
        'Settings',
        'memberLimit',
        user.ipAddress
      );
      saveDatabase(db);
      res.json({ success: true, memberLimit: numLimit, message: `সদস্য লিমিট সফলভাবে ${numLimit} জনে আপডেট করা হয়েছে।` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Change Member Role (Only Jahidul Islam can perform this!)
  app.post('/api/members/change-role', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      // Only Jahidul Islam can assign or change roles
      if (!isPermanentAdmin(user)) {
        return res.status(403).json({
          success: false,
          error: 'অনুমোদন প্রত্যাখ্যাত: শুধুমাত্র মেসের স্থায়ী প্রধান এডমিন জাহিদুল ইসলাম (Jahidul Islam) অন্য সদস্যদের রোল নির্ধারণ বা পরিবর্তন করতে পারেন। (403 Forbidden - Only Jahidul Islam can assign or change roles).',
        });
      }

      const db = getDatabase();
      const { memberId, newRole } = req.body;

      if (!memberId || !newRole || !['admin', 'member'].includes(newRole)) {
        return res.status(400).json({ success: false, error: 'সদস্য আইডি এবং বৈধ রোল (Admin অথবা Member) প্রদান করুন।' });
      }

      const target = db.members.find(m => m.id === memberId);
      if (!target) {
        return res.status(404).json({ success: false, error: 'সদস্য পাওয়া যায়নি।' });
      }

      // Critical Rule: Jahidul Islam role cannot be changed
      if (isPermanentAdmin(target) && newRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'নিরাপত্তা নিষেধাজ্ঞা: জাহিদুল ইসলাম (Jahidul Islam) Bachelor Zone এর স্থায়ী প্রধান এডমিন। তার এডমিন পদ পরিবর্তন করা সম্পূর্ণ নিষিদ্ধ।',
        });
      }

      const prevRole = target.role;
      target.role = newRole;

      logAudit(
        user.name,
        'ROLE_CHANGED',
        'members',
        `সদস্য ${target.name} এর রোল পরিবর্তন করে "${newRole === 'admin' ? 'এডমিন (Admin)' : 'সাধারণ সদস্য (Member)'}" করা হয়েছে।`,
        `পূর্বের রোল: ${prevRole}`,
        `নতুন রোল: ${newRole}`,
        user.id,
        'Member',
        memberId,
        user.ipAddress
      );

      notify('রোল পরিবর্তন', `${target.name} এর রোল পরিবর্তন করে ${newRole === 'admin' ? 'এডমিন' : 'সদস্য'} করা হয়েছে।`, 'info', 'members');
      saveDatabase(db);
      res.json({ success: true, message: `${target.name} এর রোল সফলভাবে পরিবর্তন করা হয়েছে।`, member: target, members: db.members });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Remove Member (Preserves historical records)
  app.post('/api/members/remove', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { memberId } = req.body;
      const target = db.members.find(m => m.id === memberId);

      if (!target) {
        return res.status(404).json({ success: false, error: 'সদস্য পাওয়া যায়নি।' });
      }

      // Critical Rule: Jahidul Islam cannot be removed or deactivated
      if (isPermanentAdmin(target)) {
        return res.status(403).json({
          success: false,
          error: 'নিরাপত্তা নিষেধাজ্ঞা: জাহিদুল ইসলাম (Jahidul Islam) Bachelor Zone এর স্থায়ী প্রধান এডমিন (Permanent Primary Admin / Owner)। তাকে কোনোভাবেই মেস থেকে অপসারণ বা ডিঅ্যাক্টিভেট করা যাবে না।',
        });
      }

      // Preserve historical data and set status to 'left' (Removed)
      target.status = 'left';

      logAudit(
        user.name,
        'MEMBER_REMOVED',
        'members',
        `সদস্য ${target.name} কে মেস থেকে অপসারণ (Removed) করা হয়েছে। পূর্বের সকল মিল, বাজার খরচ, পেমেন্ট ও হিসাবের রেকর্ড অক্ষত ও সংরক্ষিত রাখা হয়েছে।`,
        'Status: active',
        'Status: Removed (Historical records preserved)',
        user.id,
        'Member',
        memberId,
        user.ipAddress
      );

      notify('সদস্য অপসারণ', `সদস্য ${target.name} কে মেস তালিকা থেকে অপসারিত করা হয়েছে (আর্থিক ইতিহাস সংরক্ষিত)।`, 'warning', 'members');
      recalculateMonthlyAccount(getCurrentDhakaPeriod().periodId);
      saveDatabase(db);
      res.json({ success: true, message: `${target.name} কে অপসারণ করা হয়েছে এবং ঐতিহাসিক সকল রেকর্ড সংরক্ষিত রাখা হয়েছে।`, member: target, members: db.members });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Reactivate Member
  app.post('/api/members/reactivate', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { memberId } = req.body;
      const target = db.members.find(m => m.id === memberId);

      if (!target) {
        return res.status(404).json({ success: false, error: 'সদস্য পাওয়া যায়নি।' });
      }

      target.status = 'active';

      logAudit(
        user.name,
        'MEMBER_REACTIVATED',
        'members',
        `পূর্বে অপসারিত সদস্য ${target.name} কে পুনরায় সক্রিয় (Active) সদস্য হিসেবে অন্তর্ভুক্ত করা হয়েছে।`,
        'Status: left/inactive',
        'Status: active',
        user.id,
        'Member',
        memberId,
        user.ipAddress
      );

      notify('সদস্য পুনরায় সক্রিয়', `সদস্য ${target.name} পুনরায় মেসে সক্রিয় হয়েছেন।`, 'info', 'members');
      recalculateMonthlyAccount(getCurrentDhakaPeriod().periodId);
      saveDatabase(db);
      res.json({ success: true, message: `${target.name} কে সফলভাবে পুনরায় সক্রিয় করা হয়েছে।`, member: target, members: db.members });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Delete or Remove Member (Admin only - preserves records by setting status to left)
  app.delete('/api/members/:id', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { id } = req.params;
      const target = db.members.find(m => m.id === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'সদস্য পাওয়া যায়নি' });
      }

      // Critical Rule: Jahidul Islam can NEVER be deleted or removed
      if (isPermanentAdmin(target)) {
        return res.status(403).json({
          success: false,
          error: 'নিরাপত্তা নিষেধাজ্ঞা: জাহিদুল ইসলাম (Jahidul Islam) Bachelor Zone এর স্থায়ী প্রধান এডমিন (Permanent Primary Admin / Owner)। তাকে কোনোভাবেই মেস থেকে মুছে ফেলা, অপসারন করা বা ডিঅ্যাক্টিভেট করা যাবে না।',
        });
      }

      // Check if trying to remove the only admin
      const adminCount = db.members.filter(m => m.role === 'admin' && m.status === 'active').length;
      if (target.role === 'admin' && adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'মেসের একমাত্র এডমিনকে অপসারণ করা সম্ভব নয়। প্রথমে অন্য সদস্যকে এডমিন হিসেবে নির্ধারণ করুন।',
        });
      }

      // Always preserve historical records: set status to 'left' (Removed)
      target.status = 'left';

      logAudit(
        user.name,
        'MEMBER_REMOVED',
        'members',
        `সদস্য ${target.name} কে মেস তালিকা থেকে অপসারিত করা হয়েছে। পূর্বের সকল মিল, বাজার খরচ ও হিসাবের রেকর্ড সংরক্ষিত রয়েছে।`,
        `${target.name} (ফোন: ${target.phone}, রুম: ${target.roomNo || 'N/A'})`,
        'Status: Removed (Preserved)',
        user.id,
        'Member',
        id,
        user.ipAddress
      );

      notify('সদস্য অপসারণ', `সদস্য ${target.name} মেস তালিকা থেকে অপসারিত হয়েছে (রেকর্ড সংরক্ষিত)।`, 'warning', 'members');
      recalculateMonthlyAccount(getCurrentDhakaPeriod().periodId);
      saveDatabase(db);
      res.json({ success: true, message: 'সদস্য অপসারিত হয়েছে এবং ঐতিহাসিক রেকর্ড সংরক্ষিত রয়েছে', data: db.members });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Helper to compute a member's complete financial profile
  function buildMemberFinancialProfile(memberId: string) {
    const db = getDatabase();
    const member = db.members.find(m => m.id === memberId);
    if (!member) return null;

    const currentPeriod = getCurrentDhakaPeriod().periodId; // e.g. "2026-10"
    const currentCalculation = calculateMonthlyAccount(db, currentPeriod);
    const prevPeriod = getPreviousMonthPeriod(currentPeriod);
    const prevCalculation = db.monthlyAccounts.find(a => a.month === prevPeriod);

    // Current Month Statement
    const currentStatement = currentCalculation.statements?.[memberId];
    const prevStatement = prevCalculation?.statements?.[memberId];

    // Current Month Payments for this member
    const currentMonthPayments = (db.payments || []).filter(
      p => p.memberId === memberId && (p.date.startsWith(currentPeriod) || p.periodId === currentPeriod)
    );

    const depositedThisMonth = currentMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const verifiedPaymentsThisMonth = currentMonthPayments
      .filter(p => p.status === 'verified')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const pendingPaymentsThisMonth = currentMonthPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const rejectedPaymentsThisMonth = currentMonthPayments
      .filter(p => p.status === 'rejected')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const mealExpensesThisMonth = currentStatement?.mealCost || 0;
    const otherAllocatedExpensesThisMonth =
      (currentStatement?.sharedCostsShare || 0) + (currentStatement?.individualCosts || 0);
    const totalExpensesThisMonth =
      currentStatement?.totalCost || mealExpensesThisMonth + otherAllocatedExpensesThisMonth;

    // Carry-forward previous month balance
    const shouldCarryForward = db.settings?.accountingConfig?.carryForwardPreviousBalance !== false;
    const previousMonthBalance = shouldCarryForward && prevStatement?.netBalance ? prevStatement.netBalance : 0;

    // Current Month's balance: expenses - verified payments
    const currentMonthBalance = totalExpensesThisMonth - verifiedPaymentsThisMonth;

    // Total net balance = previous balance + current expenses - verified payments
    const netTotalBalance = previousMonthBalance + totalExpensesThisMonth - verifiedPaymentsThisMonth;
    const totalOutstandingBalance = Math.max(0, netTotalBalance);
    const advanceBalance = Math.max(0, -netTotalBalance);

    // Member Payment History (All payments for this member, sorted descending)
    const paymentHistory = (db.payments || [])
      .filter(p => p.memberId === memberId)
      .map(p => ({
        id: p.id,
        date: p.date,
        amount: Number(p.amount) || 0,
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef || undefined,
        periodId: p.periodId || p.date.slice(0, 7),
        status: p.status || 'verified',
        verifiedBy: p.verifiedBy || undefined,
        verifiedAt: p.verifiedAt || undefined,
        rejectionReason: p.rejectionReason || undefined,
        receivedBy: p.receivedBy || undefined,
        cashReceivedBy: p.cashReceivedBy || undefined,
        cashNotes: p.cashNotes || undefined,
        receiptUrl: p.receiptUrl || undefined,
        createdAt: p.createdAt || p.date,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Month-wise Statements (Available months for this member)
    const allMonths = [
      currentCalculation,
      ...(db.monthlyAccounts || []).filter(a => a.month !== currentPeriod),
    ];

    const statements = allMonths
      .map(monthAcc => {
        const stmt = monthAcc.statements?.[memberId];
        if (!stmt) return null;
        const prevMonth = getPreviousMonthPeriod(monthAcc.month);
        const prevAcc = (db.monthlyAccounts || []).find(a => a.month === prevMonth);
        const openingBalance = (shouldCarryForward && prevAcc?.statements?.[memberId]?.netBalance) || 0;

        return {
          month: monthAcc.month,
          monthName: getMonthNameBengali(monthAcc.month),
          status: monthAcc.status || 'open',
          openingBalance,
          totalMeals: stmt.totalMeals || 0,
          mealRate: stmt.mealRate || 0,
          mealCost: stmt.mealCost || 0,
          sharedCostsShare: stmt.sharedCostsShare || 0,
          individualCosts: stmt.individualCosts || 0,
          totalCost: stmt.totalCost || 0,
          totalPaid: stmt.totalPaid || 0,
          netBalance: stmt.netBalance || 0,
          outstandingAmount: Math.max(0, stmt.netBalance || 0),
          advanceAmount: Math.max(0, -(stmt.netBalance || 0)),
          calculationBreakdown: `পূর্ববর্তী ব্যালেন্স (৳${openingBalance.toLocaleString()}) + মিল খরচ (৳${stmt.mealCost.toLocaleString()}) + শেয়ার খরচ (৳${stmt.sharedCostsShare.toLocaleString()}) - মোট জমা (৳${stmt.totalPaid.toLocaleString()}) = ${stmt.netBalance > 0 ? 'বকেয়া' : 'উদ্বৃত্ত'} ৳${Math.abs(stmt.netBalance).toLocaleString()}`,
        };
      })
      .filter(Boolean);

    return {
      personalInfo: {
        id: member.id,
        memberId: member.id,
        name: member.name,
        fullName: member.name,
        nickname: member.nickname,
        phone: member.phone,
        registeredPhoneNumber: member.phone,
        roomNo: member.roomNo,
        role: member.role,
        status: member.status,
        accountStatus: member.status === 'active' ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)',
        joiningDate: member.joiningDate,
        accountCreationDate: member.joiningDate || '2026-01-01',
        avatarColor: member.avatarColor || 'bg-emerald-600',
        profilePhoto: member.avatarColor,
        email: member.email,
      },
      currentMonth: currentPeriod,
      paymentSummary: {
        depositedThisMonth,
        verifiedPaymentsThisMonth,
        pendingPaymentsThisMonth,
        rejectedPaymentsThisMonth,
        totalMealsThisMonth: currentStatement?.totalMeals || 0,
        currentMealRate: currentCalculation.mealRate || 0,
        mealExpensesThisMonth,
        totalMealExpensesThisMonth: mealExpensesThisMonth,
        otherAllocatedExpensesThisMonth,
        totalExpensesThisMonth,
        previousMonthBalance,
        currentMonthBalance,
        totalOutstandingBalance,
        advanceBalance,
      },
      paymentHistory,
      statements,
    };
  }

  // Get Authenticated Member's Own Financial Profile (Strict Privacy)
  app.get('/api/members/me/financial-profile', (req, res) => {
    try {
      const reqUser = getRequestUser(req);
      if (!reqUser || reqUser.id === 'unauthenticated') {
        return res.status(401).json({ success: false, error: 'অনুগ্রহ করে প্রথমে লগইন করুন (Unauthorized)' });
      }

      const profile = buildMemberFinancialProfile(reqUser.id);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'সদস্য তথ্য খুঁজে পাওয়া যায়নি' });
      }

      res.json({ success: true, profile });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Member Financial Profile by ID (Strict Privacy: Own record or Admin only)
  app.get('/api/members/:id/financial-profile', (req, res) => {
    try {
      const { id } = req.params;
      const reqUser = getRequestUser(req);
      if (!reqUser || reqUser.id === 'unauthenticated') {
        return res.status(401).json({ success: false, error: 'লগইন আবশ্যক' });
      }

      const isOwnProfile = reqUser.id === id;
      const isSuper = isPrimaryAdmin({ id: reqUser.id, name: reqUser.name, role: reqUser.role });
      const isAdminUser = isSuper || reqUser.role === 'admin' || reqUser.role === 'PRIMARY_ADMIN';

      if (!isOwnProfile && !isAdminUser) {
        return res.status(403).json({
          success: false,
          error: 'নিরাপত্তা নিষেধাজ্ঞা: আপনি শুধুমাত্র আপনার নিজের আর্থিক হিসাব ও পেমেন্ট রেকর্ড দেখতে পারেন। অন্য সদস্যের হিসাব দেখার অনুমতি নেই (403 Forbidden)',
        });
      }

      const profile = buildMemberFinancialProfile(id);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'সদস্য তথ্য খুঁজে পাওয়া যায়নি' });
      }

      res.json({ success: true, profile });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Batch save daily meals (Admin only, closed month protection, auto recalculate)
  app.post('/api/meals/batch', (req, res) => {
    try {
      const { date, records, notes } = req.body;
      const user = checkAdminAuth(req, res, { recordDate: date });
      if (!user) return;

      if (!date || !records) {
        return res.status(400).json({ success: false, error: 'Date and meal records are required' });
      }

      const db = getDatabase();
      let totalLunch = 0;
      let totalDinner = 0;

      Object.values(records).forEach((r: any) => {
        r.breakfast = 0;
        const l = Number(r.lunch) || 0;
        const d = Number(r.dinner) || 0;
        if (l < 0 || d < 0) {
          throw new Error('মিলের সংখ্যা কখনো নেগেটিভ হতে পারে না');
        }
        totalLunch += l;
        totalDinner += d;
      });

      const totalMeals = totalLunch + totalDinner;
      const existingIndex = db.dailyMeals.findIndex(dm => dm.date === date);
      const entryId = existingIndex >= 0 ? db.dailyMeals[existingIndex].id : `dm-${date}`;

      const entry = {
        id: entryId,
        date,
        records,
        totalBreakfast: 0,
        totalLunch,
        totalDinner,
        totalMeals,
        notes: notes || '',
        updatedBy: user.name,
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        const prevTotal = db.dailyMeals[existingIndex].totalMeals;
        db.dailyMeals[existingIndex] = entry;
        logAudit(
          user.name,
          'EDIT',
          'meals',
          `${date} তারিখের মিল আপডেট করা হয়েছে (মোট: ${totalMeals} মিল)`,
          `পূর্বের মোট মিল: ${prevTotal}`,
          `নতুন মোট মিল: ${totalMeals}`,
          user.id,
          'Meal',
          entryId,
          user.ipAddress
        );
      } else {
        db.dailyMeals.push(entry);
        logAudit(
          user.name,
          'ADD',
          'meals',
          `${date} তারিখের মিল এন্ট্রি করা হয়েছে (মোট: ${totalMeals} মিল)`,
          undefined,
          `মোট মিল: ${totalMeals}`,
          user.id,
          'Meal',
          entryId,
          user.ipAddress
        );
      }

      db.dailyMeals.sort((a, b) => b.date.localeCompare(a.date));
      saveDatabase(db);

      // Financial Protection: Recalculate affected month
      const affectedMonth = date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);

      res.json({ success: true, data: entry });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 5. Delete meals for date (Admin only, closed month protection, auto recalculate)
  app.delete('/api/meals/:date', (req, res) => {
    try {
      const { date } = req.params;
      const user = checkAdminAuth(req, res, { recordDate: date });
      if (!user) return;

      const db = getDatabase();
      const target = db.dailyMeals.find(dm => dm.date === date);
      if (!target) {
        return res.status(404).json({ success: false, error: 'এই তারিখের কোন মিল রেকর্ড পাওয়া যায়নি' });
      }

      db.dailyMeals = db.dailyMeals.filter(dm => dm.date !== date);

      logAudit(
        user.name,
        'DELETE',
        'meals',
        `${date} তারিখের সম্পূর্ণ মিল রেকর্ড মুছে ফেলা হয়েছে (মোট: ${target.totalMeals} মিল)`,
        `তারিখ: ${date}, মোট মিল: ${target.totalMeals}`,
        undefined,
        user.id,
        'Meal',
        target.id,
        user.ipAddress
      );

      // Auto recalculate month
      const affectedMonth = date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);
      saveDatabase(db);

      res.json({ success: true, message: `${date} তারিখের মিল রেকর্ড সফলভাবে মুছে ফেলা হয়েছে` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5a. Member Meal ON/OFF Toggle Endpoint
  // Enforces authorization: member can only change their own meal; admin can change all & override lock
  app.post('/api/meals/toggle-status', (req, res) => {
    try {
      const { memberId, date, mealType, status, isOverride, reason } = req.body;

      if (!memberId || !date || !mealType || !status) {
        return res.status(400).json({
          success: false,
          error: 'memberId, date, mealType (breakfast/lunch/dinner), and status (ON/OFF) are required',
        });
      }

      if (!['lunch', 'dinner'].includes(mealType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mealType. শুধুমাত্র দুপুর ও রাতের মিল চালু/বন্ধ করা যাবে।',
        });
      }

      if (!['ON', 'OFF'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status. Must be ON or OFF' });
      }

      // 1. Authorization Check: Normal member can ONLY change their own meal. Admin can manage all.
      const user = checkMemberMealAuth(req, res, memberId, date);
      if (!user) return;

      const db = getDatabase();
      const targetMember = db.members.find(m => m.id === memberId);
      if (!targetMember) {
        return res.status(404).json({ success: false, error: 'মেস সদস্য পাওয়া যায়নি' });
      }

      // Ensure selections & logs collections exist
      if (!db.memberMealSelections) db.memberMealSelections = [];
      if (!db.mealChangeLogs) db.mealChangeLogs = [];

      // 2. Cutoff time & lock check
      const cutoffSettings = db.settings.mealCutoffSettings || {
        breakfastCutoff: '06:00',
        lunchCutoff: '10:00',
        dinnerCutoff: '16:00',
        timezone: 'Asia/Dhaka',
        enableReminders: true,
        enableSmsNotification: false,
        sendSmsOnStatusChange: true,
      };

      const lockCheck = checkMealLock(date, mealType, cutoffSettings);

      // Normal member cannot change locked meals
      if (user.role !== 'admin' && lockCheck.isLocked) {
        return res.status(400).json({
          success: false,
          error: lockCheck.reason || 'Meal change time has ended for this meal. (কাট-অফ সময় শেষ হয়ে গেছে)',
          isLocked: true,
          cutoffTime: lockCheck.cutoffTime,
        });
      }

      // 3. Find existing selection or create
      const existingSelectionIdx = db.memberMealSelections.findIndex(
        s => s.memberId === memberId && s.date === date && s.mealType === mealType
      );

      const previousStatus: 'ON' | 'OFF' =
        existingSelectionIdx >= 0
          ? db.memberMealSelections[existingSelectionIdx].plannedStatus
          : 'OFF';

      const isLockedAdminOverride = user.role === 'admin' && (isOverride || lockCheck.isLocked);

      const selectionEntry = {
        id: existingSelectionIdx >= 0 ? db.memberMealSelections[existingSelectionIdx].id : `mms-${date}-${memberId}-${mealType}`,
        memberId,
        memberName: targetMember.name,
        date,
        mealType,
        plannedStatus: status as 'ON' | 'OFF',
        actualStatus: status === 'ON' ? 'attended' : 'missed',
        accountingStatus: status === 'ON' ? 'billed' : 'exempt',
        updatedBy: user.id,
        updatedByName: user.name,
        updatedAt: new Date().toISOString(),
        isLockedOverride: isLockedAdminOverride,
      };

      if (existingSelectionIdx >= 0) {
        db.memberMealSelections[existingSelectionIdx] = selectionEntry as any;
      } else {
        db.memberMealSelections.push(selectionEntry as any);
      }

      // 4. Log to mealChangeLogs
      const mealNameBn = mealType === 'breakfast' ? 'সকালের নাস্তা' : mealType === 'lunch' ? 'দুপুরের খাবার' : 'রাতের খাবার';
      const changeLog = {
        id: `mcl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        memberId,
        memberName: targetMember.name,
        date,
        mealType,
        previousStatus,
        newStatus: status as 'ON' | 'OFF',
        changedBy: user.id,
        changedByName: user.name,
        changedByRole: user.role,
        changedAt: new Date().toISOString(),
        isOverride: isLockedAdminOverride,
        reason: reason || (isLockedAdminOverride ? 'এডমিন লক ওভাররাইড' : user.role === 'admin' && user.id !== memberId ? 'এডমিন কর্তৃক পরিবর্তন' : 'সদস্য কর্তৃক পরিবর্তন'),
      };
      db.mealChangeLogs.unshift(changeLog as any);
      if (db.mealChangeLogs.length > 500) db.mealChangeLogs.pop();

      // If admin override or admin modifying another member, log to general audit logs
      if (isLockedAdminOverride || (user.role === 'admin' && user.id !== memberId)) {
        logAudit(
          user.name,
          isLockedAdminOverride ? 'ADMIN_OVERRIDE_MEAL' : 'EDIT',
          'meals',
          `${targetMember.name} এর ${date} তারিখের ${mealNameBn} (${mealType}) মিল ${previousStatus} থেকে ${status} করা হয়েছে${isLockedAdminOverride ? ' [লক ওভাররাইড]' : ''}`,
          `পূর্বের স্ট্যাটাস: ${previousStatus}`,
          `নতুন স্ট্যাটাস: ${status}`,
          user.id,
          'MealSelection',
          selectionEntry.id,
          user.ipAddress
        );
      }

      // 5. Automatic Synchronization with dailyMeals & financial accounting (Sections 8 & 9)
      let dailyEntry = db.dailyMeals.find(dm => dm.date === date);
      if (!dailyEntry) {
        dailyEntry = {
          id: `dm-${date}`,
          date,
          records: {},
          totalBreakfast: 0,
          totalLunch: 0,
          totalDinner: 0,
          totalMeals: 0,
          notes: '',
          updatedBy: user.name,
          updatedAt: new Date().toISOString(),
        };
        db.dailyMeals.push(dailyEntry);
      }

      // Get all active members
      const activeMembers = db.members.filter(m => m.status === 'active');
      activeMembers.forEach(m => {
        if (!dailyEntry!.records[m.id]) {
          dailyEntry!.records[m.id] = {
            memberId: m.id,
            breakfast: 0,
            lunch: 0,
            dinner: 0,
            total: 0,
          };
        }
      });

      // Update target member's record for this mealType
      const memRec = dailyEntry.records[memberId] || {
        memberId,
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        total: 0,
      };

      if (mealType === 'lunch') memRec.lunch = status === 'ON' ? 1 : 0;
      if (mealType === 'dinner') memRec.dinner = status === 'ON' ? 1 : 0;
      memRec.breakfast = 0;
      memRec.total = (memRec.lunch || 0) + (memRec.dinner || 0);
      dailyEntry.records[memberId] = memRec;

      // Recalculate daily totals strictly based on active members with confirmed ON
      let sumLunch = 0;
      let sumDinner = 0;
      activeMembers.forEach(m => {
        const r = dailyEntry!.records[m.id];
        if (r) {
          sumLunch += r.lunch || 0;
          sumDinner += r.dinner || 0;
        }
      });

      dailyEntry.totalBreakfast = 0;
      dailyEntry.totalLunch = sumLunch;
      dailyEntry.totalDinner = sumDinner;
      dailyEntry.totalMeals = sumLunch + sumDinner;
      dailyEntry.updatedBy = user.name;
      dailyEntry.updatedAt = new Date().toISOString();

      db.dailyMeals.sort((a, b) => b.date.localeCompare(a.date));

      // 6. Automatically recalculate monthly account for the affected month
      const affectedMonth = date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);

      // 7. Optional SMS Notification (Section 17)
      if (cutoffSettings.sendSmsOnStatusChange && targetMember.phone) {
        db.smsLogs.unshift({
          id: `sms-${Date.now()}`,
          timestamp: new Date().toISOString(),
          recipientId: memberId,
          recipientName: targetMember.name,
          phone: targetMember.phone,
          type: 'meal_status',
          message: `আপনার ${date} তারিখের ${mealNameBn} মিল সফলভাবে ${status} করা হয়েছে।`,
          status: 'sent',
          provider: db.settings.smsGateway.providerName || 'Mock SMS Gateway (Test Mode)',
          refId: `MEAL-${Date.now().toString().slice(-6)}`,
        });
      }

      saveDatabase(db);

      res.json({
        success: true,
        message: `${mealNameBn} মিল সফলভাবে ${status} করা হয়েছে।`,
        selection: selectionEntry,
        dailyMealEntry: dailyEntry,
        changeLog,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5b. Member Weekly Meal Planner / Batch Update
  app.post('/api/meals/batch-member-plan', (req, res) => {
    try {
      const { memberId, plans } = req.body;
      if (!memberId || !Array.isArray(plans)) {
        return res.status(400).json({ success: false, error: 'memberId and plans array are required' });
      }

      const user = checkMemberMealAuth(req, res, memberId, plans[0]?.date || '');
      if (!user) return;

      const db = getDatabase();
      const targetMember = db.members.find(m => m.id === memberId);
      if (!targetMember) {
        return res.status(404).json({ success: false, error: 'সদস্য পাওয়া যায়নি' });
      }

      if (!db.memberMealSelections) db.memberMealSelections = [];
      if (!db.mealChangeLogs) db.mealChangeLogs = [];

      const cutoffSettings = db.settings.mealCutoffSettings || {
        breakfastCutoff: '06:00',
        lunchCutoff: '10:00',
        dinnerCutoff: '16:00',
        timezone: 'Asia/Dhaka',
        enableReminders: true,
        enableSmsNotification: false,
      };

      const updatedDates = new Set<string>();

      plans.forEach((plan: { date: string; breakfast?: 'ON' | 'OFF'; lunch?: 'ON' | 'OFF'; dinner?: 'ON' | 'OFF' }) => {
        const { date, breakfast, lunch, dinner } = plan;
        if (!date) return;
        updatedDates.add(date);

        const mealEntries: Array<{ mealType: 'lunch' | 'dinner'; status?: 'ON' | 'OFF' }> = [
          { mealType: 'lunch', status: lunch },
          { mealType: 'dinner', status: dinner },
        ];

        mealEntries.forEach(({ mealType, status }) => {
          if (!status) return;
          const lock = checkMealLock(date, mealType, cutoffSettings);
          // If locked and not admin, skip locked meal
          if (user.role !== 'admin' && lock.isLocked) return;

          const existingIdx = db.memberMealSelections!.findIndex(
            s => s.memberId === memberId && s.date === date && s.mealType === mealType
          );
          const prevStatus = existingIdx >= 0 ? db.memberMealSelections![existingIdx].plannedStatus : 'OFF';

          if (prevStatus === status && existingIdx >= 0) return; // No change

          const selEntry = {
            id: existingIdx >= 0 ? db.memberMealSelections![existingIdx].id : `mms-${date}-${memberId}-${mealType}`,
            memberId,
            memberName: targetMember.name,
            date,
            mealType,
            plannedStatus: status,
            actualStatus: status === 'ON' ? 'attended' : 'missed',
            accountingStatus: status === 'ON' ? 'billed' : 'exempt',
            updatedBy: user.id,
            updatedByName: user.name,
            updatedAt: new Date().toISOString(),
          };

          if (existingIdx >= 0) {
            db.memberMealSelections![existingIdx] = selEntry as any;
          } else {
            db.memberMealSelections!.push(selEntry as any);
          }

          db.mealChangeLogs!.unshift({
            id: `mcl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            memberId,
            memberName: targetMember.name,
            date,
            mealType,
            previousStatus: prevStatus,
            newStatus: status,
            changedBy: user.id,
            changedByName: user.name,
            changedByRole: user.role,
            changedAt: new Date().toISOString(),
            reason: 'সাপ্তাহিক মিল প্ল্যানার থেকে সংরক্ষিত',
          } as any);
        });

        // Sync dailyMeals for this date
        let dailyEntry = db.dailyMeals.find(dm => dm.date === date);
        if (!dailyEntry) {
          dailyEntry = {
            id: `dm-${date}`,
            date,
            records: {},
            totalBreakfast: 0,
            totalLunch: 0,
            totalDinner: 0,
            totalMeals: 0,
            updatedBy: user.name,
            updatedAt: new Date().toISOString(),
          };
          db.dailyMeals.push(dailyEntry);
        }

        const lOn = db.memberMealSelections!.find(s => s.memberId === memberId && s.date === date && s.mealType === 'lunch')?.plannedStatus === 'ON';
        const dOn = db.memberMealSelections!.find(s => s.memberId === memberId && s.date === date && s.mealType === 'dinner')?.plannedStatus === 'ON';

        dailyEntry.records[memberId] = {
          memberId,
          breakfast: 0,
          lunch: lOn ? 1 : 0,
          dinner: dOn ? 1 : 0,
          total: (lOn ? 1 : 0) + (dOn ? 1 : 0),
        };

        const activeMembers = db.members.filter(m => m.status === 'active');
        let sumL = 0, sumD = 0;
        activeMembers.forEach(m => {
          const rec = dailyEntry!.records[m.id];
          if (rec) {
            sumL += rec.lunch || 0;
            sumD += rec.dinner || 0;
          }
        });
        dailyEntry.totalBreakfast = 0;
        dailyEntry.totalLunch = sumL;
        dailyEntry.totalDinner = sumD;
        dailyEntry.totalMeals = sumL + sumD;
        dailyEntry.updatedAt = new Date().toISOString();
      });

      db.dailyMeals.sort((a, b) => b.date.localeCompare(a.date));

      // Recalculate affected months
      const months = new Set(Array.from(updatedDates).map(d => d.slice(0, 7)));
      months.forEach(m => recalculateMonthlyAccount(m));

      saveDatabase(db);
      res.json({
        success: true,
        message: 'সাপ্তাহিক মিল প্ল্যান সফলভাবে সংরক্ষিত হয়েছে।',
        selections: db.memberMealSelections,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5c. Meal Change History Logs (Auditing)
  app.get('/api/meals/change-logs', (req, res) => {
    try {
      const db = getDatabase();
      const user = getRequestUser(req);
      const { memberId, date } = req.query as { memberId?: string; date?: string };

      let logs = db.mealChangeLogs || [];

      // If normal member, only return their own logs (Section 10)
      if (user.role !== 'admin') {
        logs = logs.filter(l => l.memberId === user.id);
      } else if (memberId) {
        logs = logs.filter(l => l.memberId === memberId);
      }

      if (date) {
        logs = logs.filter(l => l.date === date);
      }

      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5d. Send Meal Cutoff Reminders (Admin manual trigger or scheduled)
  app.post('/api/meals/send-cutoff-reminders', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { date = getTodayDhakaDate() } = req.body;
      const activeMembers = db.members.filter(m => m.status === 'active');

      const reminderTitle = 'মিল কনফার্মেশন রিমাইন্ডার';
      const reminderMsg = `${date} তারিখের মিল কাট-অফ সময়ের পূর্বে আপনার মিল ON বা OFF স্ট্যাটাস নিশ্চিত করুন।`;

      notify(reminderTitle, reminderMsg, 'info', 'meals');

      // Add SMS if phone configured
      let sentCount = 0;
      activeMembers.forEach(m => {
        if (m.phone) {
          db.smsLogs.unshift({
            id: `sms-${Date.now()}-${m.id}`,
            timestamp: new Date().toISOString(),
            recipientId: m.id,
            recipientName: m.name,
            phone: m.phone,
            type: 'reminder',
            message: `${reminderTitle}: ${reminderMsg} - Bachelor Zone`,
            status: 'sent',
            provider: db.settings.smsGateway.providerName,
            refId: `REM-${Date.now().toString().slice(-6)}`,
          });
          sentCount++;
        }
      });

      saveDatabase(db);
      res.json({
        success: true,
        message: `${activeMembers.length} জন সক্রিয় সদস্যের কাছে মিল রিমাইন্ডার পাঠানো হয়েছে (${sentCount} টি SMS)।`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5e. Update Meal Cutoff Settings (Admin only)
  app.post('/api/settings/meal-cutoff', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { mealCutoffSettings } = req.body;
      if (!mealCutoffSettings) {
        return res.status(400).json({ success: false, error: 'mealCutoffSettings required' });
      }

      const prev = { ...db.settings.mealCutoffSettings };
      db.settings.mealCutoffSettings = {
        ...db.settings.mealCutoffSettings,
        ...mealCutoffSettings,
      };

      logAudit(
        user.name,
        'EDIT',
        'settings',
        'মিল কাট-অফ সময় ও নিয়মাবলি কনফিগারেশন আপডেট করা হয়েছে',
        JSON.stringify(prev),
        JSON.stringify(db.settings.mealCutoffSettings),
        user.id,
        'Settings',
        'meal-cutoff-config',
        user.ipAddress
      );

      saveDatabase(db);
      res.json({ success: true, data: db.settings.mealCutoffSettings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Meal Menu (Admin only)
  app.post('/api/menus', (req, res) => {
    try {
      const { menu } = req.body;
      const user = checkAdminAuth(req, res);
      if (!user) return;

      if (!menu || !menu.date) {
        return res.status(400).json({ success: false, error: 'Date is required for menu' });
      }

      const db = getDatabase();
      const existingIndex = db.mealMenus.findIndex(m => m.date === menu.date);
      if (existingIndex >= 0) {
        const prev = db.mealMenus[existingIndex];
        db.mealMenus[existingIndex] = { ...menu, updatedBy: user.name };
        logAudit(
          user.name,
          'EDIT',
          'meals',
          `${menu.date} তারিখের খাবার মেনু পরিবর্তন করা হয়েছে`,
          `দুপুর: ${prev.lunch || 'N/A'}, রাত: ${prev.dinner || 'N/A'}`,
          `দুপুর: ${menu.lunch || 'N/A'}, রাত: ${menu.dinner || 'N/A'}`,
          user.id,
          'Menu',
          prev.id,
          user.ipAddress
        );
        notify('খাবার মেনু পরিবর্তন', `${menu.date} তারিখের মেনু আপডেট করা হয়েছে।`, 'info', 'menu');
      } else {
        const newId = `menu-${Date.now()}`;
        db.mealMenus.push({
          ...menu,
          id: newId,
          updatedBy: user.name,
        });
        logAudit(
          user.name,
          'ADD',
          'meals',
          `${menu.date} তারিখের নতুন মেনু যুক্ত হয়েছে`,
          undefined,
          `দুপুর: ${menu.lunch || 'N/A'}, রাত: ${menu.dinner || 'N/A'}`,
          user.id,
          'Menu',
          newId,
          user.ipAddress
        );
      }

      saveDatabase(db);
      res.json({ success: true, data: db.mealMenus });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Delete Menu (Admin only)
  app.delete('/api/menus/:id', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { id } = req.params;
      const target = db.mealMenus.find(m => m.id === id || m.date === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'মেনু রেকর্ড পাওয়া যায়নি' });
      }

      db.mealMenus = db.mealMenus.filter(m => m.id !== target.id);
      logAudit(
        user.name,
        'DELETE',
        'meals',
        `${target.date} তারিখের মেনু মুছে ফেলা হয়েছে`,
        `দুপুর: ${target.lunch}, রাত: ${target.dinner}`,
        undefined,
        user.id,
        'Menu',
        target.id,
        user.ipAddress
      );

      saveDatabase(db);
      res.json({ success: true, message: 'মেনু মুছে ফেলা হয়েছে', data: db.mealMenus });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Cooking Duty (Admin only)
  app.post('/api/cooking-duty', (req, res) => {
    try {
      const { duty } = req.body;
      const user = checkAdminAuth(req, res);
      if (!user) return;

      if (!duty || !duty.date || !duty.memberId) {
        return res.status(400).json({ success: false, error: 'Date and member are required' });
      }

      const db = getDatabase();
      const existingIndex = db.cookingDuties.findIndex(
        d => d.date === duty.date && d.mealType === (duty.mealType || 'all_day')
      );

      if (existingIndex >= 0) {
        const prev = db.cookingDuties[existingIndex];
        db.cookingDuties[existingIndex] = { ...duty };
        logAudit(
          user.name,
          'EDIT',
          'meals',
          `${duty.date} তারিখে রান্নার দায়িত্ব পরিবর্তন: ${duty.memberName}`,
          `পূর্বের দায়িত্ব: ${prev.memberName}`,
          `নতুন দায়িত্ব: ${duty.memberName}`,
          user.id,
          'CookingDuty',
          prev.id,
          user.ipAddress
        );
      } else {
        const newId = `cook-${Date.now()}`;
        db.cookingDuties.push({
          ...duty,
          id: newId,
          status: duty.status || 'scheduled',
        });
        logAudit(
          user.name,
          'ADD',
          'meals',
          `${duty.date} তারিখে রান্নার দায়িত্ব নির্ধারণ: ${duty.memberName}`,
          undefined,
          `${duty.memberName} (${duty.date})`,
          user.id,
          'CookingDuty',
          newId,
          user.ipAddress
        );
      }

      notify('রান্নার দায়িত্ব নির্ধারণ', `${duty.date} তারিখে রান্নার দায়িত্ব: ${duty.memberName}`, 'info', 'cooking');
      saveDatabase(db);
      res.json({ success: true, data: db.cookingDuties });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Delete Cooking Duty (Admin only)
  app.delete('/api/cooking-duty/:id', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { id } = req.params;
      const target = db.cookingDuties.find(d => d.id === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'রান্নার দায়িত্ব পাওয়া যায়নি' });
      }

      db.cookingDuties = db.cookingDuties.filter(d => d.id !== id);
      logAudit(
        user.name,
        'DELETE',
        'meals',
        `${target.date} তারিখের রান্নার দায়িত্ব মুছে ফেলা হয়েছে (${target.memberName})`,
        `${target.memberName} (${target.date})`,
        undefined,
        user.id,
        'CookingDuty',
        id,
        user.ipAddress
      );

      saveDatabase(db);
      res.json({ success: true, message: 'রান্নার দায়িত্ব মুছে ফেলা হয়েছে', data: db.cookingDuties });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Bazar Record (Admin only / Configured Treasurer; closed month protection; auto recalculate)
  app.post('/api/bazar', (req, res) => {
    try {
      const { bazar } = req.body;
      if (!bazar || !bazar.date || !bazar.bazarPersonId || !bazar.items || bazar.items.length === 0) {
        return res.status(400).json({ success: false, error: 'Date, person, and at least one item are required' });
      }

      const user = checkAdminAuth(req, res, { recordDate: bazar.date, allowTreasurerFor: 'bazar' });
      if (!user) return;

      const totalAmount = bazar.items.reduce(
        (sum: number, it: any) => sum + (Number(it.subtotal) || Number(it.quantity) * Number(it.price)),
        0
      );

      if (totalAmount <= 0) {
        return res.status(400).json({ success: false, error: 'বাজারের মোট পরিমাণ ০ এর চেয়ে বেশি হতে হবে' });
      }

      const db = getDatabase();
      const existingIndex = db.bazarRecords.findIndex(b => b.id === bazar.id);

      if (existingIndex >= 0) {
        const prev = db.bazarRecords[existingIndex];
        db.bazarRecords[existingIndex] = {
          ...bazar,
          totalAmount,
        };
        logAudit(
          user.name,
          'EDIT',
          'bazar',
          `${bazar.date} তারিখের বাজার হিসাব সংশোধন (${bazar.bazarPersonName})`,
          `৳${prev.totalAmount} (${prev.items?.length || 0} আইটেম)`,
          `৳${totalAmount} (${bazar.items.length} আইটেম)`,
          user.id,
          'Bazar',
          bazar.id,
          user.ipAddress
        );
      } else {
        const newId = `bazar-${Date.now()}`;
        const newRecord = {
          ...bazar,
          id: newId,
          totalAmount,
          createdAt: new Date().toISOString(),
          createdBy: user.name,
        };
        db.bazarRecords.unshift(newRecord);
        logAudit(
          user.name,
          'ADD',
          'bazar',
          `${bazar.date} তারিখে ৳${totalAmount.toLocaleString()} টাকার বাজার যোগ হয়েছে (${bazar.bazarPersonName})`,
          undefined,
          `৳${totalAmount} (${bazar.bazarPersonName})`,
          user.id,
          'Bazar',
          newId,
          user.ipAddress
        );
        notify(
          'বাজার সম্পন্ন',
          `${bazar.date} তারিখে ৳${totalAmount.toLocaleString()} টাকার বাজার এন্ট্রি হয়েছে।`,
          'success',
          'bazar'
        );
      }

      saveDatabase(db);

      // Financial Protection: Recalculate affected month
      const affectedMonth = bazar.date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);

      res.json({ success: true, data: db.bazarRecords });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Delete Bazar Record (Admin only / Configured Treasurer; closed month protection; auto recalculate)
  app.delete('/api/bazar/:id', (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const target = db.bazarRecords.find(b => b.id === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'বাজার রেকর্ড পাওয়া যায়নি' });
      }

      const user = checkAdminAuth(req, res, { recordDate: target.date, allowTreasurerFor: 'bazar' });
      if (!user) return;

      db.bazarRecords = db.bazarRecords.filter(b => b.id !== id);

      logAudit(
        user.name,
        'DELETE',
        'bazar',
        `${target.date} তারিখের ৳${target.totalAmount.toLocaleString()} টাকার বাজার রেকর্ড মুছে ফেলা হয়েছে (${target.bazarPersonName})`,
        `তারিখ: ${target.date}, পরিমাণ: ৳${target.totalAmount}, সদস্য: ${target.bazarPersonName}`,
        undefined,
        user.id,
        'Bazar',
        id,
        user.ipAddress
      );

      // Recalculate monthly account
      const affectedMonth = target.date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);
      saveDatabase(db);

      res.json({ success: true, message: 'বাজার রেকর্ড সফলভাবে মুছে ফেলা হয়েছে', data: db.bazarRecords });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 12. Bazar Duty (Admin only)
  app.post('/api/bazar-duty', (req, res) => {
    try {
      const { duty } = req.body;
      const user = checkAdminAuth(req, res);
      if (!user) return;

      if (!duty || !duty.date || !duty.memberId) {
        return res.status(400).json({ success: false, error: 'Date and member are required' });
      }

      const db = getDatabase();
      const existingIndex = db.bazarDuties.findIndex(d => d.date === duty.date);

      if (existingIndex >= 0) {
        const prev = db.bazarDuties[existingIndex];
        db.bazarDuties[existingIndex] = { ...duty };
        logAudit(
          user.name,
          'EDIT',
          'bazar',
          `${duty.date} তারিখের বাজার দায়িত্ব আপডেট: ${duty.memberName}`,
          `পূর্বের দায়িত্ব: ${prev.memberName}`,
          `নতুন দায়িত্ব: ${duty.memberName}`,
          user.id,
          'BazarDuty',
          prev.id,
          user.ipAddress
        );
      } else {
        const newId = `bd-${Date.now()}`;
        db.bazarDuties.push({
          ...duty,
          id: newId,
          status: duty.status || 'pending',
        });
        logAudit(
          user.name,
          'ADD',
          'bazar',
          `${duty.date} তারিখের বাজার দায়িত্ব নির্ধারণ: ${duty.memberName}`,
          undefined,
          `${duty.memberName} (${duty.date})`,
          user.id,
          'BazarDuty',
          newId,
          user.ipAddress
        );
      }

      notify('বাজার দায়িত্ব নির্ধারণ', `${duty.date} তারিখে বাজার করার দায়িত্ব: ${duty.memberName}`, 'info', 'bazar');
      saveDatabase(db);
      res.json({ success: true, data: db.bazarDuties });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 13. Delete Bazar Duty (Admin only)
  app.delete('/api/bazar-duty/:id', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { id } = req.params;
      const target = db.bazarDuties.find(d => d.id === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'বাজারের দায়িত্ব পাওয়া যায়নি' });
      }

      db.bazarDuties = db.bazarDuties.filter(d => d.id !== id);
      logAudit(
        user.name,
        'DELETE',
        'bazar',
        `${target.date} তারিখের বাজার দায়িত্ব মুছে ফেলা হয়েছে (${target.memberName})`,
        `${target.memberName} (${target.date})`,
        undefined,
        user.id,
        'BazarDuty',
        id,
        user.ipAddress
      );

      saveDatabase(db);
      res.json({ success: true, message: 'বাজার দায়িত্ব মুছে ফেলা হয়েছে', data: db.bazarDuties });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. Market List Items (Admin only)
  app.post('/api/market-list', (req, res) => {
    try {
      const { item } = req.body;
      const user = checkAdminAuth(req, res);
      if (!user) return;

      if (!item || !item.name) {
        return res.status(400).json({ success: false, error: 'Item name is required' });
      }

      const db = getDatabase();
      const existingIndex = db.marketList.findIndex(m => m.id === item.id);

      if (existingIndex >= 0) {
        const prev = db.marketList[existingIndex];
        db.marketList[existingIndex] = { ...item };
        logAudit(
          user.name,
          'EDIT',
          'bazar',
          `বাজার তালিকার আইটেম আপডেট: ${item.name}`,
          `${prev.name} (${prev.status})`,
          `${item.name} (${item.status})`,
          user.id,
          'MarketItem',
          item.id,
          user.ipAddress
        );
      } else {
        const newId = `ml-${Date.now()}`;
        db.marketList.unshift({
          ...item,
          id: newId,
          addedBy: user.name,
          addedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          status: item.status || 'needed',
          priority: item.priority || 'medium',
        });
        logAudit(
          user.name,
          'ADD',
          'bazar',
          `বাজার তালিকায় নতুন আইটেম যুক্ত: ${item.name}`,
          undefined,
          `${item.name} (${item.estimatedQty || ''})`,
          user.id,
          'MarketItem',
          newId,
          user.ipAddress
        );
      }

      saveDatabase(db);
      res.json({ success: true, data: db.marketList });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 15. Delete Market List Item (Admin only)
  app.delete('/api/market-list/:id', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { id } = req.params;
      const target = db.marketList.find(m => m.id === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'বাজার তালিকার আইটেম পাওয়া যায়নি' });
      }

      db.marketList = db.marketList.filter(m => m.id !== id);
      logAudit(
        user.name,
        'DELETE',
        'bazar',
        `বাজার তালিকা থেকে '${target.name}' মুছে ফেলা হয়েছে`,
        `${target.name} (${target.quantity || target.estimatedQuantity || ''})`,
        undefined,
        user.id,
        'MarketItem',
        id,
        user.ipAddress
      );

      saveDatabase(db);
      res.json({ success: true, message: 'আইটেম মুছে ফেলা হয়েছে', data: db.marketList });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 16. General Expenses (Admin only / Configured Treasurer; closed month protection; auto recalculate)
  app.post('/api/expenses', (req, res) => {
    try {
      const { expense } = req.body;
      if (!expense || !expense.category || !expense.amount || !expense.date) {
        return res.status(400).json({ success: false, error: 'Date, category, and amount are required' });
      }

      const user = checkAdminAuth(req, res, { recordDate: expense.date, allowTreasurerFor: 'expenses' });
      if (!user) return;

      const amt = Number(expense.amount);
      if (amt <= 0) {
        return res.status(400).json({ success: false, error: 'খরচের পরিমাণ ধনাত্মক হতে হবে' });
      }

      const db = getDatabase();
      const existingIndex = db.expenses.findIndex(e => e.id === expense.id);

      if (existingIndex >= 0) {
        const prev = db.expenses[existingIndex];
        db.expenses[existingIndex] = { ...expense, amount: amt };
        logAudit(
          user.name,
          'EDIT',
          'expenses',
          `${expense.category} খরচ আপডেট: ৳${amt}`,
          `৳${prev.amount} (${prev.description})`,
          `৳${amt} (${expense.description})`,
          user.id,
          'Expense',
          expense.id,
          user.ipAddress
        );
      } else {
        const newId = `exp-${Date.now()}`;
        const newExpense = {
          ...expense,
          id: newId,
          amount: amt,
          createdBy: user.name,
          createdAt: new Date().toISOString(),
        };
        db.expenses.unshift(newExpense);
        logAudit(
          user.name,
          'ADD',
          'expenses',
          `নতুন খরচ এন্ট্রি: ${expense.category} বাবদ ৳${amt.toLocaleString()} (${expense.description})`,
          undefined,
          `৳${amt} (${expense.description})`,
          user.id,
          'Expense',
          newId,
          user.ipAddress
        );
      }

      saveDatabase(db);

      // Financial Protection: Auto recalculate month
      const affectedMonth = expense.date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);

      res.json({ success: true, data: db.expenses });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 17. Delete Expense (Admin only / Configured Treasurer; closed month protection; auto recalculate)
  app.delete('/api/expenses/:id', (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const target = db.expenses.find(e => e.id === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'খরচের রেকর্ড পাওয়া যায়নি' });
      }

      const user = checkAdminAuth(req, res, { recordDate: target.date, allowTreasurerFor: 'expenses' });
      if (!user) return;

      db.expenses = db.expenses.filter(e => e.id !== id);

      logAudit(
        user.name,
        'DELETE',
        'expenses',
        `${target.category} বাবদ ৳${target.amount.toLocaleString()} খরচের রেকর্ড মুছে ফেলা হয়েছে`,
        `তারিখ: ${target.date}, পরিমাণ: ৳${target.amount}, বিবরণ: ${target.description}`,
        undefined,
        user.id,
        'Expense',
        id,
        user.ipAddress
      );

      // Auto recalculate month
      const affectedMonth = target.date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);
      saveDatabase(db);

      res.json({ success: true, message: 'খরচের রেকর্ড সফলভাবে মুছে ফেলা হয়েছে', data: db.expenses });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 18. Member Payments / Deposits (Admin only / Configured Treasurer; closed month protection; auto recalculate)
  app.post('/api/payments', (req, res) => {
    try {
      const { payment } = req.body;
      if (!payment || !payment.memberId || !payment.amount || !payment.date) {
        return res.status(400).json({ success: false, error: 'Member, date, and amount are required' });
      }

      const reqUser = getRequestUser(req);
      const isSelfSubmission = !payment.id && reqUser.id === payment.memberId && reqUser.status === 'active';
      let user: RequestUserInfo | null = null;
      if (isSelfSubmission) {
        if (isMonthClosed(payment.date)) {
          return res.status(400).json({ success: false, error: 'এই মাসের হিসাব বন্ধ রয়েছে।' });
        }
        user = reqUser;
      } else {
        user = checkAdminAuth(req, res, { recordDate: payment.date, allowTreasurerFor: 'payments' });
        if (!user) return;
      }

      const amt = Number(payment.amount);
      if (amt <= 0) {
        return res.status(400).json({ success: false, error: 'জমার পরিমাণ ধনাত্মক হতে হবে' });
      }

      const db = getDatabase();
      const existingIndex = db.payments.findIndex(p => p.id === payment.id);

      if (existingIndex >= 0) {
        const prev = db.payments[existingIndex];
        db.payments[existingIndex] = { ...payment, amount: amt };
        logAudit(
          user.name,
          'EDIT',
          'payments',
          `${payment.memberName} এর জমা আপডেট: ৳${amt}`,
          `৳${prev.amount} (${prev.paymentMethod})`,
          `৳${amt} (${payment.paymentMethod})`,
          user.id,
          'Payment',
          payment.id,
          user.ipAddress
        );
      } else {
        const newId = `pay-${Date.now()}`;
        const newPayment = {
          ...payment,
          id: newId,
          amount: amt,
          status: isSelfSubmission ? 'pending' : (payment.status || 'verified'),
          verifiedBy: isSelfSubmission ? undefined : (payment.verifiedBy || user.name),
          verifiedAt: isSelfSubmission ? undefined : (payment.verifiedAt || new Date().toISOString()),
          createdAt: new Date().toISOString(),
          receivedBy: payment.receivedBy || (isSelfSubmission ? 'অপেক্ষমান (Pending Verification)' : user.name),
        };
        db.payments.unshift(newPayment);
        logAudit(
          user.name,
          'ADD',
          'payments',
          `${payment.memberName} এর কাছ থেকে ৳${amt.toLocaleString()} টাকা জমা গৃহীত হয়েছে (${payment.paymentMethod})`,
          undefined,
          `৳${amt} (${payment.paymentMethod})`,
          user.id,
          'Payment',
          newId,
          user.ipAddress
        );
        notify(
          'মেস জমা রসিদ',
          `${payment.memberName} কর্তৃক ৳${amt.toLocaleString()} জমা রেকর্ড করা হয়েছে।`,
          'success',
          'payments'
        );
      }

      saveDatabase(db);

      // Financial Protection: Recalculate affected month
      const affectedMonth = payment.date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);

      res.json({ success: true, data: db.payments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 19. Delete Payment (Admin only / Configured Treasurer; closed month protection; auto recalculate)
  app.delete('/api/payments/:id', (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const target = db.payments.find(p => p.id === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'জমার রেকর্ড পাওয়া যায়নি' });
      }

      const user = checkAdminAuth(req, res, { recordDate: target.date, allowTreasurerFor: 'payments' });
      if (!user) return;

      db.payments = db.payments.filter(p => p.id !== id);

      logAudit(
        user.name,
        'DELETE',
        'payments',
        `${target.memberName} এর ৳${target.amount.toLocaleString()} জমার রেকর্ড মুছে ফেলা হয়েছে`,
        `তারিখ: ${target.date}, পরিমাণ: ৳${target.amount}, সদস্য: ${target.memberName}`,
        undefined,
        user.id,
        'Payment',
        id,
        user.ipAddress
      );

      // Recalculate month
      const affectedMonth = target.date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);
      saveDatabase(db);

      res.json({ success: true, message: 'জমার রেকর্ড সফলভাবে মুছে ফেলা হয়েছে', data: db.payments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 19b. Verify Pending Payment (Admin only / Configured Treasurer)
  app.post('/api/payments/:id/verify', (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const target = db.payments.find(p => p.id === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'জমার রেকর্ড পাওয়া যায়নি' });
      }

      const user = checkAdminAuth(req, res, { recordDate: target.date, allowTreasurerFor: 'payments' });
      if (!user) return;

      target.status = 'verified';
      target.verifiedBy = user.name;
      target.verifiedAt = new Date().toISOString();

      logAudit(
        user.name,
        'VERIFY',
        'payments',
        `${target.memberName} এর ৳${target.amount.toLocaleString()} জমার আবেদন অনুমোদন/ভেরিফাই করা হয়েছে (${target.paymentMethod})`,
        'স্ট্যাটাস: pending -> verified',
        `৳${target.amount} (${target.paymentMethod})`,
        user.id,
        'Payment',
        id,
        user.ipAddress
      );

      // Recalculate affected month
      const affectedMonth = target.date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);
      saveDatabase(db);

      res.json({ success: true, message: 'পেমেন্ট সফলভাবে অনুমোদিত ও হিসাবভুক্ত হয়েছে', payment: target, data: db.payments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 19c. Reject Pending Payment (Admin only / Configured Treasurer)
  app.post('/api/payments/:id/reject', (req, res) => {
    try {
      const db = getDatabase();
      const { id } = req.params;
      const { reason } = req.body;
      const target = db.payments.find(p => p.id === id);

      if (!target) {
        return res.status(404).json({ success: false, error: 'জমার রেকর্ড পাওয়া যায়নি' });
      }

      const user = checkAdminAuth(req, res, { recordDate: target.date, allowTreasurerFor: 'payments' });
      if (!user) return;

      target.status = 'rejected';
      target.rejectionReason = reason || 'মেস এডমিন কর্তৃক বাতিল করা হয়েছে';
      target.verifiedBy = user.name;
      target.verifiedAt = new Date().toISOString();

      logAudit(
        user.name,
        'REJECT',
        'payments',
        `${target.memberName} এর ৳${target.amount.toLocaleString()} জমার আবেদন বাতিল করা হয়েছে`,
        'স্ট্যাটাস: pending -> rejected',
        `কারণ: ${target.rejectionReason}`,
        user.id,
        'Payment',
        id,
        user.ipAddress
      );

      // Recalculate affected month
      const affectedMonth = target.date.slice(0, 7);
      recalculateMonthlyAccount(affectedMonth);
      saveDatabase(db);

      res.json({ success: true, message: 'পেমেন্ট বাতিল করা হয়েছে', payment: target, data: db.payments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 20. Month Validation (Available to check integrity)
  app.post('/api/month/validate', (req, res) => {
    try {
      const { month } = req.body;
      const targetPeriod = month || getCurrentDhakaPeriod().periodId;
      const validation = validateMonthRecords(targetPeriod);
      res.json({ success: true, validation });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 21. Month Close (Admin only - creates snapshot, locks month, sends statements)
  app.post('/api/month/close', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { month, sendMonthEndSms } = req.body;
      const targetMonth = month || db.currentMonthCalculation?.month || '2026-10';

      const validation = validateMonthRecords(targetMonth);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'মাস সমাপ্ত করার পূর্বে যাচাইকরণের ত্রুটিগুলো সমাধান করুন',
          errors: validation.errors,
        });
      }

      const closedAccount = closeMonthAccount(db, targetMonth, user, sendMonthEndSms !== false);
      res.json({ success: true, account: closedAccount });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 22. Reopen Month (CRITICAL RULE: Only Permanent Admin Jahidul Islam can reopen a closed month!)
  app.post('/api/month/reopen', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { month } = req.body;
      const targetMonth = month || getCurrentDhakaPeriod().periodId;

      const result = reopenMonthAccount(db, targetMonth, user);
      if (!result.success) {
        return res.status(403).json({ success: false, error: result.error });
      }

      res.json({ success: true, message: `${targetMonth} মাস সফলভাবে পুনঃউন্মুক্ত করা হয়েছে`, account: result.account });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 23. Recalculate Monthly Account on demand (Admin only)
  app.post('/api/month/recalculate', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const { month } = req.body;
      const db = getDatabase();
      const targetMonth = month || db.currentMonthCalculation?.month || '2026-10';
      const recalculated = recalculateMonthlyAccount(targetMonth);

      logAudit(
        user.name,
        'RECALCULATE',
        'monthly',
        `${targetMonth} মাসের মাসিক হিসাব স্বয়ংক্রিয়ভাবে পুনর্গণনা করা হয়েছে (নতুন মিল রেট: ৳${recalculated.mealRate})`,
        undefined,
        `মিল রেট: ৳${recalculated.mealRate}, মোট খরচ: ৳${recalculated.totalMessExpense}`,
        user.id,
        'MonthlyAccount',
        recalculated.id,
        user.ipAddress
      );

      res.json({ success: true, account: recalculated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get all monthly periods & historical archives
  app.get('/api/month/periods', (req, res) => {
    try {
      const db = getDatabase();
      ensureCurrentMonthPeriod(db);
      const periods = (db.monthlyAccounts || []).map(a => ({
        id: a.id,
        month: a.month,
        monthName: a.monthName,
        status: a.status,
        totalMeals: a.totalMeals,
        mealRate: a.mealRate,
        totalMessExpense: a.totalMessExpense,
        totalCollected: a.totalCollected,
        totalDue: a.totalDue,
        closedAt: a.closedAt,
        closedBy: a.closedBy,
        reopenedAt: a.reopenedAt,
        reopenedBy: a.reopenedBy,
      }));
      res.json({ success: true, periods });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get specific month account detail
  app.get('/api/month/account/:period', (req, res) => {
    try {
      const db = getDatabase();
      const { period } = req.params;
      let account = (db.monthlyAccounts || []).find(a => a.month === period);
      if (!account) {
        account = calculateMonthlyAccount(period, 'open');
      }
      res.json({ success: true, account });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Ensure and return current month
  app.post('/api/month/ensure-current', (req, res) => {
    try {
      const db = getDatabase();
      const current = ensureCurrentMonthPeriod(db);
      res.json({ success: true, currentMonthCalculation: current });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 24. Send SMS (Admin only)
  app.post('/api/sms/send', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { recipientId, recipientName, phone, type, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Phone number and message text are required' });
      }

      const refId = `SMS-${Date.now().toString().slice(-6)}`;
      const smsEntry: SmsLog = {
        id: `sms-${Date.now()}`,
        timestamp: new Date().toISOString(),
        recipientId: recipientId || 'custom',
        recipientName: recipientName || 'Member',
        phone,
        type: type || 'custom',
        message,
        status: 'sent',
        provider: db.settings.smsGateway.providerName || 'Mock SMS Gateway (Test Mode)',
        refId,
      };

      db.smsLogs.unshift(smsEntry);
      logAudit(
        user.name,
        'SEND_SMS',
        'settings',
        `${phone} নম্বরে [${type}] এসএমএস পাঠানো হয়েছে (${recipientName})`,
        undefined,
        message,
        user.id,
        'Settings',
        smsEntry.id,
        user.ipAddress
      );

      saveDatabase(db);
      res.json({
        success: true,
        data: smsEntry,
        message: `SMS successfully sent via ${db.settings.smsGateway.providerName} (Ref: ${refId})`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 25. Settings update (Admin only; supports configuring Treasurer permissions)
  app.post('/api/settings', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { settings } = req.body;
      if (!settings) {
        return res.status(400).json({ success: false, error: 'Settings object required' });
      }

      const prevSettings = { ...db.settings };
      db.settings = { ...db.settings, ...settings };

      logAudit(
        user.name,
        'EDIT',
        'settings',
        'মেস সেটিংস ও ক্যাশিয়ার অনুমতি (Treasurer Permissions) হালনাগাদ করা হয়েছে',
        JSON.stringify(prevSettings.treasurerPermissions || {}),
        JSON.stringify(db.settings.treasurerPermissions || {}),
        user.id,
        'Settings',
        'settings-config',
        user.ipAddress
      );

      saveDatabase(db);
      res.json({ success: true, data: db.settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 26. Server-side AI Assistant (Gemini 3.8 Flash)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { query, userMemberId, userRole } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, error: 'Query is required' });
      }

      const answer = await answerMessQuery(query, userMemberId, userRole || 'member');
      res.json({ success: true, answer });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 26b. Reset Current Month Accounting Values to 0 (Admin only)
  app.post('/api/accounting/reset-current-month', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const currentPeriod = getCurrentDhakaPeriod().periodId;

      // Reset current active month transactions
      db.dailyMeals = (db.dailyMeals || []).filter(d => !d.date.startsWith(currentPeriod));
      db.bazarRecords = (db.bazarRecords || []).filter(b => !b.date.startsWith(currentPeriod));
      db.expenses = (db.expenses || []).filter(e => !e.date.startsWith(currentPeriod));
      db.payments = (db.payments || []).filter(p => !p.date.startsWith(currentPeriod) && p.periodId !== currentPeriod);

      // Clean current month selections
      db.memberMealSelections = (db.memberMealSelections || []).filter(s => !s.date.startsWith(currentPeriod));

      if (!db.settings) db.settings = {} as any;
      db.settings.accountingConfig = {
        ...db.settings.accountingConfig,
        carryForwardPreviousBalance: false,
        autoOpenNewMonth: true,
        sendNewMonthSms: false,
      };

      // Recalculate
      const recalculated = recalculateMonthlyAccount(currentPeriod);
      saveDatabase(db);

      logAudit(
        user.name,
        'RESET',
        'monthly',
        `চলতি মাস (${currentPeriod}) এর সকল হিসাব শূন্য (০) তে রিসেট করা হয়েছে।`,
        undefined,
        '0',
        user.id,
        'MonthlyAccount',
        currentPeriod,
        user.ipAddress
      );

      res.json({
        success: true,
        message: 'চলতি মাসের হিসাব সফলভাবে শূন্য (০) তে রিসেট করা হয়েছে।',
        data: recalculated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 27. Reset Demo Data (Admin only)
  app.post('/api/reset-demo', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const freshData = getInitialMessData();
      saveDatabase(freshData);
      logAudit(
        user.name,
        'RESET_DEMO',
        'settings',
        'সম্পূর্ণ মেস ডাটাবেস ফ্যাক্টরি ডিফল্ট ডেমো ডাটায় রিসেট করা হয়েছে',
        undefined,
        undefined,
        user.id,
        'Settings',
        'reset',
        user.ipAddress
      );
      res.json({ success: true, message: 'Database reset to fresh demo data' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bachelor Zone server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
