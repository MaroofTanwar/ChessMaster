import React from 'react';

export default function ToggleSwitch({ label, description, checked, onChange, testId }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-slate-950/40 p-4">
    <div className="min-w-0"><div className="text-sm font-semibold text-slate-200">{label}</div><div className="mt-0.5 text-xs text-slate-500">{description}</div></div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className="group flex h-11 w-14 shrink-0 touch-manipulation items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    >
      <span data-toggle-track className={`relative block h-[26px] w-12 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none ${checked ? 'bg-purple-600' : 'bg-slate-700'}`}>
        <span data-toggle-knob className={`absolute left-[3px] top-[3px] block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none ${checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
      </span>
    </button>
  </div>;
}
