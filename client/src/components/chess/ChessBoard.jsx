import React from 'react';
import { clsx } from 'clsx';
import Piece from './Piece';
import PromotionModal from './PromotionModal';
import { useSettings } from '../../context/SettingsContext';
import { BOARD_THEMES } from '../../config/settings';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

export const ChessBoard = ({
  board,
  selectedSquare,
  legalMoves,
  lastMove,
  inCheckSquare,
  boardOrientation = 'white',
  pendingPromotion,
  turn,
  onSquareClick,
  onPromotionSelect,
  onPromotionCancel,
  isGameOver,
  isCheckmate,
}) => {
  const { settings } = useSettings();
  const theme = BOARD_THEMES[settings.boardTheme] || BOARD_THEMES.midnight;
  const displayRanks = boardOrientation === 'white' ? RANKS : [...RANKS].reverse();
  const displayFiles = boardOrientation === 'white' ? FILES : [...FILES].reverse();

  const legalMoveTargets = settings.showLegalMoves ? legalMoves.map((m) => m.to) : [];
  const captureTargets = settings.showLegalMoves ? legalMoves.filter((m) => m.isCapture).map((m) => m.to) : [];

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* Promotion Modal */}
      <PromotionModal
        isOpen={!!pendingPromotion}
        color={turn}
        onSelect={onPromotionSelect}
        onClose={onPromotionCancel}
      />

      {/* Board Container */}
      <div className="relative w-full" data-board-theme={settings.boardTheme} data-coordinates={settings.showCoordinates} style={{ maxWidth: '600px' }}>
        {/* File Labels (Top) */}
        {settings.showCoordinates && <div className="flex mb-1.5 pl-6 pr-6">
          {displayFiles.map((file) => (
            <div
              key={file}
              className="flex-1 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono"
            >
              {file}
            </div>
          ))}
        </div>}

        <div className="flex">
          {/* Rank Labels (Left) */}
          {settings.showCoordinates && <div className="flex flex-col justify-around w-6 mr-1">
            {displayRanks.map((rank) => (
              <div
                key={rank}
                className="flex items-center justify-center text-[11px] font-bold text-slate-400 font-mono"
                style={{ height: `calc(100% / 8)` }}
              >
                {rank}
              </div>
            ))}
          </div>}

          {/* The actual chessboard */}
          <div
            className="flex-1 grid grid-cols-8 rounded-xl overflow-hidden shadow-2xl border-2"
            style={{ aspectRatio: '1/1', borderColor: theme.border }}
          >
            {displayRanks.map((rank) =>
              displayFiles.map((file) => {
                const square = `${file}${rank}`;
                const pieceData = (() => {
                  const fi = FILES.indexOf(file);
                  const ri = RANKS.indexOf(rank);
                  return board[ri]?.[fi];
                })();

                const isLight = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 0;
                const isSelected = selectedSquare === square;
                const isLastMoveFrom = lastMove?.from === square;
                const isLastMoveTo = lastMove?.to === square;
                const isLegalTarget = legalMoveTargets.includes(square);
                const isCaptureTarget = captureTargets.includes(square);
                const isInCheck = inCheckSquare === square;

                const bgColor = isLight ? theme.light : theme.dark;

                return (
                  <div
                    key={square}
                    data-square={square}
                    data-legal-target={isLegalTarget}
                    data-last-move={settings.highlightLastMove && (isLastMoveFrom || isLastMoveTo)}
                    data-move-animations={settings.moveAnimations}
                    aria-label={`Chess square ${square}`}
                    onClick={() => !isGameOver && onSquareClick(square)}
                    className={clsx(
                      'relative flex items-center justify-center select-none',
                      settings.moveAnimations && 'transition-all duration-100 motion-reduce:transition-none',
                      !isGameOver && 'cursor-pointer',
                      isGameOver && 'cursor-default',
                    )}
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Last Move Highlight */}
                    {settings.highlightLastMove && (isLastMoveFrom || isLastMoveTo) && (
                      <div className="absolute inset-0 bg-cyan-400/25 z-0" />
                    )}

                    {/* Selected Square Highlight */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-purple-500/40 ring-2 ring-inset ring-purple-400 z-0" />
                    )}

                    {/* Check / Checkmate Highlight */}
                    {isInCheck && (
                      <div
                        className={clsx(
                          'absolute inset-0 z-0 animate-pulse',
                          isCheckmate
                            ? 'bg-rose-600/70 ring-4 ring-inset ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.9)]'
                            : 'bg-rose-600/50 ring-2 ring-inset ring-rose-400',
                        )}
                      />
                    )}

                    {/* Legal Move Dot (empty square) */}
                    {isLegalTarget && !pieceData && (
                      <div className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400/80 shadow-[0_0_8px_rgba(34,211,238,0.8)] z-10 pointer-events-none" />
                    )}

                    {/* Capture Ring */}
                    {isCaptureTarget && pieceData && (
                      <div className="absolute inset-0 ring-4 ring-inset ring-rose-500/90 rounded-sm z-10 pointer-events-none" />
                    )}

                    {/* Piece */}
                    {pieceData && (
                      <div className="absolute inset-0 flex items-center justify-center z-20 select-none">
                        <div className="w-full h-full p-[8%]">
                          <Piece type={pieceData.type} color={pieceData.color} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Rank Labels (Right) */}
          {settings.showCoordinates && <div className="flex flex-col justify-around w-6 ml-1">
            {displayRanks.map((rank) => (
              <div
                key={rank}
                className="flex items-center justify-center text-[11px] font-bold text-slate-400 font-mono"
                style={{ height: `calc(100% / 8)` }}
              >
                {rank}
              </div>
            ))}
          </div>}
        </div>

        {/* File Labels (Bottom) */}
        {settings.showCoordinates && <div className="flex mt-1.5 pl-6 pr-6">
          {displayFiles.map((file) => (
            <div
              key={file}
              className="flex-1 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest font-mono"
            >
              {file}
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
};

export default ChessBoard;
