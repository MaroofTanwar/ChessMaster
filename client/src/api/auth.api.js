import {
  browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword,
  sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut, updateProfile,
} from 'firebase/auth';
import { auth, firebaseConfigurationError } from '../config/firebase';
import { ensureUserProfile, toAppUser } from './user.api';
import { firebaseErrorMessage } from '../utils/firebaseErrors';

function requireAuth() {
  if (!auth) throw new Error(firebaseConfigurationError);
}
async function finishSignIn(firebaseUser, username) {
  try {
    return { user: await ensureUserProfile(firebaseUser, username), profileError: null };
  } catch (error) {
    return {
      user: { ...toAppUser(firebaseUser), ...(username ? { username } : {}) },
      profileError: firebaseErrorMessage(error, 'You are signed in, but your profile could not be saved. Please retry.'),
    };
  }
}
export async function registerApi(username, email, password) {
  requireAuth();
  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
    throw new Error('Username must be between 3 and 30 characters.');
  }
  let credential;
  try {
    await setPersistence(auth, browserLocalPersistence);
    credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw new Error(firebaseErrorMessage(error, 'Registration failed. Please try again.'));
  }
  // Account creation succeeded. A profile failure must not invite duplicate registration.
  try {
    await updateProfile(credential.user, { displayName: trimmedUsername });
  } catch {
    // The Firestore profile still stores the chosen username below.
  }
  return finishSignIn(credential.user, trimmedUsername);
}
export async function loginApi(email, password, rememberMe = true) {
  requireAuth();
  let credential;
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw new Error(firebaseErrorMessage(error, 'Sign-in failed. Please try again.'));
  }
  return finishSignIn(credential.user);
}
export async function forgotPasswordApi(email) {
  requireAuth();
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw new Error(firebaseErrorMessage(error, 'Unable to send the reset email. Please try again.'));
    }
  }
}
export async function logoutApi() {
  requireAuth();
  try { await signOut(auth); }
  catch (error) { throw new Error(firebaseErrorMessage(error, 'Unable to sign out. Please try again.')); }
}