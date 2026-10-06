import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import Piece from './Piece';

const PIECE_VALUES = Object.freeze({ q: 9, r: 5, b: 3, n: 3, p: 1 });

export const CapturedMaterialDisplay = ({
  pieces = [],
  pieceColor = 'w',
  advantage = 0,
  size = 'player',
  className = '',
}) => {
  const sortedPieces = useMemo(
    () => [...pieces].sort((a, b) => (PIECE_VALUES[b] || 0) - (PIECE_VALUES[a] || 0)),
    [pieces],
  );

  if (!sortedPieces.length && advantage <= 0) return null;

  const colorName = pieceColor === 'w' ? 'White' : 'Black';
  return <div
    data-testid="captured-material-display"
    data-piece-color={pieceColor}
    className={clsx('flex min-w-0 items-center gap-1', className)}
  >
    {sortedPieces.length > 0 && <div
      role="list"
      aria-label={`Captured ${colorName} pieces`}
      className="flex min-w-0 items-center overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {sortedPieces.map((piece, index) => <div
        role="listitem"
        key={`${piece}-${index}`}
        data-captured-piece={`${pieceColor}${piece}`}
        className={clsx(
          'relative flex shrink-0 items-center justify-center first:ml-0',
          size === 'player' ? '-ml-0.5 h-7 w-6 sm:h-8 sm:w-7' : '-ml-0.5 h-6 w-6',
        )}
      >
        <Piece type={piece} color={pieceColor} />
      </div>)}
    </div>}
    {advantage > 0 && <span
      data-material-advantage={advantage}
      aria-label={`Material advantage plus ${advantage}`}
      className={clsx(
        'shrink-0 rounded border border-cyan-500/30 bg-cyan-950/60 font-mono font-black text-cyan-300',
        size === 'player' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
      )}
    >
      +{advantage}
    </span>}
  </div>;
};

export default React.memo(CapturedMaterialDisplay);
