import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Crown, Search } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { getLeaderboardPage } from '../api/leaderboard.api';

export default function LeaderboardPage() {
  const { firebaseUser } = useAuth();
  const [players, setPlayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const loadMorePage = useCallback(async (nextCursor) => {
    const page = await getLeaderboardPage(firebaseUser, nextCursor);
    setPlayers((current) => [...current, ...page.players]);
    setCurrentUser(page.currentUser); setCursor(page.cursor); setHasMore(page.hasMore);
  }, [firebaseUser]);
  useEffect(() => {
    let active = true;
    getLeaderboardPage(firebaseUser).then((page) => {
      if (!active) return;
      setPlayers(page.players); setCurrentUser(page.currentUser); setCursor(page.cursor); setHasMore(page.hasMore);
    }).catch(() => { if (active) setError('The leaderboard could not be loaded.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [firebaseUser]);
  const visible = useMemo(() => players.filter((player) => player.username.toLowerCase().includes(search.trim().toLowerCase())), [players, search]);
  const loadMore = async () => { setLoadingMore(true); setError(null); try { await loadMorePage(cursor); } catch { setError('More players could not be loaded.'); } finally { setLoadingMore(false); } };
  return <AppLayout><div className="flex flex-col gap-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black text-slate-100">Global Leaderboard</h1><p className="text-sm text-slate-400 mt-1">Real ranked results from ChessMaster players.</p></div>{currentUser && <Card className="px-4 py-3 border-purple-500/30"><div className="text-xs text-slate-400">Your Rank · Your Rating</div><div className="font-black text-purple-300">#{currentUser.rank} · {currentUser.rating} Elo</div></Card>}</div>
    {loading && <Card className="p-10"><LoadingSpinner label="Loading leaderboard" /></Card>}
    {!loading && error && !players.length && <ErrorState title="Leaderboard unavailable" description={error} />}
    {!loading && players.length > 0 && <>
      <div className="grid gap-4 md:grid-cols-3">{players.slice(0, 3).map((player, index) => <Card key={player.uid} className={`p-5 text-center border-white/10 ${index === 0 ? 'md:-translate-y-2 border-amber-400/30' : ''}`}><Crown className={`w-7 h-7 mx-auto mb-2 ${index === 0 ? 'text-amber-300' : index === 1 ? 'text-slate-300' : 'text-orange-400'}`} /><div className="text-xs font-black text-slate-500">#{index + 1}</div><Avatar name={player.username} src={player.avatar} size="lg" className="mx-auto my-2" /><div className="font-bold text-slate-100">{player.username}</div><div className="font-mono font-black text-purple-300">{player.rating} Elo</div></Card>)}</div>
      <Card className="p-4 border-white/10"><label className="relative block"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" /><input aria-label="Search players" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search loaded players" className="w-full rounded-xl border border-white/10 bg-black/25 py-2 pl-9 pr-3 text-sm text-slate-100 focus:border-purple-400 focus:outline-none" /></label></Card>
      {visible.length ? <Card className="overflow-x-auto border-white/10"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-white/10 text-xs uppercase text-slate-500"><th className="p-4">Rank</th><th className="p-4">Player</th><th className="p-4">Rating</th><th className="p-4">Games</th><th className="p-4">Wins</th><th className="p-4">Win rate</th></tr></thead><tbody>{visible.map((player) => { const rank = players.findIndex((item) => item.uid === player.uid) + 1; return <tr key={player.uid} className={`border-b border-white/5 ${player.uid === firebaseUser.uid ? 'bg-purple-500/10' : 'hover:bg-white/5'}`}><td className="p-4 font-black text-slate-400">#{rank}</td><td className="p-4"><div className="flex items-center gap-3"><Avatar name={player.username} src={player.avatar} size="sm" /><span className="font-bold text-slate-100">{player.username}</span>{player.uid === firebaseUser.uid && <Badge variant="purple">You</Badge>}</div></td><td className="p-4 font-mono font-bold text-purple-300">{player.rating}</td><td className="p-4 text-slate-300">{player.gamesPlayed}</td><td className="p-4 text-emerald-300">{player.wins}</td><td className="p-4 text-cyan-300">{player.winRate.toFixed(1)}%</td></tr>; })}</tbody></table></Card> : <EmptyState icon={Search} title="No matching player" description="Try another name or load more players." />}
      {hasMore && <div className="text-center"><Button variant="secondary" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading…' : 'Load More'}</Button></div>}
      {error && <p role="alert" className="text-center text-sm text-rose-300">{error}</p>}
    </>}
  </div></AppLayout>;
}
