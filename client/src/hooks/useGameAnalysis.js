import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelAnalysisJob, getAnalysisJob, startGameAnalysis } from '../api/analysis.api';

export default function useGameAnalysis(firebaseUser, gameId) {
  const [status, setStatus] = useState('idle'); const [analysis, setAnalysis] = useState(null); const [progress, setProgress] = useState({ completed: 0, total: 0 }); const [error, setError] = useState('');
  const jobRef = useRef(null); const generation = useRef(0);
  const stopPolling = useCallback(() => { generation.current += 1; }, []);
  const poll = useCallback(async (jobId, currentGeneration) => {
    while (generation.current === currentGeneration) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (generation.current !== currentGeneration) return;
      const job = await getAnalysisJob(firebaseUser, jobId);
      setProgress({ completed: job.completed, total: job.total });
      if (job.status === 'complete') { jobRef.current = null; setAnalysis(job.analysis); setStatus('complete'); return; }
      if (job.status === 'error' || job.status === 'cancelled') { jobRef.current = null; setError(job.error || 'Analysis stopped.'); setStatus('error'); return; }
    }
  }, [firebaseUser]);
  const start = useCallback(async () => {
    stopPolling(); const currentGeneration = generation.current; setError(''); setStatus('loading');
    try {
      const result = await startGameAnalysis(firebaseUser, gameId);
      if (result.cached) { setAnalysis(result.analysis); setStatus('complete'); return; }
      jobRef.current = result.jobId; setStatus('running'); void poll(result.jobId, currentGeneration).catch((e) => { if (generation.current === currentGeneration) { setError(e.message); setStatus('error'); } });
    } catch (e) { setError(e.message); setStatus('error'); }
  }, [firebaseUser, gameId, poll, stopPolling]);
  const cancel = useCallback(async () => { const id = jobRef.current; stopPolling(); jobRef.current = null; if (id) await cancelAnalysisJob(firebaseUser, id).catch(() => {}); setStatus('idle'); }, [firebaseUser, stopPolling]);
  useEffect(() => () => { const id = jobRef.current; stopPolling(); if (id) void cancelAnalysisJob(firebaseUser, id).catch(() => {}); }, [firebaseUser, stopPolling]);
  return { status, analysis, progress, error, start, cancel };
}

