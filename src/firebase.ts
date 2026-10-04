import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

/**
 * Bachelor Zone Firebase Configuration
 * Project: project-b7e40554-1055-43b3-873
 */
export const firebaseConfig = {
  apiKey: "AIzaSyCZA8w2cqrrMi7PQ_7KcMpCqynQkGK5V4U",
  authDomain: "project-b7e40554-1055-43b3-873.firebaseapp.com",
  projectId: "project-b7e40554-1055-43b3-873",
  storageBucket: "project-b7e40554-1055-43b3-873.firebasestorage.app",
  messagingSenderId: "314884052075",
  appId: "1:314884052075:web:da48013f7c01a303910d2e"
};

// Singleton initialization pattern
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

/**
 * Validates Firestore server-side connection status without crashing offline environments
 */
export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    await getDocFromServer(doc(db, 'messSettings', 'connection_test'));
    return { connected: true, message: 'Firebase Firestore connected successfully.' };
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('Failed to get document')) {
      return { connected: false, message: 'Firestore offline or rules pending verification.' };
    }
    return { connected: false, message: msg };
  }
}
