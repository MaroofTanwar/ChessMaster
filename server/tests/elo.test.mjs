import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateElo, ELO_K_FACTOR } from '../src/services/elo.js';

test('equal 1200 ratings exchange 16 points on a decisive result', () => {
  assert.equal(ELO_K_FACTOR, 32);
  assert.deepEqual(calculateElo(1200, 1200, '1-0'), {
    whiteRatingBefore: 1200, whiteRatingAfter: 1216, whiteRatingChange: 16,
    blackRatingBefore: 1200, blackRatingAfter: 1184, blackRatingChange: -16,
  });
});

test('equal ratings remain unchanged after a draw', () => {
  const result = calculateElo(1200, 1200, '1/2-1/2');
  assert.equal(result.whiteRatingChange, 0);
  assert.equal(result.blackRatingChange, 0);
});
