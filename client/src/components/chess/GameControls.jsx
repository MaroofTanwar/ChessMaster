import React from 'react';
import { RotateCcw, RotateCw, Flag, Handshake, Plus } from 'lucide-react';

const ControlButton = ({ onClick, disabled, icon: Icon, label, variant = 'default' }) => {
  const variants = {
    default: 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10',
    danger:  'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border-rose-500/20',
    success: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border-emerald-500/20',
    primary: 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 hover:text-cyan-300 border-cyan-500/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        flex flex-col items-center justify-center gap-1 min-w-[56px] px-3 py-2 rounded-xl border
        transition-all duration-150 text-xs font-semibold
        disabled:opacity-25 disabled:cursor-not-allowed
        ${variants[variant]}
      `}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
};

export const GameControls = ({
  onNewGame,
  onUndoMove,
  onRedoMove,
  onResign,
  onOfferDraw,
  canUndo,
  canRedo,
  isGameOver,
  isCheckmate,
  isStalemate,
  isDraw,
  winner,
  gameStatus,
  turn,
  isCheck,
}) => {
  // Determine exact status info with Checkmate taking HIGHEST priority
  const getStatusInfo = () => {
    const winnerLabel = winner === 'w' ? 'White' : winner === 'b' ? 'Black' : '';

    if (isCheckmate) {
      return {
        text: `Checkmate! ${winnerLabel} Wins!`,
        cls: 'text-amber-300 bg-amber-500/15 border-amber-400/40 font-black shadow-[0_0_12px_rgba(251,191,36,0.3)] animate-pulse',
      };
    }
    if (gameStatus?.type === 'resigned') {
      return {
        text: `🏳 ${winnerLabel} Wins by Resignation`,
        cls: 'text-rose-400 bg-rose-500/15 border-rose-500/30 font-bold',
      };
    }
    if (gameStatus?.type === 'draw_agreed') {
      return {
        text: '½ Draw Agreed',
        cls: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold',
      };
    }
    if (isStalemate) {
      return {
        text: '½ Draw by Stalemate',
        cls: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold',
      };
    }
    if (isDraw) {
      return {
        text: '½ Game Drawn',
        cls: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold',
      };
    }
    if (isCheck) {
      return {
        text: 'Check!',
        cls: 'text-rose-400 bg-rose-500/15 border-rose-500/30 font-bold animate-pulse',
      };
    }
    return {
      text: turn === 'w' ? '⬜ White to move' : '⬛ Black to move',
      cls: 'text-slate-300 border-white/10 font-medium',
    };
  };

  const status = getStatusInfo();

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Status Badge */}
      <div className="flex justify-center min-h-[30px]">
        <div className={`px-4 py-1 rounded-full border text-xs tracking-wide transition-all ${status.cls}`}>
          {status.text}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <ControlButton
          onClick={onUndoMove}
          disabled={!canUndo || isGameOver}
          icon={RotateCcw}
          label="Undo"
          variant="default"
        />
        <ControlButton
          onClick={onRedoMove}
          disabled={!canRedo || isGameOver}
          icon={RotateCw}
          label="Redo"
          variant="default"
        />
        <ControlButton
          onClick={onResign}
          disabled={isGameOver}
          icon={Flag}
          label="Resign"
          variant="danger"
        />
        <ControlButton
          onClick={onOfferDraw}
          disabled={isGameOver}
          icon={Handshake}
          label="Draw"
          variant="success"
        />
        <ControlButton
          onClick={onNewGame}
          icon={Plus}
          label="New"
          variant="primary"
        />
      </div>
    </div>
  );
};

export default GameControls;
