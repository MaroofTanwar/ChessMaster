import { getApiUrl } from '../config/runtime';

export async function getLeaderboardPage(firebaseUser, cursor) {
  const params = new URLSearchParams();
  if (cursor) {
    params.set('afterRating', String(cursor.rating));
    params.set('afterUid', cursor.uid);
  }
  const response = await fetch(`${getApiUrl()}/api/leaderboard?${params}`, {
    headers: { Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
  });
  if (!response.ok) throw new Error('Leaderboard could not be loaded.');
  return response.json();
}
