import { getApiUrl } from '../config/runtime';

export const AI_READINESS_RETRY_DELAYS_MS = Object.freeze([0, 1_000, 2_500, 5_000]);
export const AI_HEALTH_ATTEMPT_TIMEOUT_MS = 20_000;
export const AI_MOVE_ATTEMPT_TIMEOUT_MS = 45_000;
export const AI_READY_CACHE_MS = 60_000;

const unavailableMessage = 'ChessMaster AI is temporarily unavailable. Retry.';
const cancelledMessage = 'AI calculation cancelled.';

export class AIUnavailableError extends Error {
  constructor(message = unavailableMessage) {
    super(message);
    this.name = 'AIUnavailableError';
  }
}

export class AIRequestCancelledError extends Error {
  constructor() {
    super(cancelledMessage);
    this.name = 'AIRequestCancelledError';
  }
}

class AIAttemptTimeoutError extends Error {
  constructor() {
    super('The ChessMaster backend did not respond before this attempt timed out.');
    this.name = 'AIAttemptTimeoutError';
  }
}

export const isAbortError = (error) => error?.name === 'AbortError' || error instanceof AIRequestCancelledError;

export function abortableDelay(milliseconds, signal) {
  if (!milliseconds) return signal?.aborted ? Promise.reject(new AIRequestCancelledError()) : Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new AIRequestCancelledError()); return; }
    const handleAbort = () => { clearTimeout(timer); reject(new AIRequestCancelledError()); };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

async function fetchWithTimeout(url, options, timeoutMs, fetchImpl) {
  const parentSignal = options.signal;
  if (parentSignal?.aborted) throw new AIRequestCancelledError();
  const attempt = new AbortController();
  const abortFromParent = () => attempt.abort();
  parentSignal?.addEventListener('abort', abortFromParent, { once: true });
  let timedOut = false;
  const timer = timeoutMs > 0 ? setTimeout(() => {
    timedOut = true;
    attempt.abort();
  }, timeoutMs) : null;
  try {
    return await fetchImpl(url, { ...options, signal: attempt.signal });
  } catch (error) {
    if (parentSignal?.aborted) throw new AIRequestCancelledError();
    if (timedOut) throw new AIAttemptTimeoutError();
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}

export async function waitForAIBackend({
  signal,
  fetchImpl = globalThis.fetch,
  retryDelays = AI_READINESS_RETRY_DELAYS_MS,
  attemptTimeoutMs = AI_HEALTH_ATTEMPT_TIMEOUT_MS,
  sleep = abortableDelay,
} = {}) {
  for (const delay of retryDelays) {
    await sleep(delay, signal);
    try {
      const response = await fetchWithTimeout(`${getApiUrl()}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal,
      }, attemptTimeoutMs, fetchImpl);
      if (response.ok) return true;
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) throw new AIRequestCancelledError();
    }
  }
  throw new AIUnavailableError();
}

const friendlyResponseError = (status) => {
  if (status === 401 || status === 403) return 'Your ChessMaster session could not be verified. Please sign in again.';
  if (status === 429) return 'ChessMaster AI is busy. Please wait a moment and retry.';
  if (status === 400 || status === 422) return 'ChessMaster AI could not use the current position. Start a new game and retry.';
  return unavailableMessage;
};

export async function fetchAIMove({
  firebaseUser,
  fen,
  difficulty,
  requestId,
  signal,
  fetchImpl = globalThis.fetch,
  reconnect,
  attemptTimeoutMs = AI_MOVE_ATTEMPT_TIMEOUT_MS,
}) {
  let token;
  try {
    token = await firebaseUser.getIdToken();
  } catch {
    throw new AIUnavailableError('Your ChessMaster session could not be verified. Please sign in again.');
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (signal?.aborted) throw new AIRequestCancelledError();
    let response;
    try {
      response = await fetchWithTimeout(`${getApiUrl()}/api/ai-move`, {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fen, difficulty, requestId }),
      }, attemptTimeoutMs, fetchImpl);
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) throw new AIRequestCancelledError();
      if (attempt === 0 && reconnect) {
        await reconnect();
        continue;
      }
      throw new AIUnavailableError();
    }
    if (signal?.aborted) throw new AIRequestCancelledError();
    if (response.ok) {
      const payload = await response.json().catch(() => null);
      if (!payload?.move?.from || !payload?.move?.to) throw new AIUnavailableError();
      return payload.move;
    }
    if (attempt === 0 && response.status >= 500 && reconnect) {
      await reconnect();
      continue;
    }
    throw new AIUnavailableError(friendlyResponseError(response.status));
  }
  throw new AIUnavailableError();
}

export function createAIRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

