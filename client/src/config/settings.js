export const BOARD_THEMES = Object.freeze({
  midnight: { name: 'Midnight', light: '#52525b', dark: '#18181b', border: '#3f3f46' },
  classic: { name: 'Classic', light: '#e7d4ae', dark: '#9b6b43', border: '#6f4930' },
  ocean: { name: 'Ocean', light: '#8bb8c8', dark: '#315f73', border: '#214756' },
  forest: { name: 'Forest', light: '#a6bf8d', dark: '#3f684c', border: '#294b35' },
  royal: { name: 'Royal', light: '#b9a7d9', dark: '#65468d', border: '#49316a' },
});

const treatment = (accent, blackReflection, whiteReflection) => Object.freeze({
  accent,
  white: Object.freeze({ highlight: '#fffef9', upper: '#f7f2e8', mid: whiteReflection, lower: '#d2ccc0', edge: '#a8a198' }),
  black: Object.freeze({ highlight: blackReflection, upper: '#343840', mid: '#15171c', lower: '#08090c', edge: '#020305' }),
  whiteOutline: '#3a342f',
  whiteDetail: '#746d64',
  blackOutline: '#020204',
  blackDetail: accent,
  whiteShadow: `drop-shadow(0 1px 0 rgba(255,255,255,.22)) drop-shadow(0 2px 2px rgba(0,0,0,.62)) drop-shadow(0 4px 3px rgba(0,0,0,.24))`,
  blackShadow: `drop-shadow(0 0 0.65px ${accent}) drop-shadow(0 2px 2px rgba(0,0,0,.78)) drop-shadow(0 4px 3px rgba(0,0,0,.3))`,
});

export const PIECE_TREATMENTS = Object.freeze({
  midnight: treatment('#aebfd4', '#565f6d', '#e2e7ea'),
  classic: treatment('#c9915d', '#594235', '#eadcc7'),
  ocean: treatment('#69c7e8', '#315b6b', '#dceff2'),
  forest: treatment('#76b98a', '#354f3e', '#e1eadb'),
  royal: treatment('#b18be0', '#4f3b68', '#e7dff2'),
});

export const DEFAULT_SETTINGS = Object.freeze({
  boardTheme: 'midnight',
  pieceStyle: 'standard',
  showCoordinates: true,
  showLegalMoves: true,
  highlightLastMove: true,
  moveAnimations: true,
  autoQueen: false,
  confirmResign: false,
  masterSound: true,
  moveSounds: true,
  captureSounds: true,
  checkSounds: true,
  gameEndSounds: true,
  inAppNotifications: true,
});

export const SETTING_KEYS = Object.freeze(Object.keys(DEFAULT_SETTINGS));

export function normalizeSettings(value = {}) {
  const normalized = { ...DEFAULT_SETTINGS };
  for (const key of SETTING_KEYS) {
    if (!(key in value)) continue;
    if (key === 'boardTheme') normalized[key] = BOARD_THEMES[value[key]] ? value[key] : DEFAULT_SETTINGS[key];
    else if (key === 'pieceStyle') normalized[key] = value[key] === 'standard' ? value[key] : DEFAULT_SETTINGS[key];
    else normalized[key] = typeof value[key] === 'boolean' ? value[key] : DEFAULT_SETTINGS[key];
  }
  return normalized;
}
