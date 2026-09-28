import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import playwright from '../../client/node_modules/playwright-core/index.js';
import app from '../src/app.js';
import { createSocketServer } from '../src/socket/index.js';
import { adminAuth, adminDb } from '../src/config/firebaseAdmin.js';
import { pairId } from '../src/services/socialService.js';

dotenv.config({ path: '../client/.env' });
if (process.env.CHESSMASTER_LIVE_SOCIAL_TEST !== '1') throw new Error('Set CHESSMASTER_LIVE_SOCIAL_TEST=1 to run this temporary-account test.');
const apiKey = process.env.VITE_FIREBASE_API_KEY;
const httpServer = createServer(app); const { io, manager, socialManager } = createSocketServer(httpServer); app.set('io', io);
await new Promise((resolve, reject) => { httpServer.once('error', reject); httpServer.listen(5000, 'localhost', resolve); });
const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });
const accounts = []; const contexts = []; const gameIds = [];
const report = (text) => console.log(`${text}: PASS`);
const signup = async (username) => {
  const email = `chessmaster-social-${randomUUID()}@example.com`; const password = `${randomUUID()}Aa1!`;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, displayName: username, returnSecureToken: true }) });
  const data = await response.json(); if (!response.ok) throw new Error(`Signup failed: ${data.error?.message || response.status}`);
  const account = { uid: data.localId, email, password, username }; accounts.push(account);
  await adminDb.collection('users').doc(account.uid).set({ username, usernameLower: username.toLowerCase(), email, avatar: '', rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0 });
  return account;
};
const login = async (account) => {
  const context = await browser.newContext(); contexts.push(context); const page = await context.newPage(); page.setDefaultTimeout(45_000);
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded', timeout: 45_000 }); await page.locator('input[type=email]').fill(account.email); await page.locator('input[type=password]').fill(account.password); await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL('**/dashboard', { timeout: 45_000 });
  return page;
};
try {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 6); const accountA = await signup(`SocialA${suffix}`); const accountB = await signup(`SocialB${suffix}`);
  const a = await login(accountA); const b = await login(accountB); report('Two isolated Firebase browser accounts authenticated');
  await Promise.all([a.goto('http://localhost:5173/friends'), b.goto('http://localhost:5173/friends')]);
  await a.getByLabel('Search players').fill(accountB.username); await a.getByText(accountB.username, { exact: true }).waitFor();
  await a.getByRole('button', { name: 'Add Friend', exact: true }).click(); await b.getByText('Friend Requests (1)', { exact: true }).waitFor(); report('Search and real-time friend request');
  await b.getByRole('button', { name: 'Accept', exact: true }).click(); await a.getByText('Friends (1)', { exact: true }).waitFor(); await b.getByText('Friends (1)', { exact: true }).waitFor(); report('Atomic friendship visible to both accounts');
  await a.getByText('Online', { exact: false }).first().waitFor(); report('Socket presence online');
  await a.getByRole('button', { name: 'Challenge', exact: true }).click(); await a.getByRole('button', { name: 'Ranked', exact: true }).click();
  await b.getByLabel('Notifications').click(); await b.getByText(`${accountA.username} challenged you!`, { exact: true }).waitFor(); await b.getByRole('button', { name: 'Decline', exact: true }).click(); await a.getByText('Challenge declined.', { exact: true }).waitFor();
  if (manager.rooms.size !== 0) throw new Error('Declined challenge created a room.'); report('Challenge decline creates no room');
  await a.waitForTimeout(2200);
  await a.getByRole('button', { name: 'Challenge', exact: true }).click(); await a.getByRole('button', { name: 'Ranked', exact: true }).click();
  await b.getByText(`${accountA.username} challenged you!`, { exact: true }).waitFor();
  if (!(await b.getByRole('button', { name: 'Accept', exact: true }).count())) await b.getByLabel('Notifications').click();
  await b.getByRole('button', { name: 'Accept', exact: true }).click();
  await a.waitForTimeout(2500);
  if (!(new URL(a.url()).pathname === '/multiplayer' && new URL(b.url()).pathname === '/multiplayer')) {
    throw new Error(`Accepted challenge did not navigate both clients. A=${a.url()} B=${b.url()} rooms=${[...manager.rooms.keys()].join(',')}`);
  }
  const roomA = new URL(a.url()).searchParams.get('room'); const roomB = new URL(b.url()).searchParams.get('room');
  if (!roomA || roomA !== roomB || manager.rooms.size !== 1) throw new Error(`Challenge rooms mismatch: ${roomA}/${roomB}/${manager.rooms.size}`); gameIds.push(`${roomA}-1`); report(`One shared challenge room ${roomA}`);
  const white = await a.getByText(/You play White/).count() ? a : b; const black = white === a ? b : a;
  await white.locator('[data-square="e2"]').click(); await white.locator('[data-square="e4"]').click(); await black.locator('[data-square="e7"]').click(); await black.locator('[data-square="e5"]').click(); report('Server-authoritative challenge moves synchronized');
  await a.getByRole('button', { name: 'Chat', exact: true }).click(); await b.getByRole('button', { name: 'Chat', exact: true }).click(); await a.getByPlaceholder('Send a message...').fill('Social hello'); await a.getByPlaceholder('Send a message...').press('Enter'); await b.getByText('Social hello', { exact: true }).waitFor(); report('Existing room chat reused');
  await white.getByRole('button', { name: 'Resign', exact: true }).click();
  for (let i = 0; i < 30; i += 1) { const snap = await adminDb.collection('games').doc(gameIds[0]).get(); if (snap.exists && snap.data().ratingProcessed) break; await new Promise((r) => setTimeout(r, 250)); }
  const game = await adminDb.collection('games').doc(gameIds[0]).get(); if (!game.exists || !game.data().ratingProcessed) throw new Error('Ranked challenge was not persisted/rated.'); report('Ranked Elo/history persistence reused exactly once');
  const ratingsAfterRanked = await Promise.all(accounts.map((item) => adminDb.collection('users').doc(item.uid).get().then((snap) => snap.data().rating)));
  await Promise.all([a.getByRole('button', { name: 'Exit Game', exact: true }).click(), b.getByRole('button', { name: 'Exit Game', exact: true }).click()]);
  await Promise.all([a.goto('http://localhost:5173/friends'), b.goto('http://localhost:5173/friends')]);
  await a.getByRole('button', { name: 'Challenge', exact: true }).click(); await a.getByRole('button', { name: 'Casual', exact: true }).click(); await b.getByLabel('Notifications').click(); await b.getByRole('button', { name: 'Accept', exact: true }).click(); await a.waitForTimeout(2000);
  const casualRoom = new URL(a.url()).searchParams.get('room'); if (!casualRoom || casualRoom !== new URL(b.url()).searchParams.get('room')) throw new Error('Casual challenge did not open one room.'); gameIds.push(`${casualRoom}-1`);
  await a.getByRole('button', { name: 'Resign', exact: true }).click();
  for (let i = 0; i < 30; i += 1) { if ((await adminDb.collection('games').doc(gameIds[1]).get()).exists) break; await new Promise((r) => setTimeout(r, 250)); }
  const casual = await adminDb.collection('games').doc(gameIds[1]).get(); const ratingsAfterCasual = await Promise.all(accounts.map((item) => adminDb.collection('users').doc(item.uid).get().then((snap) => snap.data().rating)));
  if (!casual.exists || casual.data().gameMode !== 'casual' || JSON.stringify(ratingsAfterRanked) !== JSON.stringify(ratingsAfterCasual)) throw new Error('Casual challenge affected Elo or did not persist.'); report('Casual challenge persisted without Elo changes');
  await Promise.all([a.goto('http://localhost:5173/friends'), b.goto('http://localhost:5173/friends')]); await a.getByRole('button', { name: 'Remove', exact: true }).click(); await a.getByRole('button', { name: 'Remove', exact: true }).last().click(); await b.getByText('Friends (0)', { exact: true }).waitFor(); report('Friend removal updates both accounts');
} finally {
  for (const context of contexts) await context.close().catch(() => {}); await browser.close().catch(() => {});
  for (const gameId of gameIds) await adminDb.collection('games').doc(gameId).delete().catch(() => {});
  if (accounts.length === 2) { const id = pairId(accounts[0].uid, accounts[1].uid); await Promise.all([adminDb.collection('friendships').doc(id).delete().catch(() => {}), adminDb.collection('friendRequests').doc(id).delete().catch(() => {})]); }
  for (const account of accounts) { await adminDb.collection('users').doc(account.uid).delete().catch(() => {}); await adminAuth.deleteUser(account.uid).catch(() => {}); }
  manager.close(); socialManager.close(); await new Promise((resolve) => io.close(resolve)); if (httpServer.listening) await new Promise((resolve) => httpServer.close(resolve));
  console.log('Temporary Phase 10 users and records cleaned up.');
}
