import React from 'react';
import { BarChart3, Gamepad2, Settings, Swords } from 'lucide-react';
import { Link } from 'react-router-dom';

const items = [
  { label: 'Play', to: '/dashboard', icon: Gamepad2 },
  { label: 'History', to: '/history', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
];

export default function MobileGameNav() {
  return (
    <nav
      aria-label="Mobile game navigation"
      data-testid="mobile-game-navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-purple-500/20 bg-slate-950/95 px-2 pt-1.5 shadow-[0_-12px_35px_rgba(2,6,23,0.72)] backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: 'max(0.45rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        <Link to="/dashboard" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
          <Gamepad2 className="h-5 w-5" />
          <span>Play</span>
        </Link>
        <button type="button" aria-current="page" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-purple-500/10 text-[10px] font-bold text-purple-300 ring-1 ring-inset ring-purple-500/20">
          <Swords className="h-5 w-5" />
          <span>Game</span>
        </button>
        {items.slice(1).map(({ label, to, icon: Icon }) => (
          <Link key={to} to={to} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
