import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parentPort } from 'node:worker_threads';
import { AI_SEARCH_SETTINGS } from './aiConfig.js';
import { selectEngineMove } from './engineMoveSelection.js';

const require = createRequire(import.meta.url);
const packageRoot = path.dirname(require.resolve('stockfish/package.json'));
const enginePath = path.join(packageRoot, 'bin', 'stockfish-19-lite-single.js');
const debug = (message) => { if (process.env.NODE_ENV !== 'production') console.log(`[AI Engine] ${message}`); };
let engine; let outputBuffer = ''; let readyState = null; let active = null; const queue = [];
const send = (command) => engine?.stdin.write(`${command}\n`);

function handleLine(rawLine) {
  const line = rawLine.trim(); if (!line) return;
  if (line === 'uciok' && readyState?.stage === 'uci') { debug('uciok received'); readyState.stage = 'ready'; send('isready'); return; }
  if (line === 'readyok' && readyState?.stage === 'ready') { debug('readyok received; engine ready'); const resolve = readyState.resolve; readyState = null; resolve(); runNext(); return; }
  const candidate = line.match(/\bmultipv\s+(\d+)\b.*\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
  if (candidate && active) active.candidates.set(Number(candidate[1]), candidate[2]);
  if (line.startsWith('bestmove ') && active) {
    const request = active; active = null; const uci = line.split(/\s+/)[1];
    const move = selectEngineMove({ fen: request.fen, bestMove: uci, candidates: request.candidates, setting: request.setting });
    debug(`bestmove received id=${request.id} move=${uci} selected=${move ? `${move.from}${move.to}${move.promotion || ''}` : 'none'}`);
    parentPort.postMessage({ id: request.id, move }); runNext();
  }
}
function handleChunk(chunk) { outputBuffer += chunk.toString('utf8'); const lines = outputBuffer.split(/\r?\n/); outputBuffer = lines.pop() || ''; for (const line of lines) handleLine(line); }
function failEngine(error) {
  debug(`engine failure: ${error.message}`); readyState?.reject(error); readyState = null;
  if (active) parentPort.postMessage({ id: active.id, error: error.message });
  for (const item of queue.splice(0)) parentPort.postMessage({ id: item.id, error: error.message });
  active = null; engine = null;
}
function startEngine() {
  if (engine) return Promise.resolve(); debug(`starting Stockfish process path=${enginePath}`);
  engine = spawn(process.execPath, [enginePath], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  engine.stdout.on('data', handleChunk);
  engine.stderr.on('data', (chunk) => { const text = chunk.toString().trim(); if (text) debug(`stderr: ${text}`); });
  engine.on('error', failEngine); engine.on('exit', (code) => { if (engine) failEngine(new Error(`Stockfish exited unexpectedly (${code}).`)); });
  return new Promise((resolve, reject) => { readyState = { stage: 'uci', resolve, reject }; send('uci'); });
}
function runNext() {
  if (!engine || readyState || active || !queue.length) return;
  active = queue.shift(); const setting = AI_SEARCH_SETTINGS[active.difficulty] || AI_SEARCH_SETTINGS.Medium;
  active.setting = setting; active.candidates = new Map();
  debug(`position received id=${active.id} difficulty=${active.difficulty}`);
  send(`setoption name Skill Level value ${setting.skill}`);
  send(`setoption name UCI_LimitStrength value ${setting.limitStrength ? 'true' : 'false'}`);
  if (setting.limitStrength) send(`setoption name UCI_Elo value ${setting.uciElo}`);
  send(`setoption name MultiPV value ${setting.multiPv}`);
  send(`position fen ${active.fen}`);
  debug(`search started id=${active.id} movetime=${setting.moveTime}ms`); send(`go movetime ${setting.moveTime}`);
}
parentPort.on('message', async (message) => {
  if (message.type === 'shutdown') { send('quit'); engine?.kill(); process.exit(0); }
  queue.push(message); try { await startEngine(); runNext(); } catch (error) { failEngine(error); }
});
process.on('exit', () => { try { engine?.kill(); } catch { /* already stopped */ } });
