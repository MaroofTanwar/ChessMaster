import React from 'react';
import { useSettings } from '../../context/SettingsContext';
import { PIECE_TREATMENTS } from '../../config/settings';
import PremiumPieceArtwork from './PremiumPieceArtwork';

export const Piece = ({ type, color, className = 'w-full h-full' }) => {
  const { settings } = useSettings();
  const themeId = PIECE_TREATMENTS[settings.boardTheme] ? settings.boardTheme : 'midnight';
  const treatment = PIECE_TREATMENTS[themeId];
  const isWhite = color === 'w';

  return (
    <div
      data-piece-art="premium-staunton"
      data-piece-theme={themeId}
      data-piece-color={isWhite ? 'white' : 'black'}
      className={`pointer-events-none flex items-center justify-center select-none ${className}`}
      style={{
        filter: isWhite ? treatment.whiteShadow : treatment.blackShadow,
        transform: 'translateZ(0)',
      }}
    >
      <PremiumPieceArtwork type={type} color={color} treatment={treatment} />
    </div>
  );
};

export default React.memo(Piece);
