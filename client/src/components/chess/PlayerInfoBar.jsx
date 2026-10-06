import React from 'react';
import Avatar from '../ui/Avatar';
import CapturedMaterialDisplay from './CapturedMaterialDisplay';
import { Clock } from 'lucide-react';
import { clsx } from 'clsx';

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
  compactOnMobile = false,
}) => {
  const isWhite = color === 'w';

  return (
    <div
      data-testid="player-info-bar"
      className={clsx(
        'flex items-center justify-between border transition-all duration-200 select-none',
        compactOnMobile ? 'gap-2 px-2 py-1.5 rounded-xl sm:gap-3 sm:px-3.5 sm:py-2.5 sm:rounded-2xl' : 'gap-3 px-3.5 py-2.5 rounded-2xl',
        isActiveTurn && !isGameOver
          ? 'bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30'
          : 'bg-slate-950/60 border-white/5',
        className
      )}
    >
      {/* Left: Player Profile */}
      <div data-testid="player-profile" className={clsx('flex items-center min-w-0', compactOnMobile ? 'gap-2 sm:gap-2.5' : 'gap-2.5')}>
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
      <CapturedMaterialDisplay
        pieces={capturedPieces}
        pieceColor={isWhite ? 'b' : 'w'}
        advantage={materialAdvantage}
        className="max-w-[30vw] flex-1 justify-center px-0.5 sm:max-w-[220px] sm:px-2"
      />

      {/* Right: Digital Tournament Clock */}
      <div
        data-testid="player-clock"
        className={clsx(
          'flex items-center gap-1.5 py-1 rounded-xl border font-mono font-black text-sm sm:text-base tracking-wider transition-all duration-150 shrink-0',
          compactOnMobile ? 'px-2 sm:px-3' : 'px-3',
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
