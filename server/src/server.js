import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app.js';
import { createSocketServer } from './socket/index.js';
import { closeAIEngine } from './ai/aiEngineService.js';
import { closeAnalysisService } from './analysis/analysisService.js';

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const { io, manager, socialManager } = createSocketServer(httpServer);
app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`[ChessMaster Server] Listening on port ${PORT}`);
});

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`[ChessMaster Server] ${signal} received; shutting down.`);
  manager.close();
  socialManager.close();
  closeAIEngine();
  await closeAnalysisService();
  io.close();
  httpServer.close((error) => {
    if (error) { console.error('[ChessMaster Server] Shutdown error:', error.message); process.exitCode = 1; }
  });
  const deadline = setTimeout(() => process.exit(1), 10_000);
  deadline.unref?.();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
