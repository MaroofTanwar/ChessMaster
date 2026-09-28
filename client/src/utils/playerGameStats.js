import { gameDateMillis } from '../api/game.api';

export function outcomeFor(game, uid) {
  return !game.winnerUid ? 'DRAW' : game.winnerUid === uid ? 'WIN' : 'LOSS';
}

export function ratingFieldsFor(game, uid) {
  const white = game.whitePlayerUid === uid;
  return {
    before: white ? game.whiteRatingBefore : game.blackRatingBefore,
    after: white ? game.whiteRatingAfter : game.blackRatingAfter,
    change: white ? game.whiteRatingChange : game.blackRatingChange,
  };
}

export function buildRatingHistory(games, uid) {
  const ranked = games
    .filter((game) => game.gameMode === 'ranked')
    .map((game) => ({ game, rating: ratingFieldsFor(game, uid) }))
    .filter(({ rating }) => Number.isFinite(rating.before) && Number.isFinite(rating.after))
    .sort((a, b) => gameDateMillis(a.game.endedAt) - gameDateMillis(b.game.endedAt));
  if (!ranked.length) return [];
  const first = ranked[0];
  return [
    { rating: first.rating.before, change: null, date: first.game.startedAt || first.game.endedAt, gameId: `${first.game.id}-start`, label: 'Starting rating' },
    ...ranked.map(({ game, rating }) => ({ rating: rating.after, change: rating.change, date: game.endedAt, gameId: game.id, label: game.whitePlayerUid === uid ? game.blackPlayerName : game.whitePlayerName })),
  ];
}
