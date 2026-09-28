import { Chess } from 'chess.js';

const VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
export const AI_SETTINGS = {
  Beginner: { depth: 1, variety: 5, delay: 350 }, Easy: { depth: 1, variety: 3, delay: 450 },
  Medium: { depth: 2, variety: 2, delay: 550 }, Hard: { depth: 3, variety: 1, delay: 650 }, Expert: { depth: 4, variety: 1, delay: 750 },
};
const moveData = (move) => ({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
const evaluate = (game, color) => {
  if (game.isCheckmate()) return game.turn() === color ? -100000 : 100000;
  if (game.isDraw()) return 0;
  let score = 0;
  for (const row of game.board()) for (const piece of row) if (piece) score += (piece.color === color ? 1 : -1) * VALUES[piece.type];
  return score;
};
const ordered = (game) => game.moves({ verbose: true }).sort((a, b) => Number(Boolean(b.captured)) - Number(Boolean(a.captured)));
const search = (game, depth, alpha, beta, color) => {
  if (depth === 0 || game.isGameOver()) return evaluate(game, color);
  const maximizing = game.turn() === color;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of ordered(game)) {
    game.move(moveData(move));
    const score = search(game, depth - 1, alpha, beta, color);
    game.undo();
    if (maximizing) { best = Math.max(best, score); alpha = Math.max(alpha, score); }
    else { best = Math.min(best, score); beta = Math.min(beta, score); }
    if (beta <= alpha) break;
  }
  return best;
};
export function chooseAIMove(fen, difficulty = 'Medium', random = Math.random) {
  const game = new Chess(fen);
  const settings = AI_SETTINGS[difficulty] || AI_SETTINGS.Medium;
  const color = game.turn();
  const scored = ordered(game).map((move) => { game.move(moveData(move)); const score = search(game, settings.depth - 1, -Infinity, Infinity, color); game.undo(); return { move: moveData(move), score }; }).sort((a, b) => b.score - a.score);
  const candidates = scored.slice(0, Math.min(settings.variety, scored.length));
  return candidates[Math.floor(random() * candidates.length)]?.move || null;
}
