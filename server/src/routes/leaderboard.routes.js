import { Router } from 'express';
import { adminDb } from '../config/firebaseAdmin.js';
import { requireFirebaseUser } from '../middleware/requireFirebaseUser.js';
import { createRateLimiter } from '../middleware/security.js';
import { isSafeId } from '../utils/validation.js';

const router = Router();
const PAGE_SIZE = 20;
const leaderboardLimit = createRateLimiter({ name: 'leaderboard', windowMs: 60_000, max: 60 });
const publicUser = (snapshot) => {
  const data = snapshot.data();
  const gamesPlayed = Number.isFinite(data.gamesPlayed) ? data.gamesPlayed : 0;
  const wins = Number.isFinite(data.wins) ? data.wins : 0;
  return { uid: snapshot.id, username: data.username || 'Chess Player', avatar: data.avatar || '', rating: Number.isFinite(data.rating) ? data.rating : 1200, gamesPlayed, wins, winRate: gamesPlayed ? Math.round((wins / gamesPlayed) * 1000) / 10 : 0 };
};

router.get('/leaderboard', requireFirebaseUser, leaderboardLimit, async (req, res, next) => {
  try {
    let query = adminDb.collection('users').orderBy('rating', 'desc').orderBy('__name__', 'desc').limit(PAGE_SIZE);
    const cursorRating = Number(req.query.afterRating);
    const cursorUid = typeof req.query.afterUid === 'string' ? req.query.afterUid : '';
    if ((req.query.afterRating !== undefined || req.query.afterUid !== undefined)
      && (!Number.isInteger(cursorRating) || cursorRating < 0 || cursorRating > 100_000 || !isSafeId(cursorUid))) {
      return res.status(400).json({ error: 'Invalid leaderboard cursor.' });
    }
    if (Number.isFinite(cursorRating) && cursorUid) query = query.startAfter(cursorRating, cursorUid);
    const snapshot = await query.get();
    const players = snapshot.docs.map(publicUser);
    const currentSnapshot = await adminDb.collection('users').doc(req.firebaseUser.uid).get();
    let currentUser = null;
    if (currentSnapshot.exists) {
      currentUser = publicUser(currentSnapshot);
      const ahead = await adminDb.collection('users').where('rating', '>', currentUser.rating).count().get();
      currentUser.rank = ahead.data().count + 1;
    }
    const last = players.at(-1);
    res.json({ players, currentUser, hasMore: snapshot.size === PAGE_SIZE, cursor: last ? { rating: last.rating, uid: last.uid } : null });
  } catch (error) { next(error); }
});

export default router;
