import { Chess } from 'chess.js';

const parseUci = (uci) => uci && uci !== '(none)' ? {
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  ...(uci[4] ? { promotion: uci[4] } : {}),
} : null;

const toUci = (move) => `${move.from}${move.to}${move.promotion || ''}`;

const weightedIndex = (weights, random) => {
  const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0);
  if (total <= 0) return 0;
  let cursor = random() * total;
  for (let index = 0; index < weights.length; index += 1) {
    cursor -= Math.max(0, weights[index]);
    if (cursor <= 0) return index;
  }
  return weights.length - 1;
};

export function selectEngineMove({ fen, bestMove, candidates, setting }, random = Math.random) {
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true }).map((move) => ({
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion } : {}),
  }));
  if (!legalMoves.length) return null;
  const legalByUci = new Map(legalMoves.map((move) => [toUci(move), move]));

  if (setting.randomLegalMoveChance > 0 && random() < setting.randomLegalMoveChance) {
    return legalMoves[Math.min(legalMoves.length - 1, Math.floor(random() * legalMoves.length))];
  }

  const ranked = [...candidates.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, uci]) => legalByUci.get(uci))
    .filter(Boolean);
  const parsedBest = parseUci(bestMove);
  const legalBest = parsedBest ? legalByUci.get(toUci(parsedBest)) : null;
  if (legalBest && !ranked.some((move) => toUci(move) === toUci(legalBest))) ranked.unshift(legalBest);
  if (!ranked.length) return legalBest || null;

  const index = weightedIndex(setting.candidateWeights.slice(0, ranked.length), random);
  return ranked[Math.min(index, ranked.length - 1)];
}

export { parseUci };
