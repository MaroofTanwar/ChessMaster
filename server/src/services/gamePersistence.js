import { FieldValue } from 'firebase-admin/firestore';
import { calculateElo, DEFAULT_RATING } from './elo.js';

const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

export async function persistCompletedGame(db, documentId, gamePayload) {
  const gameRef = db.collection('games').doc(documentId);
  const whiteRef = db.collection('users').doc(gamePayload.whitePlayerUid);
  const blackRef = db.collection('users').doc(gamePayload.blackPlayerUid);

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(gameRef);
    if (existing.exists) return existing.data();

    if (gamePayload.gameMode !== 'ranked') {
      const casual = { ...gamePayload, gameMode: 'casual', ratingProcessed: false };
      transaction.create(gameRef, casual);
      return casual;
    }

    const whiteSnapshot = await transaction.get(whiteRef);
    const blackSnapshot = await transaction.get(blackRef);
    if (!whiteSnapshot.exists || !blackSnapshot.exists) throw new Error('Both player profiles are required for ranked rating processing.');
    const white = whiteSnapshot.data();
    const black = blackSnapshot.data();
    const ratings = calculateElo(number(white.rating, DEFAULT_RATING), number(black.rating, DEFAULT_RATING), gamePayload.result);
    const draw = !gamePayload.winnerUid;
    const whiteWon = gamePayload.winnerUid === gamePayload.whitePlayerUid;
    const whiteUpdate = {
      rating: ratings.whiteRatingAfter,
      wins: number(white.wins) + (!draw && whiteWon ? 1 : 0),
      losses: number(white.losses) + (!draw && !whiteWon ? 1 : 0),
      draws: number(white.draws) + (draw ? 1 : 0),
      gamesPlayed: number(white.gamesPlayed) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    };
    const blackUpdate = {
      rating: ratings.blackRatingAfter,
      wins: number(black.wins) + (!draw && !whiteWon ? 1 : 0),
      losses: number(black.losses) + (!draw && whiteWon ? 1 : 0),
      draws: number(black.draws) + (draw ? 1 : 0),
      gamesPlayed: number(black.gamesPlayed) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    };
    const ranked = { ...gamePayload, ...ratings, gameMode: 'ranked', ratingProcessed: true };
    transaction.update(whiteRef, whiteUpdate);
    transaction.update(blackRef, blackUpdate);
    transaction.create(gameRef, ranked);
    return ranked;
  });
}
