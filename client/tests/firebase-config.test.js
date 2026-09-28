import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const sdk = vi.hoisted(() => ({
  getApps: vi.fn(), getApp: vi.fn(), initialize: vi.fn(), getAuth: vi.fn(), getFirestore: vi.fn(),
}));
vi.mock('firebase/app', () => ({ getApps: sdk.getApps, getApp: sdk.getApp, initializeApp: sdk.initialize }));
vi.mock('firebase/auth', () => ({ getAuth: sdk.getAuth }));
vi.mock('firebase/firestore', () => ({ getFirestore: sdk.getFirestore }));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const name of ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID']) {
    vi.stubEnv('VITE_FIREBASE_' + name, 'example-test-value');
  }
  sdk.getApps.mockReturnValue([]);
  sdk.initialize.mockReturnValue({ name: '[DEFAULT]' });
  sdk.getAuth.mockReturnValue({ service: 'auth' });
  sdk.getFirestore.mockReturnValue({ service: 'firestore' });
});
afterEach(() => vi.unstubAllEnvs());
it('does not initialize with missing configuration and returns a safe UI message', async () => {
  vi.stubEnv('VITE_FIREBASE_API_KEY', '');
  const config = await import('../src/config/firebase');
  expect(sdk.initialize).not.toHaveBeenCalled();
  expect(config.auth).toBeNull();
  expect(config.db).toBeNull();
  expect(config.firebaseConfigurationError).toContain('client/.env');
});
it('reuses the default app during module reloads', async () => {
  sdk.getApps.mockReturnValue([{ name: '[DEFAULT]' }]);
  sdk.getApp.mockReturnValue({ name: '[DEFAULT]' });
  const config = await import('../src/config/firebase');
  expect(sdk.initialize).not.toHaveBeenCalled();
  expect(sdk.getApp).toHaveBeenCalledOnce();
  expect(config.auth).toEqual({ service: 'auth' });
  expect(config.db).toEqual({ service: 'firestore' });
});
it.each(['getAuth', 'getFirestore'])('handles %s initialization errors without exposing config or crashing public pages', async (service) => {
  sdk[service].mockImplementationOnce(() => { throw new Error('sensitive provider detail'); });
  const config = await import('../src/config/firebase');
  expect(config.firebaseConfigurationError).toContain('could not start');
  expect(config.firebaseConfigurationError).not.toContain('sensitive');
  expect(config.auth).toBeNull();
});