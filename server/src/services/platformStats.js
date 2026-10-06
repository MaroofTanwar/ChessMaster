const DEFAULT_CACHE_TTL_MS = 60_000;

const readCount = async (query) => {
  const snapshot = await query.count().get();
  const count = Number(snapshot.data()?.count);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
};

export function createPlatformStatsService(
  db,
  { cacheTtlMs = DEFAULT_CACHE_TTL_MS, now = () => Date.now() } = {},
) {
  let cache = null;
  let pending = null;

  const refresh = async () => {
    const completedGamesQuery = db
      .collection('games')
      .where('status', 'in', ['finished', 'completed']);
    const registeredPlayersQuery = db.collection('users');
    const [gamesResult, playersResult] = await Promise.allSettled([
      readCount(completedGamesQuery),
      readCount(registeredPlayersQuery),
    ]);

    return {
      completedGames: gamesResult.status === 'fulfilled' ? gamesResult.value : null,
      registeredPlayers: playersResult.status === 'fulfilled' ? playersResult.value : null,
    };
  };

  return {
    async getCounts() {
      const timestamp = now();
      if (cache && cache.expiresAt > timestamp) return cache.value;
      if (pending) return pending;

      pending = refresh()
        .then((value) => {
          cache = { value, expiresAt: now() + cacheTtlMs };
          return value;
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    clearCache() {
      cache = null;
    },
  };
}

export const PLATFORM_STATS_CACHE_TTL_MS = DEFAULT_CACHE_TTL_MS;
