import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChessBoard } from '../src/components/chess/ChessBoard';
import { GameSidebar } from '../src/components/chess/GameSidebar';
import { SettingsContext } from '../src/context/SettingsContext';
import { ToastProvider } from '../src/context/ToastContext';
import { DEFAULT_SETTINGS } from '../src/config/settings';
import useChessGame from '../src/hooks/useChessGame';

const settingsValue = {
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  resetSettings: () => {},
  saveStatus: 'idle',
};

function BoardHarness() {
  const game = useChessGame();
  return (
    <ChessBoard
      board={game.board}
      selectedSquare={game.selectedSquare}
      legalMoves={game.legalMoves}
      lastMove={game.lastMove}
      inCheckSquare={game.inCheckSquare}
      boardOrientation="white"
      pendingPromotion={game.pendingPromotion}
      turn={game.turn}
      onSquareClick={game.selectSquare}
      onPromotionSelect={game.completePromotion}
      onPromotionCancel={game.cancelPromotion}
      isGameOver={game.isGameOver}
      isCheckmate={game.isCheckmate}
    />
  );
}

describe('mobile game layout', () => {
  it('keeps the responsive board authoritative while moving pieces by tap', () => {
    const { container } = render(
      <SettingsContext.Provider value={settingsValue}>
        <BoardHarness />
      </SettingsContext.Provider>
    );

    expect(container.querySelector('[data-mobile-optimized="true"]')).toBeTruthy();
    expect(container.querySelector('[data-square="e2"] [data-piece="wp"]')).toBeTruthy();
    fireEvent.click(container.querySelector('[data-square="e2"]'));
    fireEvent.click(container.querySelector('[data-square="e4"]'));
    expect(container.querySelector('[data-square="e2"] [data-piece]')).toBeNull();
    expect(container.querySelector('[data-square="e4"] [data-piece="wp"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-last-move="true"]')).toHaveLength(2);
  });

  it('uses the compact tab panel with Moves selected by default', () => {
    render(
      <ToastProvider>
        <GameSidebar mobileSheet currentPreset={{ name: 'Rapid 10+0' }} />
      </ToastProvider>
    );
    expect(screen.getByRole('tab', { name: 'Moves (0)' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Game Info' }));
    expect(screen.getByRole('tab', { name: 'Game Info' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: 'Chat' }));
    expect(screen.getByRole('tab', { name: 'Chat' }).getAttribute('aria-selected')).toBe('true');
  });
});


