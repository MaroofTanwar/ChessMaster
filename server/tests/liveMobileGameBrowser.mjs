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
if (process.env.CHESSMASTER_LIVE_MOBILE_TEST !== '1') throw new Error('Set CHESSMASTER_LIVE_MOBILE_TEST=1 to run this test.');

const WIDTHS = [320, 360, 375, 390, 412, 430];
const HEIGHT = 932;
const STABILITY_MOVES = [
  ['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'],
  ['f1', 'b5'], ['a7', 'a6'], ['b5', 'a4'], ['g8', 'f6'],
  ['e1', 'g1'], ['f8', 'e7'], ['f1', 'e1'], ['b7', 'b5'],
  ['a4', 'b3'], ['d7', 'd6'], ['c2', 'c3'], ['e8', 'g8'],
  ['h2', 'h3'], ['c6', 'b8'], ['d2', 'd4'], ['b8', 'd7'],
];
const apiKey = process.env.VITE_FIREBASE_API_KEY;
const gameId = `MOBILE-${randomUUID()}`;
const accounts = [];
const contexts = [];
const consoleErrors = [];
let multiplayerGameId;
const server = createServer(app);
const { io, manager, socialManager } = createSocketServer(server);
app.set('io', io);

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(5000, 'localhost', resolve);
});

const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });
const pass = (name) => console.log(`${name}: PASS`);

