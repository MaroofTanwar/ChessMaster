import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';

const asDate = (value) => typeof value?.toDate === 'function' ? value.toDate() : new Date(value);

export default function RatingChart({ history = [], currentRating = 1200, loading = false }) {
  const [hovered, setHovered] = useState(null);
  const width = 700, height = 240, left = 48, right = 18, top = 18, bottom = 38;
  const chart = useMemo(() => {
    if (!history.length) return null;
    const ratings = history.map((point) => point.rating);
    const actualMin = Math.min(...ratings);
    const actualMax = Math.max(...ratings);
    const visualPadding = Math.max(8, Math.ceil((actualMax - actualMin) * 0.2));
    const min = actualMin - visualPadding;
    const max = actualMax + visualPadding;
    const range = max - min || 1;
    const points = history.map((point, index) => ({
      ...point,
      x: left + (index / Math.max(history.length - 1, 1)) * (width - left - right),
      y: top + ((max - point.rating) / range) * (height - top - bottom),
    }));
    return { actualMax, min, max, points, path: points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ') };
  }, [history]);

  return <Card className="p-5 sm:p-6 border-purple-500/20">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
      <div><div className="flex items-center gap-2"><h3 className="text-lg font-bold text-slate-100">Rating Progression</h3><Badge variant="purple" icon={TrendingUp}>Ranked</Badge></div><p className="text-xs text-slate-400 mt-1">Elo progression from completed ranked games</p></div>
      <div className="flex gap-4 text-xs text-slate-400"><span>Peak: <strong className="font-mono text-emerald-400">{chart ? chart.actualMax : '—'}</strong></span><span>Current: <strong className="font-mono text-purple-400">{currentRating}</strong></span></div>
    </div>
    {loading ? <div className="h-48 animate-pulse rounded-xl bg-white/5" /> : !chart ? <EmptyState icon={TrendingUp} title="No ranked games yet" description="Complete a ranked game to start your rating history." /> : <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 min-w-[560px] w-full" aria-label="Rating progression chart">
        <defs><linearGradient id="ratingArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity=".35" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
        {[chart.max, (chart.max + chart.min) / 2, chart.min].map((value, index) => { const y = top + index * ((height - top - bottom) / 2); return <g key={value}><line x1={left} y1={y} x2={width - right} y2={y} stroke="rgba(255,255,255,.08)" strokeDasharray="4" /><text x={left - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11">{Math.round(value)}</text></g>; })}
        <path d={`${chart.path} L ${chart.points.at(-1).x} ${height - bottom} L ${chart.points[0].x} ${height - bottom} Z`} fill="url(#ratingArea)" />
        <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .8 }} d={chart.path} fill="none" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {chart.points.map((point, index) => <g key={point.gameId} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} tabIndex="0" role="img" aria-label={`${point.rating} Elo`} className="outline-none">
          <circle cx={point.x} cy={point.y} r={hovered === index ? 7 : 5} fill="#8b5cf6" stroke="#0f172a" strokeWidth="3" />
          <text x={point.x} y={height - 14} textAnchor="middle" fill="#64748b" fontSize="10">{index === 0 ? 'Start' : `G${index}`}</text>
          {hovered === index && <g><rect x={Math.min(point.x + 8, width - 170)} y={Math.max(4, point.y - 58)} width="155" height="48" rx="8" fill="#0f172a" stroke="#7c3aed" /><text x={Math.min(point.x + 18, width - 160)} y={Math.max(22, point.y - 40)} fill="#f8fafc" fontSize="12" fontWeight="700">{point.rating} Elo {Number.isFinite(point.change) ? `(${point.change >= 0 ? '+' : ''}${point.change})` : ''}</text><text x={Math.min(point.x + 18, width - 160)} y={Math.max(39, point.y - 23)} fill="#94a3b8" fontSize="10">{Number.isNaN(asDate(point.date).getTime()) ? 'Date unavailable' : asDate(point.date).toLocaleDateString()}</text></g>}
        </g>)}
      </svg>
    </div>}
  </Card>;
}
