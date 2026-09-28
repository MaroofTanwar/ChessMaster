import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, firebaseConfigurationError } from '../config/firebase';
import { registerApi, loginApi, logoutApi } from '../api/auth.api';
import { ensureUserProfile, toAppUser } from '../api/user.api';
import { firebaseErrorMessage } from '../utils/firebaseErrors';

const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(!!auth);
  const [isAuthPending, setIsAuthPending] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [authError, setAuthError] = useState(firebaseConfigurationError);
  const [profileSubscription, setProfileSubscription] = useState(0);
  const operation = useRef(false);

  useEffect(() => {
    try { localStorage.removeItem('chessmaster_token'); } catch { /* Site storage may be blocked. */ }
    if (!auth) return;
    let unsubscribeProfile = () => {};
    let generation = 0;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      const currentGeneration = ++generation;
      unsubscribeProfile();
      setFirebaseUser(currentUser);
      setUser(currentUser ? toAppUser(currentUser) : null);
      setProfileError(null);
      setAuthError(null);
      setIsLoading(false);
      if (!currentUser) return;
      unsubscribeProfile = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
        if (generation !== currentGeneration) return;
        if (snapshot.exists()) {
          setUser(toAppUser(currentUser, snapshot.data()));
          setProfileError(null);
        } else {
          setProfileError('Your account is ready, but your profile has not been saved. Please retry profile setup.');
        }
      }, (error) => {
        if (generation !== currentGeneration) return;
        setProfileError(firebaseErrorMessage(error, 'Your profile could not be loaded. Please retry.'));
      });
    }, (error) => {
      ++generation;
      unsubscribeProfile();
      setFirebaseUser(null);
      setUser(null);
      setIsLoading(false);
      setAuthError(firebaseErrorMessage(error, 'Your session could not be restored. Please reload and try again.'));
    });
    return () => { ++generation; unsubscribeProfile(); unsubscribeAuth(); };
  }, [profileSubscription]);

  const authenticate = async (action) => {
    if (operation.current) throw new Error('A sign-in request is already in progress.');
    operation.current = true;
    setIsAuthPending(true);
    try {
      const result = await action();
      if (auth.currentUser?.uid === result.user.uid) {
        setUser(result.user);
        setProfileError(result.profileError);
      }
      return result;
    } finally {
      operation.current = false;
      setIsAuthPending(false);
    }
  };

  const retryProfile = async () => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return;
    try {
      const profile = await ensureUserProfile(currentUser, user?.username);
      if (auth.currentUser?.uid !== currentUser.uid) return;
      setUser(profile);
      setProfileError(null);
      setProfileSubscription((value) => value + 1);
    } catch (error) {
      if (auth.currentUser?.uid === currentUser.uid) {
        setProfileError(firebaseErrorMessage(error, 'Your profile could not be saved. Please try again.'));
      }
    }
  };
  return (
    <AuthContext.Provider value={{
      user, firebaseUser, isAuthenticated: !!firebaseUser, isLoading, isAuthPending,
      profileError, authError, retryProfile,
      login: (email, password, rememberMe) => authenticate(() => loginApi(email, password, rememberMe)),
      register: (username, email, password) => authenticate(() => registerApi(username, email, password)),
      logout: logoutApi,
    }}>{children}</AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};