import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Chess } from 'chess.js';
import {
  ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Clock, FlipHorizontal, Pause, Play, Swords, BrainCircuit, X,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ErrorState from '../components/ui/ErrorState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { ChessBoard } from '../components/chess/ChessBoard';
import MoveHistory from '../components/chess/MoveHistory';
import { useAuth } from '../context/AuthContext';
import { getGameById } from '../api/game.api';
import { buildReplay } from '../utils/gameReplay';
import useGameAnalysis from '../hooks/useGameAnalysis';
import EvaluationBar from '../components/analysis/EvaluationBar';
import EvaluationGraph from '../components/analysis/EvaluationGraph';
import AnalysisInsight from '../components/analysis/AnalysisInsight';
import AnalysisSummary from '../components/analysis/AnalysisSummary';

const label = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const toDate = (value) => typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
const duration = (seconds) => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : 'Unavailable';

export default function GameReplayPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [orientation, setOrientation] = useState('white');
  const analysisState = useGameAnalysis(firebaseUser, gameId);

  useEffect(() => {
    let active = true;
    getGameById(gameId, firebaseUser?.uid).then((record) => {
      if (!active) return;
      if (!record) setError('This game was not found or you do not have permission to view it.');
      else {
        setGame(record);
        setOrientation(record.blackPlayerUid === firebaseUser.uid ? 'black' : 'white');
      }
    }).catch(() => {
      if (active) setError('This game could not be loaded. It may not exist or you may not have access.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [gameId, firebaseUser?.uid]);

  const replay = useMemo(() => game && Array.isArray(game.moves)
    ? buildReplay(game)
    : { positions: [], moves: [], error: game ? 'Replay data is unavailable for this older game.' : null }, [game]);
  const maxIndex = Math.max(0, replay.positions.length - 1);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setIndex((current) => {
      if (current >= maxIndex) { setPlaying(false); return current; }
      return current + 1;
    }), 1000 / speed);
    return () => clearInterval(timer);
  }, [playing, speed, maxIndex]);

  const position = replay.positions[Math.min(index, maxIndex)];
  const chess = useMemo(() => {
    try { return new Chess(position?.fen); } catch { return new Chess(); }
  }, [position]);
  const endedAt = game ? toDate(game.endedAt) : null;
  const winnerName = game && game.winnerUid === game.whitePlayerUid ? game.whitePlayerName
    : game && game.winnerUid === game.blackPlayerUid ? game.blackPlayerName : null;
  const initial = game?.timeControl?.initialSeconds ?? 600;
  const increment = game?.timeControl?.incrementSeconds ?? 0;
  const analyzing = ['loading', 'running'].includes(analysisState.status);
  const analysis = analysisState.analysis;
  const evaluation = analysis?.positions?.[Math.min(index, analysis.positions.length - 1)]?.evaluation || { type: 'cp', value: 0 };
  const insight = index > 0 ? analysis?.moves?.[index - 1] : null;

  if (loading) return <AppLayout><Card className="p-12"><LoadingSpinner label="Loading replay" /></Card></AppLayout>;
  if (error || !game) return <AppLayout><ErrorState title="Replay unavailable" description={error} /></AppLayout>;

  return <AppLayout mobileGame>
    <div className="flex flex-col gap-2 sm:gap-5 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 sm:px-0 sm:gap-3">
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={ArrowLeft}
            className="mb-3 w-full sm:w-auto"
            onClick={() => navigate('/history')}
          >
            Back to Game History
          </Button>
          <h1 className="text-xl sm:text-3xl font-black text-slate-100">Game Replay</h1>
          <p className="text-xs text-slate-400 mt-1">Room {game.roomId || 'Unavailable'} · Move {index} of {replay.moves.length}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Button icon={BrainCircuit} disabled={!!replay.error || analyzing || !!analysis} isLoading={analyzing} onClick={analysisState.start}>{analysis ? 'Analysis Ready' : 'Analyze Game'}</Button>{game.gameType === 'ai' && <Badge variant="purple">AI · {game.aiDifficulty || 'Unknown'}</Badge>}<Badge variant={game.winnerUid ? 'gold' : 'cyan'}>{winnerName ? `${winnerName} won` : 'Draw'}</Badge></div>
      </div>

      <Card className="mx-2 p-3 sm:mx-0 sm:p-4 border-white/10">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"><span className="font-bold text-slate-100">{game.whitePlayerName || 'White'} vs {game.blackPlayerName || 'Black'}</span><span className="text-slate-400">{label(game.reason) || 'Completed'}</span><span className="inline-flex items-center gap-1 text-slate-400"><Clock className="w-4 h-4" />{Math.round(initial / 60)}+{increment}</span><span className="text-slate-400">{duration(game.durationSeconds)}</span>{endedAt && !Number.isNaN(endedAt.getTime()) && <span className="inline-flex items-center gap-1 text-slate-500"><CalendarDays className="w-4 h-4" />{endedAt.toLocaleString()}</span>}</div>
      </Card>

      {replay.error && <div role="alert" className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">{replay.error}</div>}
      {analyzing && <Card className="p-4 border-purple-500/20"><div className="flex items-center justify-between gap-3"><div><div className="font-bold text-slate-100">Analyzing game…</div><div className="text-xs text-slate-400">{analysisState.progress.completed} / {analysisState.progress.total || replay.positions.length} positions</div></div><Button size="sm" variant="ghost" icon={X} onClick={analysisState.cancel}>Cancel</Button></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-[width]" style={{ width: `${analysisState.progress.total ? analysisState.progress.completed / analysisState.progress.total * 100 : 0}%` }} /></div></Card>}
      {analysisState.error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"><span>{analysisState.error}</span><Button size="sm" variant="secondary" onClick={analysisState.start}>Retry</Button></div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 sm:gap-6 items-start">
        <Card className="p-1.5 sm:p-5 border-white/10 rounded-xl sm:rounded-2xl">
          <div className="flex items-stretch gap-2">{analysis && <div className="hidden sm:flex"><EvaluationBar evaluation={evaluation} /></div>}<div className="relative min-w-0 flex-1"><ChessBoard board={chess.board()} selectedSquare={null} legalMoves={[]} lastMove={position?.lastMove} inCheckSquare={null} boardOrientation={orientation} pendingPromotion={null} turn={chess.turn()} onSquareClick={() => {}} onPromotionSelect={() => {}} onPromotionCancel={() => {}} isGameOver isCheckmate={false} />{analysis && <div className="absolute inset-y-1 left-1 z-30 sm:hidden"><EvaluationBar evaluation={evaluation} mobileOverlay /></div>}</div></div>
        </Card>
        <div className="flex flex-col gap-3 px-2 sm:gap-4 sm:px-0">
          <Card className="p-4 border-white/10">
            <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2 font-bold text-slate-100"><Swords className="w-4 h-4 text-purple-300" />Moves</div><Button size="sm" variant="secondary" icon={FlipHorizontal} onClick={() => setOrientation((value) => value === 'white' ? 'black' : 'white')}>Flip</Button></div>
            <div className="h-64 overflow-y-auto"><MoveHistory history={replay.moves} annotations={analysis?.moves} currentMoveIndex={index - 1} onMoveSelect={(moveIndex) => { setPlaying(false); setIndex(moveIndex + 1); }} /></div>
          </Card>
          {analysis && <Card className="p-4 border-cyan-500/20"><div className="mb-3 flex items-center gap-2 font-bold text-slate-100"><BrainCircuit className="w-4 h-4 text-cyan-300" />Move Insight</div><AnalysisInsight move={insight} index={index} /></Card>}
          <Card className="p-4 border-white/10">
            <div className="grid grid-cols-5 gap-2">
              <button aria-label="First move" disabled={!position || index === 0} onClick={() => { setPlaying(false); setIndex(0); }} className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-cyan-200 disabled:opacity-30"><ChevronsLeft /></button>
              <button aria-label="Previous move" disabled={!position || index === 0} onClick={() => { setPlaying(false); setIndex((value) => Math.max(0, value - 1)); }} className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-cyan-200 disabled:opacity-30"><ChevronLeft /></button>
              <button aria-label={playing ? 'Pause replay' : 'Play replay'} disabled={!position || maxIndex === 0} onClick={() => { if (index >= maxIndex) setIndex(0); setPlaying((value) => !value); }} className="p-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 text-cyan-200 disabled:opacity-30">{playing ? <Pause /> : <Play />}</button>
              <button aria-label="Next move" disabled={!position || index >= maxIndex} onClick={() => { setPlaying(false); setIndex((value) => Math.min(maxIndex, value + 1)); }} className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-cyan-200 disabled:opacity-30"><ChevronRight /></button>
              <button aria-label="Last move" disabled={!position || index >= maxIndex} onClick={() => { setPlaying(false); setIndex(maxIndex); }} className="p-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-cyan-200 disabled:opacity-30"><ChevronsRight /></button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400"><span>Speed</span>{[0.5, 1, 2].map((value) => <button key={value} onClick={() => setSpeed(value)} className={`px-2 py-1 rounded-lg border ${speed === value ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-white/5'}`}>{value}x</button>)}</div>
          </Card>
        </div>
      </div>
      {analysis && <><Card className="p-4 border-white/10"><h2 className="mb-2 text-lg font-black text-slate-100">Evaluation Graph</h2><p className="mb-3 text-xs text-slate-500">White advantage is above the center line; Black advantage is below. Select a point to jump.</p><EvaluationGraph positions={analysis.positions} selectedIndex={index} onSelect={(next) => { setPlaying(false); setIndex(Math.min(maxIndex, next)); }} /></Card><Card className="p-4 border-white/10"><AnalysisSummary summary={analysis.summary} /></Card><p className="text-center text-xs text-slate-500">ChessMaster classifications and accuracy use an independent centipawn-loss heuristic · {analysis.engine} · depth {analysis.depth}</p></>}
    </div>
  </AppLayout>;
}
