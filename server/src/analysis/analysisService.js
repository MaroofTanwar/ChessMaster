import { randomUUID } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { FieldValue } from 'firebase-admin/firestore';
import { Chess } from 'chess.js';
import { ANALYSIS_DEPTH, ANALYSIS_VERSION, ENGINE_ID, MAX_CONCURRENT_ANALYSES } from './analysisConfig.js';
import { centipawnLoss, classifyMove, lineToSan, summarize } from './analysisMetrics.js';

const jobs = new Map();
const activeByGame = new Map();
const initialFen = new Chess().fen();
const retire = (jobId) => { const timer = setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000); timer.unref?.(); };
const moveInput = (move) => typeof move === 'string' ? move : move?.from && move?.to ? { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) } : move?.san;

export function reconstruct(game) {
  const chess = new Chess(game.initialFen || initialFen);
  const positions = [{ fen: chess.fen() }]; const moves = [];
  for (const saved of Array.isArray(game.moves) ? game.moves : []) {
    const applied = chess.move(moveInput(saved));
    if (!applied) throw new Error('This game cannot be analyzed because complete move data is unavailable.');
    moves.push({ color: applied.color, from: applied.from, to: applied.to, promotion: applied.promotion || null, san: applied.san, uci: `${applied.from}${applied.to}${applied.promotion || ''}` });
    positions.push({ fen: chess.fen() });
  }
  if (!moves.length) throw new Error('This game cannot be analyzed because complete move data is unavailable.');
  return { positions, moves };
}

const participant = (game, uid) => game.whitePlayerUid === uid || game.blackPlayerUid === uid;
export async function getCachedAnalysis(db, gameId, uid) {
  const game = await db.collection('games').doc(gameId).get();
  if (!game.exists || !participant(game.data(), uid)) return null;
  const cached = await db.collection('gameAnalyses').doc(gameId).get();
  if (!cached.exists || cached.data().analysisVersion !== ANALYSIS_VERSION) return null;
  return cached.data();
}

export async function startAnalysis(db, gameId, uid) {
  const cached = await getCachedAnalysis(db, gameId, uid);
  if (cached) return { cached: true, analysis: cached };
  const existingId = activeByGame.get(gameId);
  if (existingId && jobs.get(existingId)?.uid === uid) return { cached: false, jobId: existingId };
  if (activeByGame.size >= MAX_CONCURRENT_ANALYSES) throw Object.assign(new Error('Analysis capacity is busy. Please retry shortly.'), { status: 429 });
  const snap = await db.collection('games').doc(gameId).get();
  if (!snap.exists || !participant(snap.data(), uid)) throw Object.assign(new Error('Game not found or access denied.'), { status: 404 });
  const game = snap.data();
  if (!['finished', 'completed'].includes(game.status)) throw Object.assign(new Error('Only completed games can be analyzed.'), { status: 400 });
  let replay;
  try { replay = reconstruct(game); } catch (error) { throw Object.assign(error, { status: 400 }); }
  const jobId = randomUUID();
  const worker = new Worker(new URL('./stockfishAnalysis.worker.js', import.meta.url));
  const job = { jobId, gameId, uid, status: 'running', completed: 0, total: replay.positions.length, worker, error: null };
  jobs.set(jobId, job); activeByGame.set(gameId, jobId);
  worker.on('message', async (message) => {
    if (message.jobId !== jobId) return;
    if (message.type === 'progress') { job.completed = message.completed; return; }
    if (message.type === 'error') { job.status = 'error'; job.error = 'Analysis engine could not complete this game.'; activeByGame.delete(gameId); retire(jobId); console.error('[Analysis worker]', { gameId, message: message.error || 'Unknown worker error' }); await worker.terminate(); return; }
    if (message.type === 'complete') {
      try {
        const moves = replay.moves.map((move, index) => {
          const before = message.evaluations[index]; const after = message.evaluations[index + 1];
          const loss = centipawnLoss(before.evaluation, after.evaluation, move.color);
          return { ...move, evaluationBefore: before.evaluation, evaluationAfter: after.evaluation, centipawnLoss: loss, classification: classifyMove({ loss, playedUci: move.uci, bestUci: before.bestMove }), bestMove: before.bestMove, bestMoveSan: lineToSan(replay.positions[index].fen, [before.bestMove])[0] || null, bestLine: lineToSan(replay.positions[index].fen, before.pv), evaluationAfterBest: before.evaluation };
        });
        const analysis = { gameId, analysisVersion: ANALYSIS_VERSION, engine: ENGINE_ID, depth: ANALYSIS_DEPTH, positions: message.evaluations.map((item, index) => ({ ply: index, evaluation: item.evaluation, bestMove: item.bestMove, bestLine: lineToSan(replay.positions[index].fen, item.pv) })), moves, summary: summarize(moves), createdAt: FieldValue.serverTimestamp() };
        const analysisRef = db.collection('gameAnalyses').doc(gameId);
        await analysisRef.set(analysis);
        job.status = 'complete'; job.analysis = (await analysisRef.get()).data(); job.completed = job.total;
      } catch (error) { job.status = 'error'; job.error = 'Analysis results could not be saved.'; console.error('[Analysis persistence]', { gameId, message: error.message }); }
      activeByGame.delete(gameId); await worker.terminate();
      retire(jobId);
    }
  });
  worker.on('error', (error) => { job.status = 'error'; job.error = 'Analysis engine could not complete this game.'; activeByGame.delete(gameId); retire(jobId); console.error('[Analysis worker]', { gameId, message: error.message }); void worker.terminate(); });
  worker.postMessage({ jobId, positions: replay.positions });
  return { cached: false, jobId };
}

export function getJob(jobId, uid) {
  const job = jobs.get(jobId);
  if (!job || job.uid !== uid) return null;
  return { jobId, gameId: job.gameId, status: job.status, completed: job.completed, total: job.total, error: job.error, ...(job.status === 'complete' ? { analysis: job.analysis } : {}) };
}

export async function cancelJob(jobId, uid) {
  const job = jobs.get(jobId);
  if (!job || job.uid !== uid || job.status !== 'running') return false;
  job.status = 'cancelled'; job.error = 'Analysis cancelled.'; activeByGame.delete(job.gameId); retire(jobId); job.worker.postMessage({ type: 'cancel' }); await new Promise((resolve) => setTimeout(resolve, 50)); await job.worker.terminate(); return true;
}

export async function closeAnalysisService() {
  const running = [...jobs.values()].filter((job) => job.status === 'running');
  for (const job of running) {
    job.status = 'cancelled';
    job.error = 'Analysis cancelled because the server is stopping.';
    job.worker.postMessage({ type: 'cancel' });
  }
  await Promise.allSettled(running.map((job) => job.worker.terminate()));
  activeByGame.clear();
  jobs.clear();
}
