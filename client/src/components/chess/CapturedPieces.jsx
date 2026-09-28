import React from 'react';
import Piece from './Piece';

const PIECE_VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1 };

export const CapturedPieces = ({ capturedWhite, capturedBlack, materialAdvantage }) => {
  const sortedByValue = (pieces) =>
    [...pieces].sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a]);

  const advantage = Math.abs(materialAdvantage);
  const leader = materialAdvantage > 0 ? 'White' : materialAdvantage < 0 ? 'Black' : null;

  return (
    <div className="flex flex-col gap-2.5 w-full bg-black/20 p-2.5 rounded-xl border border-white/5">
      {/* Black's Captures (Pieces White lost) */}
      <div className="flex items-center gap-2 min-h-[28px]">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold w-12 shrink-0">
          Black
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {sortedByValue(capturedWhite).map((p, i) => (
            <div key={i} className="w-5 h-5 flex items-center justify-center">
              <Piece type={p} color="w" className="w-5 h-5" />
            </div>
          ))}
        </div>
        {leader === 'Black' && (
          <span className="ml-auto text-xs font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
            +{advantage}
          </span>
        )}
      </div>

      {/* White's Captures (Pieces Black lost) */}
      <div className="flex items-center gap-2 min-h-[28px]">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold w-12 shrink-0">
          White
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {sortedByValue(capturedBlack).map((p, i) => (
            <div key={i} className="w-5 h-5 flex items-center justify-center">
              <Piece type={p} color="b" className="w-5 h-5" />
            </div>
          ))}
        </div>
        {leader === 'White' && (
          <span className="ml-auto text-xs font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
            +{advantage}
          </span>
        )}
      </div>
    </div>
  );
};

export default CapturedPieces;
