import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ToastContainer from './components/ui/Toast';
import ProfileNotice from './components/auth/ProfileNotice';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PlayPage = lazy(() => import('./pages/PlayPage'));
const MultiplayerPage = lazy(() => import('./pages/MultiplayerPage'));
const AIPage = lazy(() => import('./pages/AIPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const GameReplayPage = lazy(() => import('./pages/GameReplayPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const PublicPlayerPage = lazy(() => import('./pages/PublicPlayerPage'));
import { SocialProvider } from './context/SocialContext';
import { SettingsProvider } from './context/SettingsContext';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
        <Router>
          <SocialProvider>
          <ProfileNotice />
          <Suspense fallback={<div className="min-h-screen bg-[#070b14] flex items-center justify-center"><LoadingSpinner label="Loading ChessMaster" /></div>}>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Guest-only auth routes */}
            <Route
              path="/login"
              element={
                <ProtectedRoute guestOnly>
                  <LoginPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register"
              element={
                <ProtectedRoute guestOnly>
                  <RegisterPage />
                </ProtectedRoute>
              }
            />

            {/* Protected App Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/play"
              element={
                <ProtectedRoute>
                  <PlayPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/multiplayer"
              element={
                <ProtectedRoute>
                  <MultiplayerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai"
              element={
                <ProtectedRoute>
                  <AIPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history/:gameId"
              element={
                <ProtectedRoute>
                  <GameReplayPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
            <Route path="/players/:username" element={<ProtectedRoute><PublicPlayerPage /></ProtectedRoute>} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          <ToastContainer />
          </SocialProvider>
        </Router>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
