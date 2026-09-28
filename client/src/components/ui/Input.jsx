import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

export const Input = forwardRef(({
  label,
  error,
  icon: Icon,
  rightIcon: RightIcon,
  onRightIconClick,
  className = '',
  containerClassName = '',
  type = 'text',
  ...props
}, ref) => {
  return (
    <div className={clsx('flex flex-col gap-1.5 w-full', containerClassName)}>
      {label && (
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={clsx(
            'w-full bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm rounded-xl px-4 py-2.5 transition-all duration-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50',
            Icon && 'pl-10',
            RightIcon && 'pr-10',
            error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/50',
            className
          )}
          {...props}
        />
        {RightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RightIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
