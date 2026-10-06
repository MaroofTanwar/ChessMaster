import { describe, expect, it } from 'vitest';
import { SOCKET_RECONNECT_OPTIONS } from '../src/socket/socket';

describe('production Socket.IO reconnect policy', () => {
  it('keeps one socket retrying through a Render cold start', () => {
    expect(SOCKET_RECONNECT_OPTIONS.reconnection).toBe(true);
    expect(SOCKET_RECONNECT_OPTIONS.reconnectionAttempts).toBe(Infinity);
    expect(SOCKET_RECONNECT_OPTIONS.timeout).toBeGreaterThanOrEqual(20_000);
    expect(SOCKET_RECONNECT_OPTIONS.reconnectionDelayMax).toBeGreaterThanOrEqual(5_000);
  });
});
