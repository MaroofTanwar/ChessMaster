import { FieldValue } from 'firebase-admin/firestore';

const publicProfile = (uid, data = {}) => ({
  username: data.username || 'Chess Player',
  avatar: data.avatar || null,
  rating: Number.isFinite(data.rating) ? data.rating : 1200,
  gamesPlayed: Number.isFinite(data.gamesPlayed) ? data.gamesPlayed : 0,
  wins: Number.isFinite(data.wins) ? data.wins : 0,
  losses: Number.isFinite(data.losses) ? data.losses : 0,
  draws: Number.isFinite(data.draws) ? data.draws : 0,
  profileKey: uid,
});

export const pairId = (a, b) => [a, b].sort().join('__');

export async function profilesByUid(db, uids) {
  const unique = [...new Set(uids.filter(Boolean))];
  if (!unique.length) return new Map();
  const snapshots = await db.getAll(...unique.map((uid) => db.collection('users').doc(uid)));
  return new Map(snapshots.filter((doc) => doc.exists).map((doc) => [doc.id, publicProfile(doc.id, doc.data())]));
}

export async function ensureUsernameLower(db, uid, fallback = '') {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data();
  const normalized = String(data.username || fallback).trim().toLowerCase();
  if (normalized && data.usernameLower !== normalized) await ref.update({ usernameLower: normalized });
}

export async function socialSnapshot(db, uid) {
  const [friendships, incoming, outgoing] = await Promise.all([
    db.collection('friendships').where('memberUids', 'array-contains', uid).limit(100).get(),
    db.collection('friendRequests').where('receiverUid', '==', uid).limit(100).get(),
    db.collection('friendRequests').where('senderUid', '==', uid).limit(100).get(),
  ]);
  const friendUids = friendships.docs.map((doc) => doc.data().memberUids?.find((id) => id !== uid)).filter(Boolean);
  const incomingDocs = incoming.docs.filter((doc) => doc.data().status === 'pending');
  const outgoingDocs = outgoing.docs.filter((doc) => doc.data().status === 'pending');
  const profiles = await profilesByUid(db, [...friendUids, ...incomingDocs.map((d) => d.data().senderUid), ...outgoingDocs.map((d) => d.data().receiverUid)]);
  return {
    friends: friendUids.map((id) => profiles.get(id)).filter(Boolean),
    incoming: incomingDocs.map((doc) => ({ id: doc.id, ...profiles.get(doc.data().senderUid), createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null })),
    outgoing: outgoingDocs.map((doc) => ({ id: doc.id, ...profiles.get(doc.data().receiverUid) })),
  };
}

export async function areFriends(db, uidA, uidB) {
  return (await db.collection('friendships').doc(pairId(uidA, uidB)).get()).exists;
}

export async function sendFriendRequest(db, senderUid, receiverUid) {
  if (!receiverUid || senderUid === receiverUid) throw Object.assign(new Error('You cannot add yourself.'), { status: 400 });
  const receiver = await db.collection('users').doc(receiverUid).get();
  if (!receiver.exists) throw Object.assign(new Error('Player not found.'), { status: 404 });
  const id = pairId(senderUid, receiverUid);
  await db.runTransaction(async (tx) => {
    const friendshipRef = db.collection('friendships').doc(id);
    const requestRef = db.collection('friendRequests').doc(id);
    const [friendship, request] = await Promise.all([tx.get(friendshipRef), tx.get(requestRef)]);
    if (friendship.exists) throw Object.assign(new Error('You are already friends.'), { status: 409 });
    if (request.exists && request.data().status === 'pending') throw Object.assign(new Error('A friend request is already pending.'), { status: 409 });
    tx.set(requestRef, { senderUid, receiverUid, status: 'pending', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  });
  return { id };
}

export async function answerFriendRequest(db, uid, requestId, accept) {
  return db.runTransaction(async (tx) => {
    const requestRef = db.collection('friendRequests').doc(requestId);
    const snap = await tx.get(requestRef);
    if (!snap.exists || snap.data().receiverUid !== uid || snap.data().status !== 'pending') {
      throw Object.assign(new Error('This friend request is no longer available.'), { status: 409 });
    }
    const request = snap.data();
    tx.update(requestRef, { status: accept ? 'accepted' : 'declined', updatedAt: FieldValue.serverTimestamp() });
    if (accept) tx.set(db.collection('friendships').doc(pairId(request.senderUid, request.receiverUid)), {
      memberUids: [request.senderUid, request.receiverUid].sort(), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    return { senderUid: request.senderUid, receiverUid: request.receiverUid, accepted: accept };
  });
}

export async function removeFriend(db, uid, friendUid) {
  await db.collection('friendships').doc(pairId(uid, friendUid)).delete();
}

export { publicProfile };
