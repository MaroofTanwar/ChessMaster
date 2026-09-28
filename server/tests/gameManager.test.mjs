import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../src/socket/gameManager.js';

const createHarness = () => {
  let now = 1_000;
  const writes = [];
  const emissions = [];
  const io = {
    to: (roomId) => ({ emit: (event, payload) => emissions.push({ roomId, event, payload }) }),
  };
  const records = new Map([
    ['users/white', { username: 'White', rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0 }],
    ['users/black', { username: 'Black', rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0 }],
  ]);
  const reference = (collection, id) => ({ collection, id, path: `${collection}/${id}` });
  const db = {
    collection: (collection) => ({ doc: (id) => reference(collection, id) }),
    runTransaction: async (action) => action({
      get: async (ref) => ({ exists: records.has(ref.path), data: () => records.get(ref.path) }),
      create: (ref, data) => { records.set(ref.path, data); writes.push({ id: ref.id, data }); },
      update: (ref, data) => records.set(ref.path, { ...records.get(ref.path), ...data }),
    }),
  };
  const manager = new GameManager(io, db, { now: () => now });
  const socket = (uid) => ({ id: `socket-${uid}`, user: { uid, name: uid }, join() {}, leave() {} });
  return { manager, socket, writes, emissions, records, advance: (ms) => { now += ms; } };
};

