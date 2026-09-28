export const BOARD_THEMES = Object.freeze({
  midnight: { name: 'Midnight', light: '#52525b', dark: '#18181b', border: '#3f3f46' },
  classic: { name: 'Classic', light: '#e7d4ae', dark: '#9b6b43', border: '#6f4930' },
  ocean: { name: 'Ocean', light: '#8bb8c8', dark: '#315f73', border: '#214756' },
  forest: { name: 'Forest', light: '#a6bf8d', dark: '#3f684c', border: '#294b35' },
  royal: { name: 'Royal', light: '#b9a7d9', dark: '#65468d', border: '#49316a' },
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
