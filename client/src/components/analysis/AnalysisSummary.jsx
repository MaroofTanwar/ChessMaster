import React from 'react';
const rows = [['Accuracy', 'accuracy'], ['Best', 'Best'], ['Excellent', 'Excellent'], ['Good', 'Good'], ['Inaccuracies', 'Inaccuracy'], ['Mistakes', 'Mistake'], ['Blunders', 'Blunder']];
export default function AnalysisSummary({ summary }) {
  if (!summary) return null;
  return <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead><tr className="text-slate-500"><th className="p-2 text-left">ChessMaster analysis</th><th className="p-2">White</th><th className="p-2">Black</th></tr></thead><tbody>{rows.map(([label, key]) => <tr key={key} className="border-t border-white/5"><td className="p-2 text-slate-300">{label}</td><td className="p-2 text-center font-bold text-slate-100">{summary.white[key]}{key === 'accuracy' ? '%' : ''}</td><td className="p-2 text-center font-bold text-slate-100">{summary.black[key]}{key === 'accuracy' ? '%' : ''}</td></tr>)}</tbody></table></div>;
}
