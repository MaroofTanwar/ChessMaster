import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import dotenv from 'dotenv';
import playwright from '../../client/node_modules/playwright-core/index.js';
import app from '../src/app.js';
import { createSocketServer } from '../src/socket/index.js';
import { adminAuth, adminDb } from '../src/config/firebaseAdmin.js';
import { Chess } from 'chess.js';

dotenv.config({ path: '../client/.env' });
if (process.env.CHESSMASTER_LIVE_AI_TEST !== '1') process.exit(1);
const apiKey = process.env.VITE_FIREBASE_API_KEY;
const account = { email: `chessmaster-ai-${randomUUID()}@example.com`, password: `${randomUUID()}Aa1!`, name: 'AI Tester' };
let uid, gameId;
const port = Number(process.env.AI_TEST_PORT || 5000);
const apiBaseUrl = `http://localhost:${port}`;
const server = createServer(app);
const { io, manager } = createSocketServer(server);
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, 'localhost', resolve); });
const browser = await playwright.chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(20000);
page.on('pageerror', (error) => console.log(`[PAGE ERROR] ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') console.log(`[BROWSER ERROR] ${message.text()}`); });
const report = (label) => console.log(`${label}: PASS`);
try {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: account.email, password: account.password, displayName: account.name, returnSecureToken: true }) });
  const signup = await response.json(); uid = signup.localId;
  const afterE4 = new Chess(); afterE4.move('e4');
  for (const difficulty of ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert']) {
    const aiResponse = await fetch(`${apiBaseUrl}/api/ai-move`, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${signup.idToken}` }, body: JSON.stringify({ fen: afterE4.fen(), difficulty, requestId: `live_${difficulty.toLowerCase()}_${randomUUID()}` }) });
    const payload = await aiResponse.json(); if (!aiResponse.ok) throw new Error(`${difficulty} /api/ai-move failed: ${payload.error}`);
    const validation = new Chess(afterE4.fen()).move(payload.move); if (validation.color !== 'b') throw new Error(`${difficulty} returned an invalid move.`);
  }
  report('Authenticated /api/ai-move returns legal replies after e4 for all levels');
  await page.goto('http://localhost:5173/login');
  await page.locator('input[type=email]').fill(account.email); await page.locator('input[type=password]').fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click(); await page.waitForURL('**/dashboard');
  const before = await adminDb.collection('users').doc(uid).get();

  let simulatedColdStartFailures = 0;
  await page.route('**/api/health', async (route) => {
    if (simulatedColdStartFailures === 0) {
      simulatedColdStartFailures += 1;
      await route.abort('connectionrefused');
      return;
    }
    await route.continue();
  });
  await page.goto('http://localhost:5173/ai');
  await page.getByText('Connecting to ChessMaster AI…', { exact: true }).waitFor();
  await page.getByRole('button', { name: /beginner/i }).click();
  await page.getByRole('button', { name: /black/i }).click();
  await page.getByRole('button', { name: 'Start Game' }).click();
  await page.getByText('You play Black', { exact: false }).waitFor();
  if (simulatedColdStartFailures !== 1) throw new Error('The production-style cold-start failure was not exercised exactly once.');
  report('First health failure shows wake-up state and recovers without a raw network error');
  await page.getByText('AI is thinking…', { exact: true }).waitFor();
  try { await page.getByText('Move 1', { exact: false }).waitFor(); }
  catch (error) { console.log(`[AI PAGE] ${await page.locator('body').innerText()}`); throw error; }
  report('Beginner as Black makes automatic first AI move');
  await page.getByTitle('New Game').click();

  await page.getByRole('button', { name: /random/i }).click(); await page.getByRole('button', { name: 'Start Game' }).click();
  await page.getByText(/You play (White|Black)/).waitFor();
  await page.getByTitle('New Game').click();
  report('Random color resolves once and New Game cancels prior engine work');

  await page.getByRole('button', { name: /white/i }).click(); await page.getByRole('button', { name: /beginner/i }).click(); await page.getByRole('button', { name: 'Start Game' }).click();
  await page.locator('[data-square="e2"]').click(); await page.locator('[data-square="e4"]').click();
  await page.getByText('AI is thinking…', { exact: true }).waitFor(); await page.getByText('Move 2', { exact: false }).waitFor();
  const undo = page.getByTitle('Undo Move'); const redo = page.getByTitle('Redo Move');
  if (await undo.isDisabled()) throw new Error('Undo stayed disabled after a completed AI turn.');
  await undo.click(); await page.getByText('Move 0', { exact: false }).waitFor();
  if (await redo.isDisabled()) throw new Error('Redo stayed disabled after undo.');
  await redo.click(); await page.getByText('Move 2', { exact: false }).waitFor();
  report('Turn-based Undo and exact Redo restore a completed human/AI turn');

  await undo.click(); await page.getByText('Move 0', { exact: false }).waitFor();
  await page.locator('[data-square="d2"]').click(); await page.locator('[data-square="d4"]').click();
  await page.getByText('Move 2', { exact: false }).waitFor();
  if (!await redo.isDisabled()) throw new Error('Redo was not cleared after a new branch.');
  report('New human branch clears Redo history');

  await page.getByTitle('New Game').click();
  await page.getByRole('button', { name: /expert/i }).click(); await page.getByRole('button', { name: /white/i }).click(); await page.getByRole('button', { name: 'Start Game' }).click();
  await page.locator('[data-square="e2"]').click(); await page.locator('[data-square="e4"]').click();
  await page.waitForFunction(() => !document.querySelector('[title="Undo Move"]')?.disabled);
  await page.getByTitle('Undo Move').click();
  await page.getByText('Move 0', { exact: false }).waitFor(); await page.waitForTimeout(1000);
  await page.getByText('Move 0', { exact: false }).waitFor();
  report('Undo during AI thinking cancels and invalidates the stale response');

  await page.getByTitle('New Game').click();
  await page.getByRole('button', { name: /beginner/i }).click(); await page.getByRole('button', { name: /black/i }).click(); await page.getByRole('button', { name: 'Start Game' }).click();
  await page.getByText('Move 1', { exact: false }).waitFor();
  if (!await page.getByTitle('Undo Move').isDisabled()) throw new Error('Opening AI move incorrectly created a Black decision undo.');
  await page.locator('[data-square="e7"]').click(); await page.locator('[data-square="e5"]').click(); await page.getByText('Move 3', { exact: false }).waitFor();
  await page.getByTitle('Undo Move').click(); await page.getByText('Move 1', { exact: false }).waitFor();
  await page.getByTitle('Redo Move').click(); await page.getByText('Move 3', { exact: false }).waitFor();
  report('Human-as-Black Undo/Redo returns to the prior Black decision point');

  await page.getByTitle('New Game').click();
  await page.getByRole('button', { name: /beginner/i }).click(); await page.getByRole('button', { name: /white/i }).click(); await page.getByRole('button', { name: 'Start Game' }).click();
  await page.locator('[data-square="e2"]').click(); await page.locator('[data-square="e4"]').click(); await page.getByText('Move 2', { exact: false }).waitFor();
  await page.getByTitle('Resign Match').click(); await page.getByText('AI Won', { exact: false }).waitFor();
  report('Human move, worker response, thinking state, and resignation');

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const games = await adminDb.collection('games').where('humanUid', '==', uid).get();
    if (!games.empty) { gameId = games.docs[0].id; break; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!gameId) throw new Error('AI game document was not created.');
  const saved = await adminDb.collection('games').doc(gameId).get();
  const after = await adminDb.collection('users').doc(uid).get();
  if (saved.data().gameType !== 'ai' || saved.data().ratingProcessed !== false || saved.data().moves.length !== 2) throw new Error('AI persistence invalid.');
  if (after.data().rating !== before.data().rating || after.data().gamesPlayed !== before.data().gamesPlayed) throw new Error('AI game changed ranked stats.');
  report('AI persistence and Elo/stat isolation');

  await page.goto('http://localhost:5173/history');
  await page.getByText('AI · Beginner', { exact: true }).waitFor();
  await page.getByTestId('history-game').first().click();
  await page.getByText('AI · Beginner', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Next move' }).click();
  report('AI History and shared replay integration');

  await page.goto('http://localhost:5173/ai');
  await page.getByRole('button', { name: /expert/i }).click(); await page.getByRole('button', { name: /black/i }).click(); await page.getByRole('button', { name: 'Start Game' }).click();
  await page.getByText('AI is thinking…', { exact: true }).waitFor();
  await page.goto('http://localhost:5173/dashboard');
  await page.waitForTimeout(1500);
  await page.getByText('Welcome Back', { exact: false }).waitFor();
  report('Navigation during Expert calculation leaves no stale UI callback');
} finally {
  if (gameId) await adminDb.collection('games').doc(gameId).delete().catch(() => {});
  if (uid) { await adminDb.collection('users').doc(uid).delete().catch(() => {}); await adminAuth.deleteUser(uid).catch(() => {}); }
  manager.close(); await new Promise((resolve) => io.close(resolve)); if (server.listening) await new Promise((resolve) => server.close(resolve));
  await browser.close(); console.log('Temporary AI test account and game cleaned up.');
}
