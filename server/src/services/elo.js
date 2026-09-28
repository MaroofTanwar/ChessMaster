export const DEFAULT_RATING = 1200;
export const ELO_K_FACTOR = 32;

export function expectedScore(rating, opponentRating) {
  return 1 / (1 + (10 ** ((opponentRating - rating) / 400)));
}

export function calculateElo(whiteRating, blackRating, result, kFactor = ELO_K_FACTOR) {
  const whiteScore = result === '1-0' ? 1 : result === '0-1' ? 0 : 0.5;
  const blackScore = 1 - whiteScore;
  const whiteAfter = Math.round(whiteRating + kFactor * (whiteScore - expectedScore(whiteRating, blackRating)));
  const blackAfter = Math.round(blackRating + kFactor * (blackScore - expectedScore(blackRating, whiteRating)));
  return {
    whiteRatingBefore: whiteRating, whiteRatingAfter: whiteAfter, whiteRatingChange: whiteAfter - whiteRating,
    blackRatingBefore: blackRating, blackRatingAfter: blackAfter, blackRatingChange: blackAfter - blackRating,
  };
}
