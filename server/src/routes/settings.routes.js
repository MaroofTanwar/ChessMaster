import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../config/firebaseAdmin.js';
import { requireFirebaseUser } from '../middleware/requireFirebaseUser.js';
import { validSettings } from '../services/settingsSchema.js';
import { createRateLimiter } from '../middleware/security.js';

const router = Router();
const settingsLimit = createRateLimiter({ name: 'settings-write', windowMs: 60_000, max: 30 });

router.put('/settings', requireFirebaseUser, settingsLimit, async (req, res, next) => {
  try {
    if (!validSettings(req.body?.settings)) return res.status(400).json({ error: 'Settings payload is invalid.' });
    await adminDb.collection('users').doc(req.firebaseUser.uid).update({ settings: req.body.settings, updatedAt: FieldValue.serverTimestamp() });
    return res.json({ settings: req.body.settings });
  } catch (error) { return next(error); }
});

export default router;
