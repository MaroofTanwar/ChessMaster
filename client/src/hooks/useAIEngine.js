import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../config/runtime';
export default function useAIEngine(firebaseUser) {
  const controller = useRef(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);
  const cancel = useCallback(() => { controller.current?.abort(); controller.current = null; setIsThinking(false); }, []);
  useEffect(() => cancel, [cancel]);
  const requestMove = useCallback(async (fen, difficulty) => {
    if (controller.current) throw new Error('The AI is already thinking.');
    const next = new AbortController(); controller.current = next; setIsThinking(true); setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/api/ai-move`, { method: 'POST', signal: next.signal, headers: { 'content-type': 'application/json', Authorization: `Bearer ${await firebaseUser.getIdToken()}` }, body: JSON.stringify({ fen, difficulty }) });
      if (!response.ok) throw new Error('The AI engine could not calculate a move.');
      return (await response.json()).move;
    } catch (problem) { if (problem.name === 'AbortError') throw new Error('AI calculation cancelled.'); setError(problem.message); throw problem; }
    finally { if (controller.current === next) { controller.current = null; setIsThinking(false); } }
  }, [firebaseUser]);
  return { requestMove, cancel, isThinking, error };
}
