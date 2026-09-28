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
if (process.env.CHESSMASTER_LIVE_SETTINGS_TEST !== '1') throw new Error('Set CHESSMASTER_LIVE_SETTINGS_TEST=1 to run this test.');
const apiKey = process.env.VITE_FIREBASE_API_KEY; const accounts = []; const contexts = []; const gameId = `SETTINGS-${randomUUID()}`; let multiplayerGameId;
const server = createServer(app); const { io, manager, socialManager } = createSocketServer(server); app.set('io', io);
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(5000, 'localhost', resolve); });
const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });
const report = (label) => console.log(`${label}: PASS`);
const signup = async (username) => {
  const email = `settings-${randomUUID()}@example.com`; const password = `${randomUUID()}Aa1!`;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, displayName: username, returnSecureToken: true }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Signup failed.');
  const account = { uid: data.localId, email, password, username }; accounts.push(account);
  await adminDb.collection('users').doc(account.uid).set({ username, usernameLower: username.toLowerCase(), email, avatar: '', rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return account;
};
const login = async (account) => {
  const context = await browser.newContext(); contexts.push(context); const page = await context.newPage(); page.setDefaultTimeout(60_000);
  await page.goto('http://localhost:5173/login'); await page.locator('input[type=email]').fill(account.email); await page.locator('input[type=password]').fill(account.password); await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL('**/dashboard'); return page;
};
const assertBoard = async (page, theme = 'ocean', coordinates = 'false') => {
  const board = page.locator('[data-board-theme]').first(); await board.waitFor();
  if (await board.getAttribute('data-board-theme') !== theme || await board.getAttribute('data-coordinates') !== coordinates) throw new Error('Board settings were not applied.');
};
const assertSwitchGeometry = async (page, label, expected) => {
  const control = page.getByRole('switch', { name: label });
  if (await control.getAttribute('aria-checked') !== String(expected)) throw new Error(`${label} state mismatch.`);
  await page.waitForTimeout(250);
  const track = await control.locator('[data-toggle-track]').boundingBox(); const knob = await control.locator('[data-toggle-knob]').boundingBox();
  if (!track || !knob || Math.abs(track.width - 48) > 0.5 || Math.abs(track.height - 26) > 0.5 || Math.abs(knob.width - 20) > 0.5 || Math.abs(knob.height - 20) > 0.5) throw new Error(`${label} dimensions are incorrect.`);
  const leftInset = knob.x - track.x; const rightInset = track.x + track.width - knob.x - knob.width;
  if (leftInset < 2.5 || rightInset < 2.5 || Math.abs((expected ? rightInset : leftInset) - 3) > 0.75) throw new Error(`${label} knob escaped or is misaligned.`);
};
const cycleSwitch = async (page, label, initial, afterFirst, afterSecond) => {
  await assertSwitchGeometry(page, label, initial); const control = page.getByRole('switch', { name: label });
  await control.click(); await assertSwitchGeometry(page, label, afterFirst);
  await control.click(); await assertSwitchGeometry(page, label, afterSecond);
};

try {
  const owner = await signup('SettingsOwner'); const opponent = await signup('SettingsOpponent'); const page = await login(owner);
  const chess = new Chess(); const moves = ['e4', 'e5', 'Nf3', 'Nc6'].map((san) => { const move = chess.move(san); return { from: move.from, to: move.to, san: move.san, promotion: move.promotion || null }; });
  await adminDb.collection('games').doc(gameId).set({ gameId, roomId: gameId, whitePlayerUid: owner.uid, blackPlayerUid: opponent.uid, whitePlayerName: owner.username, blackPlayerName: opponent.username, participantUids: [owner.uid, opponent.uid], moves, moveCount: moves.length, initialFen: new Chess().fen(), finalFen: chess.fen(), winnerUid: owner.uid, result: '1-0', reason: 'resignation', status: 'finished', gameMode: 'casual', ratingProcessed: false, timeControl: { initialSeconds: 600, incrementSeconds: 0 }, startedAt: FieldValue.serverTimestamp(), endedAt: FieldValue.serverTimestamp() });

  await page.goto('http://localhost:5173/settings'); await page.getByTestId('theme-ocean').click();
  await cycleSwitch(page, 'Show Board Coordinates', true, false, true); await page.getByRole('switch', { name: 'Show Board Coordinates' }).click(); await assertSwitchGeometry(page, 'Show Board Coordinates', false);
  await cycleSwitch(page, 'Auto Queen', false, true, false);
  await cycleSwitch(page, 'Master Sound', true, false, true);
  await cycleSwitch(page, 'Capture Sounds', true, false, true);
  for (const label of ['Show Legal Moves', 'Highlight Last Move', 'Move Animations', 'Confirm Before Resign']) await page.getByRole('switch', { name: label }).click();
  const notificationSwitch = page.getByRole('switch', { name: 'In-App Notifications' }); await notificationSwitch.focus(); await notificationSwitch.press('Space'); await assertSwitchGeometry(page, 'In-App Notifications', false); await notificationSwitch.press('Space'); await assertSwitchGeometry(page, 'In-App Notifications', true);
  for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const label of ['Show Board Coordinates', 'Auto Queen', 'Master Sound', 'Capture Sounds']) await assertSwitchGeometry(page, label, await page.getByRole('switch', { name: label }).getAttribute('aria-checked') === 'true');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflow) throw new Error(`Settings overflow at ${viewport.width}px.`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByText('Saved', { exact: true }).waitFor();
  const saved = (await adminDb.collection('users').doc(owner.uid).get()).data().settings;
  if (saved.boardTheme !== 'ocean' || saved.showCoordinates || saved.showLegalMoves || saved.highlightLastMove || saved.moveAnimations || !saved.confirmResign) throw new Error('Firestore settings payload mismatch.');
  report('Settings auto-save to users/{uid}.settings');

  await page.reload(); await page.getByRole('switch', { name: 'Show Board Coordinates' }).waitFor();
  if (await page.getByRole('switch', { name: 'Show Board Coordinates' }).getAttribute('aria-checked') !== 'false') throw new Error('Refresh did not restore settings.');
  report('Refresh restores settings without losing values');

  await page.getByRole('button', { name: new RegExp(owner.username) }).click(); await page.getByText('Sign Out', { exact: true }).click();
  await page.goto('http://localhost:5173/login'); await page.locator('input[type=email]').fill(owner.email); await page.locator('input[type=password]').fill(owner.password); await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL('**/dashboard');
  await page.goto('http://localhost:5173/play'); await assertBoard(page);
  await page.locator('[data-square="e2"]').click(); if (await page.locator('[data-legal-target="true"]').count()) throw new Error('Legal indicators remained visible.');
  await page.locator('[data-square="e4"]').click(); if (await page.locator('[data-last-move="true"]').count()) throw new Error('Last move highlight remained visible.');
  report('Logout/login persistence and Local Chess visual preferences');

  await page.goto('http://localhost:5173/ai'); await page.getByRole('button', { name: /beginner/i }).click(); await page.getByRole('button', { name: 'Start Game' }).click(); await assertBoard(page);
  await page.locator('[data-square="e2"]').click(); await page.locator('[data-square="e4"]').click(); await page.getByText('Move 2', { exact: false }).waitFor(); await page.getByTitle('Undo Move').click(); await page.getByTitle('Redo Move').click();
  report('AI board, engine response, Undo and Redo with settings');

  await page.goto(`http://localhost:5173/history/${gameId}`); await assertBoard(page); await page.getByRole('button', { name: 'Analyze Game' }).click(); await page.getByText('Analysis Ready', { exact: true }).waitFor(); await page.getByRole('img', { name: 'Engine evaluation graph' }).waitFor();
  report('Replay and Game Analysis use board settings and analysis completes');

  const opponentPage = await login(opponent); await page.goto('http://localhost:5173/multiplayer'); await page.getByRole('button', { name: 'Create Game' }).click();
  const roomText = await page.getByText(/^CHESS-/).textContent(); multiplayerGameId = `${roomText}-1`; await opponentPage.goto('http://localhost:5173/multiplayer'); await opponentPage.getByPlaceholder('CHESS-7F29K').fill(roomText); await opponentPage.getByRole('button', { name: 'Join Game' }).click();
  await assertBoard(page); await page.locator('[data-square="e2"]').click(); await page.locator('[data-square="e4"]').click(); await opponentPage.locator('[data-square="e7"]').click(); await opponentPage.locator('[data-square="e5"]').click();
  await page.getByTitle('Resign Match').click(); await page.getByText('Resign this game?', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Resign Game' }).click(); await page.getByText('is Victorious!', { exact: false }).waitFor();
  report('Multiplayer synchronization and confirm-resign remain server-authoritative');

  const ratingBeforeReset = (await adminDb.collection('users').doc(owner.uid).get()).data().rating;
  await page.goto('http://localhost:5173/settings'); await page.getByRole('button', { name: 'Reset to Defaults' }).click(); await page.locator('.fixed.inset-0.z-50').getByRole('button', { name: 'Reset to Defaults' }).click(); await page.getByText('Saved', { exact: true }).waitFor();
  const resetProfile = (await adminDb.collection('users').doc(owner.uid).get()).data();
  if (resetProfile.settings.boardTheme !== 'midnight' || !resetProfile.settings.showCoordinates || resetProfile.settings.confirmResign || resetProfile.rating !== ratingBeforeReset) throw new Error('Reset changed non-personalization data or failed to restore defaults.');
  report('Reset restores personalization defaults without changing competitive data');
} finally {
  for (const context of contexts) await context.close().catch(() => {}); await browser.close().catch(() => {});
  await Promise.all([adminDb.collection('gameAnalyses').doc(gameId).delete().catch(() => {}), adminDb.collection('games').doc(gameId).delete().catch(() => {}), multiplayerGameId ? adminDb.collection('games').doc(multiplayerGameId).delete().catch(() => {}) : Promise.resolve()]);
  for (const account of accounts) { await adminDb.collection('users').doc(account.uid).delete().catch(() => {}); await adminAuth.deleteUser(account.uid).catch(() => {}); }
  manager.close(); socialManager.close(); await new Promise((resolve) => io.close(resolve)); if (server.listening) await new Promise((resolve) => server.close(resolve)); console.log('Temporary settings test records cleaned up.');
}
