import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AI_READY_CACHE_MS,
  AIRequestCancelledError,
  createAIRequestId,
  fetchAIMove,
  isAbortError,
  waitForAIBackend,
} from '../api/aiEngine.api';

export default function useAIEngine(firebaseUser) {
  const controller = useRef(null);
  const readinessPromise = useRef(null);
  const readyAt = useRef(0);
  const [isThinking, setIsThinking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const clearError = useCallback(() => setError(null), []);
  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    readinessPromise.current = null;
    setIsThinking(false);
    setIsConnecting(false);
    setError(null);
  }, []);
  useEffect(() => cancel, [cancel]);

  const prepare = useCallback(({ force = false } = {}) => {
    if (!firebaseUser) return Promise.reject(new Error('Sign in before starting ChessMaster AI.'));
    if (!force && readyAt.current && Date.now() - readyAt.current < AI_READY_CACHE_MS) return Promise.resolve(true);
    if (readinessPromise.current) return readinessPromise.current;
    if (controller.current) return Promise.reject(new Error('ChessMaster AI is already calculating this turn.'));

    const next = new AbortController();
    controller.current = next;
    setIsConnecting(true);
    setError(null);
    const job = waitForAIBackend({ signal: next.signal })
      .then(() => {
        if (next.signal.aborted) throw new AIRequestCancelledError();
        readyAt.current = Date.now();
        return true;
      })
      .catch((problem) => {
        if (isAbortError(problem) || next.signal.aborted) throw new AIRequestCancelledError();
        setError(problem.message);
        throw problem;
      })
      .finally(() => {
        if (controller.current === next) {
          controller.current = null;
          setIsConnecting(false);
        }
        if (readinessPromise.current === job) readinessPromise.current = null;
      });
    readinessPromise.current = job;
    return job;
  }, [firebaseUser]);

  const requestMove = useCallback(async (fen, difficulty) => {
    if (controller.current) throw new Error('ChessMaster AI is already calculating this turn.');
    const next = new AbortController(); controller.current = next; setIsThinking(true); setError(null);
    try {
      const ensureConnection = async () => {
        setIsConnecting(true);
        await waitForAIBackend({ signal: next.signal });
        readyAt.current = Date.now();
        setIsConnecting(false);
      };
      if (!readyAt.current || Date.now() - readyAt.current >= AI_READY_CACHE_MS) await ensureConnection();
      const move = await fetchAIMove({
        firebaseUser,
        fen,
        difficulty,
        requestId: createAIRequestId(),
        signal: next.signal,
        reconnect: ensureConnection,
      });
      if (next.signal.aborted) throw new AIRequestCancelledError();
      return move;
    } catch (problem) {
      if (isAbortError(problem) || next.signal.aborted) throw new AIRequestCancelledError();
      setError(problem.message);
      throw problem;
    } finally {
      if (controller.current === next) {
        controller.current = null;
        setIsThinking(false);
        setIsConnecting(false);
      }
    }
  }, [firebaseUser]);
  return { requestMove, prepare, cancel, clearError, isThinking, isConnecting, error };
}
