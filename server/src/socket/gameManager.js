import { randomBytes, randomUUID } from 'node:crypto';
import { Chess } from 'chess.js';
import { FieldValue } from 'firebase-admin/firestore';
import { GameError } from './errors.js';
import { persistCompletedGame } from '../services/gamePersistence.js';
import { isRoomId, isSquare } from '../utils/validation.js';

const STARTING_TIME_MS = 10 * 60 * 1000;
const ROOM_RETENTION_MS = 30 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const publicMove = (move) => ({
  color: move.color, from: move.from, to: move.to, piece: move.piece,
  captured: move.captured || null, promotion: move.promotion || null,
  san: move.san, flags: move.flags,
});

export class GameManager {
  constructor(io, db, { now = () => Date.now() } = {}) {
    this.io = io;
    this.db = db;
    this.now = now;
    this.rooms = new Map();
    this.playerRooms = new Map();
    this.timer = setInterval(() => this.tick(), 250);
    this.timer.unref?.();
  }

  close() {
    clearInterval(this.timer);
  }

  createRoom(socket, profile, rawGameMode = 'ranked') {
    if (this.playerRooms.has(socket.user.uid)) {
      throw new GameError('ALREADY_IN_GAME', 'Exit your current game before creating another room.');
    }
    const id = this.generateRoomId();
    const gameMode = rawGameMode === 'casual' ? 'casual' : 'ranked';
    const room = {
      id, round: 1, gameMode, chess: new Chess(), initialFen: new Chess().fen(), status: 'waiting',
      players: { w: this.player(socket, profile, 'w'), b: null },
      clocks: { w: STARTING_TIME_MS, b: STARTING_TIME_MS, activeColor: null, lastTickAt: null },
      startedAt: null, endedAt: null, result: null,
      drawOfferBy: null, rematchRequestedBy: null, persisted: false,
      updatedAt: this.now(),
    };
    this.rooms.set(id, room);
    this.playerRooms.set(socket.user.uid, id);
    socket.join(id);
    return this.snapshot(room);
  }

  joinRoom(socket, rawId, profile) {
    const id = this.normalizeRoomId(rawId);
    this.releaseWaitingRoomForJoin(socket, id);
    const room = this.rooms.get(id);
    if (!room) throw new GameError('ROOM_NOT_FOUND', 'That game room does not exist or has expired.');
    const existingColor = this.colorFor(room, socket.user.uid);
    if (existingColor) return this.reconnect(socket, room, existingColor);
    if (this.playerRooms.has(socket.user.uid)) {
      throw new GameError('ALREADY_IN_GAME', 'Exit your current game before joining another room.');
    }
    if (room.status !== 'waiting') throw new GameError('GAME_ALREADY_STARTED', 'That game has already started.');
    if (room.players.b) throw new GameError('ROOM_FULL', 'That game room is full.');
    room.players.b = this.player(socket, profile, 'b');
    room.status = 'active';
    room.startedAt = this.now();
    room.clocks.activeColor = 'w';
    room.clocks.lastTickAt = room.startedAt;
    room.updatedAt = room.startedAt;
    this.playerRooms.set(socket.user.uid, id);
    socket.join(id);
    return this.snapshot(room);
  }

  releaseWaitingRoomForJoin(socket, requestedRoomId) {
    const currentRoomId = this.playerRooms.get(socket.user.uid);
    if (!currentRoomId || currentRoomId === requestedRoomId) return;
    const currentRoom = this.rooms.get(currentRoomId);
    if (!currentRoom) {
      this.playerRooms.delete(socket.user.uid);
      return;
    }
    const ownsEmptyWaitingRoom = currentRoom.status === 'waiting'
      && currentRoom.players.w?.uid === socket.user.uid
      && !currentRoom.players.b;
    if (!ownsEmptyWaitingRoom) return;
    this.rooms.delete(currentRoomId);
    this.playerRooms.delete(socket.user.uid);
    socket.leave(currentRoomId);
  }

  reconnect(socket, room, color) {
    const player = room.players[color];
    player.connected = true;
    player.socketId = socket.id;
    player.disconnectedAt = null;
    room.updatedAt = this.now();
    socket.join(room.id);
    return this.snapshot(room);
  }

