import { Server } from 'socket.io';
import { adminDb } from '../config/firebaseAdmin.js';
import { authenticateSocket } from './authenticateSocket.js';
import { GameManager } from './gameManager.js';
import { registerGameHandlers } from './gameHandlers.js';
import { SocialManager } from './socialManager.js';
import { registerSocialHandlers } from './socialHandlers.js';
import { MatchmakingManager } from './matchmakingManager.js';
import { registerMatchmakingHandlers } from './matchmakingHandlers.js';

export function createSocketServer(httpServer) {
  const origins = (process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  const io = new Server(httpServer, {
    cors: { origin: origins, credentials: true },
    maxHttpBufferSize: 10_000,
    transports: ['websocket', 'polling'],
  });
  const manager = new GameManager(io, adminDb);
  const socialManager = new SocialManager(io, adminDb, manager);
  const matchmakingManager = new MatchmakingManager(io, manager);
  io.use(authenticateSocket);
  io.on('connection', (socket) => {
    registerGameHandlers(io, socket, manager);
    registerSocialHandlers(io, socket, socialManager);
    registerMatchmakingHandlers(socket, matchmakingManager);
  });
  return { io, manager, socialManager, matchmakingManager };
}
