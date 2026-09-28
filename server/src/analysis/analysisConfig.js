export const ANALYSIS_VERSION = 1;
export const ENGINE_ID = 'stockfish-19-lite-single';
export const ANALYSIS_DEPTH = 8;
export const PV_LENGTH = 5;
export const MAX_CONCURRENT_ANALYSES = 2;

export const CLASSIFICATION_THRESHOLDS = Object.freeze({
  excellent: 20,
  good: 50,
  inaccuracy: 100,
  mistake: 200,
});
