import React from 'react';
import Avatar from '../ui/Avatar';
import Piece from './Piece';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';

const PIECE_VALUES = { q: 9, r: 5, b: 3, n: 3, p: 1 };

export const PlayerInfoBar = ({
  player = { name: 'Player', rating: 1200, avatar: null, title: '' },
  color = 'w',
  isActiveTurn = false,
  timeFormatted = '10:00',
  isLowTime = false,
  capturedPieces = [],
  materialAdvantage = 0,
  isGameOver = false,
  online,
  className = '',
}) => {
  const isWhite = color === 'w';

  // Sort captured pieces by descending piece value (Q, R, B, N, P)
  const sortedCaptures = [...capturedPieces].sort(
    (a, b) => (PIECE_VALUES[b] || 0) - (PIECE_VALUES[a] || 0)
  );

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 select-none',
        isActiveTurn && !isGameOver
          ? 'bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30'
          : 'bg-slate-950/60 border-white/5',
        className
      )}
    >
      {/* Left: Player Profile */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative">
          <Avatar
            src={player.avatar}
            name={player.name}
            size="sm"
            status={online === undefined ? (isActiveTurn && !isGameOver ? 'online' : 'offline') : (online ? 'online' : 'offline')}
          />
          {/* Piece side indicator circle */}
          <div
            className={clsx(
              'absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-black/80 flex items-center justify-center shadow',
              isWhite ? 'bg-white' : 'bg-zinc-900 border-white/40'
            )}
            title={isWhite ? 'White' : 'Black'}
          >
            <div className={clsx('w-1.5 h-1.5 rounded-full', isWhite ? 'bg-zinc-900' : 'bg-white')} />
          </div>
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            {player.title && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                {player.title}
              </span>
            )}
            <span className="text-sm font-bold text-slate-100 truncate">
              {player.name}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <span>({player.rating || 1200})</span>
            {isActiveTurn && !isGameOver && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-1" />
            )}
          </div>
        </div>
      </div>

      {/* Middle: Captured Pieces & Advantage */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-[200px] px-2 py-0.5">
        <div className="flex items-center gap-0.5">
          {sortedCaptures.map((p, i) => (
            <div key={i} className="w-4 h-4 flex items-center justify-center shrink-0">
              <Piece type={p} color={isWhite ? 'b' : 'w'} className="w-4 h-4" />
            </div>
          ))}
        </div>
        {materialAdvantage > 0 && (
          <span className="text-[11px] font-black text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 shrink-0 font-mono">
            +{materialAdvantage}
          </span>
        )}
      </div>

      {/* Right: Digital Tournament Clock */}
      <div
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1 rounded-xl border font-mono font-black text-sm sm:text-base tracking-wider transition-all duration-150 shrink-0',
          isLowTime
            ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]'
            : isActiveTurn && !isGameOver
            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
            : 'bg-white/5 border-white/10 text-slate-400'
        )}
      >
        <Clock className={clsx('w-3.5 h-3.5', isActiveTurn && !isGameOver ? 'text-cyan-400' : 'text-slate-500')} />
        <span>{timeFormatted}</span>
      </div>
    </div>
  );
};

export default PlayerInfoBar;
