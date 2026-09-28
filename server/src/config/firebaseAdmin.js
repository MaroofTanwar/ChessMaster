import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  throw new Error('FIREBASE_PROJECT_ID is required for Firebase Admin.');
}

const app = getApps()[0] || initializeApp({
  credential: applicationDefault(),
  projectId,
});

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
