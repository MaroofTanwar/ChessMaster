import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuthenticatedSocket } from '../socket/socket';
import { EVENTS } from '../socket/events';
import { getSocial } from '../api/social.api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useSettings } from './SettingsContext';

const SocialContext = createContext(null);
export function SocialProvider({ children }) {
  const { firebaseUser } = useAuth(); const { addToast } = useToast(); const navigate = useNavigate();
  const { settings } = useSettings();
  const settingsRef = useRef(settings);
  const socketRef = useRef(null); const [social, setSocial] = useState({ friends: [], incoming: [], outgoing: [] });
  const friendsRef = useRef([]);
  const [presence, setPresence] = useState({}); const [challenges, setChallenges] = useState([]); const [connected, setConnected] = useState(false);
  const [quickMatch, setQuickMatch] = useState({ status: 'idle', roomId: null });
  const quickMatchRef = useRef(quickMatch);
  const quickMatchOperationRef = useRef(0);
  const updateQuickMatch = useCallback((next) => {
    quickMatchRef.current = typeof next === 'function' ? next(quickMatchRef.current) : next;
    setQuickMatch(quickMatchRef.current);
  }, []);
  const refresh = useCallback(async () => { if (!firebaseUser) return; try { setSocial(await getSocial(firebaseUser)); } catch (e) { if (settingsRef.current.inAppNotifications) addToast(e.message, 'error'); } }, [firebaseUser, addToast]);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { friendsRef.current = social.friends; }, [social.friends]);

  useEffect(() => {
    if (!firebaseUser) { setSocial({ friends: [], incoming: [], outgoing: [] }); setChallenges([]); updateQuickMatch({ status: 'idle', roomId: null }); return undefined; }
    void refresh();
    const socket = createAuthenticatedSocket(firebaseUser); socketRef.current = socket;
    const updatePresence = ({ uid, online }) => setPresence((current) => ({ ...current, [uid]: online }));
    const receiveChallenge = (item) => setChallenges((current) => current.some((c) => c.id === item.id) ? current : [...current, item]);
    const removeChallenge = ({ id }) => setChallenges((current) => current.filter((c) => c.id !== id));
    const accepted = ({ id, roomId }) => { removeChallenge({ id }); if (settingsRef.current.inAppNotifications) addToast('Challenge accepted. Opening the game.', 'success'); navigate(`/multiplayer?room=${encodeURIComponent(roomId)}`); };
    socket.on('connect', () => { setConnected(true); socket.emit(EVENTS.GET_PRESENCE, { uids: friendsRef.current.map((f) => f.profileKey) }, (response) => { if (response?.ok) setPresence(response.data); }); });
    const quickMatchFound = ({ roomId }) => {
      if (!roomId) return;
      updateQuickMatch({ status: 'matched', roomId });
      navigate(`/multiplayer?room=${encodeURIComponent(roomId)}`);
    };
    const quickMatchCancelled = ({ reason } = {}) => {
      updateQuickMatch({ status: 'idle', roomId: null });
      if (reason) addToast(reason, 'info');
    };
    socket.on('disconnect', () => {
      setConnected(false);
      if (['starting', 'searching', 'cancelling'].includes(quickMatchRef.current.status)) {
        quickMatchOperationRef.current += 1;
        updateQuickMatch({ status: 'idle', roomId: null });
        addToast('Quick Match search stopped because the live server disconnected.', 'error');
      }
    });
    socket.on(EVENTS.PRESENCE_UPDATE, updatePresence);
    socket.on(EVENTS.SOCIAL_CHANGED, refresh);
    socket.on(EVENTS.CHALLENGE_RECEIVED, receiveChallenge);
    socket.on(EVENTS.CHALLENGE_ACCEPTED, accepted);
    socket.on(EVENTS.CHALLENGE_DECLINED, ({ id }) => { removeChallenge({ id }); if (settingsRef.current.inAppNotifications) addToast('Challenge declined.', 'info'); });
    socket.on(EVENTS.CHALLENGE_EXPIRED, ({ id }) => { removeChallenge({ id }); if (settingsRef.current.inAppNotifications) addToast('Challenge expired.', 'info'); });
    socket.on(EVENTS.QUICK_MATCH_SEARCHING, () => updateQuickMatch({ status: 'searching', roomId: null }));
    socket.on(EVENTS.QUICK_MATCH_FOUND, quickMatchFound);
    socket.on(EVENTS.QUICK_MATCH_CANCELLED, quickMatchCancelled);
    socket.connect();
    return () => { socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; };
  }, [firebaseUser, refresh, navigate, addToast, updateQuickMatch]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !social.friends.length) return;
    socket.emit(EVENTS.GET_PRESENCE, { uids: social.friends.map((f) => f.profileKey) }, (response) => { if (response?.ok) setPresence((current) => ({ ...current, ...response.data })); });
  }, [social.friends]);

  const emit = useCallback((event, payload) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) return resolve({ ok: false, error: { message: 'The live server is unavailable.' } });
    socket.timeout(8000).emit(event, payload, (timeout, response) => resolve(timeout ? { ok: false, error: { message: 'The server did not respond.' } } : response));
  }), []);
  const waitForLiveSocket = useCallback((timeoutMs = 75_000) => new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const check = () => {
      if (socketRef.current?.connected) { resolve(true); return; }
      if (Date.now() >= deadline) { resolve(false); return; }
      setTimeout(check, 50);
    };
    check();
  }), []);
  const answerChallenge = useCallback(async (id, accept) => {
    const response = await emit(accept ? EVENTS.ACCEPT_CHALLENGE : EVENTS.DECLINE_CHALLENGE, { id });
    if (response?.ok) setChallenges((current) => current.filter((item) => item.id !== id));
    return response;
  }, [emit]);
  const startQuickMatch = useCallback(async () => {
    if (['starting', 'searching', 'cancelling'].includes(quickMatchRef.current.status)) return { ok: true, data: { searching: true } };
    const operation = ++quickMatchOperationRef.current;
    updateQuickMatch({ status: 'starting', roomId: null });
    if (!await waitForLiveSocket()) {
      if (operation !== quickMatchOperationRef.current) return { ok: false, cancelled: true };
      updateQuickMatch({ status: 'idle', roomId: null });
      const response = { ok: false, error: { message: 'The live server is unavailable.' } };
      addToast(response.error.message, 'error');
      return response;
    }
    if (operation !== quickMatchOperationRef.current) return { ok: false, cancelled: true };
    const response = await emit(EVENTS.START_QUICK_MATCH, {});
    if (operation !== quickMatchOperationRef.current) {
      if (response?.ok && response.data?.searching) void emit(EVENTS.CANCEL_QUICK_MATCH, {});
      return { ok: false, cancelled: true };
    }
    if (!response?.ok) {
      updateQuickMatch({ status: 'idle', roomId: null });
      addToast(response?.error?.message || 'Quick Match could not start.', 'error');
    } else if (response.data?.matched && response.data.roomId) {
      updateQuickMatch({ status: 'matched', roomId: response.data.roomId });
      navigate(`/multiplayer?room=${encodeURIComponent(response.data.roomId)}`);
    } else {
      updateQuickMatch({ status: 'searching', roomId: null });
    }
    return response;
  }, [emit, updateQuickMatch, addToast, navigate, waitForLiveSocket]);
  const cancelQuickMatch = useCallback(async () => {
    if (!['starting', 'searching'].includes(quickMatchRef.current.status)) return { ok: true };
    const wasStarting = quickMatchRef.current.status === 'starting';
    quickMatchOperationRef.current += 1;
    if (wasStarting && !socketRef.current?.connected) {
      updateQuickMatch({ status: 'idle', roomId: null });
      return { ok: true, data: { cancelled: true } };
    }
    updateQuickMatch((current) => ({ ...current, status: 'cancelling' }));
    const response = await emit(EVENTS.CANCEL_QUICK_MATCH, {});
    if (!response?.ok) addToast(response?.error?.message || 'Quick Match search could not be cancelled.', 'error');
    updateQuickMatch({ status: 'idle', roomId: null });
    return response;
  }, [emit, updateQuickMatch, addToast]);
  const value = useMemo(() => ({ social, presence, challenges, connected, quickMatch, startQuickMatch, cancelQuickMatch, refresh, challenge: (targetUid, gameMode) => emit(EVENTS.CHALLENGE_FRIEND, { targetUid, gameMode }), acceptChallenge: (id) => answerChallenge(id, true), declineChallenge: (id) => answerChallenge(id, false) }), [social, presence, challenges, connected, quickMatch, startQuickMatch, cancelQuickMatch, refresh, emit, answerChallenge]);
  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}
export const useSocial = () => { const value = useContext(SocialContext); if (!value) throw new Error('useSocial must be inside SocialProvider'); return value; };
