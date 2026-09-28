import React from 'react';
import { clsx } from 'clsx';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-xl bg-slate-800/60 border border-white/5',
        className
      )}
      {...props}
    />
  );
};

export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={clsx('p-6 rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse flex flex-col gap-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
};

export default Skeleton;
