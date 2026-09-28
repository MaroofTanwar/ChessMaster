import React from 'react';
import Modal from '../ui/Modal';
import { TIME_PRESETS } from '../../hooks/useChessTimer';
import { Zap, Flame, Clock, Coffee, Infinity as InfinityIcon } from 'lucide-react';
import { clsx } from 'clsx';

const CATEGORY_ICONS = {
  Bullet: Zap,
  Blitz: Flame,
  Rapid: Clock,
  Classical: Coffee,
  Casual: InfinityIcon,
};

export const TimeControlModal = ({
  isOpen,
  onClose,
  currentPreset,
  onSelectPreset,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Time Control"
      subtitle="Choose the match clock pace for your game."
      maxWidth="max-w-md"
    >
      <div className="grid grid-cols-2 gap-2.5 py-3">
        {TIME_PRESETS.map((preset) => {
          const isSelected = currentPreset?.id === preset.id;
          const Icon = CATEGORY_ICONS[preset.category] || Clock;

          return (
            <button
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset);
                onClose();
              }}
              className={clsx(
                'flex flex-col items-start p-3.5 rounded-2xl border transition-all duration-150 text-left group',
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400'
                  : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-300 hover:text-white'
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span
                  className={clsx(
                    'p-1.5 rounded-xl border',
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                      : 'bg-white/5 text-slate-400 border-white/10 group-hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  {preset.category}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-100">{preset.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {preset.initialSeconds === 0
                  ? 'No clock constraints'
                  : `${Math.floor(preset.initialSeconds / 60)} min ${
                      preset.increment ? `+ ${preset.increment}s` : ''
                    }`}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};

export default TimeControlModal;