  makeMove(socket, payload = {}) {
    const room = this.requireRoom(socket, payload.roomId);
    this.applyElapsed(room);
    this.requireActive(room);
    const color = this.colorFor(room, socket.user.uid);
    if (room.chess.turn() !== color) throw new GameError('NOT_YOUR_TURN', 'Wait for your turn.');
    const from = typeof payload.from === 'string' ? payload.from.toLowerCase() : '';
    const to = typeof payload.to === 'string' ? payload.to.toLowerCase() : '';
    if (!isSquare(from) || !isSquare(to)) throw new GameError('ILLEGAL_MOVE', 'That move is not legal.');
    const promotion = ['q', 'r', 'b', 'n'].includes(payload.promotion) ? payload.promotion : 'q';
    let move;
    try { move = room.chess.move({ from, to, promotion }); }
    catch { throw new GameError('ILLEGAL_MOVE', 'That move is not legal.'); }
    if (!move) throw new GameError('ILLEGAL_MOVE', 'That move is not legal.');
    room.drawOfferBy = null;
    room.clocks.activeColor = room.chess.turn();
    room.clocks.lastTickAt = this.now();
    room.updatedAt = room.clocks.lastTickAt;
    const ended = this.finishFromPosition(room);
    return { state: this.snapshot(room), move: publicMove(move), ended };
  }

  createChatMessage(socket, payload = {}) {
    const room = this.requireRoom(socket, payload.roomId);
    if (typeof payload.message !== 'string') {
      throw new GameError('INVALID_CHAT_MESSAGE', 'Enter a message before sending.');
    }
    const message = payload.message.trim();
    if (!message) throw new GameError('INVALID_CHAT_MESSAGE', 'Enter a message before sending.');
    if (message.length > 300) {
      throw new GameError('CHAT_MESSAGE_TOO_LONG', 'Messages can be up to 300 characters.');
    }
    const color = this.colorFor(room, socket.user.uid);
    const sender = room.players[color];
    return {
      room,
      message: {
        id: randomUUID(), roomId: room.id, senderUid: socket.user.uid,
        senderName: sender.name, message, createdAt: new Date(this.now()).toISOString(),
      },
    };
  }

  resign(socket, rawId) {
    const room = this.requireRoom(socket, rawId);
    this.requireActive(room);
    const color = this.colorFor(room, socket.user.uid);
    this.finish(room, color === 'w' ? 'b' : 'w', 'resignation');
    return this.snapshot(room);
  }

  offerDraw(socket, rawId) {
    const room = this.requireRoom(socket, rawId);
    this.requireActive(room);
    const color = this.colorFor(room, socket.user.uid);
    if (room.drawOfferBy === color) throw new GameError('DRAW_ALREADY_OFFERED', 'Your draw offer is already pending.');
    room.drawOfferBy = color;
    room.updatedAt = this.now();
    return { room, color };
  }

  respondDraw(socket, rawId, accept) {
    const room = this.requireRoom(socket, rawId);
    this.requireActive(room);
    const color = this.colorFor(room, socket.user.uid);
    if (!room.drawOfferBy || room.drawOfferBy === color) {
      throw new GameError('NO_DRAW_OFFER', 'There is no opponent draw offer to answer.');
    }
    room.drawOfferBy = null;
    if (accept) this.finish(room, null, 'draw_agreement');
    return this.snapshot(room);
  }

  requestRematch(socket, rawId) {
    const room = this.requireRoom(socket, rawId);
    if (room.status !== 'finished') throw new GameError('GAME_NOT_FINISHED', 'The current game must finish before a rematch.');
    const color = this.colorFor(room, socket.user.uid);
    room.rematchRequestedBy = color;
    room.updatedAt = this.now();
    return { room, color };
  }

  respondRematch(socket, rawId, accept) {
    const room = this.requireRoom(socket, rawId);
    const color = this.colorFor(room, socket.user.uid);
    if (room.status !== 'finished' || !room.rematchRequestedBy || room.rematchRequestedBy === color) {
      throw new GameError('NO_REMATCH_REQUEST', 'There is no opponent rematch request to answer.');
    }
    if (!accept) {
      room.rematchRequestedBy = null;
      return { started: false, state: this.snapshot(room) };
    }
    const white = room.players.b;
    const black = room.players.w;
    white.color = 'w';
    black.color = 'b';
    room.players = { w: white, b: black };
    room.round += 1;
    room.chess = new Chess();
    room.initialFen = room.chess.fen();
    room.status = 'active';
    room.clocks = { w: STARTING_TIME_MS, b: STARTING_TIME_MS, activeColor: 'w', lastTickAt: this.now() };
    room.startedAt = this.now();
    room.endedAt = null;
    room.result = null;
    room.drawOfferBy = null;
    room.rematchRequestedBy = null;
    room.persisted = false;
    room.updatedAt = this.now();
    return { started: true, state: this.snapshot(room) };
  }

