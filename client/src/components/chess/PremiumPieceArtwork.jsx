import React, { useId } from 'react';

const PIECE_NAMES = Object.freeze({ p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' });

const PieceShape = ({ type, fill, baseFill, outline, detail, highlight }) => {
  const common = { fill, stroke: outline, strokeWidth: 1.35, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const line = { fill: 'none', stroke: detail, strokeWidth: 1.15, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const shine = { fill: 'none', stroke: highlight, strokeWidth: 1.05, strokeLinecap: 'round', strokeOpacity: 0.68 };

  switch (type) {
    case 'r':
      return <>
        <path {...common} d="M9 39h27v-3H9v3Zm3-3v-4h21v4H12Zm2-6.5V17h17v12.5H14ZM11 14V9h4v2h5V9h5v2h5V9h4v5l-3 3H14l-3-3Z" />
        <path fill={baseFill} stroke={outline} strokeWidth="1.15" d="m14 29.5-1.5 2.5h20L31 29.5H14Z" />
        <path {...line} d="M11 14h23M14 17h17M13 32h19M11 36h23" />
        <path {...shine} d="M14.5 12.7V10.4m1.8 8.4v8.5m-1.7 6.4h14.7" />
      </>;
    case 'n':
      return <>
        <path {...common} d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path {...common} d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3" />
        <path fill={baseFill} stroke={outline} strokeWidth="1.2" d="M15 35.8h22.8L38 39H15v-3.2Z" />
        <path {...line} d="M17.2 34.9c4.7-2 11.4-2 17.1 0M23.8 18.3c3.4 2.2 5.8 5.4 6.7 9.5" />
        <path {...shine} d="M24.7 11.7c5.4 1.8 8.4 5.4 9.9 10.5M17.5 27.2c2.6-1.9 5.2-4.2 6.2-6.3" />
        <ellipse cx="14.45" cy="15.45" rx="1.05" ry="1.45" fill={detail} transform="rotate(-28 14.45 15.45)" />
        <circle cx="9" cy="25.5" r="1" fill={detail} />
      </>;
    case 'b':
      return <>
        <path {...common} d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.6.5 3 2-.7 1-1.6 1-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1-1.4.5-2.3.5-3-.5 1.4-2 3-2 3-2Z" />
        <path {...common} d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2Z" />
        <circle {...common} cx="22.5" cy="8" r="2.65" />
        <path {...line} d="M17.5 26h10M15 30h15M20 18h5m-2.5-2.5v5M10.5 35.6h24" />
        <path {...shine} d="M21.2 11.8c-4.8 3.2-5.5 8.2-2.6 12.1m-1.8 6.9h10.8" />
      </>;
    case 'q':
      return <>
        {[6, 14, 22.5, 31, 39].map((cx, index) => <circle key={cx} {...common} cx={cx} cy={index === 2 ? 8 : index === 0 || index === 4 ? 12 : 9} r="2.35" />)}
        <path {...common} d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26Z" />
        <path {...common} d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4Z" />
        <path {...line} d="M11 29a35 35 0 0 1 23 0m-21.5 2.5h20m-21 3a35 35 0 0 0 22 0m-23 3a35 35 0 0 0 24 0" />
        <path {...shine} d="M10.2 16.8 14 24m2.2 5.8c4.3-.6 8.8-.6 13.1 0" />
      </>;
    case 'k':
      return <>
        <path {...line} strokeWidth="1.55" d="M22.5 11.7V6M20 8h5" />
        <path {...common} d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5Z" />
        <path {...common} d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10v7Z" />
        <path {...line} d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
        <path {...shine} d="M20.5 13.8c-1 2.7.4 6.6 1.5 9.2M11.4 20.5c-2.1 3.9 2 6.6 5.1 8" />
      </>;
    default:
      return <>
        <path {...common} d="M22.5 8.5a4.5 4.5 0 0 0-3.5 7.32 6.8 6.8 0 0 0-.82 10.22C14.85 27.5 11 31.76 11 39.5h23c0-7.74-3.85-12-7.18-13.46A6.8 6.8 0 0 0 26 15.82a4.5 4.5 0 0 0-3.5-7.32Z" />
        <path fill={baseFill} stroke={outline} strokeWidth="1.1" d="M12.1 36.2h20.8c.6 1 .95 2.1 1.1 3.3H11c.16-1.2.5-2.3 1.1-3.3Z" />
        <path {...line} d="M18.6 26.1c2.4 1.1 5.4 1.1 7.8 0M14.7 32.3h15.6" />
        <path {...shine} d="M20.7 10.7c-1.6 1.4-1.5 3.5-.2 4.8m-.8 2.3c-2.2 2-1.7 5 .1 6.7m-4.1 7.1h11.6" />
      </>;
  }
};

export const PremiumPieceArtwork = ({ type = 'p', color = 'w', treatment, className = 'h-full w-full' }) => {
  const reactId = useId().replace(/:/g, '');
  const bodyId = `piece-body-${reactId}`;
  const baseId = `piece-base-${reactId}`;
  const isWhite = color === 'w';
  const safeType = PIECE_NAMES[type] ? type : 'p';
  const material = isWhite ? treatment.white : treatment.black;
  const outline = isWhite ? treatment.whiteOutline : treatment.blackOutline;
  const detail = isWhite ? treatment.whiteDetail : treatment.blackDetail;

  return <svg
    viewBox="0 0 45 45"
    role="img"
    aria-label={`${isWhite ? 'White' : 'Black'} ${PIECE_NAMES[safeType]}`}
    className={className}
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <linearGradient id={bodyId} x1="8%" y1="4%" x2="92%" y2="96%">
        <stop offset="0" stopColor={material.highlight} />
        <stop offset="0.28" stopColor={material.upper} />
        <stop offset="0.58" stopColor={material.mid} />
        <stop offset="0.82" stopColor={material.lower} />
        <stop offset="1" stopColor={material.edge} />
      </linearGradient>
      <linearGradient id={baseId} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={material.upper} />
        <stop offset="0.5" stopColor={material.lower} />
        <stop offset="1" stopColor={material.edge} />
      </linearGradient>
    </defs>
    <PieceShape
      type={safeType}
      fill={`url(#${bodyId})`}
      baseFill={`url(#${baseId})`}
      outline={outline}
      detail={detail}
      highlight={treatment.accent}
    />
  </svg>;
};

export default React.memo(PremiumPieceArtwork);
