import express from 'express';
import path from 'path';
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
import { getInitialMessData } from './server/demoData.js';
import { answerMessQuery } from './server/ai.js';
import { SmsLog, MemberRole, AdminProfile, AuthSession } from './src/types.js';
import { checkMealLock, getDhakaTime } from './src/utils/cutoffUtils.js';
import { simpleHashSync } from './src/utils/authUtils.js';

interface RequestUserInfo {
  id: string;
  name: string;
  role: MemberRole;
  status: 'active' | 'inactive' | 'left';
  ipAddress: string;
}

const activeSessions = new Map<string, AuthSession>();
const loginAttempts = new Map<string, { count: number; lastTime: number }>();

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

  // Fallback default
  const roleHeader = (req.headers['x-user-role'] as MemberRole) || req.body?.userRole;
  return {
    id: targetId || 'm1',
    name: actingUserStr || (roleHeader === 'admin' ? 'Rahim Uddin (Admin)' : 'Mess Member'),
    role: roleHeader || 'member',
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
      const currentMonthCalc = calculateMonthlyAccount('2026-09', 'open');
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

      const inputHash = simpleHashSync(password);

      // Check Admin Profile
      const admin = db.adminProfile;
      const isAdminMatch =
        admin &&
        (admin.phone.replace(/[^0-9]/g, '').endsWith(cleanId.replace(/[^0-9]/g, '')) ||
          admin.email.toLowerCase() === cleanId ||
          cleanId === 'admin' ||
          cleanId === '01711234567');

      if (isAdminMatch) {
        // Verify password
        const validPassword = admin.passwordHash ? admin.passwordHash === inputHash : password === 'admin123';
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
          role: 'admin',
          name: admin.name,
          phone: admin.phone,
          email: admin.email,
          avatarColor: 'bg-emerald-600',
          loginTime: new Date().toISOString(),
        };

        activeSessions.set(token, session);
        admin.lastLogin = new Date().toISOString();
        saveDatabase(db);

        logAudit(admin.name, 'এডমিন লগইন', 'settings', `${admin.name} এডমিন অ্যাকাউন্টে প্রবেশ করেছেন`);

        return res.json({
          success: true,
          message: 'এডমিন লগইন সফল হয়েছে',
          token,
          user: session,
          adminProfile: admin,
        });
      }

      // Check Normal Members credentials
      const matchingMember = db.members.find(
        m =>
          m.phone.replace(/[^0-9]/g, '').endsWith(cleanId.replace(/[^0-9]/g, '')) ||
          (m.email && m.email.toLowerCase() === cleanId)
      );

      if (matchingMember) {
        const creds = db.memberCredentials?.[matchingMember.id];
        const memberValidPass = creds?.passwordHash
          ? creds.passwordHash === inputHash
          : password === 'member123' || (matchingMember.role === 'admin' && password === 'admin123');

        if (!memberValidPass) {
          const currentCount = (attempt ? attempt.count : 0) + 1;
          loginAttempts.set(ip, { count: currentCount, lastTime: now });
          return res.status(401).json({ success: false, error: 'ভুল ফোন নম্বর/ইমেইল অথবা পাসওয়ার্ড' });
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

      // Update or insert Rahim/admin member entry
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
      name.includes('jahidul') ||
      name.includes('জাহিদুল') ||
      phone === '8801711234567' ||
      phone === '01711234567' ||
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
              error: 'নিরাপত্তা নিষেধাজ্ঞা: জাহিদুল ইসলাম (Jahidul Islam) Bachelor Zone এর স্থায়ী প্রধান এডমিন ও মেস প্রতিষ্ঠাতা। তার এডমিন পদ পরিবর্তন করা সম্পূর্ণ নিষিদ্ধ।',
            });
          }
          if (member.status && member.status !== 'active') {
            return res.status(403).json({
              success: false,
              error: 'নিরাপত্তা নিষেধাজ্ঞা: জাহিদুল ইসলাম (Jahidul Islam) মেসের স্থায়ী প্রধান এডমিন। তাকে কোনো অবস্থাতেই নিষ্ক্রিয় (Inactive) করা যাবে না।',
            });
          }
          member.role = 'admin';
          member.status = 'active';
        }

        // Only Jahidul Islam can change the role of another member
        if (member.role && member.role !== prev.role && !isPermanentAdmin(user)) {
          return res.status(403).json({
            success: false,
            error: 'অনুমোদন প্রত্যাখ্যাত: শুধুমাত্র মেসের স্থায়ী প্রধান এডমিন জাহিদুল ইসলাম (Jahidul Islam) সদস্যদের রোল পরিবর্তন করতে পারেন।',
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
        const newMember = {
          ...member,
          id: newId,
          status: member.status || 'active',
          role: member.role || 'member',
          joiningDate: member.joiningDate || new Date().toISOString().split('T')[0],
          avatarColor: member.avatarColor || 'bg-emerald-600',
        };
        db.members.push(newMember);
        logAudit(
          user.name,
          'MEMBER_ADDED',
          'members',
          `নতুন সদস্য ${newMember.name} (রোল: ${newMember.role === 'admin' ? 'এডমিন' : 'সদস্য'}) মেসে যুক্ত করা হয়েছে`,
          undefined,
          `${newMember.name} (ID: ${newId})`,
          user.id,
          'Member',
          newId,
          user.ipAddress
        );
        notify('নতুন সদস্য যোগ', `${newMember.name} মেসে যুক্ত হয়েছেন।`, 'info', 'members');
      }

      // Sync monthly calculations in case active count changed
      recalculateMonthlyAccount('2026-09');
      saveDatabase(db);
      res.json({ success: true, data: db.members });
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
      recalculateMonthlyAccount('2026-09');
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
      recalculateMonthlyAccount('2026-09');
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
      recalculateMonthlyAccount('2026-09');
      saveDatabase(db);
      res.json({ success: true, message: 'সদস্য অপসারিত হয়েছে এবং ঐতিহাসিক রেকর্ড সংরক্ষিত রয়েছে', data: db.members });
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
      let totalBreakfast = 0;
      let totalLunch = 0;
      let totalDinner = 0;

      Object.values(records).forEach((r: any) => {
        const b = Number(r.breakfast) || 0;
        const l = Number(r.lunch) || 0;
        const d = Number(r.dinner) || 0;
        if (b < 0 || l < 0 || d < 0) {
          throw new Error('মিলের সংখ্যা কখনো নেগেটিভ হতে পারে না');
        }
        totalBreakfast += b;
        totalLunch += l;
        totalDinner += d;
      });

      const totalMeals = totalBreakfast + totalLunch + totalDinner;
      const existingIndex = db.dailyMeals.findIndex(dm => dm.date === date);
      const entryId = existingIndex >= 0 ? db.dailyMeals[existingIndex].id : `dm-${date}`;

      const entry = {
        id: entryId,
        date,
        records,
        totalBreakfast,
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

      if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
        return res.status(400).json({ success: false, error: 'Invalid mealType' });
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

      if (mealType === 'breakfast') memRec.breakfast = status === 'ON' ? 1 : 0;
      if (mealType === 'lunch') memRec.lunch = status === 'ON' ? 1 : 0;
      if (mealType === 'dinner') memRec.dinner = status === 'ON' ? 1 : 0;
      memRec.total = (memRec.breakfast || 0) + (memRec.lunch || 0) + (memRec.dinner || 0);
      dailyEntry.records[memberId] = memRec;

      // Recalculate daily totals strictly based on active members with confirmed ON
      let sumBreakfast = 0;
      let sumLunch = 0;
      let sumDinner = 0;
      activeMembers.forEach(m => {
        const r = dailyEntry!.records[m.id];
        if (r) {
          sumBreakfast += r.breakfast || 0;
          sumLunch += r.lunch || 0;
          sumDinner += r.dinner || 0;
        }
      });

      dailyEntry.totalBreakfast = sumBreakfast;
      dailyEntry.totalLunch = sumLunch;
      dailyEntry.totalDinner = sumDinner;
      dailyEntry.totalMeals = sumBreakfast + sumLunch + sumDinner;
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

        const mealEntries: Array<{ mealType: 'breakfast' | 'lunch' | 'dinner'; status?: 'ON' | 'OFF' }> = [
          { mealType: 'breakfast', status: breakfast },
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

        const bOn = db.memberMealSelections!.find(s => s.memberId === memberId && s.date === date && s.mealType === 'breakfast')?.plannedStatus === 'ON';
        const lOn = db.memberMealSelections!.find(s => s.memberId === memberId && s.date === date && s.mealType === 'lunch')?.plannedStatus === 'ON';
        const dOn = db.memberMealSelections!.find(s => s.memberId === memberId && s.date === date && s.mealType === 'dinner')?.plannedStatus === 'ON';

        dailyEntry.records[memberId] = {
          memberId,
          breakfast: bOn ? 1 : 0,
          lunch: lOn ? 1 : 0,
          dinner: dOn ? 1 : 0,
          total: (bOn ? 1 : 0) + (lOn ? 1 : 0) + (dOn ? 1 : 0),
        };

        const activeMembers = db.members.filter(m => m.status === 'active');
        let sumB = 0, sumL = 0, sumD = 0;
        activeMembers.forEach(m => {
          const rec = dailyEntry!.records[m.id];
          if (rec) {
            sumB += rec.breakfast || 0;
            sumL += rec.lunch || 0;
            sumD += rec.dinner || 0;
          }
        });
        dailyEntry.totalBreakfast = sumB;
        dailyEntry.totalLunch = sumL;
        dailyEntry.totalDinner = sumD;
        dailyEntry.totalMeals = sumB + sumL + sumD;
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
      const { date = '2026-09-18' } = req.body;
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

      const user = checkAdminAuth(req, res, { recordDate: payment.date, allowTreasurerFor: 'payments' });
      if (!user) return;

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
          status: payment.status || 'verified',
          createdAt: new Date().toISOString(),
          receivedBy: payment.receivedBy || user.name,
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

  // 20. Month Validation (Available to check integrity)
  app.post('/api/month/validate', (req, res) => {
    try {
      const { month } = req.body;
      const validation = validateMonthRecords(month || '2026-09');
      res.json({ success: true, validation });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 21. Month Close (Admin only)
  app.post('/api/month/close', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { month, sendMonthEndSms } = req.body;
      const targetMonth = month || '2026-09';

      const validation = validateMonthRecords(targetMonth);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'মাস সমাপ্ত করার পূর্বে যাচাইকরণের ত্রুটিগুলো সমাধান করুন',
          errors: validation.errors,
        });
      }

      const closedAccount = calculateMonthlyAccount(targetMonth, 'closed', user.name);

      const existingIdx = db.monthlyAccounts.findIndex(m => m.month === targetMonth);
      if (existingIdx >= 0) {
        db.monthlyAccounts[existingIdx] = closedAccount;
      } else {
        db.monthlyAccounts.unshift(closedAccount);
      }
      if (targetMonth === '2026-09') {
        db.currentMonthCalculation = closedAccount;
      }

      logAudit(
        user.name,
        'CLOSE_MONTH',
        'monthly',
        `${targetMonth} মাসের মেস হিসাব চূড়ান্ত ও বন্ধ (Locked) ঘোষণা করা হয়েছে। মিল রেট: ৳${closedAccount.mealRate}`,
        'Status: Open',
        'Status: Closed',
        user.id,
        'MonthlyAccount',
        closedAccount.id,
        user.ipAddress
      );

      notify(
        'মাসিক হিসাব চূড়ান্ত',
        `${closedAccount.monthName} এর মেস হিসাব বন্ধ ঘোষণা করা হয়েছে। মিল রেট: ৳${closedAccount.mealRate}`,
        'success',
        'accounts'
      );

      // Trigger automatic SMS if requested
      if (sendMonthEndSms) {
        Object.values(closedAccount.statements).forEach(stmt => {
          const member = db.members.find(m => m.id === stmt.memberId);
          if (member && member.phone) {
            const balanceText =
              stmt.netBalance > 0 ? `বকেয়া: ৳${stmt.netBalance}` : `উদ্বৃত্ত: ৳${Math.abs(stmt.netBalance)}`;
            const msg = `${closedAccount.monthName} মেস হিসাব সম্পন্ন। মোট মিল: ${stmt.totalMeals}, মিল খরচ: ৳${stmt.mealCost}, শেয়ার: ৳${stmt.sharedCostsShare}, জমা: ৳${stmt.totalPaid}, ${balanceText}। - Bachelor Zone`;
            db.smsLogs.unshift({
              id: `sms-${Date.now()}-${stmt.memberId}`,
              timestamp: new Date().toISOString(),
              recipientId: stmt.memberId,
              recipientName: stmt.memberName,
              phone: member.phone,
              type: 'monthly_account',
              message: msg,
              status: 'sent',
              provider: db.settings.smsGateway.providerName,
              refId: `SMS-CLOSE-${Date.now().toString().slice(-6)}`,
            });
          }
        });
      }

      saveDatabase(db);
      res.json({ success: true, account: closedAccount });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 22. Reopen Month (Admin only - Section 9)
  app.post('/api/month/reopen', (req, res) => {
    try {
      const user = checkAdminAuth(req, res);
      if (!user) return;

      const db = getDatabase();
      const { month } = req.body;
      const targetMonth = month || '2026-09';

      const existingIdx = db.monthlyAccounts.findIndex(m => m.month === targetMonth);
      if (existingIdx >= 0) {
        db.monthlyAccounts[existingIdx].status = 'open';
      }
      if (targetMonth === '2026-09' && db.currentMonthCalculation) {
        db.currentMonthCalculation.status = 'open';
      }

      logAudit(
        user.name,
        'REOPEN_MONTH',
        'monthly',
        `${targetMonth} মাসের হিসাব পুনরায় সম্পাদনার জন্য উন্মুক্ত (Reopened) করা হয়েছে।`,
        'Status: Closed',
        'Status: Open',
        user.id,
        'MonthlyAccount',
        `month-${targetMonth}`,
        user.ipAddress
      );

      notify('হিসাব পুনঃউন্মুক্ত', `${targetMonth} মাসের হিসাব এডমিন কর্তৃক পুনরায় খোলা হয়েছে।`, 'warning', 'accounts');
      saveDatabase(db);
      res.json({ success: true, message: `${targetMonth} মাস সফলভাবে পুনঃউন্মুক্ত করা হয়েছে` });
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
      const targetMonth = month || '2026-09';
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
