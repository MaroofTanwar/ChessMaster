import { Router } from 'express';
import { adminDb } from '../config/firebaseAdmin.js';
import { requireFirebaseUser } from '../middleware/requireFirebaseUser.js';
import { answerFriendRequest, ensureUsernameLower, publicProfile, removeFriend, sendFriendRequest, socialSnapshot } from '../services/socialService.js';
import { EVENTS } from '../socket/events.js';
import { createRateLimiter } from '../middleware/security.js';
import { isSafeId } from '../utils/validation.js';

const router = Router();
const socialReadLimit = createRateLimiter({ name: 'social-read', windowMs: 60_000, max: 120 });
const socialWriteLimit = createRateLimiter({ name: 'social-write', windowMs: 60_000, max: 20, message: 'Too many social requests. Please wait a moment.' });
const route = (handler) => async (req, res, next) => { try { await handler(req, res); } catch (error) { if (error.status) res.status(error.status).json({ error: error.message }); else next(error); } };

router.use('/social', requireFirebaseUser);
router.use('/social', (req, res, next) => ['GET', 'HEAD'].includes(req.method) ? socialReadLimit(req, res, next) : socialWriteLimit(req, res, next));
router.use('/social', async (req, res, next) => {
  try { await ensureUsernameLower(adminDb, req.firebaseUser.uid, req.firebaseUser.name); next(); }
  catch (error) { next(error); }
});

router.get('/social', route(async (req, res) => res.json(await socialSnapshot(adminDb, req.firebaseUser.uid))));

router.get('/social/search', route(async (req, res) => {
  const term = String(req.query.q || '').trim().toLowerCase().slice(0, 40);
  if (term.length < 2) return res.json({ players: [] });
  const snapshot = await adminDb.collection('users').orderBy('usernameLower').startAt(term).endAt(`${term}\uf8ff`).limit(12).get();
  const social = await socialSnapshot(adminDb, req.firebaseUser.uid);
  const friendIds = new Set(social.friends.map((item) => item.profileKey));
  const outgoingIds = new Set(social.outgoing.map((item) => item.profileKey));
  const incomingIds = new Set(social.incoming.map((item) => item.profileKey));
  const players = snapshot.docs.filter((doc) => doc.id !== req.firebaseUser.uid).map((doc) => ({
    ...publicProfile(doc.id, doc.data()),
    friendStatus: friendIds.has(doc.id) ? 'friends' : outgoingIds.has(doc.id) ? 'sent' : incomingIds.has(doc.id) ? 'incoming' : 'none',
  }));
  return res.json({ players });
}));

router.get('/social/player/:username', route(async (req, res) => {
  const usernameLower = String(req.params.username || '').trim().toLowerCase();
  if (usernameLower.length < 3 || usernameLower.length > 30) return res.status(400).json({ error: 'Invalid username.' });
  const snap = await adminDb.collection('users').where('usernameLower', '==', usernameLower).limit(1).get();
  if (snap.empty) return res.status(404).json({ error: 'Player not found.' });
  const doc = snap.docs[0];
  const { profileKey: _privateKey, ...player } = publicProfile(doc.id, doc.data());
  return res.json({ player });
}));

router.post('/social/requests', route(async (req, res) => {
  const targetUid = String(req.body.targetUid || '');
  if (!isSafeId(targetUid)) return res.status(400).json({ error: 'Invalid player identifier.' });
  const result = await sendFriendRequest(adminDb, req.firebaseUser.uid, targetUid);
  req.app.get('io')?.to(`user:${targetUid}`).emit(EVENTS.SOCIAL_CHANGED);
  res.status(201).json({ ok: true, ...result });
}));
router.post('/social/requests/:id/accept', route(async (req, res) => { if (!isSafeId(req.params.id)) return res.status(400).json({ error: 'Invalid request identifier.' }); const request = await answerFriendRequest(adminDb, req.firebaseUser.uid, req.params.id, true); req.app.get('io')?.to(`user:${request.senderUid}`).to(`user:${request.receiverUid}`).emit(EVENTS.SOCIAL_CHANGED); res.json({ ok: true }); }));
router.post('/social/requests/:id/decline', route(async (req, res) => { if (!isSafeId(req.params.id)) return res.status(400).json({ error: 'Invalid request identifier.' }); const request = await answerFriendRequest(adminDb, req.firebaseUser.uid, req.params.id, false); req.app.get('io')?.to(`user:${request.senderUid}`).to(`user:${request.receiverUid}`).emit(EVENTS.SOCIAL_CHANGED); res.json({ ok: true }); }));
router.delete('/social/friends/:uid', route(async (req, res) => { if (!isSafeId(req.params.uid) || req.params.uid === req.firebaseUser.uid) return res.status(400).json({ error: 'Invalid player identifier.' }); await removeFriend(adminDb, req.firebaseUser.uid, req.params.uid); req.app.get('io')?.to(`user:${req.firebaseUser.uid}`).to(`user:${req.params.uid}`).emit(EVENTS.SOCIAL_CHANGED); res.json({ ok: true }); }));

export default router;
