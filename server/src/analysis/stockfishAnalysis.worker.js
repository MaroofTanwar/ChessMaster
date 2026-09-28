import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import readline from 'node:readline';
import { parentPort } from 'node:worker_threads';
import { ANALYSIS_DEPTH } from './analysisConfig.js';
import { Chess } from 'chess.js';

const require = createRequire(import.meta.url);
const packageRoot = path.dirname(require.resolve('stockfish/package.json'));
const enginePath = path.join(packageRoot, 'bin', 'stockfish-19-lite-single.js');
let engine;
let current = null;

function normalizeScore(type, raw, turn) {
  const parsed = Number(raw) || 0; const whiteValue = turn === 'w' ? parsed : -parsed;
  return type === 'mate' ? { type: 'mate', value: whiteValue } : { type: 'cp', value: whiteValue };
}

function startEngine() {
  if (engine) return engine;
  engine = spawn(process.execPath, [enginePath], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  readline.createInterface({ input: engine.stdout }).on('line', (line) => {
    if (!current) return;
    if (line.startsWith('info ') && line.includes(' score ') && line.includes(' pv ')) {
      const match = line.match(/score (cp|mate) (-?\d+).*?\spv\s(.+)$/);
      if (match) current.latest = { evaluation: normalizeScore(match[1], match[2], current.turn), pv: match[3].trim().split(/\s+/) };
    }
    if (line.startsWith('bestmove ')) {
      const active = current; current = null; clearTimeout(active.timer);
      active.resolve({ ...active.latest, bestMove: line.split(/\s+/)[1] === '(none)' ? null : line.split(/\s+/)[1] });
    }
  });
  engine.stderr.on('data', () => {});
  engine.on('error', (error) => { if (current) { const active = current; current = null; active.reject(error); } });
  engine.stdin.write('uci\nsetoption name Hash value 32\nisready\n');
  return engine;
}

function evaluate(fen) {
  const position = new Chess(fen);
  if (position.isCheckmate()) return Promise.resolve({ evaluation: { type: 'mate', value: position.turn() === 'w' ? -1 : 1 }, pv: [], bestMove: null });
  if (position.isDraw()) return Promise.resolve({ evaluation: { type: 'cp', value: 0 }, pv: [], bestMove: null });
  const instance = startEngine(); const turn = fen.split(' ')[1];
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { instance.stdin.write('stop\n'); reject(new Error('Stockfish position analysis timed out.')); current = null; }, 15_000);
    current = { resolve, reject, timer, turn, latest: { evaluation: { type: 'cp', value: 0 }, pv: [] } };
    instance.stdin.write(`position fen ${fen}\ngo depth ${ANALYSIS_DEPTH}\n`);
  });
}

parentPort.on('message', async ({ jobId, positions, type }) => {
  if (type === 'cancel') { engine?.stdin.write('stop\n'); engine?.kill(); process.exit(0); }
  try {
    const evaluations = [];
    for (let index = 0; index < positions.length; index += 1) {
      evaluations.push(await evaluate(positions[index].fen));
      parentPort.postMessage({ jobId, type: 'progress', completed: index + 1, total: positions.length });
    }
    parentPort.postMessage({ jobId, type: 'complete', evaluations }); engine?.kill(); engine = null;
  } catch (error) { parentPort.postMessage({ jobId, type: 'error', error: error.message }); engine?.kill(); engine = null; }
});

process.on('exit', () => { try { engine?.kill(); } catch { /* already stopped */ } });
