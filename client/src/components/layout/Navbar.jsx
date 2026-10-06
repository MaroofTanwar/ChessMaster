import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Crown, Swords, Bot, Menu, X, User, Settings, LogOut, Bell, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import Dropdown from '../ui/Dropdown';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useSocial } from '../../context/SocialContext';
import Modal from '../ui/Modal';
import { clsx } from 'clsx';

export const Navbar = ({ isMobileMenuOpen, setIsMobileMenuOpen, compactMobile = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user, isAuthenticated, logout } = useAuth();
  const { social, challenges, acceptChallenge, declineChallenge, quickMatch, startQuickMatch, cancelQuickMatch } = useSocial();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unread = social.incoming.length + challenges.length;

  const isLandingPage = location.pathname === '/';

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out successfully', 'info');
      navigate('/');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const userDropdownItems = [
    {
      label: user ? `@${user.username}` : 'Profile',
      icon: User,
      onClick: () => navigate('/profile'),
    },
    {
      label: 'Settings',
      icon: Settings,
      onClick: () => navigate('/settings'),
    },
    { divider: true },
    {
      label: 'Sign Out',
      icon: LogOut,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
      <div className={clsx('max-w-7xl mx-auto sm:px-6 lg:px-8 flex items-center justify-between', compactMobile ? 'h-14 px-2 gap-1.5 sm:h-16 sm:gap-4' : 'h-16 px-4 gap-4')}>
        {/* Left: Brand Logo & Mobile Toggle */}
        <div className={clsx('flex items-center min-w-0', compactMobile ? 'gap-1.5 sm:gap-3' : 'gap-3')}>
          {!isLandingPage && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={clsx('lg:hidden text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors shrink-0', compactMobile ? 'p-1.5 sm:p-2' : 'p-2')}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}

          <Link to="/" className={clsx('flex items-center group min-w-0', compactMobile ? 'gap-1.5 sm:gap-2.5' : 'gap-2.5')}>
            <div className={clsx('rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300 shrink-0', compactMobile ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10')}>
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-purple-400 group-hover:text-cyan-300 transition-colors">
                <Crown className="w-5 h-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className={clsx('font-extrabold tracking-wider text-slate-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-cyan-400 transition-all whitespace-nowrap', compactMobile ? 'text-sm min-[380px]:text-base sm:text-lg' : 'text-lg')}>
                CHESS<span className="text-purple-500">MASTER</span>
              </span>
              <span className={clsx('text-[9px] uppercase tracking-widest text-slate-400 font-bold -mt-1', compactMobile && 'hidden sm:block')}>
                Grandmaster Edition
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Quick Links */}
        {isLandingPage ? (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-purple-400 transition-colors">Features</a>
            <Link to="/multiplayer" className="hover:text-purple-400 transition-colors">Multiplayer</Link>
            <Link to="/ai" className="hover:text-cyan-400 transition-colors">AI Bot</Link>
            <Link to="/leaderboard" className="hover:text-amber-400 transition-colors">Leaderboard</Link>
          </nav>
        ) : (
          <div className="hidden sm:flex items-center gap-3">
            <Button data-testid="navbar-quick-match" size="sm" variant="primary" icon={Swords} onClick={() => void startQuickMatch()} isLoading={['starting', 'searching'].includes(quickMatch.status)}>
              Quick Match
            </Button>
            <Link to="/ai">
              <Button size="sm" variant="cyan" icon={Bot}>
                Play AI
              </Button>
            </Link>
          </div>
        )}

        {/* Right: User Actions / Auth Buttons */}
        <div className={clsx('flex items-center shrink-0', compactMobile ? 'gap-1 sm:gap-3' : 'gap-3')}>
          {!isAuthenticated ? (
            <div className={clsx('flex items-center', compactMobile ? 'gap-1 sm:gap-3' : 'gap-3')}>
              <Link to="/login">
                <Button size="sm" variant="ghost">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" variant="primary">
                  Get Started
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative">
              <button
                aria-label="Notifications"
                onClick={() => setNotificationsOpen((value) => !value)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center">{unread}</span>}
              </button>
              {notificationsOpen && <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
                <div className="mb-2 px-2 text-sm font-black text-slate-100">Notifications</div>
                {!unread && <p className="px-2 py-4 text-sm text-slate-400">No new notifications.</p>}
                {social.incoming.map((item) => <button key={item.id} onClick={() => { setNotificationsOpen(false); navigate('/friends'); }} className="w-full rounded-xl p-3 text-left hover:bg-white/5"><div className="text-sm font-bold">{item.username} sent a friend request</div><div className="text-xs text-purple-300">Review request</div></button>)}
                {challenges.map((item) => <div key={item.id} className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3"><div className="text-sm font-bold">{item.challenger.username} challenged you!</div><div className="mb-2 text-xs text-slate-400">{item.gameMode === 'ranked' ? 'Ranked' : 'Casual'} · Rapid 10+0</div><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={async () => { const response = await declineChallenge(item.id); if (!response?.ok) addToast(response?.error?.message, 'error'); }}>Decline</Button><Button size="sm" onClick={async () => { const response = await acceptChallenge(item.id); if (!response?.ok) addToast(response?.error?.message, 'error'); }}>Accept</Button></div></div>)}
              </div>}
              </div>

              <Dropdown
                trigger={
                  <button className="flex items-center gap-2.5 p-1 px-2 rounded-xl hover:bg-white/5 border border-white/5 transition-colors">
                    <Avatar name={user?.username || 'User'} status="online" size="sm" />
                    <div className="hidden md:flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-200">{user?.username}</span>
                      <span className="text-[10px] text-purple-400 font-mono font-semibold">{user?.rating || 1200} ELO</span>
                    </div>
                  </button>
                }
                items={userDropdownItems}
              />
            </div>
          )}
        </div>
      </div>
      <Modal
        isOpen={['starting', 'searching', 'cancelling'].includes(quickMatch.status)}
        onClose={() => void cancelQuickMatch()}
        title="Finding opponent..."
        subtitle="Ranked Rapid 10+0"
        maxWidth="max-w-sm"
      >
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10">
            <Loader2 className="h-8 w-8 animate-spin text-purple-300 motion-reduce:animate-none" />
          </div>
          <p className="text-sm text-slate-400">Searching for another authenticated ChessMaster player.</p>
          <Button variant="secondary" onClick={() => void cancelQuickMatch()} isLoading={quickMatch.status === 'cancelling'}>
            Cancel Search
          </Button>
        </div>
      </Modal>
    </header>
  );
};

export default Navbar;
