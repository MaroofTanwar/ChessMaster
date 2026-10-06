import { requestAIMove } from './aiEngineService.js';

const CACHE_TTL_MS = 60_000;
const MAX_ENTRIES = 2_000;

export function createAIMoveCoordinator({ calculate = requestAIMove, now = Date.now } = {}) {
  const requests = new Map();

  const cleanup = () => {
    const current = now();
    for (const [key, entry] of requests) if (entry.expiresAt <= current) requests.delete(key);
    if (requests.size > MAX_ENTRIES) {
      for (const key of requests.keys()) {
        requests.delete(key);
        if (requests.size <= MAX_ENTRIES) break;
      }
    }
  };

  const run = ({ uid, requestId, fen, difficulty }) => {
    cleanup();
    const key = `${uid}:${requestId}`;
    const fingerprint = `${difficulty}:${fen}`;
    const existing = requests.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        const error = new Error('An AI request ID cannot be reused for another position.');
        error.status = 409;
        throw error;
      }
      return existing.promise;
    }

    const entry = { fingerprint, expiresAt: now() + CACHE_TTL_MS };
    entry.promise = Promise.resolve()
      .then(() => calculate(fen, difficulty))
      .catch((error) => {
        requests.delete(key);
        throw error;
      });
    requests.set(key, entry);
    return entry.promise;
  };

  return { run, clear: () => requests.clear(), size: () => requests.size };
}

export const aiMoveCoordinator = createAIMoveCoordinator();
