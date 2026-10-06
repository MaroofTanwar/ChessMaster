export const AI_DIFFICULTY_ORDER = Object.freeze([
  'Beginner',
  'Easy',
  'Medium',
  'Hard',
  'Expert',
]);

// This is the single difficulty contract used by the browser and the backend.
// UCI Elo values are internal Stockfish strength controls, not ratings shown to users.
export const AI_DIFFICULTIES = Object.freeze({
  Beginner: Object.freeze({
    detail: 'Relaxed and varied',
    skill: 0,
    limitStrength: true,
    uciElo: 1320,
    moveTime: 90,
    multiPv: 8,
    randomLegalMoveChance: 0.35,
    candidateWeights: Object.freeze([0.12, 0.14, 0.14, 0.14, 0.13, 0.12, 0.11, 0.1]),
    fallbackDepth: 1,
  }),
  Easy: Object.freeze({
    detail: 'Learning challenge',
    skill: 4,
    limitStrength: true,
    uciElo: 1450,
    moveTime: 160,
    multiPv: 4,
    randomLegalMoveChance: 0.08,
    candidateWeights: Object.freeze([0.55, 0.25, 0.14, 0.06]),
    fallbackDepth: 1,
  }),
  Medium: Object.freeze({
    detail: 'Balanced calculation',
    skill: 10,
    limitStrength: true,
    uciElo: 1800,
    moveTime: 350,
    multiPv: 2,
    randomLegalMoveChance: 0,
    candidateWeights: Object.freeze([0.9, 0.1]),
    fallbackDepth: 2,
  }),
  Hard: Object.freeze({
    detail: 'Strong calculation',
    skill: 16,
    limitStrength: true,
    uciElo: 2400,
    moveTime: 700,
    multiPv: 1,
    randomLegalMoveChance: 0,
    candidateWeights: Object.freeze([1]),
    fallbackDepth: 3,
  }),
  Expert: Object.freeze({
    detail: 'Maximum strength',
    skill: 20,
    limitStrength: false,
    uciElo: null,
    moveTime: 1200,
    multiPv: 1,
    randomLegalMoveChance: 0,
    candidateWeights: Object.freeze([1]),
    fallbackDepth: 4,
  }),
});

export const isAIDifficulty = (value) => AI_DIFFICULTY_ORDER.includes(value);

