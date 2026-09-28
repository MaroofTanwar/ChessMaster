import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import playwright from '../../client/node_modules/playwright-core/index.js';
import app from '../src/app.js';
import { createSocketServer } from '../src/socket/index.js';
import { adminAuth, adminDb } from '../src/config/firebaseAdmin.js';

dotenv.config({ path: '../client/.env' });
if (process.env.CHESSMASTER_LIVE_QUICK_MATCH_TEST !== '1') {
  console.log('Set CHESSMASTER_LIVE_QUICK_MATCH_TEST=1 and run Vite on localhost:5173.');
  process.exit(1);
}

const apiKey = process.env.VITE_FIREBASE_API_KEY;
if (!apiKey) throw new Error('The frontend Firebase API key is unavailable.');

const accounts = [];
const contexts = [];
const consoleErrors = [];
let gameDocumentId = null;
const httpServer = createServer(app);
const { io, manager, socialManager, matchmakingManager } = createSocketServer(httpServer);
await new Promise((resolve, reject) => {
  httpServer.once('error', reject);
  httpServer.listen(5000, 'localhost', resolve);
});
const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });

const report = (label) => console.log(`${label}: PASS`);
const waitUntil = async (predicate, label, timeout = 10_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${label}`);
};
const signup = async (name) => {
  const account = { email: `quick-match-${randomUUID()}@example.com`, password: `${randomUUID()}Aa1!`, name };
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
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
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

try {
  const accountA = await signup('QuickAlpha');
  const accountB = await signup('QuickBravo');
  const a = await login(accountA);
  const b = await login(accountB);

  const faviconHref = await a.page.locator('link[rel="icon"]').getAttribute('href');
  const faviconResponse = await a.page.request.get(`http://localhost:5173${faviconHref}`);
  if (faviconHref !== '/favicon.svg' || !faviconResponse.ok() || !(await faviconResponse.text()).includes('linearGradient')) {
    throw new Error('ChessMaster favicon was not served from the local Vite asset.');
  }
  if (!await a.page.title().then((title) => title.startsWith('ChessMaster —'))) throw new Error('Browser title is not the ChessMaster title.');
  if (await a.page.getByText('Phase 9', { exact: true }).count()) throw new Error('The Phase 9 badge is still visible.');
  report('Local ChessMaster favicon, title, and production-facing sidebar labels');

  await a.page.getByRole('button', { name: 'Quick Match', exact: true }).nth(1).click();
  await a.page.getByRole('heading', { name: 'Finding opponent...' }).waitFor();
  await a.page.getByRole('button', { name: 'Cancel Search', exact: true }).waitFor();
  if (matchmakingManager.queue.size !== 1) throw new Error('Player A was not queued exactly once.');
  report('Dashboard Quick Match enters searching state');

  await b.page.getByTestId('navbar-quick-match').click();
  await Promise.all([a.page.waitForURL('**/multiplayer?room=*'), b.page.waitForURL('**/multiplayer?room=*')]);
  await Promise.all([
    a.page.getByText(/You play (White|Black)/).waitFor(),
    b.page.getByText(/You play (White|Black)/).waitFor(),
  ]);
  const roomA = new URL(a.page.url()).searchParams.get('room');
  const roomB = new URL(b.page.url()).searchParams.get('room');
  if (!roomA || roomA !== roomB || manager.rooms.size !== 1 || matchmakingManager.queue.size !== 0) {
    throw new Error(`Quick Match room mismatch: A=${roomA}, B=${roomB}, rooms=${manager.rooms.size}.`);
  }
  const room = manager.rooms.get(roomA);
  if (room.status !== 'active' || room.gameMode !== 'ranked' || !room.players.w || !room.players.b) throw new Error('Quick Match did not start one ranked two-player game.');
  if (room.players.w.uid === room.players.b.uid) throw new Error('A player was matched with themselves.');
  if (room.clocks.w > 600_000 || room.clocks.b !== 600_000) throw new Error('Server Rapid 10+0 clocks were not initialized.');
  report(`Both browser clients entered the same server room ${roomA} with trusted colors and timer`);

  const whitePage = room.players.w.uid === accountA.uid ? a.page : b.page;
  const blackPage = room.players.b.uid === accountA.uid ? a.page : b.page;
  await whitePage.getByRole('button', { name: 'Chat', exact: true }).click();
  await blackPage.getByRole('button', { name: 'Chat', exact: true }).click();
  await whitePage.getByPlaceholder('Send a message...').fill('Quick hello');
  await whitePage.getByPlaceholder('Send a message...').press('Enter');
  await blackPage.getByText('Quick hello', { exact: true }).waitFor();
  await whitePage.getByRole('button', { name: /^Moves/ }).click();
  await blackPage.getByRole('button', { name: /^Moves/ }).click();
  await move(whitePage, 'e2', 'e4');
  await blackPage.getByText('e4', { exact: true }).waitFor();
  await move(blackPage, 'e7', 'e5');
  await whitePage.getByText('e5', { exact: true }).waitFor();
  report('Quick Match move synchronization and existing room chat');

  const loserPage = whitePage;
  await loserPage.getByTitle('Resign Match').click();
  const confirm = loserPage.getByRole('button', { name: 'Resign Game', exact: true });
  if (await confirm.count()) await confirm.click();
  await Promise.all([
    a.page.getByRole('heading', { name: /Game Over/i }).waitFor(),
    b.page.getByRole('heading', { name: /Game Over/i }).waitFor(),
  ]);
  gameDocumentId = `${roomA}-1`;
  await waitUntil(async () => (await adminDb.collection('games').doc(gameDocumentId).get()).exists, 'completed quick-match game persistence');
  const gameDocument = await adminDb.collection('games').doc(gameDocumentId).get();
  if (gameDocument.data().gameMode !== 'ranked' || !gameDocument.data().ratingProcessed) throw new Error('Quick Match did not reuse ranked persistence/Elo processing.');
  report('Quick Match game completion persisted through the existing ranked pipeline');

  manager.leave({ user: { uid: accountA.uid }, leave() {} }, roomA);
  manager.leave({ user: { uid: accountB.uid }, leave() {} }, roomA);

  const cancelAccount = await signup('QuickCancel');
  const cancelClient = await login(cancelAccount);
  await cancelClient.page.getByRole('button', { name: 'Quick Match', exact: true }).first().click();
  await cancelClient.page.getByRole('button', { name: 'Cancel Search', exact: true }).click();
  await cancelClient.page.getByRole('heading', { name: 'Finding opponent...' }).waitFor({ state: 'detached' });
  if (matchmakingManager.queue.has(cancelAccount.uid)) throw new Error('Cancelled player remained in the queue.');
  report('Cancel Search removes the authenticated user from the queue');

  const disconnectAccount = await signup('QuickDisconnect');
  const disconnectClient = await login(disconnectAccount);
  await disconnectClient.page.getByRole('button', { name: 'Quick Match', exact: true }).first().click();
  await disconnectClient.page.getByRole('heading', { name: 'Finding opponent...' }).waitFor();
  await disconnectClient.context.close();
  await waitUntil(() => !matchmakingManager.queue.has(disconnectAccount.uid), 'disconnect queue cleanup');
  report('Disconnect while searching removes the stale queue entry');

  const rapidAccount = await signup('QuickRapid');
  const rapidClient = await login(rapidAccount);
  await rapidClient.page.getByRole('button', { name: 'Quick Match', exact: true }).first().evaluate((button) => {
    button.click();
    button.click();
  });
  await rapidClient.page.getByRole('heading', { name: 'Finding opponent...' }).waitFor();
  await waitUntil(() => matchmakingManager.queue.has(rapidAccount.uid), 'rapid-click queue entry');
  if (matchmakingManager.queue.size !== 1 || !matchmakingManager.queue.has(rapidAccount.uid)) throw new Error('Rapid Quick Match clicks created duplicate queue state.');
  await rapidClient.page.getByRole('button', { name: 'Cancel Search', exact: true }).click();
  report('Rapid/double Quick Match click is idempotent');

  if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`);
  report('No relevant browser console or runtime errors');
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  if (gameDocumentId) await adminDb.collection('games').doc(gameDocumentId).delete().catch(() => {});
  for (const account of accounts) await adminDb.collection('users').doc(account.uid).delete().catch(() => {});
  if (accounts.length) await adminAuth.deleteUsers(accounts.map(({ uid }) => uid)).catch(() => {});
  manager.close();
  socialManager.close();
  await new Promise((resolve) => io.close(resolve));
  if (httpServer.listening) await new Promise((resolve) => httpServer.close(resolve));
  await browser.close();
  console.log('Temporary Quick Match users, profiles, and game cleaned up.');
}