  leave(socket, rawId) {
    const room = this.requireRoom(socket, rawId);
    const color = this.colorFor(room, socket.user.uid);
    if (room.status === 'active') this.finish(room, color === 'w' ? 'b' : 'w', 'abandonment');
    const state = this.snapshot(room);
    this.playerRooms.delete(socket.user.uid);
    room.players[color] = null;
    socket.leave(room.id);
    if (!room.players.w && !room.players.b) this.rooms.delete(room.id);
    return { roomId: room.id, state };
  }

  disconnect(socket) {
    const id = this.playerRooms.get(socket.user.uid);
    const room = id && this.rooms.get(id);
    if (!room) return null;
    const color = this.colorFor(room, socket.user.uid);
    const player = color && room.players[color];
    if (!player || player.socketId !== socket.id) return null;
    player.connected = false;
    player.socketId = null;
    player.disconnectedAt = this.now();
    room.updatedAt = this.now();
    return { room, color, state: this.snapshot(room) };
  }

  recover(socket) {
    const id = this.playerRooms.get(socket.user.uid);
    const room = id && this.rooms.get(id);
    if (!room) return null;
    const color = this.colorFor(room, socket.user.uid);
    return { room, color, state: this.reconnect(socket, room, color) };
  }

  tick() {
    const now = this.now();
    for (const room of this.rooms.values()) {
      if (room.status === 'active') {
        const before = Math.ceil(room.clocks[room.clocks.activeColor] / 1000);
        this.applyElapsed(room);
        const after = Math.ceil(room.clocks[room.clocks.activeColor] / 1000);
        if (room.status === 'finished') {
          const state = this.snapshot(room);
          this.io.to(room.id).emit('game_over', state);
          void this.persist(room);
        } else if (before !== after) {
          this.io.to(room.id).emit('game_state', this.snapshot(room));
        }
      }
      if (now - room.updatedAt > ROOM_RETENTION_MS && !room.players.w?.connected && !room.players.b?.connected) {
        if (room.players.w) this.playerRooms.delete(room.players.w.uid);
        if (room.players.b) this.playerRooms.delete(room.players.b.uid);
        this.rooms.delete(room.id);
      }
    }
  }

  applyElapsed(room) {
    if (room.status !== 'active' || !room.clocks.activeColor || !room.clocks.lastTickAt) return;
    const now = this.now();
    const color = room.clocks.activeColor;
    room.clocks[color] = Math.max(0, room.clocks[color] - Math.max(0, now - room.clocks.lastTickAt));
    room.clocks.lastTickAt = now;
    if (room.clocks[color] === 0) this.finish(room, color === 'w' ? 'b' : 'w', 'timeout');
  }

  finishFromPosition(room) {
    if (room.chess.isCheckmate()) {
      this.finish(room, room.chess.turn() === 'w' ? 'b' : 'w', 'checkmate');
    } else if (room.chess.isStalemate()) this.finish(room, null, 'stalemate');
    else if (room.chess.isThreefoldRepetition()) this.finish(room, null, 'threefold_repetition');
    else if (room.chess.isInsufficientMaterial()) this.finish(room, null, 'insufficient_material');
    else if (room.chess.isDraw()) this.finish(room, null, 'fifty_move_rule');
    return room.status === 'finished';
  }

  finish(room, winnerColor, reason) {
    this.applyElapsedUnlessAlreadyTicking(room);
    room.status = 'finished';
    room.endedAt = this.now();
    room.updatedAt = room.endedAt;
    room.clocks.activeColor = null;
    room.clocks.lastTickAt = null;
    const winner = winnerColor ? room.players[winnerColor] : null;
    room.result = {
      winnerColor, winnerUid: winner?.uid || null, reason,
      notation: winnerColor === 'w' ? '1-0' : winnerColor === 'b' ? '0-1' : '1/2-1/2',
    };
    room.drawOfferBy = null;
    room.rematchRequestedBy = null;
    void this.persist(room);
  }

  applyElapsedUnlessAlreadyTicking(room) {
    if (room.status !== 'active' || !room.clocks.activeColor || !room.clocks.lastTickAt) return;
    const now = this.now();
    const color = room.clocks.activeColor;
    room.clocks[color] = Math.max(0, room.clocks[color] - Math.max(0, now - room.clocks.lastTickAt));
    room.clocks.lastTickAt = now;
  }

