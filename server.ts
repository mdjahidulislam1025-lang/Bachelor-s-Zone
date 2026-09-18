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
import { SmsLog, MemberRole } from './src/types.js';
import { checkMealLock, getDhakaTime } from './src/utils/cutoffUtils.js';

interface RequestUserInfo {
  id: string;
  name: string;
  role: MemberRole;
  status: 'active' | 'inactive' | 'left';
  ipAddress: string;
}

function getRequestUser(req: express.Request): RequestUserInfo {
  const db = getDatabase();
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

  const targetId = headerUserId || bodyUserId;
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
        db.members[existingIndex] = { ...prev, ...member };
        logAudit(
          user.name,
          'EDIT',
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
        const newId = `m${Date.now()}`;
        const newMember = {
          ...member,
          id: newId,
          joiningDate: member.joiningDate || new Date().toISOString().split('T')[0],
          avatarColor: member.avatarColor || 'bg-emerald-600',
        };
        db.members.push(newMember);
        logAudit(
          user.name,
          'ADD',
          'members',
          `নতুন সদস্য ${member.name} (${member.role}) যুক্ত করা হয়েছে`,
          undefined,
          `${newMember.name} (ID: ${newId})`,
          user.id,
          'Member',
          newId,
          user.ipAddress
        );
        notify('নতুন সদস্য যোগ', `${member.name} মেসে যুক্ত হয়েছেন।`, 'info', 'members');
      }

      // Sync monthly calculations in case active count changed
      recalculateMonthlyAccount('2026-09');
      saveDatabase(db);
      res.json({ success: true, data: db.members });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Delete Member (Admin only)
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

      // Check if trying to delete the only admin
      const adminCount = db.members.filter(m => m.role === 'admin' && m.status === 'active').length;
      if (target.role === 'admin' && adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'মেসের একমাত্র এডমিনকে মুছে ফেলা সম্ভব নয়। প্রথমে অন্য সদস্যকে এডমিন হিসেবে নির্ধারণ করুন।',
        });
      }

      db.members = db.members.filter(m => m.id !== id);

      logAudit(
        user.name,
        'DELETE',
        'members',
        `সদস্য ${target.name} (${target.role}) এর রেকর্ড মেস থেকে মুছে ফেলা হয়েছে`,
        `${target.name} (ফোন: ${target.phone}, রুম: ${target.roomNo || 'N/A'})`,
        undefined,
        user.id,
        'Member',
        id,
        user.ipAddress
      );

      notify('সদস্য মুছে ফেলা হয়েছে', `সদস্য ${target.name} মেস তালিকা থেকে অপসারিত হয়েছে।`, 'warning', 'members');
      recalculateMonthlyAccount('2026-09');
      saveDatabase(db);
      res.json({ success: true, message: 'সদস্য সফলভাবে মুছে ফেলা হয়েছে', data: db.members });
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
            message: `${reminderTitle}: ${reminderMsg} - Mess Manager`,
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
            const msg = `${closedAccount.monthName} মেস হিসাব সম্পন্ন। মোট মিল: ${stmt.totalMeals}, মিল খরচ: ৳${stmt.mealCost}, শেয়ার: ৳${stmt.sharedCostsShare}, জমা: ৳${stmt.totalPaid}, ${balanceText}। - Mess Manager`;
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
    console.log(`Mess Manager server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
