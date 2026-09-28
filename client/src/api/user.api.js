import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export function toAppUser(firebaseUser, profile = {}) {
  const createdAt = profile.createdAt?.toDate?.().toISOString()
    || firebaseUser.metadata?.creationTime || null;
  return {
    uid: firebaseUser.uid,
    username: profile.username || firebaseUser.displayName || 'Chess Player',
    email: firebaseUser.email || '',
    avatar: profile.avatar ?? firebaseUser.photoURL ?? '',
    rating: profile.rating ?? 1200,
    wins: profile.wins ?? 0,
    losses: profile.losses ?? 0,
    draws: profile.draws ?? 0,
    gamesPlayed: profile.gamesPlayed ?? 0,
    settings: profile.settings || null,
    createdAt,
    updatedAt: profile.updatedAt?.toDate?.().toISOString() || null,
  };
}

// Idempotent across retries/tabs; existing chess statistics are never reset.
export async function ensureUserProfile(firebaseUser, username = firebaseUser.displayName) {
  const reference = doc(db, 'users', firebaseUser.uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists()) return toAppUser(firebaseUser, snapshot.data());
    const profile = {
      username: username?.trim() || 'Chess Player',
      email: firebaseUser.email,
      avatar: firebaseUser.photoURL || '',
      rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    transaction.set(reference, profile);
    return toAppUser(firebaseUser, profile);
  });
}
