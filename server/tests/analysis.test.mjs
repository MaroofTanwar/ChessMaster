import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { Chess } from 'chess.js';
import { centipawnLoss, classifyMove, lineToSan } from '../src/analysis/analysisMetrics.js';
import { reconstruct } from '../src/analysis/analysisService.js';

test('centipawn loss respects White and Black perspective', () => {
  const before = { type: 'cp', value: 50 }; const after = { type: 'cp', value: -150 };
  assert.equal(centipawnLoss(before, after, 'w'), 200);
  assert.equal(centipawnLoss(before, after, 'b'), 0);
  assert.equal(classifyMove({ loss: 0, playedUci: 'e7e5', bestUci: 'e7e5' }), 'Best');
  assert.equal(classifyMove({ loss: 250, playedUci: 'f7f6', bestUci: 'e7e5' }), 'Blunder');
});

test('analysis reconstruction handles castling, captures, en passant, and promotion', () => {
  const castleCapture = reconstruct({ moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'O-O', 'axb5'] });
  assert.equal(castleCapture.moves[6].san, 'O-O'); assert.equal(castleCapture.moves[7].san, 'axb5');
  const enPassant = reconstruct({ moves: ['e4', 'a6', 'e5', 'd5', 'exd6'] });
  assert.match(enPassant.moves.at(-1).san, /^exd6/);
  const promotion = reconstruct({ initialFen: 'k7/4P3/8/8/8/8/8/7K w - - 0 1', moves: [{ from: 'e7', to: 'e8', promotion: 'q' }] });
  assert.match(promotion.moves[0].san, /e8=Q/);
});

test('PV coordinates convert to legal SAN', () => {
  assert.deepEqual(lineToSan(new Chess().fen(), ['e2e4', 'e7e5', 'g1f3']), ['e4', 'e5', 'Nf3']);
});

test('Stockfish worker returns normalized evaluations, best moves, and progress', async () => {
  const worker = new Worker(new URL('../src/analysis/stockfishAnalysis.worker.js', import.meta.url));
  try {
    const jobId = 'worker-test'; const positions = [{ fen: new Chess().fen() }];
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Stockfish test timed out')), 20_000);
      worker.on('message', (message) => { if (message.jobId === jobId && message.type === 'complete') { clearTimeout(timer); resolve(message); } if (message.type === 'error') reject(new Error(message.error)); });
      worker.on('error', reject); worker.postMessage({ jobId, positions });
    });
    assert.equal(result.evaluations.length, 1); assert.match(result.evaluations[0].bestMove, /^[a-h][1-8][a-h][1-8][qrbn]?$/); assert.ok(['cp', 'mate'].includes(result.evaluations[0].evaluation.type));
  } finally { await worker.terminate(); }
});
