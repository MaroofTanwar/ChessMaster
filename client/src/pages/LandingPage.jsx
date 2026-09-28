import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Swords, Bot, Trophy, Zap, Sparkles, ChevronRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Navbar from '../components/layout/Navbar';

export const LandingPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white overflow-hidden">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 bg-radial-gradient border-b border-white/5 chess-grid-bg">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-8 shadow-lg shadow-purple-950/40"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Next-Gen Competitive Chess Engine
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none mb-6"
          >
            PLAY. THINK.{' '}
            <span className="text-gradient-purple-cyan block sm:inline">
              CONQUER.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-light"
          >
            Experience online chess powered by low-latency multiplayer, responsive worker-based AI, and real-time Elo rating ladders.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto"
          >
            <Link to="/play" className="w-full sm:w-auto">
              <Button size="lg" variant="primary" icon={Swords} className="w-full sm:w-auto text-base py-4 px-8">
                Play Chess
              </Button>
            </Link>
            <a href="#features" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" icon={ChevronRight} className="w-full sm:w-auto text-base py-4 px-8">
                Explore Platform
              </Button>
            </a>
          </motion.div>

          {/* Interactive Chessboard Showcase Graphic */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-16 relative max-w-4xl mx-auto rounded-3xl p-2 bg-gradient-to-b from-purple-500/30 via-slate-800/40 to-white/5 border border-white/10 shadow-2xl backdrop-blur-xl"
          >
            <div className="rounded-2xl bg-slate-950/90 overflow-hidden p-6 sm:p-10 border border-white/5 flex flex-col items-center">
              <div className="flex items-center justify-between w-full pb-4 mb-6 border-b border-white/10 text-xs sm:text-sm text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-mono text-emerald-400 font-semibold">LIVE MATCH #8492</span>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="purple" icon={Trophy}>Master Rated</Badge>
                  <span className="font-mono text-slate-300">03:45 ⏱️</span>
                </div>
              </div>

              {/* Simplified Dark Stylized Board Preview */}
              <div className="w-full max-w-md aspect-square rounded-xl overflow-hidden grid grid-cols-8 border border-white/10 shadow-2xl">
                {Array.from({ length: 64 }).map((_, i) => {
                  const row = Math.floor(i / 8);
                  const col = i % 8;
                  const isDark = (row + col) % 2 === 1;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-center font-bold text-lg ${
                        isDark ? 'bg-slate-900/90 text-purple-400/80' : 'bg-slate-800/60 text-slate-300/80'
                      } ${i === 27 ? '!bg-purple-600/40 text-purple-200 ring-2 ring-purple-500' : ''} ${
                        i === 35 ? '!bg-cyan-600/40 text-cyan-200 ring-2 ring-cyan-400' : ''
                      }`}
                    >
                      {i === 3 && '♛'}
                      {i === 4 && '♚'}
                      {i === 27 && '♞'}
                      {i === 35 && '♟'}
                      {i === 59 && '♕'}
                      {i === 60 && '♔'}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="cyan" icon={Zap} className="mb-4">
            Built For Grandmasters
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Engineered For Pure Precision
          </h2>
          <p className="text-slate-400 text-lg">
            Every feature is designed to sharpen your tactical instinct and provide seamless competitive gameplay.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <motion.div variants={itemVariants} id="multiplayer">
            <Card className="p-8 h-full flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-6">
                  <Swords className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">Real-Time Multiplayer</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Challenge players worldwide with instant matchmaking, live spectators, move history, and draw offers.
                </p>
              </div>
              <Link to="/play" className="mt-6 pt-4 border-t border-white/5 flex items-center text-purple-400 text-xs font-semibold hover:underline">
                Matchmaking Arena &rarr;
              </Link>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} id="ai">
            <Card className="p-8 h-full flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">ChessMaster AI Bot</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Train against five progressively deeper AI search levels without blocking the interface.
                </p>
              </div>
              <Link to="/ai" className="mt-6 pt-4 border-t border-white/5 flex items-center text-cyan-400 text-xs font-semibold hover:underline">
                AI Chess &rarr;
              </Link>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} id="leaderboard">
            <Card className="p-8 h-full flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
                  <Trophy className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">Global Leaderboard</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Climb Blitz, Rapid, and Bullet ladders, earn achievement badges, and track your performance statistics.
                </p>
              </div>
              <Link to="/leaderboard" className="mt-6 pt-4 border-t border-white/5 flex items-center text-amber-400 text-xs font-semibold hover:underline">
                Elo Rating Ladder &rarr;
              </Link>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-950/60 border-y border-white/5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl sm:text-5xl font-black text-gradient-purple-cyan mb-2">100K+</div>
            <div className="text-xs uppercase tracking-widest font-bold text-slate-400">Active Players</div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-black text-gradient-purple-cyan mb-2">2.5M</div>
            <div className="text-xs uppercase tracking-widest font-bold text-slate-400">Games Completed</div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-black text-gradient-purple-cyan mb-2">&lt; 15ms</div>
            <div className="text-xs uppercase tracking-widest font-bold text-slate-400">Server Latency</div>
          </div>
          <div>
            <div className="text-4xl sm:text-5xl font-black text-gradient-gold mb-2">3200</div>
            <div className="text-xs uppercase tracking-widest font-bold text-slate-400">Max Engine ELO</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center relative">
        <Card className="p-12 sm:p-16 border-purple-500/30 bg-gradient-to-b from-purple-950/30 via-slate-900/90 to-slate-950 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Crown className="w-64 h-64 text-purple-400" />
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Ready to Claim Your Crown?
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-8">
            Create your account now to challenge live grandmasters and save your games.
          </p>
          <Link to="/register">
            <Button size="lg" variant="primary" icon={Crown} className="py-4 px-10 text-base">
              Create Free Account
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-slate-950 text-slate-500 text-sm px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-purple-500" />
            <span className="font-bold text-slate-300">ChessMaster &copy; 2026</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#features" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#features" className="hover:text-white transition-colors">API Status</a>
          </div>
        </div>
      </footer>

      
    </div>
  );
};

export default LandingPage;
