import { getApiUrl } from '../config/runtime';

export async function saveUserSettings(firebaseUser, settings) {
  const response = await fetch(`${getApiUrl()}/api/settings`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
    body: JSON.stringify({ settings }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Settings could not be saved.');
  return data.settings;
}
