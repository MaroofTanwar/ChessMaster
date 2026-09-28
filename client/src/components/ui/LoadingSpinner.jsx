import React from 'react';
import { clsx } from 'clsx';

export const LoadingSpinner = ({ size = 'md', label, className = '' }) => {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center p-4 gap-3', className)}>
      <div
        className={clsx(
          'rounded-full border-purple-500/20 border-t-purple-500 border-r-cyan-400 animate-spin shadow-lg shadow-purple-500/20',
          sizes[size]
        )}
      />
      {label && <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>}
    </div>
  );
};

export default LoadingSpinner;
