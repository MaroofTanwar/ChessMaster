import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/runtime';

export function createAuthenticatedSocket(firebaseUser) {
  return io(getSocketUrl(), {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: async (callback) => {
      try { callback({ token: await firebaseUser.getIdToken() }); }
      catch { callback({ token: '' }); }
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
}
