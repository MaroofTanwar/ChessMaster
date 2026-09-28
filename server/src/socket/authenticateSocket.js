import { adminAuth, adminDb } from '../config/firebaseAdmin.js';

export const authenticateSocket = async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (typeof token !== 'string' || token.length < 20) {
    const error = new Error('Authentication is required.');
    error.data = { code: 'AUTH_REQUIRED' };
    return next(error);
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    const profileSnapshot = await adminDb.collection('users').doc(decoded.uid).get();
    socket.user = { uid: decoded.uid, name: decoded.name || decoded.email || 'Chess Player' };
    socket.profile = profileSnapshot.exists ? profileSnapshot.data() : {};
    return next();
  } catch {
    const error = new Error('Your session could not be verified. Please sign in again.');
    error.data = { code: 'AUTH_FAILED' };
    return next(error);
  }
};
