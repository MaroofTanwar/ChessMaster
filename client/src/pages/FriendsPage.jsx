import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Users, Swords, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { useToast } from '../context/ToastContext';
import * as api from '../api/social.api';

const Player = ({ item, online, actions }) => <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
  <Avatar name={item.username} src={item.avatar} status={online ? 'online' : 'offline'} size="md" />
  <div className="min-w-0 flex-1"><div className="truncate font-bold text-slate-100">{item.username}</div><div className="text-xs text-slate-400">{item.rating} Elo · {online ? 'Online' : 'Offline'}</div></div>
  <div className="flex flex-wrap gap-2">{actions}</div>
</div>;

export default function FriendsPage() {
  const { firebaseUser } = useAuth(); const { social, presence, refresh, challenge } = useSocial(); const { addToast } = useToast(); const navigate = useNavigate();
  const [query, setQuery] = useState(''); const [results, setResults] = useState([]); const [searching, setSearching] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState(null); const [removeTarget, setRemoveTarget] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const term = query.trim(); if (term.length < 2) { setResults([]); return undefined; }
    let active = true; const timer = setTimeout(() => { setSearching(true); api.searchPlayers(firebaseUser, term).then((data) => { if (active) setResults(data.players); }).catch((e) => addToast(e.message, 'error')).finally(() => { if (active) setSearching(false); }); }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [query, firebaseUser, addToast]);
  const act = async (operation, success) => { setBusy(true); try { await operation(); addToast(success, 'success'); await refresh(); } catch (e) { addToast(e.message, 'error'); } finally { setBusy(false); } };
  const send = (item) => act(() => api.sendFriendRequest(firebaseUser, item.profileKey), 'Friend request sent.');
  const answer = (item, accept) => act(() => api.answerFriendRequest(firebaseUser, item.id, accept), accept ? 'Friend added.' : 'Friend request declined.');
  const sendChallenge = async (mode) => { setBusy(true); const response = await challenge(challengeTarget.profileKey, mode); setBusy(false); if (!response?.ok) addToast(response?.error?.message || 'Challenge failed.', 'error'); else { addToast('Challenge sent. It expires in 60 seconds.', 'success'); setChallengeTarget(null); } };
  const view = (item) => navigate(`/players/${encodeURIComponent(item.username)}`);
  return <AppLayout><div className="space-y-7">
    <div><h1 className="text-3xl font-black text-slate-100">Friends</h1><p className="mt-1 text-sm text-slate-400">Find players, connect, and start a live challenge.</p></div>
    <Card className="p-5"><label className="relative block"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input aria-label="Search players" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players by username" className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-10 pr-3 text-sm text-white focus:border-purple-400 focus:outline-none" /></label>
      {query.trim().length >= 2 && <div className="mt-4 space-y-2">{searching ? <p className="text-sm text-slate-400">Searching…</p> : results.length ? results.map((item) => <Player key={item.profileKey} item={item} online={presence[item.profileKey]} actions={<><Button size="sm" variant="ghost" icon={Eye} onClick={() => view(item)}>View</Button>{item.friendStatus === 'none' ? <Button size="sm" icon={UserPlus} disabled={busy} onClick={() => send(item)}>Add Friend</Button> : <Badge variant={item.friendStatus === 'friends' ? 'cyan' : 'purple'}>{item.friendStatus === 'friends' ? 'Friends' : item.friendStatus === 'sent' ? 'Request Sent' : 'Respond below'}</Badge>}</>} />) : <p className="text-sm text-slate-400">No players found.</p>}</div>}
    </Card>
    <section><h2 className="mb-3 flex items-center gap-2 text-xl font-black"><Users className="w-5 h-5 text-cyan-400" /> Friends ({social.friends.length})</h2><div className="space-y-2">{social.friends.length ? social.friends.map((item) => <Player key={item.profileKey} item={item} online={presence[item.profileKey]} actions={<><Button size="sm" icon={Swords} disabled={!presence[item.profileKey]} onClick={() => setChallengeTarget(item)}>Challenge</Button><Button size="sm" variant="ghost" icon={Eye} onClick={() => view(item)}>View</Button><Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRemoveTarget(item)}>Remove</Button></>} />) : <Card className="p-6 text-center text-sm text-slate-400">No friends yet. Search for players to connect.</Card>}</div></section>
    <section><h2 className="mb-3 text-xl font-black">Friend Requests ({social.incoming.length})</h2><div className="space-y-2">{social.incoming.length ? social.incoming.map((item) => <Player key={item.id} item={item} actions={<><Button size="sm" variant="ghost" disabled={busy} onClick={() => answer(item, false)}>Decline</Button><Button size="sm" disabled={busy} onClick={() => answer(item, true)}>Accept</Button></>} />) : <Card className="p-6 text-center text-sm text-slate-400">No pending friend requests.</Card>}</div></section>
    <Modal isOpen={!!challengeTarget} onClose={() => setChallengeTarget(null)} title={`Challenge ${challengeTarget?.username || ''}`} subtitle="Choose the game mode. Time control is Rapid 10+0."><div className="grid grid-cols-2 gap-3"><Button disabled={busy} onClick={() => sendChallenge('ranked')}>Ranked</Button><Button disabled={busy} variant="secondary" onClick={() => sendChallenge('casual')}>Casual</Button></div></Modal>
    <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove friend" subtitle={`Remove ${removeTarget?.username || 'this player'} from your friends?`}><div className="flex justify-end gap-3"><Button variant="ghost" onClick={() => setRemoveTarget(null)}>Cancel</Button><Button disabled={busy} variant="danger" onClick={() => act(() => api.removeFriend(firebaseUser, removeTarget.profileKey), 'Friend removed.').then(() => setRemoveTarget(null))}>Remove</Button></div></Modal>
  </div></AppLayout>;
}
