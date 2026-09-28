import { getApiUrl } from '../config/runtime';

export async function saveAIGame(firebaseUser, game) {
  const response = await fetch(`${getApiUrl()}/api/ai-games`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
    body: JSON.stringify(game),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'AI game could not be saved.');
  return response.json();
}
