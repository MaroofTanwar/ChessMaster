import React from 'react';
const numeric = (evaluation) => evaluation?.type === 'mate' ? Math.sign(evaluation.value || 1) * 6 : Math.max(-6, Math.min(6, Number(evaluation?.value || 0) / 100));
export default function EvaluationGraph({ positions = [], selectedIndex, onSelect }) {
  if (!positions.length) return null;
  const width = 800; const height = 220; const points = positions.map((item, index) => ({ x: positions.length === 1 ? 0 : index * width / (positions.length - 1), y: height / 2 - numeric(item.evaluation) * (height - 28) / 12 }));
  return <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[600px] w-full h-56" role="img" aria-label="Engine evaluation graph">
    <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#475569" strokeDasharray="5 5" />
    <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#22d3ee" strokeWidth="3" />
    {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={selectedIndex === index ? 6 : 4} fill={selectedIndex === index ? '#c084fc' : '#22d3ee'} className="cursor-pointer" onClick={() => onSelect(index)}><title>Position {index}</title></circle>)}
  </svg></div>;
}

