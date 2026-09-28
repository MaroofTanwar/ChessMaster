import express from 'express';
const router = express.Router();
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok', app: 'ChessMaster API Server', version: '1.0.0',
    timestamp: new Date().toISOString(),
    authentication: 'firebase', persistence: 'firestore',
  });
});
export default router;