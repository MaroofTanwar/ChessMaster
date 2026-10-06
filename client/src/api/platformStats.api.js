import { getApiUrl } from '../config/runtime';

const safeCount = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : null);

export async function fetchPlatformStats(signal) {
  const response = await fetch(`${getApiUrl()}/api/platform-stats`, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error('Platform statistics are unavailable.');
  const data = await response.json();
  return {
    onlinePlayers: safeCount(data.onlinePlayers),
    completedGames: safeCount(data.completedGames),
    registeredPlayers: safeCount(data.registeredPlayers),
    measuredAt: typeof data.measuredAt === 'string' ? data.measuredAt : null,
  };
}

export async function measureServerLatency(signal) {
  const startedAt = performance.now();
  const response = await fetch(`${getApiUrl()}/api/health`, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error('Server latency is unavailable.');
  await response.json();
  return Math.max(0, Math.round(performance.now() - startedAt));
}
