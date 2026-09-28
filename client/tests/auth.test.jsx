import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const sdk = vi.hoisted(() => ({
  auth: { currentUser: null }, observer: null, snapshots: [],
  create: vi.fn(), login: vi.fn(), persistence: vi.fn(), update: vi.fn(),
  signOut: vi.fn(), reset: vi.fn(), transaction: vi.fn(),
}));
vi.mock('../src/config/firebase', () => ({ auth: sdk.auth, db: {}, firebaseConfigurationError: null }));
vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'local', browserSessionPersistence: 'session',
  setPersistence: sdk.persistence, createUserWithEmailAndPassword: sdk.create,
  signInWithEmailAndPassword: sdk.login, updateProfile: sdk.update,
  sendPasswordResetEmail: sdk.reset, signOut: sdk.signOut,
  onAuthStateChanged: (_auth, next) => { sdk.observer = next; next(sdk.auth.currentUser); return vi.fn(); },
}));
vi.mock('firebase/firestore', () => ({
  doc: (_db, collection, uid) => ({ collection, uid }),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  runTransaction: (_db, action) => sdk.transaction(action),
  onSnapshot: (ref, next, fail) => { sdk.snapshots.push({ ref, next, fail }); return vi.fn(); },
}));
import { registerApi, loginApi, forgotPasswordApi } from '../src/api/auth.api';
import { ensureUserProfile } from '../src/api/user.api';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import ProtectedRoute from '../src/components/auth/ProtectedRoute';
import { firebaseErrorMessage } from '../src/utils/firebaseErrors';

const player = { uid: 'player-one', email: 'player@example.com', displayName: 'PlayerOne', metadata: { creationTime: '2026-09-12T00:00:00Z' } };
let transaction;
beforeEach(() => {
  vi.clearAllMocks();
  sdk.auth.currentUser = null;
  sdk.snapshots.length = 0;
  transaction = { get: vi.fn().mockResolvedValue({ exists: () => false }), set: vi.fn() };
  sdk.transaction.mockImplementation((action) => action(transaction));
  sdk.persistence.mockResolvedValue();
  sdk.create.mockResolvedValue({ user: player });
  sdk.login.mockResolvedValue({ user: player });
  sdk.update.mockResolvedValue();
  sdk.reset.mockResolvedValue();
  sdk.signOut.mockImplementation(async () => {
    sdk.auth.currentUser = null;
    sdk.observer?.(null);
  });
});
afterEach(cleanup);

describe('Firebase auth and profiles', () => {
  it('registers with a server-timestamped profile and no credentials in the document', async () => {
    const result = await registerApi(' PlayerOne ', ' player@example.com ', 'test-password');
    expect(sdk.persistence).toHaveBeenCalledWith(sdk.auth, 'local');
    expect(result.user.rating).toBe(1200);
    expect(transaction.set).toHaveBeenCalledWith({ collection: 'users', uid: player.uid }, {
      username: 'PlayerOne', email: player.email, avatar: '',
      rating: 1200, wins: 0, losses: 0, draws: 0, gamesPlayed: 0,
      createdAt: 'SERVER_TIMESTAMP', updatedAt: 'SERVER_TIMESTAMP',
    });
  });
  it('never resets an existing profile when a user signs in', async () => {
    transaction.get.mockResolvedValue({ exists: () => true, data: () => ({ username: 'Existing', rating: 1740, wins: 12 }) });
    const result = await loginApi(player.email, 'test-password', false);
    expect(sdk.persistence).toHaveBeenCalledWith(sdk.auth, 'session');
    expect(result.user.rating).toBe(1740);
    expect(transaction.set).not.toHaveBeenCalled();
  });
  it('reports profile failure separately after account creation and supports retry', async () => {
    sdk.transaction.mockRejectedValueOnce({ code: 'permission-denied' });
    const result = await registerApi('PlayerOne', player.email, 'test-password');
    expect(result.user.uid).toBe(player.uid);
    expect(result.profileError).toContain('permissions');
    await ensureUserProfile(player);
    expect(sdk.create).toHaveBeenCalledTimes(1);
    expect(transaction.set).toHaveBeenCalledOnce();
  });
  it('still writes the chosen username if Firebase displayName update fails', async () => {
    sdk.update.mockRejectedValueOnce({ code: 'auth/network-request-failed' });
    const result = await registerApi('ChosenName', player.email, 'test-password');
    expect(result.user.username).toBe('ChosenName');
    expect(result.profileError).toBeNull();
  });
  it.each([
    ['auth/invalid-email', 'valid email'],
    ['auth/weak-password', 'stronger password'],
    ['auth/email-already-in-use', 'already registered'],
    ['auth/invalid-credential', 'Incorrect email'],
    ['auth/network-request-failed', 'internet connection'],
    ['auth/operation-not-allowed', 'not enabled'],
  ])('cleans error %s', (code, expected) => {
    expect(firebaseErrorMessage({ code, message: 'private internals' })).toContain(expected);
  });
  it('does not expose raw unknown errors', () => {
    expect(firebaseErrorMessage({ message: 'secret' })).not.toContain('secret');
  });
  it('sends password reset through Firebase without account enumeration', async () => {
    sdk.reset.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    await expect(forgotPasswordApi(' player@example.com ')).resolves.toBeUndefined();
    expect(sdk.reset).toHaveBeenCalledWith(sdk.auth, player.email);
  });
  it('rejects invalid usernames before creating an account', async () => {
    await expect(registerApi(' x ', player.email, 'test-password')).rejects.toThrow('3 and 30');
    expect(sdk.create).not.toHaveBeenCalled();
  });
});

