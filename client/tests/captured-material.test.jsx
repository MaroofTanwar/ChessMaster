import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CapturedMaterialDisplay from '../src/components/chess/CapturedMaterialDisplay';
import CapturedPieces from '../src/components/chess/CapturedPieces';
import PlayerInfoBar from '../src/components/chess/PlayerInfoBar';
import { SettingsContext } from '../src/context/SettingsContext';
import { BOARD_THEMES, DEFAULT_SETTINGS } from '../src/config/settings';
import useChessGame from '../src/hooks/useChessGame';

const settingsValue = (boardTheme = 'midnight') => ({ settings: { ...DEFAULT_SETTINGS, boardTheme } });
const withTheme = (children, boardTheme = 'midnight') => (
  <SettingsContext.Provider value={settingsValue(boardTheme)}>{children}</SettingsContext.Provider>
);

function MaterialHarness() {
  const game = useChessGame();
  return <>
    <button onClick={() => game.makeMove('e2', 'e4')}>e4</button>
    <button onClick={() => game.makeMove('d7', 'd5')}>d5</button>
    <button onClick={() => game.makeMove('e4', 'd5')}>white capture</button>
    <button onClick={() => game.makeMove('d8', 'd5')}>black capture</button>
    <button onClick={game.undo}>undo</button>
    <button onClick={game.redo}>redo</button>
    <div data-side="white">
      <CapturedMaterialDisplay pieces={game.capturedBlack} pieceColor="b" advantage={Math.max(game.materialAdvantage, 0)} />
    </div>
    <div data-side="black">
      <CapturedMaterialDisplay pieces={game.capturedWhite} pieceColor="w" advantage={Math.max(-game.materialAdvantage, 0)} />
    </div>
  </>;
}

describe('captured and material piece presentation', () => {
  it('uses the premium renderer, correct colors, value order, and every board-theme treatment', () => {
    const pieces = ['p', 'n', 'b', 'r', 'q'];
    const { container, rerender } = render(withTheme(
      <><CapturedMaterialDisplay pieces={pieces} pieceColor="w" advantage={18} /><CapturedMaterialDisplay pieces={pieces} pieceColor="b" advantage={18} /></>,
    ));

    for (const theme of Object.keys(BOARD_THEMES)) {
      rerender(withTheme(<><CapturedMaterialDisplay pieces={pieces} pieceColor="w" advantage={18} /><CapturedMaterialDisplay pieces={pieces} pieceColor="b" advantage={18} /></>, theme));
      for (const color of ['w', 'b']) {
        const display = container.querySelector(`[data-testid="captured-material-display"][data-piece-color="${color}"]`);
        const rendered = [...display.querySelectorAll('[data-captured-piece]')];
        expect(rendered.map((node) => node.getAttribute('data-captured-piece'))).toEqual([`${color}q`, `${color}r`, `${color}n`, `${color}b`, `${color}p`]);
        expect(rendered.every((node) => node.querySelector(`[data-piece-art="premium-staunton"][data-piece-theme="${theme}"]`))).toBe(true);
        expect(display.querySelector('[data-material-advantage="18"]')?.textContent).toBe('+18');
      }
    }
  });

  it('updates captures and material through equalization, undo, and redo without hardcoded pieces', () => {
    const { container, getByRole } = render(withTheme(<MaterialHarness />));
    fireEvent.click(getByRole('button', { name: 'e4' }));
    fireEvent.click(getByRole('button', { name: 'd5' }));
    fireEvent.click(getByRole('button', { name: 'white capture' }));
    expect(container.querySelector('[data-side="white"] [data-captured-piece="bp"]')).toBeTruthy();
    expect(container.querySelector('[data-side="white"] [data-material-advantage="1"]')).toBeTruthy();

    fireEvent.click(getByRole('button', { name: 'black capture' }));
    expect(container.querySelector('[data-side="black"] [data-captured-piece="wp"]')).toBeTruthy();
    expect(container.querySelector('[data-material-advantage]')).toBeNull();

    fireEvent.click(getByRole('button', { name: 'undo' }));
    expect(container.querySelector('[data-side="white"] [data-material-advantage="1"]')).toBeTruthy();
    fireEvent.click(getByRole('button', { name: 'redo' }));
    expect(container.querySelector('[data-material-advantage]')).toBeNull();
  });

  it('keeps player-bar and detailed captured panels on the same reusable component', () => {
    const { container } = render(withTheme(<>
      <PlayerInfoBar player={{ name: 'Player', rating: 1200 }} color="b" capturedPieces={['p', 'r']} materialAdvantage={6} compactOnMobile />
      <CapturedPieces capturedWhite={['q']} capturedBlack={['n', 'b']} materialAdvantage={-3} />
    </>));
    const displays = container.querySelectorAll('[data-testid="captured-material-display"]');
    expect(displays.length).toBe(3);
    expect(container.querySelector('[data-testid="player-info-bar"] [data-captured-piece="wp"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="player-info-bar"] [data-captured-piece="wr"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="player-info-bar"] .hidden')).toBeNull();
  });
});
