import { GameError } from './errors.js';

const stores = new WeakMap();

export function assertSocketRate(socket, event, { max, windowMs }) {
  let store = stores.get(socket);
  if (!store) { store = new Map(); stores.set(socket, store); }
  const now = Date.now();
  const current = store.get(event);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;
  bucket.count += 1;
  store.set(event, bucket);
  if (bucket.count > max) throw new GameError('RATE_LIMITED', 'Too many requests. Please wait a moment.');
}
