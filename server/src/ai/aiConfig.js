import { AI_DIFFICULTIES, AI_DIFFICULTY_ORDER, isAIDifficulty } from '../../../shared/aiDifficultyConfig.mjs';

export const AI_SEARCH_SETTINGS = AI_DIFFICULTIES;
export { AI_DIFFICULTY_ORDER, isAIDifficulty };

// Includes WASM startup and queueing headroom above the 1.2 second Expert search.
export const AI_REQUEST_TIMEOUT_MS = 15_000;
