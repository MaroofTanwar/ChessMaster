import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

export default function ProfileNotice() {
  const { profileError, retryProfile, isAuthenticated } = useAuth();
  const [retrying, setRetrying] = useState(false);
  if (!isAuthenticated || !profileError) return null;
  return (
    <div role="alert" className="p-4 bg-amber-950/60 text-amber-100 flex items-center justify-between gap-4">
      <span>{profileError}</span>
      <Button size="sm" variant="secondary" isLoading={retrying} onClick={async () => {
        setRetrying(true);
        try { await retryProfile(); } finally { setRetrying(false); }
      }}>Retry Profile</Button>
    </div>
  );
}