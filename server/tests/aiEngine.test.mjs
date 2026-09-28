import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { AI_SEARCH_SETTINGS } from '../src/ai/aiConfig.js';
import { closeAIEngine, requestAIMove } from '../src/ai/aiEngineService.js';

test('AI levels increase Stockfish skill and search time without fabricated Elo values', () => {
  assert.deepEqual(Object.keys(AI_SEARCH_SETTINGS), ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert']);
  assert.ok(AI_SEARCH_SETTINGS.Expert.skill > AI_SEARCH_SETTINGS.Medium.skill);
  assert.ok(AI_SEARCH_SETTINGS.Expert.moveTime > AI_SEARCH_SETTINGS.Medium.moveTime);
});

test('Stockfish worker returns legal Black moves after e4 for every level', async (t) => {
  t.after(() => closeAIEngine());
  const position = new Chess(); position.move('e4'); const fen = position.fen();
  for (const difficulty of Object.keys(AI_SEARCH_SETTINGS)) {
    const move = await requestAIMove(fen, difficulty); const chess = new Chess(fen);
    const applied = chess.move(move); assert.equal(applied.color, 'b', `${difficulty} returned a legal Black move`);
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
