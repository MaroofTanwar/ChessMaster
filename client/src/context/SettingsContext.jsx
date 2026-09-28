import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { saveUserSettings } from '../api/settings.api';
import { DEFAULT_SETTINGS, normalizeSettings } from '../config/settings';

const CACHE_PREFIX = 'chessmaster_settings';
const fallbackValue = {
  settings: DEFAULT_SETTINGS, saveStatus: 'idle', updateSetting: () => {}, resetSettings: () => {},
};
export const SettingsContext = createContext(fallbackValue);
const cacheKey = (uid) => `${CACHE_PREFIX}:${uid || 'guest'}`;
const readCache = (uid) => {
  try { return normalizeSettings(JSON.parse(localStorage.getItem(cacheKey(uid)) || '{}')); }
  catch { return { ...DEFAULT_SETTINGS }; }
};

export function SettingsProvider({ children }) {
  const { firebaseUser, user } = useAuth();
  const uid = firebaseUser?.uid || null;
  const [settings, setSettings] = useState(() => readCache(null));
  const [saveStatus, setSaveStatus] = useState('idle');
  const initializedUid = useRef(undefined);
  const pendingSave = useRef(false);
  const revision = useRef(0);
  const activeUid = useRef(uid);
  const saveChain = useRef(Promise.resolve());

  useEffect(() => {
    if (initializedUid.current !== uid) {
      initializedUid.current = uid;
      activeUid.current = uid;
      pendingSave.current = false;
      revision.current = 0;
      const cached = readCache(uid);
      const next = user?.settings ? normalizeSettings(user.settings) : cached;
      setSettings(next);
      try { localStorage.setItem(cacheKey(uid), JSON.stringify(next)); } catch { /* Storage may be blocked. */ }
      setSaveStatus('idle');
      return;
    }
    if (user?.settings && !pendingSave.current) {
      const next = normalizeSettings(user.settings);
      setSettings(next);
      try { localStorage.setItem(cacheKey(uid), JSON.stringify(next)); } catch { /* Storage may be blocked. */ }
    }
  }, [uid, user?.settings]);

  useEffect(() => {
    try { localStorage.setItem(cacheKey(uid), JSON.stringify(settings)); } catch { /* Storage may be blocked. */ }
    if (!uid || !pendingSave.current) return undefined;
    setSaveStatus('saving');
    const saveRevision = revision.current;
    const settingsToSave = settings;
    const userToSave = firebaseUser;
    const timer = setTimeout(() => {
      const operation = saveChain.current.then(() => saveUserSettings(userToSave, settingsToSave));
      saveChain.current = operation.catch(() => {});
      operation.then(() => {
        if (activeUid.current !== uid) return;
        if (revision.current === saveRevision) {
          pendingSave.current = false;
          setSaveStatus('saved');
        }
      }).catch(() => {
        if (activeUid.current === uid && revision.current === saveRevision) setSaveStatus('error');
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [settings, uid, firebaseUser]);

  const updateSetting = useCallback((key, value) => {
    if (!(key in DEFAULT_SETTINGS)) return;
    revision.current += 1;
    pendingSave.current = true;
    setSaveStatus('saving');
    setSettings((current) => normalizeSettings({ ...current, [key]: value }));
  }, []);
  const resetSettings = useCallback(() => {
    revision.current += 1;
    pendingSave.current = true;
    setSaveStatus('saving');
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);
  const value = useMemo(() => ({ settings, saveStatus, updateSetting, resetSettings }), [settings, saveStatus, updateSetting, resetSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
