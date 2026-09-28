import { randomUUID } from 'node:crypto';
import { EVENTS } from './events.js';
import { areFriends } from '../services/socialService.js';
import { isSafeId } from '../utils/validation.js';

const TTL = 60_000;
const safeProfile = (socket) => ({
  username: socket.profile?.username || socket.user.name || 'Chess Player',
  avatar: socket.profile?.avatar || null,
  rating: Number.isFinite(socket.profile?.rating) ? socket.profile.rating : 1200,
});

export class SocialManager {
  constructor(io, db, gameManager, { now = () => Date.now() } = {}) {
    this.io = io; this.db = db; this.gameManager = gameManager; this.now = now;
    this.connections = new Map(); this.challenges = new Map(); this.lastChallengeAt = new Map();
    this.timer = setInterval(() => this.expire(), 1000); this.timer.unref?.();
  }

  close() { clearInterval(this.timer); }

  connect(socket) {
    const uid = socket.user.uid;
    const ids = this.connections.get(uid) || new Set();
    ids.add(socket.id); this.connections.set(uid, ids);
    socket.join(`user:${uid}`);
    void this.broadcastPresence(uid, true);
  }

  disconnect(socket) {
    const uid = socket.user.uid; const ids = this.connections.get(uid);
    if (!ids) return;
    ids.delete(socket.id);
    if (!ids.size) { this.connections.delete(uid); void this.broadcastPresence(uid, false); }
  }

  async broadcastPresence(uid, online) {
    try {
      const snapshot = await this.db.collection('friendships').where('memberUids', 'array-contains', uid).limit(100).get();
      for (const doc of snapshot.docs) {
        const friendUid = doc.data().memberUids?.find((item) => item !== uid);
        if (friendUid) this.io.to(`user:${friendUid}`).emit(EVENTS.PRESENCE_UPDATE, { uid, online });
      }
    } catch { /* Presence is transient; clients can request a fresh snapshot. */ }
  }

  presence(uids = []) { return [...new Set(uids.filter(isSafeId))].slice(0, 100).reduce((out, uid) => ({ ...out, [uid]: this.connections.has(uid) }), {}); }

  async challenge(socket, payload = {}) {
    const challengerUid = socket.user.uid;
    const targetUid = String(payload.targetUid || '');
    if (!isSafeId(targetUid) || targetUid === challengerUid) throw new Error('Choose another player to challenge.');
    if (!this.connections.has(targetUid)) throw new Error('That friend is currently offline.');
    if (!await areFriends(this.db, challengerUid, targetUid)) throw new Error('Only friends can challenge each other.');
    const now = this.now();
    if (now - (this.lastChallengeAt.get(challengerUid) || 0) < 2000) throw new Error('Please wait before sending another challenge.');
    const duplicate = [...this.challenges.values()].find((item) => item.status === 'pending' && item.challengerUid === challengerUid && item.targetUid === targetUid);
    if (duplicate) throw new Error('A challenge is already pending.');
    this.lastChallengeAt.set(challengerUid, now);
    const challenge = { id: randomUUID(), challengerUid, targetUid, challenger: safeProfile(socket), gameMode: payload.gameMode === 'casual' ? 'casual' : 'ranked', timeControl: '10+0', status: 'pending', createdAt: now, expiresAt: now + TTL };
    this.challenges.set(challenge.id, challenge);
    this.io.to(`user:${targetUid}`).emit(EVENTS.CHALLENGE_RECEIVED, challenge);
    return challenge;
  }

  decline(socket, id) {
    const item = this.requirePending(socket, id);
    item.status = 'declined'; this.challenges.delete(id);
    this.io.to(`user:${item.challengerUid}`).emit(EVENTS.CHALLENGE_DECLINED, { id });
  }

  accept(socket, id) {
    const item = this.requirePending(socket, id);
    item.status = 'processing';
    const challengerSocket = this.firstSocket(item.challengerUid);
    const targetSocket = this.firstSocket(item.targetUid, socket.id);
    if (!challengerSocket || !targetSocket) { item.status = 'pending'; throw new Error('Both players must be online to start.'); }
    try {
      const challengerWhite = Math.random() < 0.5;
      const white = challengerWhite ? challengerSocket : targetSocket;
      const black = challengerWhite ? targetSocket : challengerSocket;
      this.gameManager.createRoom(white, white.profile, item.gameMode);
      const state = this.gameManager.joinRoom(black, this.gameManager.playerRooms.get(white.user.uid), black.profile);
      item.status = 'accepted'; this.challenges.delete(id);
      this.io.to(state.roomId).emit(EVENTS.PLAYER_JOINED, state);
      this.io.to(state.roomId).emit(EVENTS.GAME_STARTED, state);
      this.io.to(`user:${item.challengerUid}`).to(`user:${item.targetUid}`).emit(EVENTS.CHALLENGE_ACCEPTED, { id, roomId: state.roomId, state });
      return state;
    } catch (error) { item.status = 'pending'; throw error; }
  }

  requirePending(socket, id) {
    if (!isSafeId(String(id || ''))) throw new Error('This challenge is no longer available.');
    const item = this.challenges.get(String(id || ''));
    if (!item || item.targetUid !== socket.user.uid || item.status !== 'pending' || item.expiresAt <= this.now()) throw new Error('This challenge is no longer available.');
    return item;
  }

  firstSocket(uid, preferred) {
    const ids = this.connections.get(uid); if (!ids?.size) return null;
    return this.io.sockets.sockets.get(preferred) || this.io.sockets.sockets.get([...ids][0]) || null;
  }

  expire() {
    for (const [id, item] of this.challenges) if (item.status === 'pending' && item.expiresAt <= this.now()) {
      item.status = 'expired'; this.challenges.delete(id);
      this.io.to(`user:${item.challengerUid}`).to(`user:${item.targetUid}`).emit(EVENTS.CHALLENGE_EXPIRED, { id });
    }
  }
}
