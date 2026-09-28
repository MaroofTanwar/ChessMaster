import { EVENTS } from './events.js';
import { cleanError } from './errors.js';
import { assertSocketRate } from './rateLimit.js';

const reply = (ack, payload) => typeof ack === 'function' && ack(payload);

export function registerMatchmakingHandlers(socket, matchmaking) {
  socket.on(EVENTS.START_QUICK_MATCH, (_payload, ack) => {
    try {
      assertSocketRate(socket, EVENTS.START_QUICK_MATCH, { max: 10, windowMs: 60_000 });
      reply(ack, { ok: true, data: matchmaking.start(socket) });
    } catch (error) {
      reply(ack, { ok: false, error: cleanError(error) });
    }
  });

  socket.on(EVENTS.CANCEL_QUICK_MATCH, (_payload, ack) => {
    try {
      assertSocketRate(socket, EVENTS.CANCEL_QUICK_MATCH, { max: 20, windowMs: 60_000 });
      reply(ack, { ok: true, data: matchmaking.cancel(socket) });
    } catch (error) {
      reply(ack, { ok: false, error: cleanError(error) });
    }
  });

  socket.on('disconnect', () => matchmaking.disconnect(socket));
}
