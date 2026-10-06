import React from 'react';
import CapturedMaterialDisplay from './CapturedMaterialDisplay';

export const CapturedPieces = ({ capturedWhite, capturedBlack, materialAdvantage }) => {
  const advantage = Math.abs(materialAdvantage);
  const leader = materialAdvantage > 0 ? 'White' : materialAdvantage < 0 ? 'Black' : null;

  return (
    <div className="flex flex-col gap-2.5 w-full bg-black/20 p-2.5 rounded-xl border border-white/5">
      {/* Black's Captures (Pieces White lost) */}
      <div className="flex items-center gap-2 min-h-[28px]">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold w-12 shrink-0">
          Black
        </span>
        <CapturedMaterialDisplay pieces={capturedWhite} pieceColor="w" advantage={leader === 'Black' ? advantage : 0} size="panel" className="flex-1" />
      </div>

      {/* White's Captures (Pieces Black lost) */}
      <div className="flex items-center gap-2 min-h-[28px]">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold w-12 shrink-0">
          White
        </span>
        <CapturedMaterialDisplay pieces={capturedBlack} pieceColor="b" advantage={leader === 'White' ? advantage : 0} size="panel" className="flex-1" />
      </div>
    </div>
  );
};

export default CapturedPieces;
