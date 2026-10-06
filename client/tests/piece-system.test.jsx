import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { ChessBoard } from '../src/components/chess/ChessBoard';
import Piece from '../src/components/chess/Piece';
import { SettingsContext } from '../src/context/SettingsContext';
import { BOARD_THEMES, DEFAULT_SETTINGS, PIECE_TREATMENTS } from '../src/config/settings';

const renderPiece = (theme, type = 'q', color = 'w') => render(
  <SettingsContext.Provider value={{ settings: { ...DEFAULT_SETTINGS, boardTheme: theme } }}>
    <Piece type={type} color={color} />
  </SettingsContext.Provider>,
);

const renderBoard = (game, boardOrientation = 'white') => render(
  <SettingsContext.Provider value={{ settings: DEFAULT_SETTINGS }}>
    <ChessBoard
      board={game.board()}
      selectedSquare={null}
      legalMoves={[]}
      lastMove={null}
      inCheckSquare={null}
      boardOrientation={boardOrientation}
      pendingPromotion={null}
      turn={game.turn()}
      onSquareClick={() => {}}
      onPromotionSelect={() => {}}
      onPromotionCancel={() => {}}
      isGameOver={false}
      isCheckmate={false}
    />
  </SettingsContext.Provider>,
);

describe('premium chess piece system', () => {
  it('provides a matching treatment for every supported board theme', () => {
    expect(Object.keys(PIECE_TREATMENTS)).toEqual(Object.keys(BOARD_THEMES));
    for (const theme of Object.keys(BOARD_THEMES)) {
      const { container, unmount } = renderPiece(theme, 'n', 'b');
      const piece = container.querySelector('[data-piece-art="premium-staunton"]');
      expect(piece?.getAttribute('data-piece-theme')).toBe(theme);
      expect(piece?.getAttribute('data-piece-color')).toBe('black');
      expect(container.querySelector('svg[aria-label="Black Knight"]')).toBeTruthy();
      expect(container.querySelector('img')).toBeNull();
      unmount();
    }
  });

  it('renders every white and black tournament piece as scalable vector artwork', () => {
    for (const color of ['w', 'b']) {
      for (const type of ['k', 'q', 'r', 'b', 'n', 'p']) {
        const { container, unmount } = renderPiece('ocean', type, color);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('viewBox')).toBe('0 0 45 45');
        expect(svg?.querySelector('linearGradient')).toBeTruthy();
        unmount();
      }
    }
  });

  it('keeps the shared artwork on the correct squares after captures, castling, en passant, promotion, and a board flip', () => {
    const positions = [];

    const capture = new Chess();
    ['e4', 'd5', 'exd5'].forEach((move) => capture.move(move));
    positions.push({ game: capture, square: 'd5', piece: 'wp', empty: 'e4' });

    const castle = new Chess();
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O'].forEach((move) => castle.move(move));
    positions.push({ game: castle, square: 'g1', piece: 'wk', companion: ['f1', 'wr'] });

    const enPassant = new Chess();
    ['e4', 'a6', 'e5', 'd5', 'exd6'].forEach((move) => enPassant.move(move));
    positions.push({ game: enPassant, square: 'd6', piece: 'wp', empty: 'd5' });

    const promotion = new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');
    promotion.move({ from: 'a7', to: 'a8', promotion: 'q' });
    positions.push({ game: promotion, square: 'a8', piece: 'wq', empty: 'a7', orientation: 'black' });

    for (const position of positions) {
      const { container, unmount } = renderBoard(position.game, position.orientation);
      expect(container.querySelector(`[data-square="${position.square}"] [data-piece="${position.piece}"] [data-piece-art="premium-staunton"]`)).toBeTruthy();
      if (position.empty) expect(container.querySelector(`[data-square="${position.empty}"] [data-piece]`)).toBeNull();
      if (position.companion) expect(container.querySelector(`[data-square="${position.companion[0]}"] [data-piece="${position.companion[1]}"]`)).toBeTruthy();
      unmount();
    }
  });
});
