import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let auth = null;
let db = null;
let firebaseConfigurationError = null;
if (Object.values(firebaseConfig).some((value) => !value?.trim())) {
  firebaseConfigurationError = 'Sign-in is not configured yet. Complete client/.env and restart the frontend.';
} else {
  try {
    const app = getApps().some((item) => item.name === '[DEFAULT]') ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch {
    auth = null;
    db = null;
    firebaseConfigurationError = 'Sign-in could not start. Check the Firebase web app configuration and restart the frontend.';
  }
}

export { auth, db, firebaseConfigurationError };
