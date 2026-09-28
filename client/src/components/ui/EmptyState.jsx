import React from 'react';
import { Crown } from 'lucide-react';
import Button from './Button';

export const EmptyState = ({
  icon: Icon = Crown,
  title = 'No Data Available',
  description = 'There is nothing to display here yet.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-lg shadow-purple-950/40">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-lg font-bold text-slate-200 mb-1">{title}</h4>
      <p className="text-sm text-slate-400 mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
