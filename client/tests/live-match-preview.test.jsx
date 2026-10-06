import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Chess } from 'chess.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LiveMatchPreviewBoard from '../src/components/chess/LiveMatchPreviewBoard';
import {
  LIVE_MATCH_MOVE_ANIMATION_MS,
  LIVE_MATCH_PREVIEW_BEFORE_MOVE_FEN,
  LIVE_MATCH_PREVIEW_FEN,
  LIVE_MATCH_PREVIEW_LAST_MOVE,
  LIVE_MATCH_PREVIEW_MOVES,
  createLiveMatchPreviewGame,
  getLiveMatchAnimatedPieces,
  getLiveMatchMovePause,
} from '../src/utils/liveMatchPreview';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('LiveMatchPreviewBoard', () => {
  it('renders a complete 8x8 position with both armies represented', () => {
    render(<LiveMatchPreviewBoard />);

    expect(screen.getAllByRole('gridcell')).toHaveLength(64);
    expect(screen.getAllByRole('img', { name: /^White / })).toHaveLength(15);
    expect(screen.getAllByRole('img', { name: /^Black / })).toHaveLength(15);
  });

  it('highlights a legal last move that produces the displayed FEN', () => {
    render(<LiveMatchPreviewBoard />);
    const game = new Chess(LIVE_MATCH_PREVIEW_BEFORE_MOVE_FEN);
    const move = game.move(LIVE_MATCH_PREVIEW_LAST_MOVE);

    expect(move?.san).toBe('Rad8');
    expect(game.fen()).toBe(LIVE_MATCH_PREVIEW_FEN);
    expect(document.querySelector('[data-square="a8"]')?.getAttribute('data-last-move')).toBe('from');
    expect(document.querySelector('[data-square="d8"]')?.getAttribute('data-last-move')).toBe('to');
  });

  it('advances the preview with a legal move and updates its highlight', async () => {
    vi.useFakeTimers();
    render(<LiveMatchPreviewBoard />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(getLiveMatchMovePause(0) + 1);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_MATCH_MOVE_ANIMATION_MS + 30);
    });

    const board = screen.getByRole('grid', { name: /live match chess position/i });
    expect(board.getAttribute('data-preview-fen')).not.toBe(LIVE_MATCH_PREVIEW_FEN);
    expect(board.getAttribute('data-preview-move-index')).toBe('1');
    expect(document.querySelector('[data-square="e3"]')?.getAttribute('data-last-move')).toBe('from');
    expect(document.querySelector('[data-square="a7"]')?.getAttribute('data-last-move')).toBe('to');
  });

  it('keeps the complete curated demo line legal in chess.js', () => {
    const game = createLiveMatchPreviewGame();
    LIVE_MATCH_PREVIEW_MOVES.forEach((move) => expect(game.move(move)?.san).toBe(move));
    expect(game.history()).toHaveLength(LIVE_MATCH_PREVIEW_MOVES.length);
    expect(game.isCheckmate()).toBe(true);
    expect(game.isGameOver()).toBe(true);
  });

  it('animates both king and rook for castling and preserves promotion moves', () => {
    const castlingGame = new Chess();
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'].forEach((move) => castlingGame.move(move));
    const castlingBoard = castlingGame.board();
    const castle = castlingGame.move('O-O');
    expect(getLiveMatchAnimatedPieces(castlingBoard, castle).map(({ from, to }) => `${from}-${to}`)).toEqual([
      'e1-g1',
      'h1-f1',
    ]);

    const promotionGame = new Chess('8/P7/8/8/8/4k3/7p/4K3 w - - 0 1');
    const promotionBoard = promotionGame.board();
    const promotion = promotionGame.move('a8=Q');
    expect(getLiveMatchAnimatedPieces(promotionBoard, promotion)[0]).toMatchObject({ from: 'a7', to: 'a8' });
    expect(promotionGame.get('a8')).toMatchObject({ type: 'q', color: 'w' });
  });
});
