import { Chess } from 'chess.js';
import { CLASSIFICATION_THRESHOLDS, PV_LENGTH } from './analysisConfig.js';

export const numericEvaluation = (evaluation) => evaluation?.type === 'mate'
  ? Math.sign(evaluation.value || 1) * (10_000 - Math.min(100, Math.abs(evaluation.value || 0)))
  : Number(evaluation?.value || 0);

export const centipawnLoss = (before, after, mover) => Math.max(0, Math.round(
  mover === 'w' ? numericEvaluation(before) - numericEvaluation(after) : numericEvaluation(after) - numericEvaluation(before),
));

export function classifyMove({ loss, playedUci, bestUci }) {
  if (playedUci && bestUci && playedUci === bestUci) return 'Best';
  if (loss <= CLASSIFICATION_THRESHOLDS.excellent) return 'Excellent';
  if (loss <= CLASSIFICATION_THRESHOLDS.good) return 'Good';
  if (loss <= CLASSIFICATION_THRESHOLDS.inaccuracy) return 'Inaccuracy';
  if (loss <= CLASSIFICATION_THRESHOLDS.mistake) return 'Mistake';
  return 'Blunder';
}

const uciMove = (value) => value?.length >= 4 ? { from: value.slice(0, 2), to: value.slice(2, 4), ...(value[4] ? { promotion: value[4] } : {}) } : null;

export function lineToSan(fen, line = []) {
  const chess = new Chess(fen); const result = [];
  for (const uci of line.slice(0, PV_LENGTH)) {
    try { const move = chess.move(uciMove(uci)); if (!move) break; result.push(move.san); } catch { break; }
  }
  return result;
}

export const accuracyFor = (moves) => {
  if (!moves.length) return 0;
  const value = moves.reduce((sum, move) => sum + (100 / (1 + move.centipawnLoss / 100)), 0) / moves.length;
  return Math.round(value * 10) / 10;
};

export function summarize(moves) {
  const side = (color) => {
    const own = moves.filter((move) => move.color === color);
    const counts = { Best: 0, Excellent: 0, Good: 0, Inaccuracy: 0, Mistake: 0, Blunder: 0 };
    for (const move of own) counts[move.classification] += 1;
    return { accuracy: accuracyFor(own), ...counts };
  };
  return { white: side('w'), black: side('b') };
}

