import { useEffect, useState } from 'react';
import { fetchPlatformStats, measureServerLatency } from '../api/platformStats.api';

const REFRESH_INTERVAL_MS = 30_000;
const initialState = {
  onlinePlayers: null,
  completedGames: null,
  registeredPlayers: null,
  latencyMs: null,
  loading: true,
  error: '',
};

export function usePlatformStats() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let disposed = false;
    let controller = null;

    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      const [statsResult, latencyResult] = await Promise.allSettled([
        fetchPlatformStats(controller.signal),
        measureServerLatency(controller.signal),
      ]);
      if (disposed) return;

      setState((current) => ({
        onlinePlayers: statsResult.status === 'fulfilled'
          ? statsResult.value.onlinePlayers
          : current.onlinePlayers,
        completedGames: statsResult.status === 'fulfilled'
          ? statsResult.value.completedGames
          : current.completedGames,
        registeredPlayers: statsResult.status === 'fulfilled'
          ? statsResult.value.registeredPlayers
          : current.registeredPlayers,
        latencyMs: latencyResult.status === 'fulfilled' ? latencyResult.value : null,
        loading: false,
        error: statsResult.status === 'rejected' && latencyResult.status === 'rejected'
          ? 'Live platform statistics are currently unavailable.'
          : '',
      }));
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, []);

  return state;
}

export { REFRESH_INTERVAL_MS as PLATFORM_STATS_REFRESH_INTERVAL_MS };
