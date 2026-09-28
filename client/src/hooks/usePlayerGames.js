import { useEffect, useMemo, useState } from 'react';
import { getAllCompletedGames } from '../api/game.api';
import { buildRatingHistory } from '../utils/playerGameStats';

export default function usePlayerGames(uid) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    getAllCompletedGames(uid).then((records) => { if (active) setGames(records); })
      .catch(() => { if (active) setError('Your recent games could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid]);
  const ratingHistory = useMemo(() => buildRatingHistory(games, uid), [games, uid]);
  return { games, recentGames: games.slice(0, 5), ratingHistory, loading, error };
}
