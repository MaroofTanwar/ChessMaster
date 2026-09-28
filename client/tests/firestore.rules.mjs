import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';

let env;
before(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  env = await initializeTestEnvironment({
    projectId: 'demo-chessmaster',
    firestore: { host, port: Number(port), rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});
beforeEach(async () => env.clearFirestore());
after(async () => env?.cleanup());
const database = (uid) => uid ? env.authenticatedContext(uid, { email: uid + '@example.com' }).firestore() : env.unauthenticatedContext().firestore();
const profile = () => ({
  username: 'PlayerOne', email: 'owner@example.com', avatar: '',
  rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
});
const settings = () => ({
  boardTheme: 'ocean', pieceStyle: 'standard', showCoordinates: false,
  showLegalMoves: true, highlightLastMove: true, moveAnimations: true,
  autoQueen: false, confirmResign: true, masterSound: true, moveSounds: true,
  captureSounds: true, checkSounds: true, gameEndSounds: true, inAppNotifications: false,
});
test('owner can create/read profile and edit username/avatar', async () => {
  const ref = doc(database('owner'), 'users/owner');
  await assertSucceeds(setDoc(ref, profile()));
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(updateDoc(ref, { username: 'NewName', avatar: '', updatedAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(ref, { settings: settings(), updatedAt: serverTimestamp() }));
});
test('anonymous and other users cannot read/write a private profile', async () => {
  await assertSucceeds(setDoc(doc(database('owner'), 'users/owner'), profile()));
  for (const uid of [null, 'other']) {
    const ref = doc(database(uid), 'users/owner');
    await assertFails(getDoc(ref));
    await assertFails(setDoc(ref, profile()));
    await assertFails(updateDoc(ref, { username: 'Stolen', updatedAt: serverTimestamp() }));
  }
});
test('listing, deletion, and unrelated collections are denied', async () => {
  const db = database('owner');
  await assertSucceeds(setDoc(doc(db, 'users/owner'), profile()));
  await assertFails(getDocs(collection(db, 'users')));
  await assertFails(deleteDoc(doc(db, 'users/owner')));
  await assertFails(setDoc(doc(db, 'games/test'), { winner: 'owner' }));
});
test('cannot forge initial stats, identity, credentials, field types, or timestamps', async () => {
  for (const extra of [
    { rating: 2500 }, { wins: 1 }, { losses: 1 }, { draws: 1 }, { gamesPlayed: 1 },
    { email: 'other@example.com' }, { password: 'not-allowed' }, { token: 'not-allowed' },
    { username: 'x' }, { username: 'x'.repeat(31) }, { avatar: 42 }, { rating: 1200.5 },
    { createdAt: Timestamp.fromMillis(0) }, { updatedAt: Timestamp.fromMillis(0) },
  ]) {
    await assertFails(setDoc(doc(database('owner'), 'users/owner'), { ...profile(), ...extra }));
  }
});
test('owner cannot overwrite stats, email, createdAt, or add credentials', async () => {
  const ref = doc(database('owner'), 'users/owner');
  await assertSucceeds(setDoc(ref, profile()));
  for (const extra of [
    { rating: 2500 }, { wins: 2 }, { losses: 2 }, { draws: 2 }, { gamesPlayed: 2 },
    { email: 'other@example.com' }, { createdAt: Timestamp.fromMillis(0) }, { password: 'secret' },
  ]) await assertFails(updateDoc(ref, { ...extra, updatedAt: serverTimestamp() }));
});

test('settings cannot smuggle protected fields or invalid preferences', async () => {
  const ref = doc(database('owner'), 'users/owner');
  await assertSucceeds(setDoc(ref, profile()));
  await assertFails(updateDoc(ref, { settings: { ...settings(), rating: 9999 }, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { settings: { ...settings(), boardTheme: 'forged' }, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { settings: { ...settings(), autoQueen: 'yes' }, updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(ref, { settings: settings(), rating: 9999, updatedAt: serverTimestamp() }));
});

test('players can query their games while clients cannot write results', async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'games/game-1'), {
      whitePlayerUid: 'white', blackPlayerUid: 'black', status: 'finished', endedAt: Timestamp.now(),
    });
  });
  const whiteDb = database('white');
  const blackDb = database('black');
  const strangerDb = database('stranger');
  await assertSucceeds(getDoc(doc(whiteDb, 'games/game-1')));
  await assertSucceeds(getDocs(query(collection(blackDb, 'games'), where('blackPlayerUid', '==', 'black'))));
  await assertFails(getDoc(doc(strangerDb, 'games/game-1')));
  await assertFails(getDocs(collection(strangerDb, 'games')));
  await assertFails(setDoc(doc(whiteDb, 'games/forged'), { whitePlayerUid: 'white' }));
});