test('server-owned clock ends the game and persists a timeout result', async (t) => {
  const h = createHarness();
  t.after(() => h.manager.close());
  const white = h.socket('white');
  const black = h.socket('black');
  const roomId = h.manager.createRoom(white, { username: 'White' }).roomId;
  h.manager.joinRoom(black, roomId, { username: 'Black' });
  h.advance(600_001);
  h.manager.tick();
  await new Promise((resolve) => setImmediate(resolve));
  const room = h.manager.rooms.get(roomId);
  assert.equal(room.status, 'finished');
  assert.equal(room.result.reason, 'timeout');
  assert.equal(room.result.winnerUid, 'black');
  assert.equal(h.writes[0].data.reason, 'timeout');
  assert.equal(h.writes[0].data.initialFen, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  assert.equal(h.writes[0].data.finalFen, room.chess.fen());
  assert.deepEqual(h.writes[0].data.participantUids, ['white', 'black']);
  assert.equal(h.writes[0].data.moveCount, 0);
  assert.equal(h.writes[0].data.ratingProcessed, true);
  assert.equal(h.writes[0].data.whiteRatingChange, -16);
  assert.equal(h.writes[0].data.blackRatingChange, 16);
});

test('ranked results update both profiles exactly once and casual results do not update ratings', async (t) => {
  const ranked = createHarness();
  t.after(() => ranked.manager.close());
  const white = ranked.socket('white');
  const black = ranked.socket('black');
  const rankedId = ranked.manager.createRoom(white, {}, 'ranked').roomId;
  ranked.manager.joinRoom(black, rankedId, {});
  ranked.manager.resign(black, rankedId);
  await new Promise((resolve) => setImmediate(resolve));
  await ranked.manager.persist(ranked.manager.rooms.get(rankedId));
  assert.equal(ranked.records.get('users/white').rating, 1216);
  assert.equal(ranked.records.get('users/white').wins, 1);
  assert.equal(ranked.records.get('users/white').gamesPlayed, 1);
  assert.equal(ranked.records.get('users/black').rating, 1184);
  assert.equal(ranked.records.get('users/black').losses, 1);
  assert.equal(ranked.records.get('users/black').gamesPlayed, 1);
  assert.equal(ranked.writes.length, 1);

  const casual = createHarness();
  t.after(() => casual.manager.close());
  const casualId = casual.manager.createRoom(casual.socket('white'), {}, 'casual').roomId;
  casual.manager.joinRoom(casual.socket('black'), casualId, {});
  casual.manager.resign(casual.socket('black'), casualId);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(casual.records.get('users/white').rating, 1200);
  assert.equal(casual.records.get('users/white').gamesPlayed, 0);
  assert.equal(casual.writes[0].data.gameMode, 'casual');
  assert.equal(casual.writes[0].data.ratingProcessed, false);
});

test('resignation and agreed draw are decided by membership, not client claims', async (t) => {
  const h = createHarness();
  t.after(() => h.manager.close());
  const white = h.socket('white');
  const black = h.socket('black');
  let roomId = h.manager.createRoom(white, {}).roomId;
  h.manager.joinRoom(black, roomId, {});
  const resigned = h.manager.resign(white, roomId);
  assert.deepEqual(resigned.result, { winnerColor: 'b', winnerUid: 'black', reason: 'resignation', notation: '0-1' });

  const h2 = createHarness();
  t.after(() => h2.manager.close());
  roomId = h2.manager.createRoom(white, {}).roomId;
  h2.manager.joinRoom(black, roomId, {});
  h2.manager.offerDraw(white, roomId);
  const drawn = h2.manager.respondDraw(black, roomId, true);
  assert.equal(drawn.status, 'finished');
  assert.equal(drawn.result.reason, 'draw_agreement');
  assert.equal(drawn.result.notation, '1/2-1/2');
});

test('room membership, turn, and legal moves cannot be spoofed', (t) => {
  const h = createHarness();
  t.after(() => h.manager.close());
  const white = h.socket('white');
  const black = h.socket('black');
  const stranger = h.socket('stranger');
  const roomId = h.manager.createRoom(white, {}).roomId;
  h.manager.joinRoom(black, roomId, {});
  assert.throws(() => h.manager.makeMove(stranger, { roomId, from: 'e2', to: 'e4' }), { code: 'NOT_AUTHORIZED' });
  assert.throws(() => h.manager.makeMove(black, { roomId, from: 'e7', to: 'e5' }), { code: 'NOT_YOUR_TURN' });
  assert.throws(() => h.manager.makeMove(white, { roomId, from: 'e2', to: 'e5' }), { code: 'ILLEGAL_MOVE' });
  assert.equal(h.manager.makeMove(white, { roomId, from: 'e2', to: 'e4', fen: 'forged' }).state.fen.startsWith('rnbqkbnr/pppppppp'), true);
});

test('reconnect requires the same UID and preserves position, color, and clock', (t) => {
  const h = createHarness();
  t.after(() => h.manager.close());
  const white = h.socket('white');
  const black = h.socket('black');
  const roomId = h.manager.createRoom(white, {}).roomId;
  h.manager.joinRoom(black, roomId, {});
  h.manager.makeMove(white, { roomId, from: 'e2', to: 'e4' });
  h.manager.disconnect(black);
  h.advance(2_000);
  const replacement = { ...black, id: 'new-black-socket' };
  const recovered = h.manager.recover(replacement);
  assert.equal(recovered.color, 'b');
  assert.equal(recovered.state.history.length, 1);
  assert.equal(recovered.state.players.b.connected, true);
  assert.ok(recovered.state.clocks.b <= 600);
});

test('joining replaces only the same player\'s abandoned waiting room', (t) => {
  const h = createHarness();
  t.after(() => h.manager.close());
  const white = h.socket('white');
  const black = h.socket('black');
  const abandonedRoomId = h.manager.createRoom(black, {}).roomId;
  h.manager.disconnect(black);
  const targetRoomId = h.manager.createRoom(white, {}).roomId;

  assert.throws(() => h.manager.joinRoom(h.socket('stranger'), 'CHESS-NONE2', {}), { code: 'ROOM_NOT_FOUND' });

  const joined = h.manager.joinRoom({ ...black, id: 'replacement-black-socket' }, targetRoomId, {});

  assert.equal(joined.roomId, targetRoomId);
  assert.equal(joined.status, 'active');
  assert.equal(joined.players.b.uid, 'black');
  assert.equal(h.manager.rooms.has(abandonedRoomId), false);
  assert.equal(h.manager.playerRooms.get('black'), targetRoomId);
});

test('chat messages use trusted room membership and enforce content limits', (t) => {
  const h = createHarness();
  t.after(() => h.manager.close());
  const white = h.socket('white');
  const black = h.socket('black');
  const roomId = h.manager.createRoom(white, { username: 'Trusted White' }).roomId;
  h.manager.joinRoom(black, roomId, { username: 'Trusted Black' });

  const chat = h.manager.createChatMessage(white, { roomId, message: '  Good game  ', senderName: 'Forged' });
  assert.equal(chat.message.message, 'Good game');
  assert.equal(chat.message.senderUid, 'white');
  assert.equal(chat.message.senderName, 'Trusted White');
  assert.equal(chat.message.roomId, roomId);
  assert.throws(() => h.manager.createChatMessage(h.socket('stranger'), { roomId, message: 'Hello' }), { code: 'NOT_AUTHORIZED' });
  assert.throws(() => h.manager.createChatMessage(white, { roomId, message: '   ' }), { code: 'INVALID_CHAT_MESSAGE' });
  assert.throws(() => h.manager.createChatMessage(white, { roomId, message: 'x'.repeat(301) }), { code: 'CHAT_MESSAGE_TOO_LONG' });
});
