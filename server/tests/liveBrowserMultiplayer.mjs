import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import playwright from '../../client/node_modules/playwright-core/index.js';
import app from '../src/app.js';
import { createSocketServer } from '../src/socket/index.js';
import { adminAuth, adminDb } from '../src/config/firebaseAdmin.js';

dotenv.config({ path: '../client/.env' });
if (process.env.CHESSMASTER_LIVE_BROWSER_TEST !== '1') {
  console.log('Set CHESSMASTER_LIVE_BROWSER_TEST=1 and run Vite on localhost:5173.');
  process.exit(1);
}

const apiKey = process.env.VITE_FIREBASE_API_KEY;
const { chromium } = playwright;
const accounts = [];
let roomId;
let staleRoomId;
let casualRoomId;
let drawRoomId;
const httpServer = createServer(app);
const { io, manager } = createSocketServer(httpServer);
await new Promise((resolve, reject) => {
  httpServer.once('error', reject);
  httpServer.listen(5000, 'localhost', resolve);
});
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const contexts = [];

const signup = async (name) => {
  const account = { email: `chessmaster-ui-${randomUUID()}@example.com`, password: `${randomUUID()}Aa1!`, name };
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password, displayName: name, returnSecureToken: true }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Temporary signup failed: ${data.error?.message?.split(' : ')[0] || response.status}`);
  account.uid = data.localId;
  accounts.push(account);
  return account;
};
const login = async (account) => {
  const context = await browser.newContext();
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  await page.goto('http://localhost:5173/login');
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('**/dashboard');
  return { context, page };
};
const move = async (page, from, to) => {
  await page.locator(`[data-square="${from}"]`).click();
  await page.locator(`[data-square="${to}"]`).click();
};
const report = (name) => console.log(`${name}: PASS`);

try {
  const accountA = await signup('BrowserWhite');
  const accountB = await signup('BrowserBlack');
  const a = await login(accountA);
  const b = await login(accountB);
  report('Two isolated Firebase browser sessions');

  await b.page.getByRole('button', { name: 'Create Game', exact: true }).click();
  await b.page.getByRole('button', { name: 'Create Secure Room', exact: true }).click();
  staleRoomId = await b.page.getByText(/^CHESS-[A-Z2-9]{5}$/).textContent();
  await b.page.goto('http://localhost:5173/dashboard');
  await b.page.getByText('Welcome Back', { exact: false }).first().waitFor();
  console.log(`[ROOMS] Player B prior waiting room=${staleRoomId}`);

  await a.page.getByRole('button', { name: 'Create Game', exact: true }).click();
  await a.page.getByRole('button', { name: 'Create Secure Room', exact: true }).click();
  roomId = await a.page.getByText(/^CHESS-[A-Z2-9]{5}$/).textContent();
  console.log(`[CREATE_GAME] room=${roomId}`);
  report('Dashboard create-game modal and waiting room UI');

  await b.page.getByRole('button', { name: 'Join Game Room', exact: true }).click();
  await b.page.locator('input[type=text]').fill(roomId);
  await b.page.getByRole('button', { name: 'Join Room', exact: true }).click();
  await a.page.getByText('You play White', { exact: false }).waitFor();
  await b.page.getByText('You play Black', { exact: false }).waitFor();
  const joinedRoomId = new URL(b.page.url()).searchParams.get('room');
  console.log(`[JOIN_GAME] requestedRoom=${roomId} roomFound=${manager.rooms.has(roomId)} activeRooms=${[...manager.rooms.keys()].join(',')}`);
  if (joinedRoomId !== roomId) throw new Error(`Player B joined ${joinedRoomId || 'no room'} after requesting ${roomId}.`);
  if (manager.rooms.has(staleRoomId) || manager.rooms.size !== 1) {
    throw new Error('The abandoned waiting room was not released during the explicit join.');
  }
  console.log(`[GAME_STARTED] room=${roomId} players=2`);
  report('Join UI, trusted colors, and opposite orientations');

  await a.page.getByRole('button', { name: 'Chat', exact: true }).click();
  await b.page.getByRole('button', { name: 'Chat', exact: true }).click();
  await a.page.getByPlaceholder('Send a message...').fill('Hello');
  await a.page.getByPlaceholder('Send a message...').press('Enter');
  await b.page.getByText('Hello', { exact: true }).waitFor();
  await b.page.getByPlaceholder('Send a message...').fill('Hi');
  await b.page.getByPlaceholder('Send a message...').press('Enter');
  await a.page.getByText('Hi', { exact: true }).waitFor();
  await a.page.getByRole('button', { name: 'Nice move!', exact: true }).click();
  await b.page.locator('div').filter({ hasText: /^Nice move!$/ }).first().waitFor();
  if (await a.page.getByText('Hello', { exact: true }).count() !== 1)
    throw new Error('Sender received a duplicate chat message.');
  report('Bidirectional room chat and quick chat');

  await a.page.getByRole('button', { name: /^Moves/ }).click();
  await b.page.getByRole('button', { name: /^Moves/ }).click();

  await move(a.page, 'f2', 'f3');
  await b.page.getByText('f3', { exact: true }).waitFor();
  await move(b.page, 'e7', 'e5');
  await a.page.getByText('e5', { exact: true }).waitFor();
  report('Bidirectional real-time moves');

  const roomUrl = b.page.url();
  await b.context.close();
  await a.page.getByText('Opponent disconnected', { exact: false }).waitFor();
  const b2 = await login(accountB);
  await b2.page.goto(roomUrl);
  await b2.page.getByText('You play Black', { exact: false }).waitFor();
  await b2.page.getByText('f3', { exact: true }).waitFor();
  await a.page.getByText('Opponent disconnected', { exact: false }).waitFor({ state: 'detached' });
  report('Disconnect notice and authenticated state restoration');

  await move(a.page, 'g2', 'g4');
  await move(b2.page, 'd8', 'h4');
  await a.page.getByRole('heading', { name: /Checkmate!/ }).waitFor();
  await b2.page.getByRole('heading', { name: /Checkmate!/ }).waitFor();
  await a.page.getByText('-16 Elo', { exact: true }).waitFor();
  await b2.page.getByText('+16 Elo', { exact: true }).waitFor();
  report('Identical game-over UI');

  await b2.page.keyboard.press('Escape');
  await a.page.getByRole('button', { name: 'Request Rematch' }).click();
  await b2.page.getByText('Your opponent requested a rematch', { exact: false }).waitFor();
  await b2.page.getByRole('button', { name: 'Accept', exact: true }).click();
  await a.page.getByText('You play Black', { exact: false }).waitFor();
  await b2.page.getByText('You play White', { exact: false }).waitFor();
  report('Rematch acceptance, reset, and color swap UI');

  await a.page.getByTitle('Resign Match').click();
  await a.page.getByRole('heading', { name: /Game Over/i }).waitFor();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const documents = await Promise.all([
      adminDb.collection('games').doc(`${roomId}-1`).get(),
      adminDb.collection('games').doc(`${roomId}-2`).get(),
    ]);
    if (documents.every((document) => document.exists)) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const [rankedOne, rankedTwo, profileA, profileB] = await Promise.all([
    adminDb.collection('games').doc(`${roomId}-1`).get(), adminDb.collection('games').doc(`${roomId}-2`).get(),
    adminDb.collection('users').doc(accountA.uid).get(), adminDb.collection('users').doc(accountB.uid).get(),
  ]);
  if (!rankedOne.data().ratingProcessed || !rankedTwo.data().ratingProcessed) throw new Error('Ranked games were not rating processed.');
  if (profileA.data().rating !== 1169 || profileB.data().rating !== 1231 || profileA.data().losses !== 2 || profileB.data().wins !== 2) throw new Error('Two ranked results did not atomically update Elo and stats.');
  await manager.persist(manager.rooms.get(roomId));
  const duplicateA = await adminDb.collection('users').doc(accountA.uid).get();
  if (duplicateA.data().gamesPlayed !== 2) throw new Error('Duplicate rating processing changed stats.');
  report('Two ranked Elo transactions and duplicate-processing protection');

  await b2.page.goto('http://localhost:5173/dashboard');
  await b2.page.getByRole('img', { name: '1231 Elo' }).waitFor();
  await b2.page.getByText('Peak:').locator('strong').filter({ hasText: /^1231$/ }).waitFor();
  if (await b2.page.getByRole('link', { name: /Replay game against BrowserWhite/ }).count() !== 2) throw new Error('Dashboard did not show two real recent matches.');
  await b2.page.getByRole('link', { name: /Replay game against BrowserWhite/ }).first().click();
  await b2.page.getByText('Game Replay', { exact: true }).waitFor();
  await b2.page.getByRole('button', { name: 'Back to Game History' }).click();
  await b2.page.getByText('Match History', { exact: true }).waitFor();
  await b2.page.goto('http://localhost:5173/dashboard');
  await b2.page.reload();
  await b2.page.getByRole('img', { name: '1231 Elo' }).waitFor();
  await b2.page.getByRole('link', { name: /View All History/ }).click();
  await b2.page.getByText('Match History', { exact: true }).waitFor();
  report('Real dashboard rating progression, recent matches, replay link, history link, and refresh');
  await a.page.goto('http://localhost:5173/history');
  await b2.page.goto('http://localhost:5173/history');
  await a.page.getByTestId('history-game').first().waitFor();
  await b2.page.getByTestId('history-game').first().waitFor();
  if (await a.page.getByTestId('history-game').count() !== 2 || await b2.page.getByTestId('history-game').count() !== 2)
    throw new Error('Both players did not receive both completed games in history.');
  if (!await a.page.getByTestId('history-game').first().getByText('Resignation', { exact: true }).count())
    throw new Error('History was not sorted newest first.');
  if (await a.page.getByText('BrowserBlack', { exact: true }).count() !== 2 || await b2.page.getByText('BrowserWhite', { exact: true }).count() !== 2)
    throw new Error('History opponent names were not shown from each player perspective.');
  report('Two-account Firestore game history, perspective, and newest-first sorting');

  const replayCard = a.page.getByTestId('history-game').nth(1);
  const replayGameId = await replayCard.getAttribute('data-game-id');
  await replayCard.click();
  await a.page.waitForURL(`**/history/${replayGameId}`);
  await a.page.getByText('Move 0 of 4', { exact: false }).waitFor();
  await a.page.getByRole('button', { name: 'Next move' }).click();
  await a.page.getByText('Move 1 of 4', { exact: false }).waitFor();
  await a.page.getByRole('button', { name: 'Previous move' }).click();
  await a.page.getByText('Move 0 of 4', { exact: false }).waitFor();
  await a.page.getByRole('button', { name: 'Last move' }).click();
  await a.page.getByText('Move 4 of 4', { exact: false }).waitFor();
  await a.page.getByRole('button', { name: 'First move' }).click();
  await a.page.locator('[data-move-index="2"]').click();
  await a.page.getByText('Move 3 of 4', { exact: false }).waitFor();
  await a.page.getByRole('button', { name: 'First move' }).click();
  await a.page.getByRole('button', { name: 'Play replay' }).click();
  await a.page.getByText('Move 1 of 4', { exact: false }).waitFor();
  await a.page.getByRole('button', { name: 'Pause replay' }).click();
  await a.page.reload();
  await a.page.getByText('Move 0 of 4', { exact: false }).waitFor();
  report('Replay next, previous, first, last, move jump, play, pause, and refresh');

  const accountC = await signup('BrowserStranger');
  const c = await login(accountC);
  await c.page.goto(`http://localhost:5173/history/${replayGameId}`);
  await c.page.getByText('Replay unavailable', { exact: true }).waitFor();
  report('Unrelated authenticated user denied replay access');

  await a.page.goto('http://localhost:5173/leaderboard');
  await a.page.getByText('BrowserBlack', { exact: true }).first().waitFor();
  await a.page.getByPlaceholder('Search loaded players').fill('BrowserWhite');
  await a.page.getByText('BrowserWhite', { exact: true }).last().waitFor();
  await a.page.reload();
  await a.page.getByText('Your Rank', { exact: false }).waitFor();
  report('Firestore-backed leaderboard ordering, current user, search, and refresh');

  manager.leave({ user: { uid: accountA.uid }, leave() {} }, roomId);
  manager.leave({ user: { uid: accountB.uid }, leave() {} }, roomId);
  await a.page.goto('http://localhost:5173/dashboard');
  await b2.page.goto('http://localhost:5173/dashboard');
  await a.page.getByRole('button', { name: 'Create Game', exact: true }).click();
  await a.page.getByRole('button', { name: /casual/i }).click();
  await a.page.getByRole('button', { name: 'Create Secure Room', exact: true }).click();
  casualRoomId = await a.page.getByText(/^CHESS-[A-Z2-9]{5}$/).textContent();
  await b2.page.getByRole('button', { name: 'Join Game Room', exact: true }).click();
  await b2.page.locator('input[type=text]').fill(casualRoomId);
  await b2.page.getByRole('button', { name: 'Join Room', exact: true }).click();
  await a.page.getByText('casual', { exact: false }).first().waitFor();
  await a.page.getByTitle('Resign Match').click();
  await a.page.getByText('No rating change', { exact: false }).waitFor();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const document = await adminDb.collection('games').doc(`${casualRoomId}-1`).get();
    if (document.exists) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const [casualGame, casualA, casualB] = await Promise.all([
    adminDb.collection('games').doc(`${casualRoomId}-1`).get(), adminDb.collection('users').doc(accountA.uid).get(), adminDb.collection('users').doc(accountB.uid).get(),
  ]);
  if (casualGame.data().gameMode !== 'casual' || casualGame.data().ratingProcessed !== false || casualA.data().rating !== 1169 || casualB.data().rating !== 1231) throw new Error('Casual game changed ratings.');
  report('Casual game persistence without Elo or stat changes');

  manager.leave({ user: { uid: accountA.uid }, leave() {} }, casualRoomId);
  manager.leave({ user: { uid: accountB.uid }, leave() {} }, casualRoomId);
  await a.page.goto('http://localhost:5173/dashboard');
  await b2.page.goto('http://localhost:5173/dashboard');
  await a.page.getByRole('button', { name: 'Create Game', exact: true }).click();
  await a.page.getByRole('button', { name: 'Create Secure Room', exact: true }).click();
  drawRoomId = await a.page.getByText(/^CHESS-[A-Z2-9]{5}$/).textContent();
  await b2.page.getByRole('button', { name: 'Join Game Room', exact: true }).click();
  await b2.page.locator('input[type=text]').fill(drawRoomId);
  await b2.page.getByRole('button', { name: 'Join Room', exact: true }).click();
  await a.page.getByTitle('Offer Draw').click();
  await b2.page.getByText('Your opponent offered a draw.', { exact: true }).waitFor();
  await b2.page.getByRole('button', { name: 'Accept', exact: true }).click();
  await a.page.getByText('+3 Elo', { exact: true }).waitFor();
  await b2.page.getByText('-3 Elo', { exact: true }).waitFor();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const document = await adminDb.collection('games').doc(`${drawRoomId}-1`).get();
    if (document.exists) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const [drawGame, drawA, drawB] = await Promise.all([
    adminDb.collection('games').doc(`${drawRoomId}-1`).get(), adminDb.collection('users').doc(accountA.uid).get(), adminDb.collection('users').doc(accountB.uid).get(),
  ]);
  if (drawGame.data().result !== '1/2-1/2' || drawA.data().rating !== 1172 || drawB.data().rating !== 1228 || drawA.data().draws !== 1 || drawB.data().draws !== 1) throw new Error('Ranked draw Elo or counters were incorrect.');
  report('Ranked draw Elo and draw counters');

  await a.page.setViewportSize({ width: 390, height: 844 });
  await a.page.goto('http://localhost:5173/dashboard');
  await a.page.getByText('Welcome Back', { exact: false }).first().waitFor();
  await a.page.goto('http://localhost:5173/play');
  await a.page.locator('[data-square="e2"]').waitFor();
  if (await a.page.locator('[data-square]').count() !== 64) throw new Error('Local chess board did not render on mobile.');
  await a.page.goto('http://localhost:5173/ai');
  await a.page.getByRole('button', { name: 'Start Game', exact: true }).click();
  await a.page.locator('[data-square="e2"]').waitFor();
  if (await a.page.locator('[data-square]').count() !== 64) throw new Error('AI chess board did not render on mobile.');
  const overflow = await a.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error('Mobile layout has horizontal page overflow.');
  report('Mobile Dashboard, local chess, and AI chess regression');
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (roomId) {
    await adminDb.collection('games').doc(`${roomId}-1`).delete().catch(() => {});
    await adminDb.collection('games').doc(`${roomId}-2`).delete().catch(() => {});
  }
  if (casualRoomId) await adminDb.collection('games').doc(`${casualRoomId}-1`).delete().catch(() => {});
  if (drawRoomId) await adminDb.collection('games').doc(`${drawRoomId}-1`).delete().catch(() => {});
  for (const account of accounts) {
    await adminDb.collection('users').doc(account.uid).delete().catch(() => {});
  }
  if (accounts.length) await adminAuth.deleteUsers(accounts.map(({ uid }) => uid)).catch(() => {});
  manager.close();
  await new Promise((resolve) => io.close(resolve));
  if (httpServer.listening) await new Promise((resolve) => httpServer.close(resolve));
  await browser.close();
  console.log('Temporary browser-test users, profiles, and games cleaned up.');
}
