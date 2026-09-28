export const SETTINGS_THEMES = new Set(['midnight', 'classic', 'ocean', 'forest', 'royal']);
export const SETTINGS_BOOLEAN_KEYS = [
  'showCoordinates', 'showLegalMoves', 'highlightLastMove', 'moveAnimations',
  'autoQueen', 'confirmResign', 'masterSound', 'moveSounds', 'captureSounds',
  'checkSounds', 'gameEndSounds', 'inAppNotifications',
];
export const validSettings = (settings) => settings && typeof settings === 'object' && !Array.isArray(settings)
  && Object.keys(settings).length === SETTINGS_BOOLEAN_KEYS.length + 2
  && SETTINGS_THEMES.has(settings.boardTheme) && settings.pieceStyle === 'standard'
  && SETTINGS_BOOLEAN_KEYS.every((key) => typeof settings[key] === 'boolean')
  && Object.keys(settings).every((key) => SETTINGS_BOOLEAN_KEYS.includes(key) || key === 'boardTheme' || key === 'pieceStyle');
