import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.routes.js';
import leaderboardRoutes from './routes/leaderboard.routes.js';
import aiGamesRoutes from './routes/aiGames.routes.js';
import socialRoutes from './routes/social.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import platformStatsRoutes from './routes/platformStats.routes.js';
import { securityHeaders } from './middleware/security.js';

dotenv.config();

const app = express();
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL?.trim()) {
  throw new Error('CLIENT_URL is required when NODE_ENV=production.');
}
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

// Middlewares
app.use(cors({
  origin: (process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()),
  credentials: true,
}));
app.use(securityHeaders);
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// Routes
app.use('/api', healthRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', aiGamesRoutes);
app.use('/api', socialRoutes);
app.use('/api', analysisRoutes);
app.use('/api', settingsRoutes);
app.use('/api', platformStatsRoutes);
app.use(['/api/auth', '/api/users'], (req, res) => {
  res.status(410).json({ error: 'Use Firebase Authentication and Firestore from the frontend.' });
});


// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ChessMaster Core API',
    health: '/api/health',
    authentication: 'firebase',
    persistence: 'firestore',
  });
});

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  const production = process.env.NODE_ENV === 'production';
  const expected = status < 500;
  console.error('[API Error]', {
    method: req.method,
    path: req.originalUrl,
    status,
    code: err.code || null,
    message: err.message || 'Unknown error',
    ...(production ? {} : { stack: err.stack }),
  });
  res.status(status).json({ error: expected ? err.message : 'The server could not complete this request.' });
});

export default app;
