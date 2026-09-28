import React, { useState } from 'react';
import { Copy, Check, Swords, KeyRound, Wifi, Loader2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function MultiplayerLobby({ roomId, status, connectionState, error, onCreate, onJoin }) {
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const connected = connectionState === 'connected';
  const act = async (action) => { setWorking(true); try { await action(); } finally { setWorking(false); } };
  const copy = async () => { await navigator.clipboard.writeText(roomId); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  if (roomId && status === 'waiting') return (
    <Card className="max-w-lg mx-auto p-8 text-center border-purple-500/30">
      <Loader2 className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-4" />
      <h2 className="text-2xl font-black text-white">Waiting for opponent</h2>
      <p className="text-sm text-slate-400 mt-2">Share this room ID with another signed-in player.</p>
      <div className="my-6 p-4 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-3xl font-black font-mono tracking-widest text-purple-300">{roomId}</div>
      <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy Room ID'}</Button>
    </Card>
  );
  return (
    <Card className="max-w-2xl mx-auto p-8 border-white/10">
      <div className="text-center mb-7"><Wifi className={`w-10 h-10 mx-auto mb-3 ${connected ? 'text-emerald-400' : 'text-amber-400'}`} /><h1 className="text-3xl font-black text-white">Live Multiplayer</h1><p className="text-sm text-slate-400 mt-2">Server-authoritative Rapid 10+0 chess.</p></div>
      {error && <div role="alert" className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/20"><h2 className="font-bold text-white mb-2">Create Game</h2><p className="text-xs text-slate-400 mb-5">You play White and receive a private room ID.</p><Button className="w-full" icon={Swords} disabled={!connected} isLoading={working} onClick={() => act(onCreate)}>Create Game</Button></div>
        <form className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20" onSubmit={(event) => { event.preventDefault(); act(() => onJoin(code)); }}><h2 className="font-bold text-white mb-2">Join Game</h2><Input label="Room ID" icon={KeyRound} placeholder="CHESS-7F29K" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /><Button type="submit" variant="cyan" className="w-full mt-4" disabled={!connected || !code.trim()} isLoading={working}>Join Game</Button></form>
      </div>
    </Card>
  );
}
