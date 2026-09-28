import React, { useEffect, useState } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import Card from '../components/ui/Card'; import Button from '../components/ui/Button'; import Avatar from '../components/ui/Avatar'; import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext'; import { getPublicPlayer } from '../api/social.api';

export default function PublicPlayerPage() {
  const { username } = useParams(); const { firebaseUser } = useAuth(); const navigate = useNavigate(); const [player, setPlayer] = useState(null); const [error, setError] = useState('');
  useEffect(() => { let active = true; getPublicPlayer(firebaseUser, username).then((data) => active && setPlayer(data.player)).catch((e) => active && setError(e.message)); return () => { active = false; }; }, [firebaseUser, username]);
  const winRate = player?.gamesPlayed ? ((player.wins / player.gamesPlayed) * 100).toFixed(1) : '0.0';
  return <AppLayout><Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/friends')}>Back to Friends</Button><Card className="mx-auto mt-6 max-w-2xl p-7">{error ? <p className="text-rose-300">{error}</p> : !player ? <LoadingSpinner label="Loading player" /> : <><div className="flex items-center gap-4"><Avatar name={player.username} src={player.avatar} size="lg" /><div><h1 className="text-2xl font-black">{player.username}</h1><p className="flex items-center gap-1 text-purple-300"><Trophy className="w-4 h-4" /> {player.rating} Elo</p></div></div><div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">{[['Games', player.gamesPlayed], ['Wins', player.wins], ['Losses', player.losses], ['Draws', player.draws], ['Win rate', `${winRate}%`]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/5 p-3 text-center"><div className="text-lg font-black">{value}</div><div className="text-xs text-slate-400">{label}</div></div>)}</div></>}</Card></AppLayout>;
}
