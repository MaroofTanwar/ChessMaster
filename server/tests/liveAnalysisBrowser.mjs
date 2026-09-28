import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import playwright from '../../client/node_modules/playwright-core/index.js';
import { Chess } from 'chess.js';
import { FieldValue } from 'firebase-admin/firestore';
import app from '../src/app.js';
import { createSocketServer } from '../src/socket/index.js';
import { adminAuth, adminDb } from '../src/config/firebaseAdmin.js';

dotenv.config({ path: '../client/.env' });
if (process.env.CHESSMASTER_LIVE_ANALYSIS_TEST !== '1') throw new Error('Set CHESSMASTER_LIVE_ANALYSIS_TEST=1 to run this test.');
const apiKey = process.env.VITE_FIREBASE_API_KEY; const users = []; const gameId = `ANALYSIS-${randomUUID()}`;
const server = createServer(app); const { io, manager, socialManager } = createSocketServer(server); app.set('io', io);
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(5000, 'localhost', resolve); });
const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true }); const contexts = [];
const report = (text) => console.log(`${text}: PASS`);
const signup = async (username) => {
  const email = `analysis-${randomUUID()}@example.com`; const password = `${randomUUID()}Aa1!`;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, displayName: username, returnSecureToken: true }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Signup failed'); const account = { uid: data.localId, email, password, username }; users.push(account);
  await adminDb.collection('users').doc(account.uid).set({ username, usernameLower: username.toLowerCase(), email, avatar: '', rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0 }); return account;
};
const login = async (account) => { const context = await browser.newContext(); contexts.push(context); const page = await context.newPage(); page.setDefaultTimeout(60_000); await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' }); await page.locator('input[type=email]').fill(account.email); await page.locator('input[type=password]').fill(account.password); await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL('**/dashboard'); return page; };
try {
  const owner = await signup('AnalysisOwner'); const stranger = await signup('AnalysisStranger');
  const chess = new Chess(); const moves = ['f3', 'e5', 'g4', 'Qh4#'].map((san) => { const move = chess.move(san); return { from: move.from, to: move.to, san: move.san, promotion: move.promotion || null }; });
  await adminDb.collection('games').doc(gameId).set({ gameId, roomId: gameId, whitePlayerUid: owner.uid, blackPlayerUid: 'test-opponent', whitePlayerName: owner.username, blackPlayerName: 'Tactical Opponent', participantUids: [owner.uid, 'test-opponent'], moves, moveCount: moves.length, initialFen: new Chess().fen(), finalFen: chess.fen(), winnerUid: 'test-opponent', result: '0-1', reason: 'checkmate', status: 'finished', gameMode: 'casual', ratingProcessed: false, timeControl: { initialSeconds: 600, incrementSeconds: 0 }, startedAt: FieldValue.serverTimestamp(), endedAt: FieldValue.serverTimestamp() });
  const page = await login(owner); await page.goto(`http://localhost:5173/history/${gameId}`); await page.getByRole('heading', { name: 'Game Replay' }).waitFor(); await page.getByRole('button', { name: 'Analyze Game' }).click();
  await page.getByText('Analysis Ready', { exact: true }).waitFor(); await page.getByRole('img', { name: 'Engine evaluation graph' }).waitFor(); await page.getByLabel(/^Evaluation /).waitFor(); report('Real completed tactical game analyzed with bar and graph');
  const labels = await page.locator('text=/Best|Excellent|Good|Inaccuracy|Mistake|Blunder/').count(); if (!labels) throw new Error('Move classifications missing.');
  await page.getByLabel('Next move').click(); await page.getByText('Best move:', { exact: false }).waitFor(); report('Move classifications, best move, PV, and selected insight');
  const cache = await adminDb.collection('gameAnalyses').doc(gameId).get(); if (!cache.exists || cache.data().analysisVersion !== 1 || cache.data().moves.length !== moves.length) throw new Error('Analysis cache invalid.');
  await page.reload({ waitUntil: 'domcontentloaded' }); const started = Date.now(); await page.getByRole('button', { name: 'Analyze Game' }).click(); await page.getByText('Analysis Ready', { exact: true }).waitFor(); if (Date.now() - started > 5000) throw new Error('Compatible cache was not reused.'); report('Versioned analysis cache reused');
  const ownerAfter = await adminDb.collection('users').doc(owner.uid).get(); const gameAfter = await adminDb.collection('games').doc(gameId).get(); if (ownerAfter.data().rating !== 1200 || gameAfter.data().result !== '0-1' || gameAfter.data().ratingProcessed !== false) throw new Error('Analysis mutated Elo or result.'); report('Analysis did not mutate Elo or game result');
  const strangerPage = await login(stranger); await strangerPage.goto(`http://localhost:5173/history/${gameId}`); await strangerPage.getByText('Replay unavailable', { exact: true }).waitFor(); report('Unrelated user denied replay and analysis');
} finally {
  for (const context of contexts) await context.close().catch(() => {}); await browser.close().catch(() => {});
  await Promise.all([adminDb.collection('gameAnalyses').doc(gameId).delete().catch(() => {}), adminDb.collection('games').doc(gameId).delete().catch(() => {})]);
  for (const user of users) { await adminDb.collection('users').doc(user.uid).delete().catch(() => {}); await adminAuth.deleteUser(user.uid).catch(() => {}); }
  manager.close(); socialManager.close(); await new Promise((resolve) => io.close(resolve)); if (server.listening) await new Promise((resolve) => server.close(resolve)); console.log('Temporary analysis test records cleaned up.');
}
