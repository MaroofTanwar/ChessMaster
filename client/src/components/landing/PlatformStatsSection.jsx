import React from 'react';
import { usePlatformStats } from '../../hooks/usePlatformStats';

const countFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const displayCount = (value) => (Number.isSafeInteger(value) && value >= 0 ? countFormatter.format(value) : '—');

export const PlatformStatsGrid = ({ stats }) => {
  const items = [
    { key: 'online', label: 'Active Players', value: displayCount(stats.onlinePlayers) },
    { key: 'games', label: 'Games Completed', value: displayCount(stats.completedGames) },
    {
      key: 'latency',
      label: 'Server Latency',
      value: Number.isSafeInteger(stats.latencyMs) && stats.latencyMs >= 0 ? `${stats.latencyMs}ms` : '—',
    },
    { key: 'players', label: 'Registered Players', value: displayCount(stats.registeredPlayers), accent: 'gold' },
  ];

  return (
    <section
      className="border-y border-white/5 bg-slate-950/60 px-4 py-20 sm:px-6 lg:px-8"
      aria-label="Live ChessMaster platform statistics"
      aria-busy={stats.loading}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 text-center md:grid-cols-4">
        {items.map((item) => {
          const unavailable = item.value === '—';
          return (
            <div key={item.key} data-platform-stat={item.key} title={unavailable ? 'Unavailable' : undefined}>
              <div
                className={`mb-2 text-4xl font-black sm:text-5xl ${
                  item.accent === 'gold' ? 'text-gradient-gold' : 'text-gradient-purple-cyan'
                } ${stats.loading && unavailable ? 'animate-pulse' : ''}`}
              >
                {item.value}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{item.label}</div>
            </div>
          );
        })}
      </div>
      {stats.error && <p className="mt-5 text-center text-xs text-slate-500">{stats.error}</p>}
    </section>
  );
};

export const PlatformStatsSection = () => {
  const stats = usePlatformStats();
  return <PlatformStatsGrid stats={stats} />;
};

export default PlatformStatsSection;
