import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { AI_SETTINGS, chooseAIMove } from '../src/utils/aiEngineCore';

const expectLegal = (fen, difficulty) => {
  const chess = new Chess(fen);
  const move = chooseAIMove(fen, difficulty, () => 0);
  expect(move).toBeTruthy();
  expect(() => chess.move(move)).not.toThrow();
};

describe('AI engine', () => {
  it('defines five meaningfully increasing search levels', () => {
    expect(Object.keys(AI_SETTINGS)).toEqual(['Beginner', 'Easy', 'Medium', 'Hard', 'Expert']);
    expect(AI_SETTINGS.Expert.depth).toBeGreaterThan(AI_SETTINGS.Medium.depth);
  });

  it('returns legal moves at beginner, medium, and hard levels', () => {
    const fen = new Chess().fen();
    for (const level of ['Beginner', 'Medium', 'Hard']) expectLegal(fen, level);
  });

  it('returns a legal promotion from a promotion position', () => {
    const fen = '7k/P7/8/8/8/8/8/K7 w - - 0 1';
    const move = chooseAIMove(fen, 'Medium', () => 0);
    expect(move.from).toBe('a7');
    expect(move.to).toBe('a8');
    expect(['q', 'r', 'b', 'n']).toContain(move.promotion);
  });
});
