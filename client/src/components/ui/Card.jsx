import React from 'react';
import { clsx } from 'clsx';

export const Card = ({
  children,
  className = '',
  hoverEffect = true,
  variant = 'glass',
  ...props
}) => {
  const baseStyles = 'rounded-2xl transition-all duration-300 relative overflow-hidden';
  
  const variants = {
    glass: 'bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50',
    solid: 'bg-slate-900 border border-slate-800 shadow-xl',
    glow: 'bg-slate-900/80 backdrop-blur-xl border border-purple-500/20 shadow-xl shadow-purple-950/20',
  };

  const hoverStyles = hoverEffect ? 'hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-purple-500/10' : '';

  return (
    <div
      className={clsx(baseStyles, variants[variant], hoverStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
