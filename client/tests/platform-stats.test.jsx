import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlatformStatsGrid } from '../src/components/landing/PlatformStatsSection';

afterEach(cleanup);

describe('PlatformStatsGrid', () => {
  it('renders only supplied real aggregate values and measured latency', () => {
    render(
      <PlatformStatsGrid
        stats={{ onlinePlayers: 3, completedGames: 42, registeredPlayers: 8, latencyMs: 27, loading: false, error: '' }}
      />,
    );

    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('27ms')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('Registered Players')).toBeTruthy();
    expect(screen.queryByText('100K+')).toBeNull();
    expect(screen.queryByText('2.5M')).toBeNull();
    expect(screen.queryByText('3200')).toBeNull();
  });

  it('shows unavailable values instead of fabricated fallbacks', () => {
    render(
      <PlatformStatsGrid
        stats={{ onlinePlayers: null, completedGames: null, registeredPlayers: null, latencyMs: null, loading: false, error: 'Live platform statistics are currently unavailable.' }}
      />,
    );
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.getByText('Live platform statistics are currently unavailable.')).toBeTruthy();
  });
});
