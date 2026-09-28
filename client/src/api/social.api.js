import { getApiUrl } from '../config/runtime';

async function request(firebaseUser, path, options = {}) {
  const response = await fetch(`${getApiUrl()}/api/social${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await firebaseUser.getIdToken()}`, ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The social request failed.');
  return body;
}

export const getSocial = (user) => request(user, '');
export const searchPlayers = (user, query) => request(user, `/search?q=${encodeURIComponent(query)}`);
export const getPublicPlayer = (user, username) => request(user, `/player/${encodeURIComponent(username)}`);
export const sendFriendRequest = (user, targetUid) => request(user, '/requests', { method: 'POST', body: JSON.stringify({ targetUid }) });
export const answerFriendRequest = (user, id, accept) => request(user, `/requests/${encodeURIComponent(id)}/${accept ? 'accept' : 'decline'}`, { method: 'POST' });
export const removeFriend = (user, uid) => request(user, `/friends/${encodeURIComponent(uid)}`, { method: 'DELETE' });
