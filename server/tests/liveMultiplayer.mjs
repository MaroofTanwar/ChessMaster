import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { io as createClient } from 'socket.io-client';
import dotenv from 'dotenv';
import app from '../src/app.js';
import { createSocketServer } from '../src/socket/index.js';
import { adminAuth, adminDb } from '../src/config/firebaseAdmin.js';
import { EVENTS } from '../src/socket/events.js';

dotenv.config({ path: '../client/.env' });
if (process.env.CHESSMASTER_LIVE_MULTIPLAYER_TEST !== '1') {
  console.log('Set CHESSMASTER_LIVE_MULTIPLAYER_TEST=1 to run this temporary-account test.');
  process.exit(1);
}

const apiKey = process.env.VITE_FIREBASE_API_KEY;
if (!apiKey) throw new Error('The frontend Firebase API key is unavailable.');
const httpServer = createServer(app);
const { io, manager } = createSocketServer(httpServer);
await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${httpServer.address().port}`;
const accounts = [];
const sockets = [];
let gameDocumentId;

const report = (label) => console.log(`${label}: PASS`);
const expect = (condition, label) => { if (!condition) throw new Error(`Assertion failed: ${label}`); report(label); };
const once = (socket, event, timeout = 8000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(event, listener); reject(new Error(`Timed out waiting for ${event}`)); }, timeout);
  const listener = (value) => { clearTimeout(timer); resolve(value); };
  socket.once(event, listener);
});
const emit = (socket, event, payload = {}) => new Promise((resolve, reject) => {
  socket.timeout(8000).emit(event, payload, (error, response) => error ? reject(error) : resolve(response));
});
const signup = async (name) => {
  const email = `chessmaster-phase6-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, displayName: name, returnSecureToken: true }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Temporary Firebase signup failed: ${data.error?.message?.split(' : ')[0] || response.status}`);
  accounts.push(data.localId);
  await adminDb.collection('users').doc(data.localId).set({
    username: name,
    usernameLower: name.toLowerCase(),
    rating: 1200,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { uid: data.localId, token: data.idToken };
};
const connect = async (token) => {
  const socket = createClient(url, { transports: ['websocket'], auth: { token }, reconnection: false });
  sockets.push(socket);
  await once(socket, 'connect');
  return socket;
};

try {
  const whiteAccount = await signup('Phase6White');
  const blackAccount = await signup('Phase6Black');
  const white = await connect(whiteAccount.token);
  const black = await connect(blackAccount.token);
  report('Two Firebase-authenticated Socket.IO clients connected');

  const created = await emit(white, EVENTS.CREATE_GAME);
  expect(created.ok && /^CHESS-[A-Z2-9]{5}$/.test(created.data.roomId), 'Server generated a private room ID');
  const roomId = created.data.roomId;
  const joined = await emit(black, EVENTS.JOIN_GAME, { roomId });
  expect(joined.ok && joined.data.players.w.uid === whiteAccount.uid && joined.data.players.b.uid === blackAccount.uid, 'Two users assigned trusted White and Black identities');
  expect(joined.data.status === 'active' && joined.data.clocks.w <= 600 && joined.data.clocks.b === 600, 'Server clock started at Rapid 10+0');
  let response;

  const thirdAccount = await signup('Phase6Third');
  const third = await connect(thirdAccount.token);
  const full = await emit(third, EVENTS.JOIN_GAME, { roomId });
  expect(!full.ok && ['GAME_ALREADY_STARTED', 'ROOM_FULL'].includes(full.error.code), 'Third player rejected');
  const whiteChat = once(white, EVENTS.CHAT_MESSAGE);
  const blackChat = once(black, EVENTS.CHAT_MESSAGE);
  response = await emit(white, EVENTS.SEND_CHAT_MESSAGE, { roomId, message: 'Hello', senderUid: blackAccount.uid });
  const [whiteReceived, blackReceived] = await Promise.all([whiteChat, blackChat]);
  expect(response.ok && whiteReceived.id === blackReceived.id && blackReceived.senderUid === whiteAccount.uid && blackReceived.message === 'Hello', 'Room chat broadcast once to both authenticated players');
  response = await emit(third, EVENTS.SEND_CHAT_MESSAGE, { roomId, message: 'Intrusion' });
  expect(!response.ok && response.error.code === 'NOT_AUTHORIZED', 'Non-member chat rejected');
  const unauthenticated = createClient(url, { transports: ['websocket'], auth: {}, reconnection: false });
  sockets.push(unauthenticated);
  const authFailure = await once(unauthenticated, 'connect_error');
  expect(authFailure.data?.code === 'AUTH_REQUIRED', 'Unauthenticated socket rejected');

  response = await emit(black, EVENTS.MAKE_MOVE, { roomId, from: 'e7', to: 'e5' });
  expect(!response.ok && response.error.code === 'NOT_YOUR_TURN', 'Out-of-turn move rejected');
  response = await emit(white, EVENTS.MAKE_MOVE, { roomId, from: 'e2', to: 'e5' });
  expect(!response.ok && response.error.code === 'ILLEGAL_MOVE', 'Illegal move rejected by server chess.js');

  response = await emit(white, EVENTS.MAKE_MOVE, { roomId, from: 'f2', to: 'f3' });
  expect(response.ok && response.data.history.length === 1, 'White legal move broadcast');
  response = await emit(black, EVENTS.MAKE_MOVE, { roomId, from: 'e7', to: 'e5' });
  expect(response.ok && response.data.history.length === 2, 'Black legal move broadcast');

  const disconnectedNotice = once(white, EVENTS.PLAYER_DISCONNECTED);
  black.disconnect();
  const disconnected = await disconnectedNotice;
  expect(disconnected.state.players.b.connected === false, 'Opponent disconnect broadcast');
  const reconnectState = once(white, EVENTS.PLAYER_RECONNECTED);
  const blackReconnected = await connect(blackAccount.token);
  const restored = await reconnectState;
  expect(restored.state.history.length === 2 && restored.state.players.b.connected, 'Verified UID reconnect restored authoritative state');

  await emit(white, EVENTS.OFFER_DRAW, { roomId });
  response = await emit(blackReconnected, EVENTS.DECLINE_DRAW, { roomId });
  expect(response.ok && response.data.status === 'active', 'Draw offer decline');
  await emit(white, EVENTS.MAKE_MOVE, { roomId, from: 'g2', to: 'g4' });
  response = await emit(blackReconnected, EVENTS.MAKE_MOVE, { roomId, from: 'd8', to: 'h4' });
  expect(response.ok && response.data.status === 'finished' && response.data.result.reason === 'checkmate', 'Checkmate detected identically by server');
  gameDocumentId = `${roomId}-1`;

  let saved;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    saved = await adminDb.collection('games').doc(gameDocumentId).get();
    if (saved.exists) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  expect(saved?.exists && saved.data().moves.length === 4 && saved.data().winnerUid === blackAccount.uid, 'Completed game persisted by Firebase Admin');

  await emit(white, EVENTS.REQUEST_REMATCH, { roomId });
  response = await emit(blackReconnected, EVENTS.ACCEPT_REMATCH, { roomId });
  expect(response.ok && response.data.round === 2 && response.data.players.w.uid === blackAccount.uid && response.data.history.length === 0, 'Rematch reset state and swapped colors');
} finally {
  for (const socket of sockets) socket.disconnect();
  if (gameDocumentId) await adminDb.collection('games').doc(gameDocumentId).delete().catch(() => {});
  await Promise.all(accounts.map((uid) => adminDb.collection('users').doc(uid).delete().catch(() => {})));
  if (accounts.length) await adminAuth.deleteUsers(accounts).catch(() => {});
  manager.close();
  await new Promise((resolve) => io.close(resolve));
  if (httpServer.listening) await new Promise((resolve) => httpServer.close(resolve));
  console.log('Temporary test users and game document cleaned up.');
}
