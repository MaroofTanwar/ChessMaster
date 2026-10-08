import React, { useRef, useEffect } from 'react';
import { scrollElementWithinContainer } from '../../utils/scrollWithinContainer';

export const MoveHistory = ({ history, currentMoveIndex, onMoveSelect, annotations = [] }) => {
  const scrollContainerRef = useRef(null);
  const endRef = useRef(null);
  const moveRefs = useRef(new Map());

  useEffect(() => {
    const container = scrollContainerRef.current;
    const selectedMove = currentMoveIndex >= 0 ? moveRefs.current.get(currentMoveIndex) : null;
    scrollElementWithinContainer(container, selectedMove || endRef.current, {
      behavior: 'smooth',
      align: selectedMove ? 'nearest' : 'end',
    });
  }, [history.length, currentMoveIndex]);

  // Group moves into pairs (white + black)
  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: history[i],
      black: history[i + 1] || null,
    });
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm italic">
        No moves yet
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      data-testid="move-history-scroll"
      className="flex h-full min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain pr-1 custom-scrollbar [overflow-anchor:none]"
    >
      {movePairs.map(({ number, white, black }) => {
        const whiteIdx = (number - 1) * 2;
        const blackIdx = whiteIdx + 1;
        return (
          <div
            key={number}
            className="grid grid-cols-[32px_1fr_1fr] gap-1 items-center text-sm"
          >
            {/* Move number */}
            <span className="text-slate-500 font-mono text-xs text-right pr-2">
              {number}.
            </span>

            {/* White move */}
            <button
              type="button"
              onClick={() => onMoveSelect?.(whiteIdx)}
              disabled={!onMoveSelect}
              data-move-index={whiteIdx}
              ref={(node) => { if (node) moveRefs.current.set(whiteIdx, node); else moveRefs.current.delete(whiteIdx); }}
              className={`px-2 py-0.5 rounded font-mono transition-colors ${
                currentMoveIndex === whiteIdx
                  ? 'bg-cyan-500/30 text-cyan-300 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{white?.san}</span>{annotations[whiteIdx] && <span className="ml-1 text-[9px] text-cyan-300">{annotations[whiteIdx].classification}</span>}
            </button>

            {/* Black move */}
            <button
              type="button"
              onClick={() => black && onMoveSelect?.(blackIdx)}
              disabled={!black || !onMoveSelect}
              data-move-index={black ? blackIdx : undefined}
              ref={(node) => { if (node) moveRefs.current.set(blackIdx, node); else moveRefs.current.delete(blackIdx); }}
              className={`px-2 py-0.5 rounded font-mono transition-colors ${
                black && currentMoveIndex === blackIdx
                  ? 'bg-cyan-500/30 text-cyan-300 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{black?.san ?? ''}</span>{black && annotations[blackIdx] && <span className="ml-1 text-[9px] text-cyan-300">{annotations[blackIdx].classification}</span>}
            </button>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
};

export default MoveHistory;
