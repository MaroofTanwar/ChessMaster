import React from 'react';
import { clsx } from 'clsx';

export const Avatar = ({
  src,
  name = 'User',
  size = 'md',
  status, // 'online' | 'offline' | 'ingame'
  className = '',
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const statusColors = {
    online: 'bg-emerald-500 ring-emerald-950',
    offline: 'bg-slate-500 ring-slate-950',
    ingame: 'bg-purple-500 ring-purple-950 animate-pulse',
  };

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={name}
          className={clsx(
            'rounded-full object-cover border border-white/10 shadow-md',
            sizes[size],
            className
          )}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full bg-gradient-to-br from-purple-700 to-indigo-900 border border-purple-400/30 text-purple-100 font-bold flex items-center justify-center shadow-inner',
            sizes[size],
            className
          )}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2',
            statusColors[status] || statusColors.offline
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
