import test from 'node:test';
import assert from 'node:assert/strict';
import { SocialManager } from '../src/socket/socialManager.js';

function fixture() {
  const emitted = [];
  const sockets = new Map();
  const channel = (rooms = []) => ({
    to(room) { return channel([...rooms, room]); },
    emit(event, payload) { emitted.push({ rooms, event, payload }); },
  });
  const io = { sockets: { sockets }, emit(event, payload) { emitted.push({ rooms: ['all'], event, payload }); }, to: (room) => channel([room]) };
  const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: true }) }) }) };
  let roomCount = 0;
  const gameManager = {
    playerRooms: new Map(),
    createRoom(socket, profile, gameMode) { roomCount += 1; const roomId = `CHESS-${roomCount}`; this.playerRooms.set(socket.user.uid, roomId); socket.join(roomId); return { roomId, gameMode }; },
    joinRoom(socket, roomId) { this.playerRooms.set(socket.user.uid, roomId); socket.join(roomId); return { roomId, status: 'active', players: { w: {}, b: {} } }; },
  };
  const manager = new SocialManager(io, db, gameManager, { now: () => 100_000 });
  const makeSocket = (id, uid, username) => ({ id, user: { uid, name: username }, profile: { username, rating: 1200 }, joined: [], join(room) { this.joined.push(room); } });
  return { manager, sockets, emitted, gameManager, makeSocket, get roomCount() { return roomCount; } };
}

test('presence stays online until every socket for a UID disconnects', () => {
  const f = fixture(); const a1 = f.makeSocket('a1', 'a', 'Alpha'); const a2 = f.makeSocket('a2', 'a', 'Alpha');
  f.manager.connect(a1); f.manager.connect(a2); f.manager.disconnect(a1);
  assert.equal(f.manager.presence(['a']).a, true);
  f.manager.disconnect(a2); assert.equal(f.manager.presence(['a']).a, false);
  f.manager.close();
});

test('accepting a challenge creates one shared room and cannot be accepted twice', async () => {
  const f = fixture(); const a = f.makeSocket('a1', 'a', 'Alpha'); const b = f.makeSocket('b1', 'b', 'Beta');
  f.sockets.set(a.id, a); f.sockets.set(b.id, b); f.manager.connect(a); f.manager.connect(b);
  const challenge = await f.manager.challenge(a, { targetUid: 'b', gameMode: 'ranked' });
  const state = f.manager.accept(b, challenge.id);
  assert.equal(state.roomId, 'CHESS-1'); assert.equal(f.roomCount, 1);
  assert.equal(f.gameManager.playerRooms.get('a'), f.gameManager.playerRooms.get('b'));
  assert.throws(() => f.manager.accept(b, challenge.id), /no longer available/i);
  assert.equal(f.roomCount, 1);
  f.manager.close();
});
