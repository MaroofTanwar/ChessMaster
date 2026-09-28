import { Router } from 'express';
import { adminDb } from '../config/firebaseAdmin.js';
import { requireFirebaseUser } from '../middleware/requireFirebaseUser.js';
import { cancelJob, getCachedAnalysis, getJob, startAnalysis } from '../analysis/analysisService.js';
import { createRateLimiter } from '../middleware/security.js';
import { isSafeId } from '../utils/validation.js';

const router = Router();
const analysisLimit = createRateLimiter({ name: 'analysis-start', windowMs: 10 * 60_000, max: 10, message: 'Too many analysis requests. Please wait before trying again.' });
const requireId = (param) => (req, res, next) => isSafeId(req.params[param]) ? next() : res.status(400).json({ error: 'Invalid request identifier.' });
router.get('/game-analyses/:gameId', requireFirebaseUser, requireId('gameId'), async (req, res, next) => { try { const analysis = await getCachedAnalysis(adminDb, req.params.gameId, req.firebaseUser.uid); res.json({ analysis }); } catch (e) { next(e); } });
router.post('/game-analyses/:gameId', requireFirebaseUser, analysisLimit, requireId('gameId'), async (req, res, next) => { try { const result = await startAnalysis(adminDb, req.params.gameId, req.firebaseUser.uid); res.status(result.cached ? 200 : 202).json(result); } catch (e) { if (e.status) res.status(e.status).json({ error: e.message }); else next(e); } });
router.get('/game-analysis-jobs/:jobId', requireFirebaseUser, requireId('jobId'), (req, res) => { const job = getJob(req.params.jobId, req.firebaseUser.uid); if (!job) return res.status(404).json({ error: 'Analysis job not found.' }); return res.json(job); });
router.delete('/game-analysis-jobs/:jobId', requireFirebaseUser, requireId('jobId'), async (req, res) => res.json({ cancelled: await cancelJob(req.params.jobId, req.firebaseUser.uid) }));
export default router;
