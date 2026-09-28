import test from 'node:test';
import assert from 'node:assert/strict';
import { clearRateLimitsForTests, createRateLimiter, securityHeaders } from '../src/middleware/security.js';
import { isFenInput, isRoomId, isSafeId, isSquare } from '../src/utils/validation.js';
import { assertSocketRate } from '../src/socket/rateLimit.js';

const response = () => ({
  headers: {}, statusCode: 200, body: null,
  set(name, value) { if (typeof name === 'object') Object.assign(this.headers, name); else this.headers[name] = value; return this; },
  status(value) { this.statusCode = value; return this; },
  json(value) { this.body = value; return this; },
});

test('request security headers prevent framing and content sniffing', () => {
  const res = response(); let called = false;
  securityHeaders({}, res, () => { called = true; });
  assert.equal(called, true);
  assert.equal(res.headers['X-Frame-Options'], 'DENY');
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.match(res.headers['Permissions-Policy'], /camera=\(\)/);
});

test('REST limiter is scoped by authenticated UID and returns retry metadata', () => {
  clearRateLimitsForTests();
  const limiter = createRateLimiter({ name: 'test', windowMs: 60_000, max: 2 });
  const call = (uid) => { const res = response(); let passed = false; limiter({ firebaseUser: { uid } }, res, () => { passed = true; }); return { res, passed }; };
  assert.equal(call('alpha').passed, true);
  assert.equal(call('alpha').passed, true);
  const blocked = call('alpha'); assert.equal(blocked.passed, false); assert.equal(blocked.res.statusCode, 429); assert.ok(blocked.res.headers['Retry-After']);
  assert.equal(call('beta').passed, true);
});

test('socket limiter blocks only the guarded event after its allowance', () => {
  const socket = {};
  assert.doesNotThrow(() => assertSocketRate(socket, 'chat', { max: 2, windowMs: 60_000 }));
  assert.doesNotThrow(() => assertSocketRate(socket, 'chat', { max: 2, windowMs: 60_000 }));
  assert.throws(() => assertSocketRate(socket, 'chat', { max: 2, windowMs: 60_000 }), { code: 'RATE_LIMITED' });
  assert.doesNotThrow(() => assertSocketRate(socket, 'move', { max: 1, windowMs: 60_000 }));
});

test('external identifiers, room codes, squares, and FEN payload sizes are bounded', () => {
  assert.equal(isSafeId('valid_uid-123'), true);
  assert.equal(isSafeId('../users/admin'), false);
  assert.equal(isRoomId('chess-ab2cd'), true);
  assert.equal(isRoomId('CHESS-OOOOO'), false);
  assert.equal(isSquare('E2'), true);
  assert.equal(isSquare('e9'), false);
  assert.equal(isFenInput('8/8/8/8/8/8/8/K6k w - - 0 1'), true);
  assert.equal(isFenInput('x'.repeat(257)), false);
});
