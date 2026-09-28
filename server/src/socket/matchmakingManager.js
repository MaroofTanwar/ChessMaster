import { EVENTS } from './events.js';
import { GameError } from './errors.js';

const QUICK_MATCH_MODE = 'ranked';

export class MatchmakingManager {
  constructor(io, gameManager, { random = Math.random } = {}) {
    this.io = io;
    this.gameManager = gameManager;
    this.random = random;
    this.queue = new Map();
  }

  start(socket) {
    const uid = socket.user.uid;
    if (this.gameManager.playerRooms.has(uid)) {
      throw new GameError('ALREADY_IN_GAME', 'Exit your current game before searching for a match.');
    }

    this.prune();
    const currentEntry = this.queue.get(uid);
    if (currentEntry?.socketId === socket.id) {
      socket.emit(EVENTS.QUICK_MATCH_SEARCHING, { gameMode: QUICK_MATCH_MODE });
      return { searching: true, matched: false, gameMode: QUICK_MATCH_MODE };
    }

    if (currentEntry) {
      const previousSocket = this.socketFor(currentEntry);
      previousSocket?.emit(EVENTS.QUICK_MATCH_CANCELLED, {
        reason: 'Search continued in another tab.',
      });
      this.queue.delete(uid);
    }

    const opponent = [...this.queue.entries()].find(([candidateUid, entry]) => (
      candidateUid !== uid && this.isEligible(candidateUid, entry)
    ));

    if (!opponent) {
      this.queue.set(uid, { uid, socketId: socket.id });
      socket.emit(EVENTS.QUICK_MATCH_SEARCHING, { gameMode: QUICK_MATCH_MODE });
      return { searching: true, matched: false, gameMode: QUICK_MATCH_MODE };
    }

    const [opponentUid, opponentEntry] = opponent;
    const opponentSocket = this.socketFor(opponentEntry);
    this.queue.delete(opponentUid);
    return this.createMatch(socket, opponentSocket);
  }

  cancel(socket) {
    const entry = this.queue.get(socket.user.uid);
    if (!entry || entry.socketId !== socket.id) return { cancelled: false };
    this.queue.delete(socket.user.uid);
    return { cancelled: true };
  }

  disconnect(socket) {
    const entry = this.queue.get(socket.user.uid);
    if (entry?.socketId === socket.id) this.queue.delete(socket.user.uid);
  }

  prune() {
    for (const [uid, entry] of this.queue) {
      if (!this.isEligible(uid, entry)) this.queue.delete(uid);
    }
  }

  isEligible(uid, entry) {
    const candidate = this.socketFor(entry);
    return Boolean(candidate && candidate.connected !== false && !this.gameManager.playerRooms.has(uid));
  }

  socketFor(entry) {
    return entry && this.io.sockets.sockets.get(entry.socketId);
  }

  createMatch(requestingSocket, opponentSocket) {
    if (!opponentSocket || opponentSocket.user.uid === requestingSocket.user.uid) {
      throw new GameError('MATCHMAKING_FAILED', 'No eligible opponent is available yet.');
    }

    const requesterIsWhite = this.random() < 0.5;
    const white = requesterIsWhite ? requestingSocket : opponentSocket;
    const black = requesterIsWhite ? opponentSocket : requestingSocket;
    let roomId = null;

    try {
      const waitingState = this.gameManager.createRoom(white, white.profile, QUICK_MATCH_MODE);
      roomId = waitingState.roomId;
      const state = this.gameManager.joinRoom(black, roomId, black.profile);
      this.io.to(roomId).emit(EVENTS.PLAYER_JOINED, state);
      this.io.to(roomId).emit(EVENTS.GAME_STARTED, state);
      white.emit(EVENTS.QUICK_MATCH_FOUND, { roomId, gameMode: QUICK_MATCH_MODE, state });
      black.emit(EVENTS.QUICK_MATCH_FOUND, { roomId, gameMode: QUICK_MATCH_MODE, state });
      return { searching: false, matched: true, roomId, gameMode: QUICK_MATCH_MODE, state };
    } catch (error) {
      if (roomId && this.gameManager.playerRooms.get(white.user.uid) === roomId) {
        try { this.gameManager.leave(white, roomId); } catch { /* Best-effort rollback. */ }
      }
      opponentSocket.emit(EVENTS.QUICK_MATCH_CANCELLED, {
        reason: 'The match could not be started. Please search again.',
      });
      throw error;
    }
  }
}

export { QUICK_MATCH_MODE };
