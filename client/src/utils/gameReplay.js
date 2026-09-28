import { Chess } from 'chess.js';

export const DEFAULT_INITIAL_FEN = new Chess().fen();

const normalizedMove = (move) => {
  if (typeof move === 'string') return move;
  if (!move || typeof move !== 'object') return null;
  if (typeof move.from === 'string' && typeof move.to === 'string') {
    return { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) };
  }
  return typeof move.san === 'string' ? move.san : null;
};

export function buildReplay(game) {
  const initialFen = typeof game?.initialFen === 'string' && game.initialFen.trim()
    ? game.initialFen
    : DEFAULT_INITIAL_FEN;
  let chess;
  try { chess = new Chess(initialFen); }
  catch { return { positions: [], moves: [], error: 'The saved starting position is invalid.' }; }

  const positions = [{ fen: chess.fen(), lastMove: null }];
  const moves = [];
  for (const storedMove of Array.isArray(game?.moves) ? game.moves : []) {
    const candidate = normalizedMove(storedMove);
    if (!candidate) return { positions, moves, error: 'Replay data is incomplete for this game.' };
    try {
      const applied = chess.move(candidate);
      if (!applied) throw new Error('Illegal move');
      const move = {
        color: applied.color, from: applied.from, to: applied.to, piece: applied.piece,
        captured: applied.captured || null, promotion: applied.promotion || null,
        san: applied.san, flags: applied.flags,
      };
      moves.push(move);
      positions.push({ fen: chess.fen(), lastMove: move });
    } catch {
      return { positions, moves, error: `Replay stopped at move ${moves.length + 1} because its saved data is invalid.` };
    }
  }
  return { positions, moves, error: null };
}
