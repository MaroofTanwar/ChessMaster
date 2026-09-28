import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, Swords } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { outcomeFor, ratingFieldsFor } from '../../utils/playerGameStats';

const asDate = (value) => typeof value?.toDate === 'function' ? value.toDate() : new Date(value);

export default function RecentMatches({ games, uid, loading, error }) {
  if (loading) return <Card className="h-28 animate-pulse border-white/10 bg-white/5" />;
  if (!games.length) return <EmptyState icon={Swords} title="No completed games yet" description={error || 'Play a live match and your completed games will appear here.'} />;
  return <div className="grid gap-3">{games.map((game) => {
    const white = game.whitePlayerUid === uid;
    const opponent = white ? game.blackPlayerName : game.whitePlayerName;
    const avatar = white ? game.blackPlayerAvatar : game.whitePlayerAvatar;
    const outcome = outcomeFor(game, uid);
    const rating = ratingFieldsFor(game, uid);
    const date = asDate(game.endedAt);
    const initial = game.timeControl?.initialSeconds ?? 600;
    const increment = game.timeControl?.incrementSeconds ?? 0;
    const modeLabel = game.gameType === 'ai' ? `AI Match · ${game.aiDifficulty || 'Difficulty unavailable'}` : `${game.gameMode || 'Completed'} · ${white ? 'White' : 'Black'}`;
    return <Link key={game.id} to={`/history/${encodeURIComponent(game.id)}`} aria-label={`Replay game against ${opponent || 'Chess Player'}`}><Card className="p-4 border-white/10 hover:border-purple-400/30">
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Avatar name={opponent || 'Chess Player'} src={avatar} size="sm" /><div><div className="flex items-center gap-2"><Badge variant={outcome === 'WIN' ? 'emerald' : outcome === 'LOSS' ? 'rose' : 'gold'}>{outcome}</Badge><span className="font-bold text-slate-100">vs {opponent || 'Chess Player'}</span></div><div className="mt-1 text-xs text-slate-400 capitalize">{modeLabel}</div></div></div><div className={`font-mono text-sm font-bold ${game.gameMode === 'casual' ? 'text-slate-400' : rating.change > 0 ? 'text-emerald-300' : rating.change < 0 ? 'text-rose-300' : 'text-slate-300'}`}>{game.gameMode === 'casual' ? 'No rating change' : Number.isFinite(rating.change) ? `${rating.change >= 0 ? '+' : ''}${rating.change} Elo` : '—'}</div></div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/5 pt-3 text-xs text-slate-500"><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Rapid {Math.round(initial / 60)}+{increment}</span><span>{game.moveCount ?? game.moves?.length ?? '—'} moves</span><span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()}</span></div>
    </Card></Link>;
  })}</div>;
}
