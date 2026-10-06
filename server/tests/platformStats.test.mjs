import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatformStatsService } from '../src/services/platformStats.js';

function fixture({ completedGames = 12, registeredPlayers = 7 } = {}) {
  const calls = { games: 0, users: 0, where: null };
  const countSnapshot = (value, key) => ({
    count: () => ({
      get: async () => {
        calls[key] += 1;
        return { data: () => ({ count: value }) };
      },
    }),
  });
  const db = {
    collection(name) {
      if (name === 'games') {
        return {
          where(field, operator, values) {
            calls.where = { field, operator, values };
            return countSnapshot(completedGames, 'games');
          },
        };
      }
      if (name === 'users') return countSnapshot(registeredPlayers, 'users');
      throw new Error(`Unexpected collection: ${name}`);
    },
  };
  return { db, calls };
}

test('platform stats use aggregate counts for completed games and registered users', async () => {
  const { db, calls } = fixture();
  const service = createPlatformStatsService(db);
  const stats = await service.getCounts();
  assert.deepEqual(stats, { completedGames: 12, registeredPlayers: 7 });
  assert.deepEqual(calls.where, { field: 'status', operator: 'in', values: ['finished', 'completed'] });
  assert.equal(calls.games, 1);
  assert.equal(calls.users, 1);
});

test('platform stats cache aggregate reads and refresh after the TTL', async () => {
  let now = 1_000;
  const { db, calls } = fixture();
  const service = createPlatformStatsService(db, { cacheTtlMs: 60_000, now: () => now });
  await Promise.all([service.getCounts(), service.getCounts()]);
  await service.getCounts();
  assert.deepEqual(calls, { games: 1, users: 1, where: { field: 'status', operator: 'in', values: ['finished', 'completed'] } });
  now += 60_001;
  await service.getCounts();
  assert.equal(calls.games, 2);
  assert.equal(calls.users, 2);
});