const signup = async (prefix) => {
  const username = `${prefix}${randomUUID().slice(0, 8)}`;
  const email = `mobile-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, displayName: username, returnSecureToken: true }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message || 'Signup failed.');
  const account = { uid: payload.localId, username, email, password };
  accounts.push(account);
  await adminDb.collection('users').doc(account.uid).set({
    username,
    usernameLower: username.toLowerCase(),
    email,
    avatar: '',
    rating: 1200,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return account;
};

const login = async (account) => {
  const context = await browser.newContext({ viewport: { width: 430, height: HEIGHT } });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await page.goto('http://localhost:5173/login');
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('**/dashboard');
  return page;
};

const verifyBoardAtWidths = async (page, name, { players = false } = {}) => {
  await page.getByTestId('chessboard').waitFor();
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: HEIGHT });
    await page.waitForTimeout(80);
    const board = await page.getByTestId('chessboard').boundingBox();
    if (!board) throw new Error(`${name}: board missing at ${width}px.`);
    if (Math.abs(board.width - board.height) > 1) throw new Error(`${name}: board is not square at ${width}px.`);
    if (board.width < width - 16) throw new Error(`${name}: board wastes mobile width at ${width}px (${board.width}px).`);
    if (board.x < 0 || board.x + board.width > width + 0.5) throw new Error(`${name}: board clips at ${width}px.`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflow) throw new Error(`${name}: horizontal overflow at ${width}px.`);
    if (players && await page.getByTestId('player-info-bar').count() !== 2) throw new Error(`${name}: player bars missing at ${width}px.`);
    const nav = await page.getByTestId('mobile-game-navigation').boundingBox();
    if (!nav || Math.abs(nav.y + nav.height - HEIGHT) > 1) throw new Error(`${name}: bottom navigation is not fixed at ${width}px.`);
    console.log(`${name} ${width}px: board ${Math.round(board.width)}px`);
  }
  pass(`${name} mobile geometry`);
};

const readPageScroll = (page) => page.locator('main').evaluate((main) => main.scrollTop);
const resetPageScroll = async (page) => {
  await page.locator('main').evaluate((main) => { main.scrollTop = 0; });
  await page.waitForTimeout(80);
  return readPageScroll(page);
};
const expectStablePageScroll = async (page, expected, label) => {
  await page.waitForTimeout(220);
  const actual = await readPageScroll(page);
  if (Math.abs(actual - expected) > 1) throw new Error(`${label}: page moved from ${expected}px to ${actual}px.`);
};
const playTapMove = async (page, from, to) => {
  await page.locator(`[data-square="${from}"]`).click();
  await page.locator(`[data-square="${to}"]`).click();
};

try {
  const owner = await signup('MobileOwner');
  const opponent = await signup('MobileOpponent');
  const page = await login(owner);
  const opponentPage = await login(opponent);

  const fixtureChess = new Chess();
  const fixtureMoves = STABILITY_MOVES.map(([from, to]) => {
    const move = fixtureChess.move({ from, to });
    return { from: move.from, to: move.to, san: move.san, promotion: move.promotion || null };
  });
  await adminDb.collection('games').doc(gameId).set({
    gameId, roomId: gameId,
    whitePlayerUid: owner.uid, whitePlayerName: owner.username,
    blackPlayerUid: opponent.uid, blackPlayerName: opponent.username,
    participantUids: [owner.uid, opponent.uid], winnerUid: owner.uid,
    result: '1-0', reason: 'resignation', status: 'completed', gameMode: 'casual', ratingProcessed: false,
    moves: fixtureMoves, moveCount: fixtureMoves.length, initialFen: new Chess().fen(), finalFen: fixtureChess.fen(),
    timeControl: { initialSeconds: 600, incrementSeconds: 0 },
    startedAt: FieldValue.serverTimestamp(), endedAt: FieldValue.serverTimestamp(),
  });

  await page.goto('http://localhost:5173/play');
  await verifyBoardAtWidths(page, 'Local Chess', { players: true });
  await page.locator('[data-square="e2"]').click();
  await page.locator('[data-square="e4"]').click();
  if (await page.locator('[data-square="e2"] [data-piece]').count()) throw new Error('Local Chess source square remained occupied.');
  if (await page.locator('[data-square="e4"] [data-piece="wp"]').count() !== 1) throw new Error('Local Chess tap move failed.');
  await page.locator('[data-square="d7"]').click(); await page.locator('[data-square="d5"]').click();
  await page.locator('[data-square="e4"]').click(); await page.locator('[data-square="d5"]').click();
  await page.setViewportSize({ width: 320, height: HEIGHT });
  const compactCaptureLayout = await page.locator('[data-captured-piece="bp"]').first().evaluate((piece) => {
    const bar = piece.closest('[data-testid="player-info-bar"]');
    const display = bar?.querySelector('[data-testid="captured-material-display"]');
    const profile = bar?.querySelector('[data-testid="player-profile"]');
    const clock = bar?.querySelector('[data-testid="player-clock"]');
    if (!bar || !display || !profile || !clock) return null;
    const rect = (node) => { const value = node.getBoundingClientRect(); return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height }; };
    return { bar: rect(bar), display: rect(display), profile: rect(profile), clock: rect(clock), piece: rect(piece) };
  });
  if (!compactCaptureLayout || compactCaptureLayout.piece.width < 20 || compactCaptureLayout.display.right > compactCaptureLayout.clock.left + 0.5 || compactCaptureLayout.profile.right > compactCaptureLayout.display.left + 0.5 || compactCaptureLayout.bar.right > 320.5) throw new Error(`Captured-piece player bar overlaps at 320px: ${JSON.stringify(compactCaptureLayout)}.`);
  pass('Local Chess mobile tap-to-move');
  pass('Premium captured-piece mobile alignment');

  const movesTab = page.getByRole('tab', { name: /Moves/ });
  if (await movesTab.getAttribute('aria-selected') !== 'true') throw new Error('Moves is not the default mobile tab.');
  await page.getByRole('tab', { name: 'Game Info' }).click();
  await page.getByRole('tab', { name: 'Chat' }).click();
  await page.locator('main').evaluate((main) => { main.scrollTop = main.scrollHeight; });
  await page.waitForTimeout(100);
  const lastControl = await page.getByTitle('New Game').boundingBox();
  const mobileNav = await page.getByTestId('mobile-game-navigation').boundingBox();
  if (!lastControl || !mobileNav || lastControl.y + lastControl.height > mobileNav.y + 1) throw new Error(`Bottom navigation covers the mobile game controls: control=${JSON.stringify(lastControl)} nav=${JSON.stringify(mobileNav)}.`);
  pass('Moves/Game Info/Chat sheet clearance');

  await page.goto('http://localhost:5173/play');
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await page.getByTestId('chessboard').waitFor();
  const localScroll = await resetPageScroll(page);
  for (let index = 0; index < STABILITY_MOVES.length; index += 1) {
    const [from, to] = STABILITY_MOVES[index];
    await playTapMove(page, from, to);
    await page.getByRole('tab', { name: `Moves (${index + 1})` }).waitFor();
    await expectStablePageScroll(page, localScroll, `Local move ${index + 1}`);
  }
  const moveFeedState = await page.getByTestId('move-history-scroll').evaluate((feed) => ({
    scrollTop: feed.scrollTop,
    scrollHeight: feed.scrollHeight,
    clientHeight: feed.clientHeight,
  }));
  if (moveFeedState.scrollHeight <= moveFeedState.clientHeight || moveFeedState.scrollTop <= 0) {
    throw new Error(`Moves history did not scroll independently: ${JSON.stringify(moveFeedState)}.`);
  }
  pass('20-ply Local game keeps page stable and scrolls Moves independently');

  await page.goto('http://localhost:5173/ai');
  await page.getByRole('button', { name: /beginner/i }).click();
  await page.getByRole('button', { name: 'Start Game' }).click();
  await verifyBoardAtWidths(page, 'AI Bot', { players: true });
  await page.setViewportSize({ width: 390, height: HEIGHT });
  const aiScroll = await resetPageScroll(page);
  await page.locator('[data-square="e2"]').click();
  await page.locator('[data-square="e4"]').click();
  await page.getByRole('tab', { name: 'Moves (2)' }).waitFor();
  await expectStablePageScroll(page, aiScroll, 'AI human + engine response');
  pass('AI mobile move response');

  await page.goto('http://localhost:5173/multiplayer');
  await page.getByRole('button', { name: 'Create Game' }).click();
  const roomId = await page.getByText(/^CHESS-/).textContent();
  multiplayerGameId = `${roomId}-1`;
  await opponentPage.goto('http://localhost:5173/multiplayer');
  await opponentPage.getByPlaceholder('CHESS-7F29K').fill(roomId);
  await opponentPage.getByRole('button', { name: 'Join Game' }).click();
  await verifyBoardAtWidths(page, 'Multiplayer / Quick Match board', { players: true });
  await page.setViewportSize({ width: 390, height: HEIGHT });
  await opponentPage.setViewportSize({ width: 390, height: HEIGHT });
  const multiplayerOwnerScroll = await resetPageScroll(page);
  const multiplayerOpponentScroll = await resetPageScroll(opponentPage);
  await page.locator('[data-square="e2"]').click();
  await page.locator('[data-square="e4"]').click();
  await opponentPage.locator('[data-square="e4"] [data-piece="wp"]').waitFor();
  await expectStablePageScroll(page, multiplayerOwnerScroll, 'Multiplayer local move');
  await expectStablePageScroll(opponentPage, multiplayerOpponentScroll, 'Multiplayer opponent move');
  await opponentPage.locator('[data-square="e7"]').click();
  await opponentPage.locator('[data-square="e5"]').click();
  await page.locator('[data-square="e5"] [data-piece="bp"]').waitFor();
  await expectStablePageScroll(page, multiplayerOwnerScroll, 'Multiplayer received response');
  await expectStablePageScroll(opponentPage, multiplayerOpponentScroll, 'Multiplayer sent response');
  pass('Multiplayer synchronization after responsive layout');

  await page.goto(`http://localhost:5173/history/${gameId}`);
  await verifyBoardAtWidths(page, 'Game Replay');
  await page.setViewportSize({ width: 390, height: HEIGHT });
  const replayScroll = await resetPageScroll(page);
  for (let index = 0; index < STABILITY_MOVES.length; index += 1) {
    await page.getByRole('button', { name: 'Next move' }).click();
    await expectStablePageScroll(page, replayScroll, `Replay move ${index + 1}`);
  }
  if (await page.locator('[data-square="d7"] [data-piece="bn"]').count() !== 1) throw new Error('Replay did not reconstruct the final fixture position.');
  await page.getByRole('button', { name: 'Previous move' }).click();
  await expectStablePageScroll(page, replayScroll, 'Replay previous move');
  pass('Replay navigation after responsive layout');

  await page.getByRole('button', { name: 'Analyze Game' }).click();
  await page.getByText('Analysis Ready', { exact: true }).waitFor();
  await page.getByRole('img', { name: 'Engine evaluation graph' }).waitFor();
  await verifyBoardAtWidths(page, 'Game Analysis');
  if (!await page.getByLabel(/Evaluation/).nth(1).isVisible()) throw new Error('Mobile evaluation bar is not visible.');
  await page.setViewportSize({ width: 390, height: HEIGHT });
  const analysisScroll = await resetPageScroll(page);
  await page.locator('[data-move-index="15"]').evaluate((move) => move.click());
  await expectStablePageScroll(page, analysisScroll, 'Analysis move selection');
  pass('Analysis evaluation bar, graph, and cached result');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(100);
  if (await page.getByTestId('mobile-game-navigation').isVisible()) throw new Error('Mobile navigation leaked into desktop layout.');
  const desktopBoard = await page.getByTestId('chessboard').boundingBox();
  if (!desktopBoard || desktopBoard.width > 601 || Math.abs(desktopBoard.width - desktopBoard.height) > 1) throw new Error('Desktop board layout regressed.');
  pass('Desktop layout remains unchanged');

  const meaningfulErrors = consoleErrors.filter((message) => !message.includes('favicon'));
  if (meaningfulErrors.length) throw new Error(`Browser console errors: ${meaningfulErrors.join(' | ')}`);
  pass('Browser console');
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser.close().catch(() => {});
  await Promise.all([
    adminDb.collection('gameAnalyses').doc(gameId).delete().catch(() => {}),
    adminDb.collection('games').doc(gameId).delete().catch(() => {}),
    multiplayerGameId ? adminDb.collection('games').doc(multiplayerGameId).delete().catch(() => {}) : Promise.resolve(),
  ]);
  for (const account of accounts) {
    await adminDb.collection('users').doc(account.uid).delete().catch(() => {});
    await adminAuth.deleteUser(account.uid).catch(() => {});
  }
  manager.close();
  socialManager.close();
  await new Promise((resolve) => io.close(resolve));
  if (server.listening) await new Promise((resolve) => server.close(resolve));
  console.log('Temporary mobile-layout test data cleaned up.');
}


