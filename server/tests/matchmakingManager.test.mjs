import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchmakingManager, QUICK_MATCH_MODE } from '../src/socket/matchmakingManager.js';
import { EVENTS } from '../src/socket/events.js';

function createHarness() {
  const sockets = new Map();
  const roomEvents = [];
  const io = {
    sockets: { sockets },
    to: (roomId) => ({ emit: (event, payload) => roomEvents.push({ roomId, event, payload }) }),
  };
  let roomSequence = 0;
  const calls = { create: 0, join: 0, leave: 0 };
  const gameManager = {
    playerRooms: new Map(),
    createRoom(socket, profile, gameMode) {
      calls.create += 1;
      assert.equal(gameMode, 'ranked');
      const roomId = `CHESS-TEST${++roomSequence}`;
      this.playerRooms.set(socket.user.uid, roomId);
      socket.join(roomId);
      return { roomId, status: 'waiting', gameMode, players: { w: { uid: socket.user.uid, ...profile }, b: null } };
    },
    joinRoom(socket, roomId, profile) {
      calls.join += 1;
      this.playerRooms.set(socket.user.uid, roomId);
      socket.join(roomId);
      return { roomId, status: 'active', gameMode: 'ranked', players: { w: { uid: 'white' }, b: { uid: socket.user.uid, ...profile } } };
    },
    leave(socket) {
      calls.leave += 1;
      this.playerRooms.delete(socket.user.uid);
    },
  };
  const makeSocket = (uid, id = `socket-${uid}`) => {
    const events = [];
    const joined = [];
    const socket = {
      id, connected: true, user: { uid, name: uid }, profile: { username: uid, rating: 1200 },
      emit: (event, payload) => events.push({ event, payload }),
      join: (roomId) => joined.push(roomId),
    };
    sockets.set(id, socket);
    return { socket, events, joined };
  };
  const manager = new MatchmakingManager(io, gameManager, { random: () => 0 });
  return { manager, gameManager, makeSocket, calls, roomEvents, sockets };
}

test('two authenticated users create exactly one ranked room and receive the same room id', () => {
  const h = createHarness();
  const a = h.makeSocket('white');
  const b = h.makeSocket('black');
  const first = h.manager.start(a.socket);
  assert.equal(first.searching, true);
  assert.equal(h.manager.queue.size, 1);

  const second = h.manager.start(b.socket);
  assert.equal(second.matched, true);
  assert.equal(second.gameMode, QUICK_MATCH_MODE);
  assert.equal(h.calls.create, 1);
  assert.equal(h.calls.join, 1);
  assert.equal(h.manager.queue.size, 0);
  const aMatch = a.events.find(({ event }) => event === EVENTS.QUICK_MATCH_FOUND);
  const bMatch = b.events.find(({ event }) => event === EVENTS.QUICK_MATCH_FOUND);
  assert.equal(aMatch.payload.roomId, second.roomId);
  assert.equal(bMatch.payload.roomId, second.roomId);
  assert.equal(h.roomEvents.filter(({ event }) => event === EVENTS.GAME_STARTED).length, 1);
});

test('duplicate clicks and a second tab cannot create duplicate queue entries or self-matches', () => {
  const h = createHarness();
  const firstTab = h.makeSocket('same-user', 'socket-tab-1');
  h.manager.start(firstTab.socket);
  h.manager.start(firstTab.socket);
  assert.equal(h.manager.queue.size, 1);
  assert.equal(h.calls.create, 0);

  const secondTab = h.makeSocket('same-user', 'socket-tab-2');
  h.manager.start(secondTab.socket);
  assert.equal(h.manager.queue.size, 1);
  assert.equal(h.manager.queue.get('same-user').socketId, 'socket-tab-2');
  assert.equal(h.calls.create, 0);
  assert.ok(firstTab.events.some(({ event }) => event === EVENTS.QUICK_MATCH_CANCELLED));

  h.manager.disconnect(firstTab.socket);
  assert.equal(h.manager.queue.size, 1);
});

test('cancel and disconnect remove only the active socket queue entry', () => {
  const h = createHarness();
  const a = h.makeSocket('player-a');
  h.manager.start(a.socket);
  assert.deepEqual(h.manager.cancel(a.socket), { cancelled: true });
  assert.equal(h.manager.queue.size, 0);

  h.manager.start(a.socket);
  h.manager.disconnect(a.socket);
  assert.equal(h.manager.queue.size, 0);
});

test('stale socket entries are pruned instead of blocking a new search', () => {
  const h = createHarness();
  h.manager.queue.set('stale-player', { uid: 'stale-player', socketId: 'missing-socket' });
  const active = h.makeSocket('active-player');
  const result = h.manager.start(active.socket);
  assert.equal(result.searching, true);
  assert.equal(h.manager.queue.has('stale-player'), false);
  assert.equal(h.manager.queue.get('active-player').socketId, active.socket.id);
  assert.equal(h.calls.create, 0);
});

test('users already assigned to a game cannot enter matchmaking', () => {
  const h = createHarness();
  const a = h.makeSocket('busy-player');
  h.gameManager.playerRooms.set('busy-player', 'CHESS-BUSY1');
  assert.throws(() => h.manager.start(a.socket), (error) => error.code === 'ALREADY_IN_GAME');
  assert.equal(h.manager.queue.size, 0);
});
