import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * On User Account Creation:
 * Guarantees that public signups cannot self-assign ADMIN or PRIMARY_ADMIN roles.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const isPrimary = user.email === 'mdjahidulislam1025@gmail.com' ||
    user.phoneNumber === '+8801516528497' ||
    user.phoneNumber === '+8801711234567';

  const defaultRole = isPrimary ? 'admin' : 'member';

  await db.collection('users').doc(user.uid).set({
    id: user.uid,
    phone: user.phoneNumber || '',
    email: user.email || '',
    role: defaultRole,
    status: isPrimary ? 'active' : 'pending',
    isPrimaryAdmin: isPrimary,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
});

/**
 * Secure Admin Password Reset Cloud Function (Callable)
 * Enforces role authorization using Firebase Admin SDK:
 * 1. PRIMARY_ADMIN and ADMIN can reset MEMBER passwords.
 * 2. Only PRIMARY_ADMIN can reset other ADMIN passwords.
 * 3. Nobody can reset the PRIMARY_ADMIN password.
 */
export const adminResetPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const callerUid = context.auth.uid;
  const callerDoc = await db.collection('users').doc(callerUid).get();
  const callerData = callerDoc.data();

  const isCallerPrimary = context.auth.token.email === 'mdjahidulislam1025@gmail.com' ||
    context.auth.token.phone_number === '+8801516528497' ||
    context.auth.token.phone_number === '+8801711234567';

  const isCallerAdmin = isCallerPrimary || callerData?.role === 'admin';

  if (!isCallerAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only Admins can perform password resets.');
  }

  const { targetUid, newPassword } = data;
  if (!targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Target user UID is required.');
  }

  const targetDoc = await db.collection('users').doc(targetUid).get();
  if (!targetDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Target user not found.');
  }
  const targetData = targetDoc.data();

  // 1. Primary Admin Protection
  const isTargetPrimary = targetData?.email === 'mdjahidulislam1025@gmail.com' ||
    targetData?.phone === '+8801516528497' ||
    targetData?.phone === '+8801711234567' ||
    targetData?.isPrimaryAdmin === true;

  if (isTargetPrimary) {
    throw new functions.https.HttpsError('permission-denied', 'Primary Admin account cannot be reset by any admin.');
  }

  // 2. Admin Target Protection
  if (targetData?.role === 'admin' && !isCallerPrimary) {
    throw new functions.https.HttpsError('permission-denied', 'Only the Primary Admin (Jahidul Islam) can reset other Admin accounts.');
  }

  // 3. Generate secure temporary password if not provided
  const tempPassword = newPassword || `BZ-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

  // Update password in Firebase Auth
  await admin.auth().updateUser(targetUid, {
    password: tempPassword,
  });

  // Revoke all existing refresh tokens for the target user (forces re-login)
  await admin.auth().revokeRefreshTokens(targetUid);

  // Update Firestore user metadata to flag required password change
  await db.collection('users').doc(targetUid).update({
    requiresPasswordChange: true,
    temporaryPasswordIssuedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Log audit
  await db.collection('auditLogs').add({
    actor: callerData?.name || context.auth.token.email || callerUid,
    action: 'PASSWORD_RESET',
    module: 'members',
    details: `Password reset performed for user ${targetData?.name || targetUid}`,
    targetUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    temporaryPassword: tempPassword,
    message: 'Password successfully reset.',
  };
});
