import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/runtime';

export const SOCKET_RECONNECT_OPTIONS = Object.freeze({
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 750,
  reconnectionDelayMax: 8_000,
  randomizationFactor: 0.4,
  timeout: 20_000,
});

export function createAuthenticatedSocket(firebaseUser) {
  return io(getSocketUrl(), {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: async (callback) => {
      try { callback({ token: await firebaseUser.getIdToken() }); }
      catch { callback({ token: '' }); }
    },
    ...SOCKET_RECONNECT_OPTIONS,
  });
}
