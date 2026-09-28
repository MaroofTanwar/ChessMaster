import { getApiUrl } from '../config/runtime';
const call = async (firebaseUser, path, options = {}) => {
  const response = await fetch(`${getApiUrl()}/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await firebaseUser.getIdToken()}`, ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Game analysis request failed.');
  return body;
};
export const startGameAnalysis = (user, gameId) => call(user, `/game-analyses/${encodeURIComponent(gameId)}`, { method: 'POST' });
export const getAnalysisJob = (user, jobId) => call(user, `/game-analysis-jobs/${encodeURIComponent(jobId)}`);
export const cancelAnalysisJob = (user, jobId) => call(user, `/game-analysis-jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
