import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import Piece from './Piece';
import {
  LIVE_MATCH_MOVE_ANIMATION_MS,
  LIVE_MATCH_PREVIEW_LAST_MOVE,
  LIVE_MATCH_PREVIEW_MOVES,
  LIVE_MATCH_RESTART_DELAY_MS,
  createLiveMatchPreviewGame,
  getLiveMatchAnimatedPieces,
  getLiveMatchMovePause,
} from '../../utils/liveMatchPreview';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const STARTING_CLOCK_SECONDS = 225;
const PREVIEW_COLORS = {
  lightSquare: '#5c566b',
  darkSquare: '#342e3d',
  fromHighlight: 'rgba(168, 85, 247, 0.14)',
  fromBorder: 'rgba(216, 180, 254, 0.58)',
  toHighlight: 'rgba(34, 211, 238, 0.1)',
  toBorder: 'rgba(103, 232, 249, 0.55)',
};

const createPositionState = (game, lastMove = LIVE_MATCH_PREVIEW_LAST_MOVE, moveIndex = 0, cycle = 0) => ({
  board: game.board(),
  fen: game.fen(),
  lastMove,
  moveIndex,
  cycle,
  turn: game.turn(),
  isCheck: game.inCheck(),
  isCheckmate: game.isCheckmate(),
  isGameOver: game.isGameOver(),
});

const squareToGrid = (square) => ({
  column: square.charCodeAt(0) - 97,
  row: 8 - Number(square[1]),
});

