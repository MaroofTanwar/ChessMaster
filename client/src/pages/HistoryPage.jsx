import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { CalendarDays, ChevronRight, Clock, History, Search, Swords } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gameDateMillis, getCompletedGamesPage } from '../api/game.api';

const FILTERS = ['All', 'Wins', 'Losses', 'Draws', 'White', 'Black'];
const toDate = (value) => typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
const label = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const duration = (seconds) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : 'Unavailable';
const outcomeFor = (game, uid) => !game.winnerUid ? 'Draw' : game.winnerUid === uid ? 'Win' : 'Loss';

export const HistoryPage = () => {
  const { firebaseUser } = useAuth();
  const [games, setGames] = useState([]);
  const [cursors, setCursors] = useState({});
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [reload, setReload] = useState(0);

  const loadMore = useCallback(async () => {
    const uid = firebaseUser?.uid;
    if (!uid) return;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getCompletedGamesPage(uid, cursors);
      setGames((current) => {
        const merged = new Map(current.map((game) => [game.id, game]));
        for (const game of page.games) merged.set(game.id, game);
        return [...merged.values()].sort((a, b) => gameDateMillis(b.endedAt) - gameDateMillis(a.endedAt));
      });
      setCursors(page.cursors);
      setHasMore(page.hasMore);
    } catch {
      setError('More games could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  }, [firebaseUser?.uid, cursors]);

  useEffect(() => {
    let active = true;
    getCompletedGamesPage(firebaseUser?.uid, {}).then((page) => {
      if (!active) return;
      setGames(page.games);
      setCursors(page.cursors);
      setHasMore(page.hasMore);
    }).catch(() => {
      if (active) setError('Your completed games could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [firebaseUser?.uid, reload]);

  const filteredGames = useMemo(() => games.filter((game) => {
    const uid = firebaseUser?.uid;
    const isWhite = game.whitePlayerUid === uid;
    const outcome = outcomeFor(game, uid);
    const opponent = isWhite ? game.blackPlayerName : game.whitePlayerName;
    if (filter === 'Wins' && outcome !== 'Win') return false;
    if (filter === 'Losses' && outcome !== 'Loss') return false;
    if (filter === 'Draws' && outcome !== 'Draw') return false;
    if (filter === 'White' && !isWhite) return false;
    if (filter === 'Black' && isWhite) return false;
    return !search.trim() || (opponent || '').toLowerCase().includes(search.trim().toLowerCase());
  }), [games, filter, search, firebaseUser?.uid]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div><h1 className="text-3xl font-black tracking-tight text-slate-100">Match History</h1><p className="text-sm text-slate-400 mt-1">Review and replay your completed live games.</p></div>
          <Badge variant="purple" icon={History}>{games.length}{hasMore ? '+' : ''} Games</Badge>
        </div>

        <Card className="p-4 border-white/10">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">{FILTERS.map((item) => <button key={item} onClick={() => setFilter(item)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filter === item ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>{item}</button>)}</div>
            <label className="relative min-w-0 lg:w-64"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input aria-label="Search opponent" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search opponent" className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/25 border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-400" /></label>
          </div>
        </Card>

        {loading && <Card className="p-10"><LoadingSpinner label="Loading games" /></Card>}
        {!loading && error && games.length === 0 && <ErrorState title="History unavailable" description={error} onRetry={() => { setLoading(true); setError(null); setReload((value) => value + 1); }} />}
        {!loading && !error && games.length === 0 && <Card className="p-8 text-center"><EmptyState icon={History} title="No completed games yet" description="Play a live match and your games will appear here." /></Card>}
        {!loading && games.length > 0 && filteredGames.length === 0 && <Card className="p-8 text-center"><EmptyState icon={Search} title="No matching games" description="Try another result, color, or opponent filter." /></Card>}

        {!loading && filteredGames.length > 0 && <div className="grid gap-4">{filteredGames.map((game) => {
          const uid = firebaseUser.uid;
          const isWhite = game.whitePlayerUid === uid;
          const opponent = isWhite ? game.blackPlayerName : game.whitePlayerName;
          const outcome = outcomeFor(game, uid);
          const variant = outcome === 'Win' ? 'emerald' : outcome === 'Loss' ? 'rose' : 'gold';
          const initial = game.timeControl?.initialSeconds ?? 600;
          const increment = game.timeControl?.incrementSeconds ?? 0;
          const endedAt = toDate(game.endedAt);
          const replayAvailable = Array.isArray(game.moves);
          const ratingChange = isWhite ? game.whiteRatingChange : game.blackRatingChange;
          return <Link key={game.id} to={`/history/${encodeURIComponent(game.id)}`} aria-label={`Replay game against ${opponent || 'Chess Player'}`}>
            <Card data-testid="history-game" data-game-id={game.id} className="p-5 border-white/10 group">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20"><Swords className="w-5 h-5 text-purple-300" /></div><div><div className="text-xs text-slate-500 uppercase tracking-wider">Opponent</div><div className="font-bold text-slate-100">{opponent || 'Chess Player'}</div><div className="text-xs text-slate-400 mt-1">{isWhite ? 'White' : 'Black'} · Room {game.roomId || 'Unavailable'}</div></div></div>
                <div className="flex items-center gap-2"><Badge variant={variant}>{outcome.toUpperCase()}</Badge><ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-cyan-300" /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-5 text-sm">
                <div><div className="text-xs text-slate-500">Reason</div><div className="text-slate-200">{label(game.reason) || 'Completed'}</div></div>
                <div><div className="text-xs text-slate-500">Mode</div><div className="text-slate-200 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{game.gameType === 'ai' ? `AI · ${game.aiDifficulty || 'Unknown'}` : `${Math.round(initial / 60)}+${increment}`}</div></div>
                <div><div className="text-xs text-slate-500">Moves</div><div className="text-slate-200">{game.moveCount ?? game.moves?.length ?? '—'}</div></div>
                <div><div className="text-xs text-slate-500">Duration</div><div className="text-slate-200">{duration(game.durationSeconds)}</div></div>
                <div><div className="text-xs text-slate-500">Replay</div><div className={replayAvailable ? 'text-cyan-300' : 'text-slate-500'}>{replayAvailable ? 'Available' : 'Unavailable'}</div></div>
                <div><div className="text-xs text-slate-500">Rating</div><div className={game.gameMode === 'casual' ? 'text-slate-400' : ratingChange > 0 ? 'text-emerald-300' : ratingChange < 0 ? 'text-rose-300' : 'text-slate-300'}>{game.gameMode === 'casual' ? 'Casual · No change' : Number.isFinite(ratingChange) ? `${ratingChange >= 0 ? '+' : ''}${ratingChange} Elo` : '—'}</div></div>
              </div>
              <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-white/5 text-xs text-slate-500"><CalendarDays className="w-3.5 h-3.5" />{Number.isNaN(endedAt.getTime()) ? 'Date unavailable' : endedAt.toLocaleString()}</div>
            </Card>
          </Link>;
        })}</div>}

        {!loading && hasMore && <div className="flex flex-col items-center gap-2"><Button variant="secondary" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading…' : 'Load More'}</Button>{error && <p role="alert" className="text-sm text-rose-300">{error}</p>}</div>}
      </div>
    </AppLayout>
  );
};

export default HistoryPage;
