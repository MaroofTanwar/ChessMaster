import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';
import Button from './Button';

export const ErrorState = ({
  title = 'Something Went Wrong',
  description = 'An unexpected error occurred while loading content.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-950/40">
        <AlertOctagon className="w-7 h-7" />
      </div>
      <h4 className="text-lg font-bold text-rose-200 mb-1">{title}</h4>
      <p className="text-sm text-slate-400 mb-6">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
