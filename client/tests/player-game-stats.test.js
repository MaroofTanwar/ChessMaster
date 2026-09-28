import { describe, expect, it } from 'vitest';
import { buildRatingHistory, outcomeFor, ratingFieldsFor } from '../src/utils/playerGameStats';

const ranked = (id, endedAt, before, after, uid = 'me') => ({
  id, endedAt, startedAt: endedAt, gameMode: 'ranked', whitePlayerUid: uid,
  blackPlayerUid: 'opponent', whitePlayerName: 'Me', blackPlayerName: 'Opponent',
  whiteRatingBefore: before, whiteRatingAfter: after, whiteRatingChange: after - before,
  blackRatingBefore: 1200, blackRatingAfter: 1200 - (after - before), blackRatingChange: before - after,
  winnerUid: after > before ? uid : after < before ? 'opponent' : null,
});

describe('player game statistics', () => {
  it('builds a starting point plus one point for a single ranked game', () => {
    expect(buildRatingHistory([ranked('one', '2026-09-14', 1200, 1216)], 'me').map((point) => point.rating)).toEqual([1200, 1216]);
  });

  it('sorts multiple ranked results chronologically and ignores casual/legacy games', () => {
    const games = [ranked('two', '2026-09-15', 1216, 1201), { id: 'casual', gameMode: 'casual' }, ranked('one', '2026-09-14', 1200, 1216), { id: 'old', gameMode: 'ranked' }];
    expect(buildRatingHistory(games, 'me').map((point) => point.rating)).toEqual([1200, 1216, 1201]);
  });

  it('selects result and rating fields from the current player perspective', () => {
    const game = ranked('one', '2026-09-14', 1200, 1216);
    expect(outcomeFor(game, 'me')).toBe('WIN');
    expect(outcomeFor(game, 'opponent')).toBe('LOSS');
    expect(ratingFieldsFor(game, 'me')).toEqual({ before: 1200, after: 1216, change: 16 });
  });
});
