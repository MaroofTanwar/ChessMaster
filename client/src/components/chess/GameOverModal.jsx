import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Trophy, Handshake, Plus, Eye, Award } from 'lucide-react';

export const GameOverModal = ({
  isOpen,
  onClose,
  winner,
  reason,
  isCheckmate,
  moveCount = 0,
  onNewGame,
  primaryLabel = 'Play New Game',
  primaryDisabled = false,
  secondaryLabel = 'Review Board',
  onSecondary,
  gameMode = 'ranked',
  rating = null,
  winnerLabel,
  aiDifficulty,
  resultHeading,
}) => {
  const isDraw = !winner;
  const winnerName = winnerLabel || (winner === 'w' ? 'White' : winner === 'b' ? 'Black' : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="max-w-md"
      className="text-center"
    >
      <div className="flex flex-col items-center py-2">
        {/* Animated Icon Avatar */}
        <div className="relative mb-5">
          {!isDraw ? (
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/30 to-amber-300/20 border-2 border-amber-400/40 flex items-center justify-center shadow-xl shadow-amber-500/20 animate-bounce">
              <Trophy className="w-10 h-10 text-amber-300" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/40 flex items-center justify-center shadow-xl shadow-cyan-500/20">
              <Handshake className="w-10 h-10 text-cyan-300" />
            </div>
          )}
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
          {resultHeading || (isCheckmate
            ? '♚ Checkmate!'
            : isDraw
            ? '½ Game Drawn'
            : '🏁 Game Over')}
        </h2>

        {/* Subheading / Winner Announcement */}
        <p className="text-base font-semibold text-slate-300 mb-4">
          {!isDraw ? (
            <span>
              <span className={winner === 'w' ? 'text-amber-200 font-bold' : 'text-purple-300 font-bold'}>
                {winnerName}
              </span>{' '}
              is Victorious!
            </span>
          ) : (
            <span className="text-slate-400">Game ended in a peaceful draw</span>
          )}
        </p>

        {/* Info Pill */}
        {reason && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 mb-6">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span>{reason}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{moveCount} moves</span>
          </div>
        )}
        <div className="mb-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          {gameMode === 'ai' ? <span className="text-slate-300">ChessMaster AI · {aiDifficulty} · No rating change</span> : gameMode === 'casual' ? <span className="text-slate-300">Casual game · No rating change</span> : rating ? <div className="flex items-center gap-3"><span className="text-slate-300">{rating.before} → {rating.after}</span><span className={rating.change >= 0 ? 'font-bold text-emerald-300' : 'font-bold text-rose-300'}>{rating.change >= 0 ? '+' : ''}{rating.change} Elo</span></div> : <span className="text-slate-400">Updating rating…</span>}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
          <Button
            variant="primary"
            disabled={primaryDisabled}
            className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
            onClick={() => {
              onClose();
              onNewGame();
            }}
          >
            <Plus className="w-4 h-4" />
            {primaryLabel}
          </Button>

          <Button
            variant="ghost"
            className="w-full sm:w-auto py-3 text-sm text-slate-400 hover:text-white flex items-center justify-center gap-2"
            onClick={onSecondary || onClose}
          >
            <Eye className="w-4 h-4" />
            {secondaryLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GameOverModal;
