import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import {
  AIRequestCancelledError,
  fetchAIMove,
  waitForAIBackend,
} from '../src/api/aiEngine.api';
import useAIEngine from '../src/hooks/useAIEngine';

const ok = (payload = {}) => ({ ok: true, status: 200, json: async () => payload });
const firebaseUser = { getIdToken: vi.fn(async () => 'test-token') };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AI backend readiness and retries', () => {
  it('recovers from a cold first health request with bounded backoff', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(ok({ status: 'ok' }));
    const sleep = vi.fn(async () => {});
    await expect(waitForAIBackend({ fetchImpl, retryDelays: [0, 800], attemptTimeoutMs: 0, sleep })).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('never exposes the raw browser network error after readiness is exhausted', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const promise = waitForAIBackend({ fetchImpl, retryDelays: [0, 0], attemptTimeoutMs: 0, sleep: async () => {} });
    await expect(promise).rejects.toThrow('ChessMaster AI is temporarily unavailable. Retry.');
    await expect(promise).rejects.not.toThrow('Failed to fetch');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('treats an individual health timeout as retryable instead of user cancellation', async () => {
    vi.useFakeTimers();
    try {
      let attempts = 0;
      const fetchImpl = vi.fn((_url, options) => {
        attempts += 1;
        if (attempts === 2) return Promise.resolve(ok({ status: 'ok' }));
        return new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      });
      const readiness = waitForAIBackend({ fetchImpl, retryDelays: [0, 0], attemptTimeoutMs: 10 });
      await vi.advanceTimersByTimeAsync(10);
      await expect(readiness).resolves.toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries a dropped move request sequentially with the same idempotency key', async () => {
    let active = 0;
    let maxActive = 0;
    const bodies = [];
    const fetchImpl = vi.fn(async (_url, options) => {
      active += 1; maxActive = Math.max(maxActive, active); bodies.push(JSON.parse(options.body));
      active -= 1;
      if (bodies.length === 1) throw new TypeError('Failed to fetch');
      return ok({ move: { from: 'e7', to: 'e5' } });
    });
    const reconnect = vi.fn(async () => {});
    await expect(fetchAIMove({ firebaseUser, fen: new Chess().fen(), difficulty: 'Easy', requestId: 'request_fixed', signal: new AbortController().signal, fetchImpl, reconnect })).resolves.toEqual({ from: 'e7', to: 'e5' });
    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(bodies.map((body) => body.requestId)).toEqual(['request_fixed', 'request_fixed']);
    expect(maxActive).toBe(1);
  });
});

describe('useAIEngine request lifecycle', () => {
  it('recovers its UI state when the first production-style health request is unavailable', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(ok({ status: 'ok' }));
      vi.stubGlobal('fetch', fetchMock);
      const { result } = renderHook(() => useAIEngine(firebaseUser));
      let readiness;
      act(() => { readiness = result.current.prepare(); });
      expect(result.current.isConnecting).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); await readiness; });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('deduplicates readiness and prevents concurrent move requests', async () => {
    let resolveHealth;
    const health = new Promise((resolve) => { resolveHealth = resolve; });
    const fetchMock = vi.fn((url, options) => {
      if (url.endsWith('/api/health')) return health;
      return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAIEngine(firebaseUser));
    let firstReady; let secondReady;
    act(() => { firstReady = result.current.prepare(); secondReady = result.current.prepare(); });
    expect(firstReady).toBe(secondReady);
    await act(async () => { await Promise.resolve(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { resolveHealth(ok()); await firstReady; });

    let pending;
    act(() => { pending = result.current.requestMove(new Chess().fen(), 'Medium'); });
    await waitFor(() => expect(result.current.isThinking).toBe(true));
    await expect(result.current.requestMove(new Chess().fen(), 'Medium')).rejects.toThrow('already calculating');
    act(() => result.current.cancel());
    await expect(pending).rejects.toBeInstanceOf(AIRequestCancelledError);
    expect(result.current.isThinking).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

