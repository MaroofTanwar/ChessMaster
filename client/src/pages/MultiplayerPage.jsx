import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wifi, WifiOff, Copy, DoorOpen } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { ChessBoard } from '../components/chess/ChessBoard';
import { PlayerInfoBar } from '../components/chess/PlayerInfoBar';
import { GameSidebar } from '../components/chess/GameSidebar';
import { GameOverModal } from '../components/chess/GameOverModal';
import MultiplayerLobby from '../components/game/MultiplayerLobby';
import useMultiplayerGame from '../hooks/useMultiplayerGame';
import useChessSounds from '../hooks/useChessSounds';
import { detectOpening } from '../utils/chessOpenings';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import ConfirmResignModal from '../components/chess/ConfirmResignModal';

const VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1 };
const formatClock = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function MultiplayerPage() {
  const { firebaseUser, user } = useAuth();
  const { addToast } = useToast();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const actionHandled = useRef(false);
  const previousMoveCount = useRef(0);
  const previousStatus = useRef('idle');
  const [gameOverOpen, setGameOverOpen] = useState(false);
  const [resignOpen, setResignOpen] = useState(false);
  const multiplayer = useMultiplayerGame(firebaseUser, user);
  const { isMuted, toggleMute, playMove, playCapture, playCheck, playGameOver } = useChessSounds();
  const { state, game, board, myColor, clocks, connectionState, createGame, joinGame } = multiplayer;

  useEffect(() => {
    if (connectionState !== 'connected' || actionHandled.current) return;
    const room = params.get('room');
    const action = params.get('action');
    if (!room && action !== 'create') return;
    actionHandled.current = true;
    const operation = room ? joinGame(room) : createGame(params.get('mode') === 'casual' ? 'casual' : 'ranked');
    void operation.then((response) => {
      if (response?.ok) setParams({ room: response.data.roomId }, { replace: true });
      else setParams({}, { replace: true });
    });
  }, [connectionState, createGame, joinGame, params, setParams]);

  useEffect(() => {
    if (state.history.length > previousMoveCount.current) {
      const move = state.history.at(-1);
      if (game.isCheckmate()) playGameOver();
      else if (game.inCheck()) playCheck();
      else if (move?.captured) playCapture();
      else playMove();
    }
    previousMoveCount.current = state.history.length;
  }, [state.history, game, playMove, playCapture, playCheck, playGameOver]);

  useEffect(() => {
    if (state.status === 'finished' && previousStatus.current !== 'finished') {
      setGameOverOpen(true);
      playGameOver();
    }
    previousStatus.current = state.status;
  }, [state.status, playGameOver]);

  const derived = useMemo(() => {
    const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    let checkSquare = null;
    const isCheck = game.inCheck();
    for (let rank = 0; rank < 8; rank += 1) for (let file = 0; file < 8; file += 1) {
      const piece = board[rank][file];
      if (piece && piece.type !== 'k') counts[piece.color][piece.type] += 1;
      if (isCheck && piece?.type === 'k' && piece.color === state.turn) checkSquare = `${'abcdefgh'[file]}${8 - rank}`;
    }
    const capturedWhite = [], capturedBlack = [];
    let whiteValue = 0, blackValue = 0;
    for (const type of Object.keys(COUNTS)) {
      for (let i = counts.w[type]; i < COUNTS[type]; i += 1) capturedWhite.push(type);
      for (let i = counts.b[type]; i < COUNTS[type]; i += 1) capturedBlack.push(type);
      whiteValue += counts.w[type] * VALUES[type];
      blackValue += counts.b[type] * VALUES[type];
    }
    return { capturedWhite, capturedBlack, advantage: whiteValue - blackValue, checkSquare };
  }, [board, game, state.turn]);

  const orientation = myColor === 'b' ? 'black' : 'white';
  const topColor = orientation === 'white' ? 'b' : 'w';
  const bottomColor = orientation === 'white' ? 'w' : 'b';
  const playerFor = (color) => state.players[color] || { name: 'Waiting for opponent', rating: 1200, connected: false };
  const resultReason = state.result?.reason?.replaceAll('_', ' ') || null;
  const gameStatus = state.status === 'finished'
    ? { type: state.result?.reason === 'draw_agreement' ? 'draw_agreed' : state.result?.reason, winner: state.result?.winnerColor }
    : null;
  const incomingDraw = state.drawOfferBy && state.drawOfferBy !== myColor;
  const incomingRematch = state.rematchRequestedBy && state.rematchRequestedBy !== myColor;
  const exit = async () => { if (state.roomId) await multiplayer.leaveGame(); navigate('/dashboard'); };

  if (!state.roomId || state.status === 'waiting') return (
    <AppLayout>
      <MultiplayerLobby roomId={state.roomId} status={state.status} connectionState={multiplayer.connectionState}
        error={multiplayer.error} onCreate={multiplayer.createGame} onJoin={async (roomId) => {
          const response = await multiplayer.joinGame(roomId);
          if (response?.ok) setParams({ room: response.data.roomId }, { replace: true });
          return response;
        }} />
    </AppLayout>
  );

  const renderPlayer = (color) => <PlayerInfoBar player={playerFor(color)} color={color} online={playerFor(color).connected}
    isActiveTurn={state.turn === color} timeFormatted={formatClock(clocks[color])}
    isLowTime={clocks[color] < 30 && clocks[color] > 0}
    capturedPieces={color === 'w' ? derived.capturedBlack : derived.capturedWhite}
    materialAdvantage={color === 'w' ? Math.max(derived.advantage, 0) : Math.max(-derived.advantage, 0)}
    isGameOver={state.status === 'finished'} compactOnMobile />;

  return (
    <AppLayout mobileGame>
      <GameOverModal isOpen={gameOverOpen} onClose={() => setGameOverOpen(false)} winner={state.result?.winnerColor}
        reason={resultReason} isCheckmate={state.result?.reason === 'checkmate'} moveCount={state.history.length}
        gameMode={state.gameMode} rating={myColor ? state.result?.rating?.[myColor] : null}
        onNewGame={multiplayer.requestRematch} primaryLabel={state.rematchRequestedBy === myColor ? 'Rematch Requested' : 'Request Rematch'}
        primaryDisabled={state.rematchRequestedBy === myColor} secondaryLabel="Exit Game" onSecondary={exit} />
      <ConfirmResignModal isOpen={resignOpen} onClose={() => setResignOpen(false)} onConfirm={multiplayer.resign} />
      <div className="flex flex-col gap-2 sm:gap-5 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 sm:px-0 sm:gap-3">
          <div><div className="flex items-center gap-2"><h1 className="text-lg sm:text-3xl font-black text-slate-100">Live Chess Arena</h1><Badge variant={multiplayer.connectionState === 'connected' ? 'cyan' : 'rose'} icon={multiplayer.connectionState === 'connected' ? Wifi : WifiOff}>{multiplayer.connectionState === 'connected' ? 'Connected' : 'Reconnecting'}</Badge></div><p className="hidden sm:block text-xs text-slate-400 mt-1">Room {state.roomId} · You play {myColor === 'w' ? 'White' : 'Black'} · Rapid 10+0 · <span className="capitalize">{state.gameMode || 'ranked'}</span></p></div>
          <div className="flex gap-2"><Button size="sm" variant="secondary" icon={Copy} onClick={() => navigator.clipboard.writeText(state.roomId)}>Copy ID</Button><Button size="sm" variant="danger" icon={DoorOpen} onClick={exit}>Exit</Button></div>
        </div>
        {multiplayer.error && <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{multiplayer.error}</div>}
        {(!state.players.w?.connected || !state.players.b?.connected) && state.status === 'active' && <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">Opponent disconnected. Their seat and current game are being kept for reconnection.</div>}
        {incomingDraw && <Card className="p-4 border-emerald-500/30 flex items-center justify-between gap-3"><span>Your opponent offered a draw.</span><div className="flex gap-2"><Button size="sm" variant="cyan" onClick={multiplayer.acceptDraw}>Accept</Button><Button size="sm" variant="secondary" onClick={multiplayer.declineDraw}>Decline</Button></div></Card>}
        {incomingRematch && <Card className="p-4 border-purple-500/30 flex items-center justify-between gap-3"><span>Your opponent requested a rematch. Colors will swap.</span><div className="flex gap-2"><Button size="sm" onClick={async () => { await multiplayer.acceptRematch(); setGameOverOpen(false); }}>Accept</Button><Button size="sm" variant="secondary" onClick={multiplayer.declineRematch}>Decline</Button></div></Card>}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 sm:gap-6 items-start">
          <Card className="p-1.5 sm:p-5 border-white/10 flex flex-col gap-1.5 sm:gap-3 shadow-2xl rounded-xl sm:rounded-2xl">
            {renderPlayer(topColor)}
            <div className="flex justify-center"><ChessBoard board={board} selectedSquare={multiplayer.selectedSquare} legalMoves={multiplayer.legalMoves} lastMove={state.lastMove} inCheckSquare={derived.checkSquare} boardOrientation={orientation} pendingPromotion={multiplayer.pendingPromotion} turn={state.turn} onSquareClick={multiplayer.selectSquare} onPromotionSelect={multiplayer.completePromotion} onPromotionCancel={multiplayer.cancelPromotion} isGameOver={state.status !== 'active'} isCheckmate={game.isCheckmate()} mobileOptimized /></div>
            {renderPlayer(bottomColor)}
          </Card>
          <GameSidebar history={state.history} currentMoveIndex={state.history.length - 1} fen={state.fen} opening={detectOpening(state.history)} turn={state.turn} isCheck={game.inCheck()} isCheckmate={game.isCheckmate()} isStalemate={state.result?.reason === 'stalemate'} isDraw={state.status === 'finished' && !state.result?.winnerColor} isGameOver={state.status === 'finished'} winner={state.result?.winnerColor} gameStatus={gameStatus} canUndo={false} canRedo={false} currentPreset={{ name: 'Rapid 10+0' }} isMuted={isMuted} onResign={() => settings.confirmResign ? setResignOpen(true) : multiplayer.resign()} onOfferDraw={multiplayer.offerDraw} onNewGame={() => addToast('Multiplayer games cannot be reset while active.', 'info')} onRematch={multiplayer.requestRematch} onFlipBoard={() => addToast('Your board follows your assigned color.', 'info')} onToggleSound={toggleMute} onOpenTimeControl={() => addToast('Multiplayer uses server-controlled Rapid 10+0.', 'info')} chatMessages={multiplayer.chatMessages} currentUserUid={firebaseUser?.uid} onSendChatMessage={multiplayer.sendChatMessage} mobileSheet />
        </div>
      </div>
    </AppLayout>
  );
}

