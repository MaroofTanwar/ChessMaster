import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../src/config/firebaseAdmin.js';

dotenv.config({ path: '../client/.env' });
if (process.env.CHESSMASTER_LIVE_SECURITY_TEST !== '1') throw new Error('Set CHESSMASTER_LIVE_SECURITY_TEST=1 to run this isolated rules test.');

const apiKey = process.env.VITE_FIREBASE_API_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!apiKey || !projectId) throw new Error('Firebase test configuration is incomplete.');
const suffix = randomUUID().replaceAll('-', '');
const account = { email: `security-${suffix}@example.com`, password: `${randomUUID()}Aa1!`, username: `Security${suffix.slice(0, 8)}` };
const otherUid = `security-other-${suffix}`;
const gameId = `SECURITY-${suffix}`;
const requestId = `SECURITY-REQUEST-${suffix}`;
let uid;

const firestoreUrl = (path) => `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${path}`;
const call = (path, token, options = {}) => fetch(firestoreUrl(path), { ...options, headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json', ...options.headers } });
const expect = (condition, label) => { if (!condition) throw new Error(`Assertion failed: ${label}`); console.log(`${label}: PASS`); };

try {
  const signupResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: account.email, password: account.password, displayName: account.username, returnSecureToken: true }),
  });
  const signup = await signupResponse.json();
  if (!signupResponse.ok) throw new Error(signup.error?.message || 'Temporary signup failed.');
  uid = signup.localId;
  const profile = { username: account.username, email: account.email, avatar: '', rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() };
  await Promise.all([adminDb.collection('users').doc(uid).set(profile), adminDb.collection('users').doc(otherUid).set({ ...profile, username: 'Other Security User', email: 'other-security@example.com' })]);

  const ownRead = await call(`users/${encodeURIComponent(uid)}`, signup.idToken);
  expect(ownRead.status === 200, 'Authenticated user can read own profile');
  const otherRead = await call(`users/${encodeURIComponent(otherUid)}`, signup.idToken);
  expect(otherRead.status === 403, 'Authenticated user cannot read another private user document');

  const ratingWrite = await call(`users/${encodeURIComponent(uid)}?updateMask.fieldPaths=rating`, signup.idToken, { method: 'PATCH', body: JSON.stringify({ fields: { rating: { integerValue: '99999' } } }) });
  expect(ratingWrite.status === 403, 'Client cannot modify rating');
  const profileAfter = await adminDb.collection('users').doc(uid).get();
  expect(profileAfter.data().rating === 1200, 'Rejected rating write leaves competitive data unchanged');

  const gameWrite = await call(`games?documentId=${encodeURIComponent(gameId)}`, signup.idToken, { method: 'POST', body: JSON.stringify({ fields: { winnerUid: { stringValue: uid }, status: { stringValue: 'finished' } } }) });
  expect(gameWrite.status === 403, 'Client cannot create or forge a completed game');
  const friendWrite = await call(`friendRequests?documentId=${encodeURIComponent(requestId)}`, signup.idToken, { method: 'POST', body: JSON.stringify({ fields: { senderUid: { stringValue: otherUid }, receiverUid: { stringValue: uid }, status: { stringValue: 'pending' } } }) });
  expect(friendWrite.status === 403, 'Client cannot forge a friend request');
} finally {
  await Promise.all([
    uid ? adminDb.collection('users').doc(uid).delete().catch(() => {}) : Promise.resolve(),
    adminDb.collection('users').doc(otherUid).delete().catch(() => {}),
    adminDb.collection('games').doc(gameId).delete().catch(() => {}),
    adminDb.collection('friendRequests').doc(requestId).delete().catch(() => {}),
  ]);
  if (uid) await adminAuth.deleteUser(uid).catch(() => {});
  console.log('Temporary security test records cleaned up.');
}