export const LiveMatchPreviewBoard = ({ onClockChange }) => {
  const [position, setPosition] = useState(() => createPositionState(createLiveMatchPreviewGame()));
  const [pendingMove, setPendingMove] = useState(null);
  const [animationStarted, setAnimationStarted] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );
  const [clockSeconds, setClockSeconds] = useState(STARTING_CLOCK_SECONDS);

  const hiddenPieceSquares = useMemo(
    () => new Set(pendingMove?.animatedPieces.map(({ from }) => from) || []),
    [pendingMove],
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState !== 'hidden';
      if (!isVisible) setAnimationStarted(false);
      setPageVisible(isVisible);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    onClockChange?.(clockSeconds);
  }, [clockSeconds, onClockChange]);

  useEffect(() => {
    if (!pageVisible || position.isGameOver) return undefined;
    const interval = window.setInterval(() => {
      setClockSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [pageVisible, position.isGameOver, position.cycle]);

  useEffect(() => {
    if (!pageVisible || pendingMove) return undefined;

    const demoComplete = position.isGameOver || position.moveIndex >= LIVE_MATCH_PREVIEW_MOVES.length;
    if (demoComplete) {
      const restartTimer = window.setTimeout(() => {
        const nextGame = createLiveMatchPreviewGame();
        setPosition(createPositionState(nextGame, LIVE_MATCH_PREVIEW_LAST_MOVE, 0, position.cycle + 1));
        setClockSeconds(STARTING_CLOCK_SECONDS);
      }, LIVE_MATCH_RESTART_DELAY_MS);
      return () => window.clearTimeout(restartTimer);
    }

    const moveTimer = window.setTimeout(() => {
      const currentGame = new Chess(position.fen);
      const nextGame = new Chess(currentGame.fen());
      const move = nextGame.move(LIVE_MATCH_PREVIEW_MOVES[position.moveIndex]);
      const animatedPieces = getLiveMatchAnimatedPieces(currentGame.board(), move);

      setPendingMove({
        move,
        animatedPieces,
        nextFen: nextGame.fen(),
        nextMoveIndex: position.moveIndex + 1,
        cycle: position.cycle,
      });
    }, getLiveMatchMovePause(position.moveIndex));

    return () => window.clearTimeout(moveTimer);
  }, [pageVisible, pendingMove, position.cycle, position.fen, position.isGameOver, position.moveIndex]);

  useEffect(() => {
    if (!pageVisible || !pendingMove) return undefined;

    const animationFrame = window.requestAnimationFrame(() => setAnimationStarted(true));
    const commitTimer = window.setTimeout(() => {
      const nextGame = new Chess(pendingMove.nextFen);
      setPosition(
        createPositionState(
          nextGame,
          { from: pendingMove.move.from, to: pendingMove.move.to },
          pendingMove.nextMoveIndex,
          pendingMove.cycle,
        ),
      );
      setPendingMove(null);
      setAnimationStarted(false);
    }, LIVE_MATCH_MOVE_ANIMATION_MS);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(commitTimer);
    };
  }, [pageVisible, pendingMove]);

  return (
    <div
      className="relative grid aspect-square w-full max-w-md grid-cols-8 overflow-hidden rounded-xl border"
      role="grid"
      aria-label="Live match chess position"
      aria-live="off"
      data-preview-fen={position.fen}
      data-preview-move-index={position.moveIndex}
      data-preview-paused={!pageVisible}
      style={{
        borderColor: 'rgba(196, 181, 253, 0.24)',
        boxShadow:
          '0 18px 42px rgba(2, 3, 10, 0.55), 0 0 0 1px rgba(168, 85, 247, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {position.board.flatMap((rank, rowIndex) =>
        rank.map((piece, columnIndex) => {
          const square = `${FILES[columnIndex]}${8 - rowIndex}`;
          const isDark = (rowIndex + columnIndex) % 2 === 1;
          const isLastMoveFrom = square === position.lastMove?.from;
          const isLastMoveTo = square === position.lastMove?.to;
          const isCheckedKing =
            position.isCheck && piece?.type === 'k' && piece.color === position.turn;

          return (
            <div
              key={square}
              role="gridcell"
              aria-label={`Chess square ${square}`}
              data-square={square}
              data-square-tone={isDark ? 'dark' : 'light'}
              data-last-move={isLastMoveFrom ? 'from' : isLastMoveTo ? 'to' : undefined}
              className="relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden"
              style={{ backgroundColor: isDark ? PREVIEW_COLORS.darkSquare : PREVIEW_COLORS.lightSquare }}
            >
              {isLastMoveFrom && (
                <div
                  className="pointer-events-none absolute inset-0 z-0"
                  aria-hidden="true"
                  style={{
                    backgroundColor: PREVIEW_COLORS.fromHighlight,
                    boxShadow: `inset 0 0 0 1.5px ${PREVIEW_COLORS.fromBorder}, inset 0 0 12px rgba(168, 85, 247, 0.16)`,
                  }}
                />
              )}
              {isLastMoveTo && (
                <div
                  className="pointer-events-none absolute inset-0 z-0"
                  aria-hidden="true"
                  style={{
                    backgroundColor: PREVIEW_COLORS.toHighlight,
                    boxShadow: `inset 0 0 0 1.5px ${PREVIEW_COLORS.toBorder}, inset 0 0 12px rgba(34, 211, 238, 0.12)`,
                  }}
                />
              )}
              {isCheckedKing && (
                <div
                  className={`pointer-events-none absolute inset-0 z-0 ${
                    position.isCheckmate ? 'bg-rose-600/35' : 'bg-rose-500/20'
                  }`}
                  aria-hidden="true"
                />
              )}
              {piece && !hiddenPieceSquares.has(square) && (
                <div
                  className="pointer-events-none absolute inset-[5%] z-10 flex items-center justify-center select-none"
                >
                  <Piece type={piece.type} color={piece.color} />
                </div>
              )}
            </div>
          );
        }),
      )}

      {pendingMove?.animatedPieces.map(({ from, to, piece }) => {
        const source = squareToGrid(from);
        const destination = squareToGrid(to);
        return (
          <div
            key={`${from}-${to}`}
            className="pointer-events-none absolute z-30 flex items-center justify-center p-[0.625%] will-change-transform"
            data-animating-piece={`${from}-${to}`}
            style={{
              left: `${source.column * 12.5}%`,
              top: `${source.row * 12.5}%`,
              width: '12.5%',
              height: '12.5%',
              transform: animationStarted
                ? `translate(${(destination.column - source.column) * 100}%, ${(destination.row - source.row) * 100}%)`
                : 'translate(0, 0)',
              transition: `transform ${LIVE_MATCH_MOVE_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
          >
            <Piece type={piece.type} color={piece.color} />
          </div>
        );
      })}
    </div>
  );
};

export default LiveMatchPreviewBoard;
