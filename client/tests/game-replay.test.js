import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { buildReplay } from '../src/utils/gameReplay';

const structured = (moves, initialFen) => {
  const chess = new Chess(initialFen);
  return moves.map((move) => {
    const applied = chess.move(move);
    return { from: applied.from, to: applied.to, san: applied.san, promotion: applied.promotion || null };
  });
};

describe('saved game replay', () => {
  it('reconstructs captures and castling exactly', () => {
    const moves = structured([
      { from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' },
      { from: 'g1', to: 'f3' }, { from: 'b8', to: 'c6' },
      { from: 'f1', to: 'c4' }, { from: 'g8', to: 'f6' },
      { from: 'e1', to: 'g1' }, { from: 'f6', to: 'e4' },
    ]);
    const replay = buildReplay({ moves });
    expect(replay.error).toBeNull();
    expect(replay.positions).toHaveLength(9);
    expect(replay.moves[6].san).toBe('O-O');
    expect(replay.moves[7].captured).toBe('p');
  });

  it('reconstructs en passant', () => {
    const moves = structured([
      { from: 'e2', to: 'e4' }, { from: 'a7', to: 'a6' },
      { from: 'e4', to: 'e5' }, { from: 'd7', to: 'd5' },
      { from: 'e5', to: 'd6' },
    ]);
    const replay = buildReplay({ moves });
    expect(replay.error).toBeNull();
    expect(replay.moves.at(-1).flags).toContain('e');
  });

  it('reconstructs promotion from a saved initial FEN', () => {
    const initialFen = 'k7/4P3/8/8/8/8/8/7K w - - 0 1';
    const moves = structured([{ from: 'e7', to: 'e8', promotion: 'q' }], initialFen);
    const replay = buildReplay({ initialFen, moves });
    expect(replay.error).toBeNull();
    expect(replay.moves[0].promotion).toBe('q');
    expect(new Chess(replay.positions[1].fen).get('e8')?.type).toBe('q');
  });

  it('returns the valid prefix and a readable error for corrupt data', () => {
    const replay = buildReplay({ moves: [{ from: 'e2', to: 'e4' }, { from: 'e2', to: 'e5' }] });
    expect(replay.moves).toHaveLength(1);
    expect(replay.error).toContain('move 2');
  });
});
