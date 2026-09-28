import React from 'react';
import { clsx } from 'clsx';

export const Badge = ({
  children,
  variant = 'purple',
  size = 'md',
  icon: Icon,
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full border backdrop-blur-md gap-1';

  const variants = {
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    gold: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5',
  };

  return (
    <span className={clsx(baseStyles, variants[variant], sizes[size], className)}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
};

export default Badge;
