import { chromium } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// Explicit opt-in: this test creates a temporary account in the configured project.
// It deletes that account afterwards and attempts to remove only its own test profile.
if (process.env.CHESSMASTER_LIVE_TEST !== '1') {
  console.log('Set CHESSMASTER_LIVE_TEST=1 to run the live Firebase/browser verification.');
  process.exit(1);
}
const browser = await chromium.launch({ channel: process.env.CHESSMASTER_BROWSER || 'msedge', headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', () => errors.push('Uncaught browser exception'));
const credentials = { email: 'chessmaster-test-' + randomUUID() + '@example.com', password: randomUUID() + 'aA1!', username: 'IntegrationTest' };
let stage = 'startup';
let testUid;
let profileCreated = false;
const report = (name, value) => console.log(name + ': ' + value);
try {
  await page.goto('http://127.0.0.1:5173/');
  await page.locator('header').waitFor();
  report('Landing page', 'PASS');
  await page.goto('http://127.0.0.1:5173/play');
  await page.waitForURL('**/login');
  report('Protected route redirects', 'PASS');
  await page.goto('http://127.0.0.1:5173/register');
  await page.locator('input[type=text]').fill(credentials.username);
  stage = 'fill auth form';
  await page.locator('input[type=email]').fill(credentials.email);
  await page.locator('input[type=password]').fill(credentials.password);
  await page.getByRole('button', { name: 'Register & Play' }).click();
  try { await page.waitForURL('**/dashboard', { timeout: 45000 }); }
  catch {
    const status = await page.evaluate(async () => {
      const { auth } = await import('/src/config/firebase.js');
      return { signedIn: !!auth?.currentUser };
    });
    report('Registration', status.signedIn ? 'Auth succeeded; profile operation pending' : 'BLOCKED by Firebase service configuration');
    throw new Error('Live registration did not reach dashboard');
  }
  testUid = await page.evaluate(async () => (await import('/src/config/firebase.js')).auth.currentUser?.uid);
  report('Email/password registration', testUid ? 'PASS' : 'FAIL');
  await page.waitForTimeout(1500);
  profileCreated = await page.evaluate(async () => {
    const { auth, db } = await import('/src/config/firebase.js');
    const { getDocFromServer, doc } = await import(performance.getEntriesByType('resource').find((entry) => /\/firebase_firestore\.js\?/.test(entry.name)).name);
    try {
      const snapshot = await getDocFromServer(doc(db, 'users', auth.currentUser.uid));
      if (!snapshot.exists()) return 'missing';
      const p = snapshot.data();
      return p.rating === 1200 && p.gamesPlayed === 0 && p.wins === 0 && p.losses === 0 && p.draws === 0
        && !('password' in p) && !('token' in p) && !!p.createdAt?.toDate;
    } catch (error) { return error.code || 'read-failed'; }
  });
  report('Firestore profile created with defaults/timestamps', profileCreated === true ? 'PASS' : String(profileCreated));
  const profileNotice = await page.locator('[role=alert]').textContent().catch(() => 'none');
  report('Profile notice', profileNotice);
  await page.reload();
  await page.waitForURL('**/dashboard');
  await page.locator('header').waitFor();
  report('Session persists after refresh', 'PASS');
  for (const route of ['dashboard', 'profile', 'history', 'leaderboard', 'settings', 'ai', 'play']) {
    await page.goto('http://127.0.0.1:5173/' + route);
    await page.locator('header').waitFor();
    if (!page.url().endsWith('/' + route)) throw new Error('Route redirected: ' + route);
    report('Route /' + route, 'PASS');
  }
  const squares = page.locator('.grid-cols-8 > div');
  if (await squares.count() !== 64) throw new Error('Chess board missing');
  await squares.nth(52).click(); // e2
  await squares.nth(36).click(); // e4
  await page.getByTitle('Undo Move').waitFor();
  if (await page.getByTitle('Undo Move').isDisabled()) throw new Error('Local move did not register');
  await page.getByTitle('Undo Move').click();
  if (await page.getByTitle('Redo Move').isDisabled()) throw new Error('Undo failed');
  await page.getByTitle('Redo Move').click();
  report('Local chess move/undo/redo and premium board', 'PASS');
  stage = 'open account menu';
  await page.locator('header .relative.inline-block > div').first().click();
  stage = 'click sign out';
  await page.getByText('Sign Out', { exact: true }).click();
  stage = 'wait for logout redirect';
  await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/login');
  await page.goto('http://127.0.0.1:5173/dashboard');
  await page.waitForURL('**/login');
  report('Logout and protected route', 'PASS');
  stage = 'fill auth form';
  await page.locator('input[type=email]').fill(credentials.email);
  await page.locator('input[type=password]').fill('IncorrectPassword123!');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  stage = 'incorrect credentials message';
  await page.getByText('Incorrect email or password.', { exact: true }).first().waitFor();
  report('Incorrect credentials UI', 'PASS');
  await page.locator('input[type=password]').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('**/dashboard', { timeout: 45000 });
  report('Email/password login', 'PASS');
  report('Uncaught browser exceptions', errors.length);
  if (errors.length || profileCreated !== true) process.exitCode = 1;
} catch (error) {
  // Do not print raw browser/network messages, URLs, credentials or token-bearing requests.
  report('Verification incomplete', error.message.startsWith('Live registration') ? error.message : 'A browser assertion failed at ' + stage + ' (' + error.name + ')');
  process.exitCode = 1;
} finally {
  const cleanup = await page.evaluate(async ({ credentials, testUid }) => {
    const { auth, db } = await import('/src/config/firebase.js');
    const { deleteUser, signInWithEmailAndPassword } = await import(performance.getEntriesByType('resource').find((entry) => /\/firebase_auth\.js\?/.test(entry.name)).name);
    const { deleteDoc, doc } = await import(performance.getEntriesByType('resource').find((entry) => /\/firebase_firestore\.js\?/.test(entry.name)).name);
    if (!auth.currentUser && testUid) {
      try { await signInWithEmailAndPassword(auth, credentials.email, credentials.password); } catch { return 'Manual cleanup required for test UID ' + testUid; }
    }
    const user = auth.currentUser;
    if (!user || user.email !== credentials.email) return 'No test account to clean up';
    let leftover = false;
    if (user) {
      try { await deleteDoc(doc(db, 'users', user.uid)); } catch { leftover = true; }
    }
    const uid = user.uid;
    try { await deleteUser(user); }
    catch { return 'Manual cleanup required for test UID ' + uid; }
    return leftover ? 'Auth account removed; profile requires Console deletion: users/' + uid : 'Temporary test account/profile removed';
  }, { credentials, testUid, profileCreated }).catch(() => 'Cleanup verification unavailable');
  report('Cleanup', cleanup);
  await browser.close();
}