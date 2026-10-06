import { Router } from 'express';
import { adminDb } from '../config/firebaseAdmin.js';
import { createRateLimiter } from '../middleware/security.js';
import { createPlatformStatsService } from '../services/platformStats.js';

const router = Router();
const statsService = createPlatformStatsService(adminDb);
const statsLimit = createRateLimiter({ name: 'platform-stats', windowMs: 60_000, max: 60 });

router.get('/platform-stats', statsLimit, async (req, res, next) => {
  try {
    const counts = await statsService.getCounts();
    const presence = req.app.get('socialManager');
    const onlinePlayers = presence && typeof presence.onlineUserCount === 'function'
      ? presence.onlineUserCount()
      : null;

    res.set('Cache-Control', 'no-store');
    res.json({
      onlinePlayers,
      completedGames: counts.completedGames,
      registeredPlayers: counts.registeredPlayers,
      measuredAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
