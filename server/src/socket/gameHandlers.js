import { EVENTS } from './events.js';
import { cleanError } from './errors.js';
import { assertSocketRate } from './rateLimit.js';

const reply = (ack, payload) => typeof ack === 'function' && ack(payload);

export function registerGameHandlers(io, socket, manager) {
  const run = (ack, action) => {
    try { return action(); }
    catch (error) {
      const clean = cleanError(error);
      reply(ack, { ok: false, error: clean });
      socket.emit(EVENTS.SOCKET_ERROR, clean);
      return null;
    }
  };

  const recovered = manager.recover(socket);
  if (recovered) {
    socket.to(recovered.room.id).emit(EVENTS.PLAYER_RECONNECTED, { color: recovered.color, state: recovered.state });
    socket.emit(EVENTS.GAME_STATE, recovered.state);
  }

  socket.on(EVENTS.CREATE_GAME, (payload, ack) => run(ack, () => {
    assertSocketRate(socket, EVENTS.CREATE_GAME, { max: 10, windowMs: 60_000 });
    const state = manager.createRoom(socket, socket.profile, payload?.gameMode);
    reply(ack, { ok: true, data: state });
    socket.emit(EVENTS.GAME_CREATED, state);
  }));

  socket.on(EVENTS.JOIN_GAME, (payload, ack) => run(ack, () => {
    assertSocketRate(socket, EVENTS.JOIN_GAME, { max: 20, windowMs: 60_000 });
    const state = manager.joinRoom(socket, payload?.roomId, socket.profile);
    reply(ack, { ok: true, data: state });
    io.to(state.roomId).emit(EVENTS.PLAYER_JOINED, state);
    io.to(state.roomId).emit(EVENTS.GAME_STARTED, state);
  }));

  socket.on(EVENTS.MAKE_MOVE, (payload, ack) => {
    try {
      const result = manager.makeMove(socket, payload);
      reply(ack, { ok: true, data: result.state });
      io.to(result.state.roomId).emit(EVENTS.MOVE_APPLIED, { move: result.move, state: result.state });
      if (result.ended) io.to(result.state.roomId).emit(EVENTS.GAME_OVER, result.state);
    } catch (error) {
      const clean = cleanError(error);
      reply(ack, { ok: false, error: clean });
      socket.emit(EVENTS.MOVE_REJECTED, clean);
    }
  });

  socket.on(EVENTS.SEND_CHAT_MESSAGE, (payload, ack) => run(ack, () => {
    assertSocketRate(socket, EVENTS.SEND_CHAT_MESSAGE, { max: 15, windowMs: 10_000 });
    const result = manager.createChatMessage(socket, payload);
    reply(ack, { ok: true, data: result.message });
    io.to(result.room.id).emit(EVENTS.CHAT_MESSAGE, result.message);
  }));

  socket.on(EVENTS.RESIGN_GAME, (payload, ack) => run(ack, () => {
    assertSocketRate(socket, EVENTS.RESIGN_GAME, { max: 10, windowMs: 60_000 });
    const state = manager.resign(socket, payload?.roomId);
    reply(ack, { ok: true, data: state });
    io.to(state.roomId).emit(EVENTS.GAME_OVER, state);
  }));

  socket.on(EVENTS.OFFER_DRAW, (payload, ack) => run(ack, () => {
    assertSocketRate(socket, EVENTS.OFFER_DRAW, { max: 20, windowMs: 60_000 });
    const { room, color } = manager.offerDraw(socket, payload?.roomId);
    const state = manager.snapshot(room);
    reply(ack, { ok: true, data: state });
    socket.to(room.id).emit(EVENTS.DRAW_OFFERED, { by: color, state });
  }));

  for (const [event, accept] of [[EVENTS.ACCEPT_DRAW, true], [EVENTS.DECLINE_DRAW, false]]) {
    socket.on(event, (payload, ack) => run(ack, () => {
      assertSocketRate(socket, event, { max: 20, windowMs: 60_000 });
      const state = manager.respondDraw(socket, payload?.roomId, accept);
      reply(ack, { ok: true, data: state });
      io.to(state.roomId).emit(accept ? EVENTS.GAME_OVER : EVENTS.DRAW_DECLINED, state);
    }));
  }

  socket.on(EVENTS.REQUEST_REMATCH, (payload, ack) => run(ack, () => {
    assertSocketRate(socket, EVENTS.REQUEST_REMATCH, { max: 10, windowMs: 60_000 });
    const { room, color } = manager.requestRematch(socket, payload?.roomId);
    const state = manager.snapshot(room);
    reply(ack, { ok: true, data: state });
    socket.to(room.id).emit(EVENTS.REMATCH_REQUESTED, { by: color, state });
  }));

  for (const [event, accept] of [[EVENTS.ACCEPT_REMATCH, true], [EVENTS.DECLINE_REMATCH, false]]) {
    socket.on(event, (payload, ack) => run(ack, () => {
      assertSocketRate(socket, event, { max: 20, windowMs: 60_000 });
      const result = manager.respondRematch(socket, payload?.roomId, accept);
      reply(ack, { ok: true, data: result.state });
      io.to(result.state.roomId).emit(result.started ? EVENTS.REMATCH_STARTED : EVENTS.REMATCH_DECLINED, result.state);
    }));
  }

  socket.on(EVENTS.LEAVE_GAME, (payload, ack) => run(ack, () => {
    const result = manager.leave(socket, payload?.roomId);
    reply(ack, { ok: true, data: result });
    if (result.state?.status === 'finished') io.to(result.roomId).emit(EVENTS.GAME_OVER, result.state);
  }));

  socket.on('disconnect', () => {
    const result = manager.disconnect(socket);
    if (result) socket.to(result.room.id).emit(EVENTS.PLAYER_DISCONNECTED, { color: result.color, state: result.state });
  });
}
