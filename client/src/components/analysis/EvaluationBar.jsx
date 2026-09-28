import React from 'react';
import { evaluationNumber, formatEvaluation } from '../../utils/analysisFormat';
export default function EvaluationBar({ evaluation }) {
  const score = evaluationNumber(evaluation); const white = Math.max(8, Math.min(92, 50 + 42 * Math.tanh(score / 4)));
  return <div className="flex h-[min(80vw,600px)] w-8 shrink-0 flex-col overflow-hidden rounded-lg border border-white/15 bg-slate-950 shadow-lg" aria-label={`Evaluation ${formatEvaluation(evaluation)}`}>
    <div className="relative bg-slate-100 transition-[height] duration-500" style={{ height: `${white}%` }}><span className="absolute left-1/2 top-2 -translate-x-1/2 rotate-90 text-[10px] font-black text-slate-900">{score >= 0 ? formatEvaluation(evaluation) : ''}</span></div>
    <div className="relative flex-1 bg-slate-900"><span className="absolute bottom-2 left-1/2 -translate-x-1/2 rotate-90 text-[10px] font-black text-white">{score < 0 ? formatEvaluation(evaluation) : ''}</span></div>
  </div>;
}