describe('session observer and protected routes', () => {
  it('restores Firebase sessions, removes legacy JWT, and ignores stale profile callbacks after logout', async () => {
    localStorage.setItem('chessmaster_token', 'obsolete');
    sdk.auth.currentUser = player;
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(localStorage.getItem('chessmaster_token')).toBeNull();
    const stale = sdk.snapshots[0];
    act(() => stale.next({ exists: () => true, data: () => ({ username: 'ProfileName', rating: 1500 }) }));
    expect(result.current.user.username).toBe('ProfileName');
    await act(() => result.current.logout());
    act(() => stale.next({ exists: () => true, data: () => ({ username: 'Stale' }) }));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
  it('keeps the authenticated session and permits profile recovery after Firestore failure', async () => {
    sdk.auth.currentUser = player;
    const { result } = renderHook(useAuth, { wrapper: AuthProvider });
    act(() => sdk.snapshots[0].fail({ code: 'permission-denied' }));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.profileError).toContain('permissions');
    await act(() => result.current.retryProfile());
    expect(result.current.profileError).toBeNull();
    expect(sdk.create).not.toHaveBeenCalled();
  });
  it('redirects an unauthenticated protected-route visit', async () => {
    render(<AuthProvider><MemoryRouter initialEntries={['/private']}><Routes>
      <Route path="/private" element={<ProtectedRoute><div>Private screen</div></ProtectedRoute>} />
      <Route path="/login" element={<div>Login screen</div>} />
    </Routes></MemoryRouter></AuthProvider>);
    expect(await screen.findByText('Login screen')).toBeTruthy();
    expect(screen.queryByText('Private screen')).toBeNull();
  });
  it('does not unmount the guest form while profile creation is pending', async () => {
    let finish;
    sdk.transaction.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    sdk.create.mockImplementation(async () => {
      sdk.auth.currentUser = player;
      sdk.observer(player);
      return { user: player };
    });
    let pending;
    function Form() {
      const { register } = useAuth();
      return <button onClick={() => { pending = register('PlayerOne', player.email, 'test-password'); }}>Register form</button>;
    }
    render(<AuthProvider><MemoryRouter initialEntries={['/register']}><Routes>
      <Route path="/register" element={<ProtectedRoute guestOnly><Form /></ProtectedRoute>} />
      <Route path="/dashboard" element={<div>Dashboard screen</div>} />
    </Routes></MemoryRouter></AuthProvider>);
    await act(async () => screen.getByText('Register form').click());
    expect(screen.getByText('Register form')).toBeTruthy();
    await act(async () => { finish({ uid: player.uid, username: 'PlayerOne' }); await pending; });
    expect(await screen.findByText('Dashboard screen')).toBeTruthy();
  });
});