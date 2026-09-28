import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import CreateGameModal from '../components/game/CreateGameModal';
import JoinGameModal from '../components/game/JoinGameModal';
import RatingChart from '../components/profile/RatingChart';
import RecentMatches from '../components/profile/RecentMatches';
import { Swords, Bot, PlusCircle, LogIn, Trophy, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import usePlayerGames from '../hooks/usePlayerGames';

export const DashboardPage = () => {
  const { user, firebaseUser } = useAuth();
  const { quickMatch, startQuickMatch } = useSocial();
  const isSearching = ['starting', 'searching', 'cancelling'].includes(quickMatch.status);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const playerGames = usePlayerGames(firebaseUser?.uid);

  const winRate = user?.gamesPlayed > 0 
    ? ((user.wins / user.gamesPlayed) * 100).toFixed(1) + '%' 
    : '0.0%';

  // Determine Rank Title
  let rankTitle = 'Pawn Apprentice';
  if ((user?.rating || 1200) >= 2400) rankTitle = 'Grandmaster';
  else if ((user?.rating || 1200) >= 2000) rankTitle = 'International Master';
  else if ((user?.rating || 1200) >= 1800) rankTitle = 'Candidate Master';
  else if ((user?.rating || 1200) >= 1500) rankTitle = 'Knight Tactician';
  else if ((user?.rating || 1200) >= 1200) rankTitle = 'Gold Scholar';

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/30 p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
        >
          <div className="flex items-center gap-4">
            <Avatar name={user?.username || 'Player'} status="online" size="xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-100">
                  Welcome Back, {user?.username || 'Player'}!
                </h1>
                <Badge variant="gold" icon={Trophy}>{rankTitle}</Badge>
              </div>
              <p className="text-sm text-slate-400">Ready to dominate the chessboard today?</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Button variant="primary" icon={Swords} onClick={() => void startQuickMatch()} isLoading={isSearching}>
              Quick Match
            </Button>
            <Link to="/ai">
              <Button variant="cyan" icon={Bot}>
                Vs AI
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Quick Action Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => void startQuickMatch()}
            disabled={isSearching}
            className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 hover:border-purple-400/60 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-2 text-center group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Swords className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Quick Match</span>
          </button>

          <Link
            to="/ai"
            className="p-4 rounded-2xl bg-gradient-to-br from-cyan-900/40 to-slate-900 border border-cyan-500/30 hover:border-cyan-400/60 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-2 text-center group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Play ChessMaster AI</span>
          </Link>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="p-4 rounded-2xl bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-500/30 hover:border-amber-400/60 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-2 text-center group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Create Game</span>
          </button>

          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 hover:border-emerald-400/60 hover:-translate-y-1 transition-all flex flex-col items-center justify-center gap-2 text-center group shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <LogIn className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Join Game Room</span>
          </button>
        </div>

        {/* User Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-5">
            <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Rating</div>
            <div className="text-2xl font-black text-purple-400">{user?.rating || 1200}</div>
            <div className="text-[10px] text-purple-300/70 mt-1">Standard Blitz</div>
          </Card>
          <Card className="p-5">
            <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Wins</div>
            <div className="text-2xl font-black text-emerald-400">{user?.wins || 0}</div>
            <div className="text-[10px] text-emerald-300/70 mt-1">Victories</div>
          </Card>
          <Card className="p-5">
            <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Losses</div>
            <div className="text-2xl font-black text-rose-400">{user?.losses || 0}</div>
            <div className="text-[10px] text-rose-300/70 mt-1">Defeats</div>
          </Card>
          <Card className="p-5">
            <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Draws</div>
            <div className="text-2xl font-black text-amber-400">{user?.draws || 0}</div>
            <div className="text-[10px] text-amber-300/70 mt-1">Stalemates</div>
          </Card>
          <Card className="p-5">
            <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Games Played</div>
            <div className="text-2xl font-black text-slate-100">{user?.gamesPlayed || 0}</div>
            <div className="text-[10px] text-slate-400 mt-1">Total Matches</div>
          </Card>
          <Card className="p-5">
            <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1">Win Rate</div>
            <div className="text-2xl font-black text-cyan-400">{winRate}</div>
            <div className="text-[10px] text-cyan-300/70 mt-1">Accuracy</div>
          </Card>
        </div>

        {/* Rating Progression Graph Section */}
        <RatingChart history={playerGames.ratingHistory} currentRating={user?.rating || 1200} loading={playerGames.loading} />

        {/* Recent Games Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" /> Recent Matches
            </h3>
            <Link to="/history" className="text-xs font-semibold text-purple-400 hover:underline">
              View All History &rarr;
            </Link>
          </div>

          <RecentMatches games={playerGames.recentGames} uid={firebaseUser?.uid} loading={playerGames.loading} error={playerGames.error} />
        </div>
      </div>

      {/* Quick Action Modals */}
      <CreateGameModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <JoinGameModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </AppLayout>
  );
};

export default DashboardPage;
