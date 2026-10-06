import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Clock, Loader2, Sliders, Volume2, VolumeX } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { ChessBoard } from '../components/chess/ChessBoard';
import { GameOverModal } from '../components/chess/GameOverModal';
import { GameSidebar } from '../components/chess/GameSidebar';
import { PlayerInfoBar } from '../components/chess/PlayerInfoBar';
import { TimeControlModal } from '../components/chess/TimeControlModal';
import ConfirmResignModal from '../components/chess/ConfirmResignModal';
import { saveAIGame } from '../api/aiGame.api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useAIEngine from '../hooks/useAIEngine';
import useChessGame from '../hooks/useChessGame';
import useChessSounds from '../hooks/useChessSounds';
import useChessTimer from '../hooks/useChessTimer';
import { detectOpening } from '../utils/chessOpenings';
import { getAIUndoPlyCount } from '../utils/aiTurnHistory';
import { useSettings } from '../context/SettingsContext';
import { AI_DIFFICULTIES, AI_DIFFICULTY_ORDER } from '../config/aiDifficulty';

const AI_LEVELS = AI_DIFFICULTY_ORDER.map((label) => ({ label, detail: AI_DIFFICULTIES[label].detail }));

const reasonCode = (game, status) => {
  if (status?.type === 'resigned') return 'resignation';
  if (status?.type) return status.type;
  if (game.isCheckmate()) return 'checkmate';
  if (game.isStalemate()) return 'stalemate';
  if (game.isThreefoldRepetition()) return 'threefold_repetition';
  if (game.isInsufficientMaterial()) return 'insufficient_material';
  return game.isDraw() ? 'draw' : null;
};

