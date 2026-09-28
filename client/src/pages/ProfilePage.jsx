import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '../components/layout/AppLayout';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import RatingChart from '../components/profile/RatingChart';
import RecentMatches from '../components/profile/RecentMatches';
import { Trophy, Flame, Calendar, Edit3, Mail, History } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import usePlayerGames from '../hooks/usePlayerGames';

export const ProfilePage = () => {
  const { addToast } = useToast();
  const { user, firebaseUser } = useAuth();
  const playerGames = usePlayerGames(firebaseUser?.uid);

  const joinedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Sep 2026';

  const winRateVal = user?.gamesPlayed > 0 
    ? ((user.wins / user.gamesPlayed) * 100)
    : 0;

  const winRateFormatted = winRateVal.toFixed(1) + '%';

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
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-8 border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-slate-900 to-cyan-950/30 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              <Avatar name={user?.username || 'User'} size="xl" status="online" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                  <h1 className="text-3xl font-black text-slate-100">{user?.username}</h1>
                  <Badge variant="purple" icon={Trophy}>{rankTitle}</Badge>
                </div>
                <p className="text-sm text-slate-400 mb-4 flex items-center justify-center sm:justify-start gap-2">
                  <Mail className="w-4 h-4 text-slate-500" /> {user?.email}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-purple-400" /> Joined {joinedDate}</span>
                  <span className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-amber-400" /> {user?.gamesPlayed || 0} Career Games</span>
                </div>
              </div>
              <Button variant="secondary" size="sm" icon={Edit3} onClick={() => addToast('Profile editing is not available yet.', 'info')}>
                Edit Profile
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Detailed Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-1">Standard ELO</div>
            <div className="text-3xl font-black text-purple-400">{user?.rating || 1200}</div>
            <div className="text-xs text-purple-300/70 mt-1">Blitz Ladder</div>
          </Card>

          <Card className="p-6">
            <div className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-1">Wins</div>
            <div className="text-3xl font-black text-emerald-400">{user?.wins || 0}</div>
            <div className="text-xs text-emerald-300/70 mt-1">Victories</div>
          </Card>

          <Card className="p-6">
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">Losses</div>
            <div className="text-3xl font-black text-rose-400">{user?.losses || 0}</div>
            <div className="text-xs text-rose-300/70 mt-1">Defeats</div>
          </Card>

          <Card className="p-6">
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">Win Rate</div>
            <div className="text-3xl font-black text-cyan-400">{winRateFormatted}</div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(winRateVal, 100)}%` }}
              />
            </div>
          </Card>
        </div>

        {/* Rating History Chart */}
        <RatingChart history={playerGames.ratingHistory} currentRating={user?.rating || 1200} loading={playerGames.loading} />

        {/* Career Matches Archive */}
        <div>
          <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold text-slate-100 flex items-center gap-2"><History className="w-5 h-5 text-purple-400" /> Recent Matches</h3><Link to="/history" className="text-xs font-semibold text-purple-400 hover:underline">View All History →</Link></div>
          <RecentMatches games={playerGames.recentGames} uid={firebaseUser?.uid} loading={playerGames.loading} error={playerGames.error} />
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
