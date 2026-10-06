import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Chess } from 'chess.js';
import { AI_DIFFICULTY_ORDER, AI_REQUEST_TIMEOUT_MS, AI_SEARCH_SETTINGS } from '../src/ai/aiConfig.js';
import { closeAIEngine, createAIEngineService, requestAIMove } from '../src/ai/aiEngineService.js';
import { createAIMoveCoordinator } from '../src/ai/aiMoveCoordinator.js';
import { selectEngineMove } from '../src/ai/engineMoveSelection.js';

test('all five levels have distinct, progressively stronger production configurations', () => {
  assert.deepEqual(Object.keys(AI_SEARCH_SETTINGS), AI_DIFFICULTY_ORDER);
  const signatures = AI_DIFFICULTY_ORDER.map((name) => JSON.stringify(AI_SEARCH_SETTINGS[name]));
  assert.equal(new Set(signatures).size, AI_DIFFICULTY_ORDER.length);
  for (let index = 1; index < AI_DIFFICULTY_ORDER.length; index += 1) {
    const previous = AI_SEARCH_SETTINGS[AI_DIFFICULTY_ORDER[index - 1]];
    const current = AI_SEARCH_SETTINGS[AI_DIFFICULTY_ORDER[index]];
    assert.ok(current.skill > previous.skill);
    assert.ok(current.moveTime > previous.moveTime);
  }
  assert.equal(AI_SEARCH_SETTINGS.Beginner.limitStrength, true);
  assert.equal(AI_SEARCH_SETTINGS.Beginner.multiPv, 8);
  assert.ok(AI_SEARCH_SETTINGS.Beginner.randomLegalMoveChance > AI_SEARCH_SETTINGS.Easy.randomLegalMoveChance);
  assert.equal(AI_SEARCH_SETTINGS.Expert.limitStrength, false);
  assert.equal(AI_SEARCH_SETTINGS.Expert.skill, 20);
  assert.ok(AI_REQUEST_TIMEOUT_MS > AI_SEARCH_SETTINGS.Expert.moveTime * 5);
});

test('lower levels select varied legal moves while stronger levels keep the engine preference', () => {
  const position = new Chess(); position.move('e4'); const fen = position.fen();
  const candidates = new Map([[1, 'e7e5'], [2, 'c7c5'], [3, 'e7e6'], [4, 'b8c6']]);
  const beginner = selectEngineMove({ fen, bestMove: 'e7e5', candidates, setting: AI_SEARCH_SETTINGS.Beginner }, (() => { const values = [0.1, 0.99]; return () => values.shift(); })());
  const expert = selectEngineMove({ fen, bestMove: 'e7e5', candidates, setting: AI_SEARCH_SETTINGS.Expert }, () => 0);
  assert.ok(new Chess(fen).move(beginner));
  assert.deepEqual(expert, { from: 'e7', to: 'e5' });
  assert.notDeepEqual(beginner, expert);
});

test('Stockfish worker returns repeated legal moves for every level', async (t) => {
  t.after(() => closeAIEngine());
  for (const difficulty of AI_DIFFICULTY_ORDER) {
    const game = new Chess();
    for (let turn = 0; turn < 3; turn += 1) {
      game.move(game.moves({ verbose: true })[0]);
      const move = await requestAIMove(game.fen(), difficulty);
      const applied = game.move(move);
      assert.equal(applied.color, 'b', `${difficulty} returned a legal Black move on turn ${turn + 1}`);
    }
  }
});

test('Stockfish handles a ten-ply game without stale or illegal responses', async (t) => {
  t.after(() => closeAIEngine()); const game = new Chess();
  for (let turn = 0; turn < 5; turn += 1) {
    const human = game.moves({ verbose: true })[0]; game.move(human);
    const ai = await requestAIMove(game.fen(), 'Expert'); const applied = game.move(ai);
    assert.equal(applied.color, 'b'); assert.equal(game.history().length, (turn + 1) * 2);
  }
});

test('timed-out engine work is terminated and a later request can start cleanly', async () => {
  class FakeWorker extends EventEmitter {
    static instances = [];
    constructor() { super(); this.ordinal = FakeWorker.instances.push(this); this.terminated = false; }
    postMessage(message) {
      if (message.type === 'shutdown' || this.ordinal === 1) return;
      queueMicrotask(() => this.emit('message', { id: message.id, move: { from: 'e7', to: 'e5' } }));
    }
    terminate() { this.terminated = true; return Promise.resolve(); }
    unref() {}
  }
  const service = createAIEngineService({ WorkerConstructor: FakeWorker, requestTimeoutMs: 20 });
  await assert.rejects(service.requestAIMove(new Chess().fen(), 'Beginner'), /timed out/i);
  assert.equal(FakeWorker.instances[0].terminated, true);
  assert.deepEqual(await service.requestAIMove(new Chess().fen(), 'Easy'), { from: 'e7', to: 'e5' });
  service.close();
});

test('duplicate client retries share one engine calculation', async () => {
  let calculations = 0;
  let release;
  const calculate = () => { calculations += 1; return new Promise((resolve) => { release = resolve; }); };
  const coordinator = createAIMoveCoordinator({ calculate });
  const request = { uid: 'user-a', requestId: 'request_12345', fen: new Chess().fen(), difficulty: 'Medium' };
  const first = coordinator.run(request);
  const retry = coordinator.run(request);
  await Promise.resolve();
  assert.equal(calculations, 1);
  release({ from: 'e2', to: 'e4' });
  assert.deepEqual(await first, await retry);
  assert.throws(() => coordinator.run({ ...request, difficulty: 'Hard' }), /cannot be reused/i);
});
