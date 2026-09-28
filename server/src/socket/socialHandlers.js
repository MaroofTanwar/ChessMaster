import { EVENTS } from './events.js';
import { assertSocketRate } from './rateLimit.js';

const reply = (ack, payload) => typeof ack === 'function' && ack(payload);
const clean = (error) => ({ code: 'SOCIAL_ERROR', message: error?.message || 'That social action failed.' });

export function registerSocialHandlers(io, socket, social) {
  social.connect(socket);
  socket.on(EVENTS.GET_PRESENCE, (payload, ack) => { try { assertSocketRate(socket, EVENTS.GET_PRESENCE, { max: 30, windowMs: 10_000 }); reply(ack, { ok: true, data: social.presence(Array.isArray(payload?.uids) ? payload.uids : []) }); } catch (e) { reply(ack, { ok: false, error: clean(e) }); } });
  socket.on(EVENTS.CHALLENGE_FRIEND, async (payload, ack) => { try { assertSocketRate(socket, EVENTS.CHALLENGE_FRIEND, { max: 10, windowMs: 60_000 }); reply(ack, { ok: true, data: await social.challenge(socket, payload) }); } catch (e) { reply(ack, { ok: false, error: clean(e) }); } });
  socket.on(EVENTS.ACCEPT_CHALLENGE, (payload, ack) => { try { assertSocketRate(socket, EVENTS.ACCEPT_CHALLENGE, { max: 20, windowMs: 60_000 }); reply(ack, { ok: true, data: social.accept(socket, payload?.id) }); } catch (e) { reply(ack, { ok: false, error: clean(e) }); } });
  socket.on(EVENTS.DECLINE_CHALLENGE, (payload, ack) => { try { assertSocketRate(socket, EVENTS.DECLINE_CHALLENGE, { max: 20, windowMs: 60_000 }); social.decline(socket, payload?.id); reply(ack, { ok: true }); } catch (e) { reply(ack, { ok: false, error: clean(e) }); } });
  socket.on('disconnect', () => social.disconnect(socket));
}