  async persist(room) {
    if (room.persisted || room.status !== 'finished' || !room.players.w || !room.players.b) return;
    room.persisted = true;
    const persistedRound = room.round;
    const documentId = `${room.id}-${persistedRound}`;
    const payload = {
      gameId: documentId, roomId: room.id, round: persistedRound,
      whitePlayerUid: room.players.w.uid, blackPlayerUid: room.players.b.uid,
      whitePlayerName: room.players.w.name, blackPlayerName: room.players.b.name,
      whitePlayerAvatar: room.players.w.avatar, blackPlayerAvatar: room.players.b.avatar,
      whiteRating: room.players.w.rating, blackRating: room.players.b.rating,
      participantUids: [room.players.w.uid, room.players.b.uid],
      moves: room.chess.history({ verbose: true }).map(publicMove),
      moveCount: room.chess.history().length,
      initialFen: room.initialFen,
      finalFen: room.chess.fen(),
      result: room.result.notation, winnerUid: room.result.winnerUid,
      reason: room.result.reason, timeControl: { initialSeconds: 600, incrementSeconds: 0 },
      startedAt: new Date(room.startedAt), endedAt: new Date(room.endedAt),
      durationSeconds: Math.max(0, Math.round((room.endedAt - room.startedAt) / 1000)),
      gameMode: room.gameMode, ratingProcessed: false,
      status: 'finished', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    };
    try {
      const saved = await persistCompletedGame(this.db, documentId, payload);
      if (room.round === persistedRound && saved.ratingProcessed) {
        room.result.rating = {
          w: { before: saved.whiteRatingBefore, after: saved.whiteRatingAfter, change: saved.whiteRatingChange },
          b: { before: saved.blackRatingBefore, after: saved.blackRatingAfter, change: saved.blackRatingChange },
        };
        room.players.w.rating = saved.whiteRatingAfter;
        room.players.b.rating = saved.blackRatingAfter;
        this.io.to(room.id).emit('game_state', this.snapshot(room));
      }
    } catch (error) {
      if (error.code === 6 || error.code === 'already-exists') return;
      if (room.round === persistedRound) room.persisted = false;
      console.error(`[Game persistence] Failed for ${documentId}:`, error.code || error.message);
      this.io.to(room.id).emit('socket_error', { code: 'PERSISTENCE_FAILED', message: 'The game ended, but its result could not be saved yet.' });
    }
  }

  snapshot(room) {
    const history = room.chess.history({ verbose: true }).map(publicMove);
    return {
      roomId: room.id, round: room.round, gameMode: room.gameMode, status: room.status,
      fen: room.chess.fen(), turn: room.chess.turn(), history,
      lastMove: history.at(-1) || null,
      players: { w: this.publicPlayer(room.players.w), b: this.publicPlayer(room.players.b) },
      clocks: { w: Math.ceil(room.clocks.w / 1000), b: Math.ceil(room.clocks.b / 1000), activeColor: room.clocks.activeColor },
      result: room.result, drawOfferBy: room.drawOfferBy,
      rematchRequestedBy: room.rematchRequestedBy,
      serverNow: this.now(), startedAt: room.startedAt, endedAt: room.endedAt,
    };
  }

  player(socket, profile, color) {
    return {
      uid: socket.user.uid, name: profile.username || socket.user.name || 'Chess Player',
      rating: Number.isFinite(profile.rating) ? profile.rating : 1200,
      avatar: typeof profile.avatar === 'string' ? profile.avatar : '',
      color, connected: true, socketId: socket.id, disconnectedAt: null,
    };
  }

  publicPlayer(player) {
    if (!player) return null;
    return { uid: player.uid, name: player.name, rating: player.rating, avatar: player.avatar, color: player.color, connected: player.connected };
  }

  requireRoom(socket, rawId) {
    const id = this.normalizeRoomId(rawId);
    const room = this.rooms.get(id);
    if (!room) throw new GameError('ROOM_NOT_FOUND', 'That game room does not exist or has expired.');
    if (!this.colorFor(room, socket.user.uid)) throw new GameError('NOT_AUTHORIZED', 'You are not a player in this game.');
    return room;
  }

  requireActive(room) {
    if (room.status === 'finished') throw new GameError('GAME_FINISHED', 'This game has already finished.');
    if (room.status !== 'active') throw new GameError('GAME_NOT_ACTIVE', 'The game is waiting for an opponent.');
  }

  colorFor(room, uid) {
    if (room.players.w?.uid === uid) return 'w';
    if (room.players.b?.uid === uid) return 'b';
    return null;
  }

  normalizeRoomId(rawId) {
    if (!isRoomId(rawId)) return '';
    return rawId.trim().toUpperCase();
  }

  generateRoomId() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const bytes = randomBytes(5);
      let suffix = '';
      for (const byte of bytes) suffix += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      const id = `CHESS-${suffix}`;
      if (!this.rooms.has(id)) return id;
    }
    throw new GameError('ROOM_CREATION_FAILED', 'A room code could not be generated. Please try again.');
  }
}
