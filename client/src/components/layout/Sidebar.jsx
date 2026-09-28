import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Swords, Bot, Trophy, History, User, Settings, Sparkles, Users } from 'lucide-react';
import { clsx } from 'clsx';
import Badge from '../ui/Badge';

export const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Play Live', icon: Swords, path: '/multiplayer', badge: 'LIVE' },
    { label: 'Local Chess', icon: Swords, path: '/play' },
    { label: 'VS AI Bot', icon: Bot, path: '/ai' },
    { label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
    { label: 'Game History', icon: History, path: '/history' },
    { label: 'Friends', icon: Users, path: '/friends' },
    { label: 'My Profile', icon: User, path: '/profile' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full py-4 px-3 justify-between">
      <div className="flex flex-col gap-1">
        <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          Menu Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen && setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20 text-purple-300 border border-purple-500/30 shadow-lg shadow-purple-950/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <Badge
                  variant={item.badge === 'LIVE' ? 'rose' : 'cyan'}
                  size="sm"
                >
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Pro Banner Bottom */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-900/40 to-slate-900/90 border border-purple-500/20 text-center relative overflow-hidden mt-6">
        <div className="absolute top-0 right-0 p-2 opacity-10">
          <Sparkles className="w-16 h-16 text-purple-400" />
        </div>
        <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Grandmaster Pass
        </div>
        <p className="text-[11px] text-slate-400 mb-3">Unlock engine deep analysis & unlimited AI puzzles.</p>
        <button className="w-full py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors shadow-md shadow-purple-600/30">
          Upgrade Now
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/10 bg-slate-950/60 backdrop-blur-xl shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <aside className="relative z-10 w-72 max-w-[80vw] bg-slate-950 border-r border-white/10 h-full flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
