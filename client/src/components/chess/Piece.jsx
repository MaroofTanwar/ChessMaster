import React from 'react';

// Import official vector SVG piece graphics
import wP from '../../assets/pieces/wP.svg';
import wN from '../../assets/pieces/wN.svg';
import wB from '../../assets/pieces/wB.svg';
import wR from '../../assets/pieces/wR.svg';
import wQ from '../../assets/pieces/wQ.svg';
import wK from '../../assets/pieces/wK.svg';
import bP from '../../assets/pieces/bP.svg';
import bN from '../../assets/pieces/bN.svg';
import bB from '../../assets/pieces/bB.svg';
import bR from '../../assets/pieces/bR.svg';
import bQ from '../../assets/pieces/bQ.svg';
import bK from '../../assets/pieces/bK.svg';

const PIECE_IMAGES = {
  wp: wP,
  wn: wN,
  wb: wB,
  wr: wR,
  wq: wQ,
  wk: wK,
  bp: bP,
  bn: bN,
  bb: bB,
  br: bR,
  bq: bQ,
  bk: bK,
};

export const Piece = ({ type, color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const pieceKey = `${isWhite ? 'w' : 'b'}${type?.toLowerCase() || 'p'}`;
  const imageSrc = PIECE_IMAGES[pieceKey] || PIECE_IMAGES.wp;

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <img
        src={imageSrc}
        alt={`${isWhite ? 'White' : 'Black'} ${type}`}
        draggable={false}
        className={`w-full h-full object-contain pointer-events-none transition-transform duration-100 ${
          isWhite
            ? 'filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
            : 'filter drop-shadow-[0_0_1.5px_rgba(255,255,255,0.8)] drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)]'
        }`}
      />
    </div>
  );
};

export default Piece;
