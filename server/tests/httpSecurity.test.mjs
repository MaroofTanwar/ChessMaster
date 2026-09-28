import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

const { default: app } = await import('../src/app.js');

test('HTTP boundary applies security/CORS headers and bounded request bodies', async (t) => {
  const server = createServer(app);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/api/health`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-frame-options'), 'DENY');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(health.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  const disallowed = await fetch(`${base}/api/health`, { headers: { Origin: 'https://untrusted.example' } });
  assert.equal(disallowed.headers.get('access-control-allow-origin'), null);

  const oversized = await fetch(`${base}/api/ai-move`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(70 * 1024) }),
  });
  assert.equal(oversized.status, 413);
  const body = await oversized.json();
  assert.equal(typeof body.error, 'string');
  assert.doesNotMatch(body.error, /node_modules|[A-Z]:\\/i);
});
