import { adminAuth } from '../config/firebaseAdmin.js';

export async function requireFirebaseUser(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication is required.' });
  try {
    req.firebaseUser = await adminAuth.verifyIdToken(token, true);
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session could not be verified.' });
  }
}
