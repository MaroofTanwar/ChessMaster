import React from 'react';
import Badge from '../ui/Badge';
import { formatEvaluation } from '../../utils/analysisFormat';
const variants = { Best: 'emerald', Excellent: 'cyan', Good: 'purple', Inaccuracy: 'gold', Mistake: 'rose', Blunder: 'rose' };
export default function AnalysisInsight({ move, index }) {
  if (!move) return <p className="text-sm text-slate-400">Select a move to view its engine insight.</p>;
  return <div className="space-y-3 text-sm"><div className="flex items-center justify-between"><span className="font-bold text-slate-100">Move {Math.ceil(index / 2)}{move.color === 'b' ? '…' : '.'} {move.san}</span><Badge variant={variants[move.classification]}>{move.classification}</Badge></div>
    <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-white/5 p-2"><span className="text-slate-500">Before</span><div className="font-mono text-slate-200">{formatEvaluation(move.evaluationBefore)}</div></div><div className="rounded-lg bg-white/5 p-2"><span className="text-slate-500">After</span><div className="font-mono text-slate-200">{formatEvaluation(move.evaluationAfter)}</div></div></div>
    <div><span className="text-slate-500">Best move: </span><strong className="text-cyan-300">{move.bestMoveSan || 'Unavailable'}</strong>{move.uci === move.bestMove && <span className="text-emerald-300"> · Played</span>}</div>
    <div><span className="text-slate-500">Centipawn loss: </span><span>{move.centipawnLoss}</span></div>
    {!!move.bestLine?.length && <div><span className="text-slate-500">Best line: </span><span className="font-mono text-slate-300">{move.bestLine.join(' ')}</span></div>}
  </div>;
}
