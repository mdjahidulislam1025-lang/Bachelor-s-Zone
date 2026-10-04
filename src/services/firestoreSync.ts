import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase.js';
import {
  Member,
  MessSettings,
  DailyMealEntry,
  MealMenu,
  CookingDuty,
  BazarRecord,
  ExpenseRecord,
  PaymentRecord,
  MonthlyAccount,
  AuditLog,
  InAppNotification,
} from '../types.js';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Sync helper: Saves or updates a member document in the 'users' collection
 */
export async function syncMemberToFirestore(member: Member) {
  const path = `users/${member.id}`;
  try {
    const docRef = doc(db, 'users', member.id);
    await setDoc(
      docRef,
      {
        id: member.id,
        name: member.name,
        nickname: member.nickname || '',
        phone: member.phone,
        email: member.email || '',
        roomNo: member.roomNo || '',
        role: member.role,
        status: member.status,
        joiningDate: member.joiningDate || '2026-01-01',
        avatarColor: member.avatarColor || 'bg-emerald-600',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return { success: false, error };
  }
}

/**
 * Sync helper: Saves or updates payment record in 'payments' collection
 */
export async function syncPaymentToFirestore(payment: PaymentRecord) {
  const path = `payments/${payment.id}`;
  try {
    const docRef = doc(db, 'payments', payment.id);
    await setDoc(
      docRef,
      {
        id: payment.id,
        date: payment.date,
        memberId: payment.memberId,
        memberName: payment.memberName,
        amount: Number(payment.amount),
        paymentMethod: payment.paymentMethod,
        transactionRef: payment.transactionRef || '',
        notes: payment.notes || '',
        status: payment.status || 'verified',
        receivedBy: payment.receivedBy || 'Treasurer',
        verifiedBy: payment.verifiedBy || '',
        verifiedAt: payment.verifiedAt || '',
        rejectionReason: payment.rejectionReason || '',
        createdAt: payment.createdAt || new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return { success: false, error };
  }
}

/**
 * Sync helper: Saves or updates daily meal records in 'mealRecords' collection
 */
export async function syncDailyMealToFirestore(meal: DailyMealEntry) {
  const path = `mealRecords/${meal.date}`;
  try {
    const docRef = doc(db, 'mealRecords', meal.date);
    await setDoc(
      docRef,
      {
        date: meal.date,
        records: meal.records || {},
        totalLunch: meal.totalLunch || 0,
        totalDinner: meal.totalDinner || 0,
        totalMeals: meal.totalMeals || 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return { success: false, error };
  }
}

/**
 * Sync helper: Saves audit logs in 'auditLogs' collection
 */
export async function syncAuditLogToFirestore(entry: AuditLog) {
  const path = `auditLogs/${entry.id}`;
  try {
    const docRef = doc(db, 'auditLogs', entry.id);
    await setDoc(docRef, {
      ...entry,
      syncedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return { success: false, error };
  }
}

/**
 * Sync helper: Saves mess settings in 'messSettings' collection
 */
export async function syncSettingsToFirestore(settings: MessSettings) {
  const path = 'messSettings/current';
  try {
    const docRef = doc(db, 'messSettings', 'current');
    await setDoc(docRef, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return { success: false, error };
  }
}
