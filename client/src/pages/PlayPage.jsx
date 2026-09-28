import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Swords, FlipHorizontal, Clock, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

import { ChessBoard } from '../components/chess/ChessBoard';
import { PlayerInfoBar } from '../components/chess/PlayerInfoBar';
import { GameSidebar } from '../components/chess/GameSidebar';
import { GameOverModal } from '../components/chess/GameOverModal';
import { TimeControlModal } from '../components/chess/TimeControlModal';

import useChessGame from '../hooks/useChessGame';
import useChessTimer from '../hooks/useChessTimer';
import useChessSounds from '../hooks/useChessSounds';
import { detectOpening } from '../utils/chessOpenings';

export const PlayPage = () => {
  const { addToast } = useToast();
  const { user } = useAuth();

  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showTimeControlModal, setShowTimeControlModal] = useState(false);

  // Sound Engine
  const {
    isMuted,
    toggleMute,
    playMove,
    playCapture,
    playCheck,
    playGameOver,
  } = useChessSounds();

  // Chess Engine Hook
  const {
    fen,
    board,
    turn,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    isGameOver,
    winner,
    gameOverReason,
    inCheckSquare,
    selectedSquare,
    legalMoves,
    lastMove,
    capturedWhite,
    capturedBlack,
    materialAdvantage,
    history,
    canUndo,
    canRedo,
    pendingPromotion,
    boardOrientation,
    gameStatus,
    selectSquare,
    completePromotion,
    cancelPromotion,
    undo,
    redo,
    resetGame,
    flipBoard,
    resign,
    agreeDraw,
  } = useChessGame();

  // Handle timeout loss
  const handleTimeout = useCallback(
    (timedOutColor) => {
      const winningColor = timedOutColor === 'w' ? 'b' : 'w';
      const winnerName = winningColor === 'w' ? 'White' : 'Black';
      addToast(`${timedOutColor === 'w' ? 'White' : 'Black'} ran out of time! ${winnerName} wins.`, 'warning');
      resign(timedOutColor);
    },
    [addToast, resign]
  );

  // Chess Tournament Timer Hook
  const {
    whiteTimeFormatted,
    blackTimeFormatted,
    isWhiteLowTime,
    isBlackLowTime,
    currentPreset,
    selectPreset,
    resetClocks,
  } = useChessTimer({
    turn,
    isGameOver,
    moveCount: history.length,
    onTimeout: handleTimeout,
    initialPresetId: 'rapid_10_0',
  });

  // Live Opening Detection
  const opening = useMemo(() => detectOpening(history), [history]);
  const latestMove = history.at(-1);

  // Audio trigger on move updates
  useEffect(() => {
    if (!latestMove) return;

    if (isCheckmate) {
      playGameOver();
    } else if (isCheck) {
      playCheck();
    } else if (latestMove?.captured) {
      playCapture();
    } else {
      playMove();
    }
  }, [latestMove, isCheck, isCheckmate, playMove, playCapture, playCheck, playGameOver]);

  // Show Game Over modal when match terminates
  useEffect(() => {
    if (isGameOver) {
      setShowGameOverModal(true);
    } else {
      setShowGameOverModal(false);
    }
  }, [isGameOver]);

  // Player Profiles
  const whitePlayer = useMemo(
    () => ({
      name: user?.username || 'You (White)',
      rating: user?.rating || 1200,
      avatar: user?.avatar || null,
      title: user?.rating >= 2000 ? 'CM' : '',
    }),
    [user]
  );

  const blackPlayer = useMemo(
    () => ({
      name: 'Challenger (Black)',
      rating: 1500,
      avatar: null,
      title: 'IM',
    }),
    []
  );

  // Determine top/bottom player based on board orientation
  const topPlayer = boardOrientation === 'white' ? blackPlayer : whitePlayer;
  const bottomPlayer = boardOrientation === 'white' ? whitePlayer : blackPlayer;
  const topColor = boardOrientation === 'white' ? 'b' : 'w';
  const bottomColor = boardOrientation === 'white' ? 'w' : 'b';

  // Game control handlers
  const handleResign = useCallback(() => {
    resign(turn);
    addToast(`${turn === 'w' ? 'White' : 'Black'} resigned!`, 'warning');
  }, [resign, turn, addToast]);

  const handleOfferDraw = useCallback(() => {
    agreeDraw();
    addToast('Draw agreed by mutual agreement!', 'info');
  }, [agreeDraw, addToast]);

  const handleNewGame = useCallback(() => {
    resetGame();
    resetClocks();
    setShowGameOverModal(false);
    addToast('New game started!', 'success');
  }, [resetGame, resetClocks, addToast]);

  const handleRematch = useCallback(() => {
    resetGame();
    resetClocks();
    flipBoard();
    setShowGameOverModal(false);
    addToast('Rematch accepted! Sides flipped.', 'info');
  }, [resetGame, resetClocks, flipBoard, addToast]);

  return (
    <AppLayout>
      {/* Game Over Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        onClose={() => setShowGameOverModal(false)}
        winner={winner}
        reason={gameOverReason}
        isCheckmate={isCheckmate}
        moveCount={history.length}
        onNewGame={handleNewGame}
      />

      {/* Time Control Modal */}
      <TimeControlModal
        isOpen={showTimeControlModal}
        onClose={() => setShowTimeControlModal(false)}
        currentPreset={currentPreset}
        onSelectPreset={(preset) => {
          selectPreset(preset);
          resetGame();
          addToast(`Pace set to ${preset.name}`, 'info');
        }}
      />

      <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full">
        {/* Top Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100">
                Chess Arena
              </h1>
              <Badge variant="rose" icon={Swords}>Tournament</Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {opening ? `${opening.name} (${opening.eco})` : 'Professional pass-and-play match arena.'}
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTimeControlModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all"
              title="Time Control"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentPreset.name}</span>
            </button>

            <button
              onClick={toggleMute}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            <button
              onClick={flipBoard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all"
              title="Flip Board Orientation"
            >
              <FlipHorizontal size={14} />
              <span className="hidden sm:inline">Flip</span>
            </button>
          </div>
        </div>

        {/* Main Tournament Grid: Board (Left/Center) + Sidebar (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Board Column */}
          <Card className="p-3.5 sm:p-5 border-white/10 flex flex-col gap-3 shadow-2xl">
            {/* Top Player Info Bar */}
            <PlayerInfoBar
              player={topPlayer}
              color={topColor}
              isActiveTurn={turn === topColor}
              timeFormatted={topColor === 'w' ? whiteTimeFormatted : blackTimeFormatted}
              isLowTime={topColor === 'w' ? isWhiteLowTime : isBlackLowTime}
              capturedPieces={topColor === 'w' ? capturedBlack : capturedWhite}
              materialAdvantage={
                topColor === 'w'
                  ? materialAdvantage > 0 ? materialAdvantage : 0
                  : materialAdvantage < 0 ? Math.abs(materialAdvantage) : 0
              }
              isGameOver={isGameOver}
            />

            {/* Chessboard Component (Hero Focus) */}
            <div className="flex items-center justify-center w-full py-1">
              <ChessBoard
                board={board}
                selectedSquare={selectedSquare}
                legalMoves={legalMoves}
                lastMove={lastMove}
                inCheckSquare={inCheckSquare}
                boardOrientation={boardOrientation}
                pendingPromotion={pendingPromotion}
                turn={turn}
                onSquareClick={selectSquare}
                onPromotionSelect={completePromotion}
                onPromotionCancel={cancelPromotion}
                isGameOver={isGameOver}
                isCheckmate={isCheckmate}
              />
            </div>

            {/* Bottom Player Info Bar */}
            <PlayerInfoBar
              player={bottomPlayer}
              color={bottomColor}
              isActiveTurn={turn === bottomColor}
              timeFormatted={bottomColor === 'w' ? whiteTimeFormatted : blackTimeFormatted}
              isLowTime={bottomColor === 'w' ? isWhiteLowTime : isBlackLowTime}
              capturedPieces={bottomColor === 'w' ? capturedBlack : capturedWhite}
              materialAdvantage={
                bottomColor === 'w'
                  ? materialAdvantage > 0 ? materialAdvantage : 0
                  : materialAdvantage < 0 ? Math.abs(materialAdvantage) : 0
              }
              isGameOver={isGameOver}
            />
          </Card>

          {/* Sidebar Column: Tabs (Moves, Info, Chat) + Tournament Controls */}
          <div className="flex flex-col gap-4">
            <GameSidebar
              history={history}
              currentMoveIndex={history.length - 1}
              fen={fen}
              opening={opening}
              turn={turn}
              isCheck={isCheck}
              isCheckmate={isCheckmate}
              isStalemate={isStalemate}
              isDraw={isDraw}
              isGameOver={isGameOver}
              winner={winner}
              gameStatus={gameStatus}
              canUndo={canUndo}
              canRedo={canRedo}
              currentPreset={currentPreset}
              isMuted={isMuted}
              onUndo={undo}
              onRedo={redo}
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              onNewGame={handleNewGame}
              onRematch={handleRematch}
              onFlipBoard={flipBoard}
              onToggleSound={toggleMute}
              onOpenTimeControl={() => setShowTimeControlModal(true)}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PlayPage;
