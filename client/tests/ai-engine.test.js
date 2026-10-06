import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { AI_SETTINGS, chooseAIMove } from '../src/utils/aiEngineCore';
import { AI_DIFFICULTIES, AI_DIFFICULTY_ORDER } from '../src/config/aiDifficulty';

const expectLegal = (fen, difficulty) => {
  const chess = new Chess(fen);
  const move = chooseAIMove(fen, difficulty, () => 0);
  expect(move).toBeTruthy();
  expect(() => chess.move(move)).not.toThrow();
};

describe('AI engine', () => {
  it('uses one distinct production configuration for all five levels', () => {
    expect(Object.keys(AI_DIFFICULTIES)).toEqual(AI_DIFFICULTY_ORDER);
    expect(new Set(AI_DIFFICULTY_ORDER.map((name) => JSON.stringify(AI_DIFFICULTIES[name]))).size).toBe(5);
    expect(AI_DIFFICULTIES.Beginner.randomLegalMoveChance).toBeGreaterThan(AI_DIFFICULTIES.Easy.randomLegalMoveChance);
    expect(AI_DIFFICULTIES.Easy.uciElo).toBeLessThan(AI_DIFFICULTIES.Medium.uciElo);
    expect(AI_DIFFICULTIES.Medium.uciElo).toBeLessThan(AI_DIFFICULTIES.Hard.uciElo);
    expect(AI_DIFFICULTIES.Expert.limitStrength).toBe(false);
    expect(AI_DIFFICULTIES.Expert.moveTime).toBeGreaterThan(AI_DIFFICULTIES.Hard.moveTime);
    expect(Object.keys(AI_SETTINGS)).toEqual(AI_DIFFICULTY_ORDER);
  });

  it('returns legal fallback moves at every level', () => {
    const fen = '7k/8/8/8/8/8/6P1/7K w - - 0 1';
    for (const level of AI_DIFFICULTY_ORDER) expectLegal(fen, level);
  });

  it('returns a legal promotion from a promotion position', () => {
    const fen = '7k/P7/8/8/8/8/8/K7 w - - 0 1';
    const move = chooseAIMove(fen, 'Medium', () => 0);
    expect(move.from).toBe('a7');
    expect(move.to).toBe('a8');
    expect(['q', 'r', 'b', 'n']).toContain(move.promotion);
  });
});
