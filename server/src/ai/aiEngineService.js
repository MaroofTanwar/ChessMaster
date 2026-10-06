import { Worker } from 'node:worker_threads';
import { AI_REQUEST_TIMEOUT_MS } from './aiConfig.js';

const debug = (message) => { if (process.env.NODE_ENV !== 'production') console.log(`[AI Service] ${message}`); };

export function createAIEngineService({ WorkerConstructor = Worker, requestTimeoutMs = AI_REQUEST_TIMEOUT_MS } = {}) {
  let worker;
  let sequence = 0;
  const pending = new Map();

  function rejectAll(error) {
    for (const request of pending.values()) { clearTimeout(request.timer); request.reject(error); }
    pending.clear();
  }
  function disposeWorker(error) {
    const current = worker; worker = null;
    if (current) { current.removeAllListeners(); current.postMessage({ type: 'shutdown' }); void current.terminate(); }
    if (error) rejectAll(error);
  }
  function start() {
    if (worker) return worker;
    debug('starting isolated Stockfish worker');
    const current = new WorkerConstructor(new URL('./aiEngine.worker.js', import.meta.url)); worker = current;
    current.on('message', ({ id, move, error }) => {
      const request = pending.get(id); if (!request) return;
      pending.delete(id); clearTimeout(request.timer); if (error) request.reject(new Error(error)); else request.resolve(move);
    });
    current.on('error', (error) => { if (worker === current) disposeWorker(error); });
    current.on('exit', (code) => { if (worker === current && code !== 0) disposeWorker(new Error(`AI worker exited unexpectedly (${code}).`)); });
    current.unref(); return current;
  }
  function requestAIMove(fen, difficulty) {
    const current = start(); const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending.has(id)) return;
        debug(`request timed out id=${id}; restarting engine`);
        disposeWorker(new Error('AI calculation timed out. Please try again.'));
      }, requestTimeoutMs);
      pending.set(id, { resolve, reject, timer }); current.postMessage({ id, fen, difficulty });
    });
  }
  return { requestAIMove, close: () => disposeWorker() };
}

const defaultService = createAIEngineService();
export const requestAIMove = defaultService.requestAIMove;
export const closeAIEngine = defaultService.close;
export { AI_REQUEST_TIMEOUT_MS as REQUEST_TIMEOUT_MS };
