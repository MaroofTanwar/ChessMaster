const developmentBackend = import.meta.env.DEV ? 'http://localhost:5000' : '';
const configuredApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL || developmentBackend;
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || developmentBackend;

const normalize = (value) => String(value || '').trim().replace(/\/$/, '');

export function getApiUrl() {
  const value = normalize(configuredApiUrl);
  if (!value) throw new Error('The backend URL is not configured. Set VITE_API_URL for this deployment.');
  return value;
}

export function getSocketUrl() {
  const value = normalize(configuredSocketUrl);
  if (!value) throw new Error('The Socket.IO URL is not configured. Set VITE_SOCKET_URL for this deployment.');
  return value;
}