export default function AIPage() {
  const { user, firebaseUser } = useAuth();
  const { addToast } = useToast();
  const [difficulty, setDifficulty] = useState('Medium');
  const [colorChoice, setColorChoice] = useState('white');
  const [humanColor, setHumanColor] = useState('w');
  const [gameStarted, setGameStarted] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [gameOverOpen, setGameOverOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [aiRetryKey, setAiRetryKey] = useState(0);
  const { settings } = useSettings();
  const startedAt = useRef(null);
  const saved = useRef(false);
  const aiGeneration = useRef(0);
  const startInFlight = useRef(null);
  const gameApi = useChessGame();
  const engine = useAIEngine(firebaseUser);
  const sounds = useChessSounds();
  const { game, fen, board, turn, history, isGameOver, gameStatus, winner, makeMove } = gameApi;
  const { endGame } = gameApi;
  const { requestMove, prepare: prepareAI, cancel: cancelAI, clearError: clearEngineError, isThinking, isConnecting, error: engineError } = engine;
  const { playGameOver, playCheck, playCapture, playMove } = sounds;
  const aiColor = humanColor === 'w' ? 'b' : 'w';
  const orientation = flipped ? (humanColor === 'w' ? 'black' : 'white') : (humanColor === 'w' ? 'white' : 'black');

  const handleTimeout = useCallback((timedOut) => endGame('timeout', timedOut === 'w' ? 'b' : 'w'), [endGame]);
  const timer = useChessTimer({ turn, isGameOver, moveCount: history.length, onTimeout: handleTimeout, initialPresetId: 'rapid_10_0' });

  useEffect(() => {
    if (!firebaseUser) return;
    void prepareAI().catch(() => { /* A friendly error appears only after bounded wake-up retries fail. */ });
  }, [firebaseUser, prepareAI]);

  useEffect(() => {
    if (!gameStarted || isGameOver || turn !== aiColor) return;
    let active = true;
    const generation = ++aiGeneration.current;
    requestMove(fen, difficulty).then((move) => {
      if (!active || generation !== aiGeneration.current || !move || !gameStarted) return;
      if (!makeMove(move.from, move.to, move.promotion)) addToast('The AI returned an invalid move. Start a new game to retry.', 'error');
    }).catch(() => { /* The hook exposes a friendly inline error with a retry action. */ });
    return () => { active = false; };
  }, [gameStarted, isGameOver, turn, aiColor, fen, difficulty, requestMove, makeMove, addToast, aiRetryKey]);

  useEffect(() => {
    if (!history.length) return;
    const move = history.at(-1);
    if (game.isCheckmate()) playGameOver(); else if (game.inCheck()) playCheck(); else if (move.captured) playCapture(); else playMove();
  }, [history, game, playGameOver, playCheck, playCapture, playMove]);

  useEffect(() => {
    if (!gameStarted || !isGameOver) return;
    setGameOverOpen(true);
    cancelAI();
    if (saved.current || !firebaseUser) return;
    saved.current = true;
    saveAIGame(firebaseUser, {
      humanColor, aiDifficulty: difficulty, reason: reasonCode(game, gameStatus), winnerColor: winner,
      moves: history.map((move) => ({ from: move.from, to: move.to, promotion: move.promotion || null })),
      startedAt: startedAt.current,
      timeControl: { initialSeconds: timer.currentPreset.initialSeconds, incrementSeconds: timer.currentPreset.increment },
    }).catch(() => addToast('The game finished, but its history could not be saved.', 'error'));
  }, [gameStarted, isGameOver, firebaseUser, humanColor, difficulty, game, gameStatus, winner, history, timer.currentPreset, cancelAI, addToast]);

  const startGame = () => {
    if (startInFlight.current) return startInFlight.current;
    const generation = ++aiGeneration.current;
    setStarting(true);
    const job = prepareAI()
      .then(() => {
        if (generation !== aiGeneration.current) return;
        gameApi.resetGame(); timer.resetClocks(); saved.current = false; startedAt.current = Date.now();
        const selected = colorChoice === 'random' ? (crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? 'w' : 'b') : colorChoice === 'white' ? 'w' : 'b';
        setHumanColor(selected); setFlipped(false); setGameStarted(true); setGameOverOpen(false); setAiRetryKey(0);
      })
      .catch(() => { /* The connection panel provides the retry action. */ })
      .finally(() => {
        if (startInFlight.current === job) startInFlight.current = null;
        setStarting(false);
      });
    startInFlight.current = job;
    return job;
  };
  const newGame = () => { aiGeneration.current += 1; cancelAI(); gameApi.resetGame(); timer.resetClocks(); setGameStarted(false); setGameOverOpen(false); saved.current = false; };
  const undoTurn = () => {
    const plies = getAIUndoPlyCount(history.length, humanColor);
    if (!plies) return;
    aiGeneration.current += 1;
    cancelAI();
    if (gameApi.undo(plies)) {
      timer.syncMoveState(game.history().length, game.turn());
      setGameOverOpen(false);
    }
  };
  const redoTurn = () => {
    aiGeneration.current += 1;
    cancelAI();
    if (gameApi.redo()) timer.syncMoveState(game.history().length, game.turn());
  };
  const canUndoTurn = getAIUndoPlyCount(history.length, humanColor) > 0;
  const opening = useMemo(() => detectOpening(history), [history]);
  const human = useMemo(() => ({ name: user?.username || 'You', rating: user?.rating ?? 1200, avatar: user?.avatar, title: '' }), [user]);
  const ai = useMemo(() => ({ name: 'ChessMaster AI', rating: difficulty, avatar: null, title: 'BOT' }), [difficulty]);
  const playerFor = (color) => color === humanColor ? human : ai;
  const topColor = orientation === 'white' ? 'b' : 'w';
  const bottomColor = orientation === 'white' ? 'w' : 'b';
  const renderPlayer = (color) => <PlayerInfoBar player={playerFor(color)} color={color} isActiveTurn={turn === color} timeFormatted={color === 'w' ? timer.whiteTimeFormatted : timer.blackTimeFormatted} isLowTime={color === 'w' ? timer.isWhiteLowTime : timer.isBlackLowTime} capturedPieces={color === 'w' ? gameApi.capturedBlack : gameApi.capturedWhite} materialAdvantage={color === 'w' ? Math.max(gameApi.materialAdvantage, 0) : Math.max(-gameApi.materialAdvantage, 0)} isGameOver={isGameOver} compactOnMobile />;

  return <AppLayout mobileGame={gameStarted}>
    <GameOverModal isOpen={gameOverOpen} onClose={() => setGameOverOpen(false)} winner={winner} winnerLabel={winner ? (winner === humanColor ? 'You' : 'ChessMaster AI') : null} resultHeading={!winner ? 'Draw' : winner === humanColor ? 'You Won' : 'AI Won'} reason={gameApi.gameOverReason} isCheckmate={gameApi.isCheckmate} moveCount={history.length} onNewGame={newGame} primaryLabel="New AI Game" gameMode="ai" aiDifficulty={difficulty} />
    <TimeControlModal isOpen={timeOpen} onClose={() => setTimeOpen(false)} currentPreset={timer.currentPreset} onSelectPreset={(preset) => { timer.selectPreset(preset); if (gameStarted) newGame(); }} />
    <ConfirmResignModal isOpen={resignOpen} onClose={() => setResignOpen(false)} onConfirm={() => gameApi.resign(humanColor)} />
    <div className="flex flex-col gap-2 sm:gap-5 max-w-7xl mx-auto w-full">
      <div className={gameStarted ? 'flex flex-wrap items-center justify-between gap-2 px-2 sm:px-0 sm:gap-3' : 'flex flex-wrap items-center justify-between gap-3'}><div><div className="flex items-center gap-2"><h1 className="text-lg sm:text-3xl font-black text-slate-100">ChessMaster AI</h1><Badge variant="cyan" icon={Bot}>AI Mode</Badge></div><p className={gameStarted ? 'hidden sm:block text-sm text-slate-400 mt-1' : 'text-sm text-slate-400 mt-1'}>{gameStarted ? `${difficulty} · You play ${humanColor === 'w' ? 'White' : 'Black'} · Move ${history.length}` : opening ? `${opening.name} (${opening.eco})` : 'Responsive worker-based chess engine practice.'}</p></div><div className="flex gap-2"><Button size="sm" variant="secondary" icon={Clock} onClick={() => setTimeOpen(true)}>{timer.currentPreset.name}</Button><Button size="sm" variant="ghost" icon={sounds.isMuted ? VolumeX : Volume2} onClick={sounds.toggleMute}>Sound</Button></div></div>
      {!gameStarted ? <Card className="p-6 sm:p-8 border-cyan-500/20 max-w-3xl mx-auto w-full"><h2 className="flex items-center gap-2 font-bold text-slate-100 mb-4"><Sliders className="w-5 h-5 text-cyan-300" />Configure AI Match</h2><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{AI_LEVELS.map((level) => <button key={level.label} disabled={starting} onClick={() => { aiGeneration.current += 1; setDifficulty(level.label); }} className={`rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-60 ${difficulty === level.label ? 'border-cyan-400 bg-cyan-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-400'}`}><strong className="block text-sm">{level.label}</strong><span className="text-[10px]">{level.detail}</span></button>)}</div><div className="mt-6"><div className="text-xs uppercase text-slate-500 mb-2">Play as</div><div className="grid grid-cols-3 gap-2">{['white', 'random', 'black'].map((color) => <button key={color} disabled={starting} onClick={() => setColorChoice(color)} className={`rounded-xl border px-4 py-3 capitalize font-bold disabled:cursor-not-allowed disabled:opacity-60 ${colorChoice === color ? 'border-purple-400 bg-purple-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-400'}`}>{color}</button>)}</div></div><Button className="w-full mt-6" icon={Bot} isLoading={starting || isConnecting} disabled={starting || isConnecting} onClick={startGame}>{starting || isConnecting ? 'Connecting to ChessMaster AI…' : 'Start Game'}</Button>{engineError && <div role="alert" className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 sm:flex-row sm:items-center"><span>{engineError}</span><Button size="sm" variant="secondary" onClick={() => { clearEngineError(); startGame(); }}>Retry Connection</Button></div>}</Card> : <>
        {(isConnecting || isThinking) && <div className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-sm text-cyan-200"><Loader2 className="w-4 h-4 animate-spin" />{isConnecting ? 'Connecting to ChessMaster AI…' : 'AI is thinking…'}</div>}
        {engineError && <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 sm:flex-row sm:items-center"><span>{engineError}</span><Button size="sm" variant="secondary" onClick={() => { clearEngineError(); setAiRetryKey((value) => value + 1); }}>Retry AI Move</Button></div>}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 sm:gap-6 items-start"><Card className="p-1.5 sm:p-5 border-white/10 flex flex-col gap-1.5 sm:gap-3 rounded-xl sm:rounded-2xl">{renderPlayer(topColor)}<div className="flex justify-center"><ChessBoard board={board} selectedSquare={gameApi.selectedSquare} legalMoves={turn === humanColor && !isThinking ? gameApi.legalMoves : []} lastMove={gameApi.lastMove} inCheckSquare={gameApi.inCheckSquare} boardOrientation={orientation} pendingPromotion={gameApi.pendingPromotion} turn={turn} onSquareClick={(square) => { if (turn === humanColor && !isThinking) gameApi.selectSquare(square); }} onPromotionSelect={gameApi.completePromotion} onPromotionCancel={gameApi.cancelPromotion} isGameOver={isGameOver || isThinking} isCheckmate={gameApi.isCheckmate} mobileOptimized /></div>{renderPlayer(bottomColor)}</Card><GameSidebar history={history} currentMoveIndex={history.length - 1} fen={fen} opening={opening} turn={turn} isCheck={gameApi.isCheck} isCheckmate={gameApi.isCheckmate} isStalemate={gameApi.isStalemate} isDraw={gameApi.isDraw} isGameOver={isGameOver} winner={winner} gameStatus={gameApi.gameStatus} canUndo={canUndoTurn} canRedo={gameApi.canRedo} currentPreset={timer.currentPreset} isMuted={sounds.isMuted} onUndo={undoTurn} onRedo={redoTurn} onResign={() => settings.confirmResign ? setResignOpen(true) : gameApi.resign(humanColor)} onOfferDraw={() => addToast('The AI does not accept draw offers.', 'info')} onNewGame={newGame} onRematch={startGame} onFlipBoard={() => setFlipped((value) => !value)} onToggleSound={sounds.toggleMute} onOpenTimeControl={() => setTimeOpen(true)} mobileSheet /></div>
      </>}
    </div>
  </AppLayout>;
}
