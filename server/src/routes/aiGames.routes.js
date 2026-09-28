import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { Chess } from 'chess.js';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../config/firebaseAdmin.js';
import { requireFirebaseUser } from '../middleware/requireFirebaseUser.js';
import { requestAIMove } from '../ai/aiEngineService.js';
import { createRateLimiter } from '../middleware/security.js';
import { isFenInput, isSquare } from '../utils/validation.js';

const router = Router();
const aiMoveLimit = createRateLimiter({ name: 'ai-move', windowMs: 60_000, max: 30, message: 'Too many AI move requests. Please wait a moment.' });
const aiGameLimit = createRateLimiter({ name: 'ai-game', windowMs: 10 * 60_000, max: 20 });
const publicMove = (move) => ({ color: move.color, from: move.from, to: move.to, piece: move.piece, captured: move.captured || null, promotion: move.promotion || null, san: move.san, flags: move.flags });

router.post('/ai-move', requireFirebaseUser, aiMoveLimit, async (req, res, next) => {
  try {
    const { fen, difficulty } = req.body || {};
    if (!isFenInput(fen) || !['Beginner', 'Easy', 'Medium', 'Hard', 'Expert'].includes(difficulty)) return res.status(400).json({ error: 'Invalid AI request.' });
    let position;
    try { position = new Chess(fen); } catch { return res.status(400).json({ error: 'The supplied chess position is invalid.' }); }
    if (position.isGameOver()) return res.status(400).json({ error: 'The supplied chess game has already ended.' });
    const move = await requestAIMove(fen, difficulty);
    if (!move) return res.status(422).json({ error: 'The AI engine did not return a move.' });
    let applied;
    try { applied = position.move(move); } catch { applied = null; }
    if (!applied) return res.status(502).json({ error: 'The AI engine returned an illegal move.' });
    res.json({ move: { from: applied.from, to: applied.to, ...(applied.promotion ? { promotion: applied.promotion } : {}) } });
  } catch (error) { next(error); }
});

router.post('/ai-games', requireFirebaseUser, aiGameLimit, async (req, res, next) => {
  try {
    const { moves, humanColor, aiDifficulty, reason, winnerColor: claimedWinnerColor, startedAt, timeControl } = req.body || {};
    if (!['w', 'b'].includes(humanColor) || !Array.isArray(moves) || moves.length > 1000) return res.status(400).json({ error: 'Invalid AI game data.' });
    if (!['Beginner', 'Easy', 'Medium', 'Hard', 'Expert'].includes(aiDifficulty)) return res.status(400).json({ error: 'Invalid AI difficulty.' });
    const chess = new Chess();
    const normalizedMoves = [];
    for (const candidate of moves) {
      if (!isSquare(candidate?.from) || !isSquare(candidate?.to) || (candidate?.promotion && !['q', 'r', 'b', 'n'].includes(candidate.promotion))) {
        return res.status(400).json({ error: 'The AI game contains malformed move data.' });
      }
      let applied;
      try { applied = chess.move({ from: candidate?.from, to: candidate?.to, promotion: candidate?.promotion || 'q' }); }
      catch { return res.status(400).json({ error: 'The AI game contains an illegal move.' }); }
      if (!applied) return res.status(400).json({ error: 'The AI game contains an illegal move.' });
      normalizedMoves.push(publicMove(applied));
    }
    let finalReason = reason;
    let winnerColor = null;
    if (chess.isCheckmate()) { finalReason = 'checkmate'; winnerColor = chess.turn() === 'w' ? 'b' : 'w'; }
    else if (chess.isStalemate()) finalReason = 'stalemate';
    else if (chess.isThreefoldRepetition()) finalReason = 'threefold_repetition';
    else if (chess.isInsufficientMaterial()) finalReason = 'insufficient_material';
    else if (chess.isDraw()) finalReason = 'draw';
    else if (reason === 'resignation') winnerColor = humanColor === 'w' ? 'b' : 'w';
    else if (reason === 'timeout' && ['w', 'b'].includes(claimedWinnerColor)) winnerColor = claimedWinnerColor;
    else return res.status(400).json({ error: 'The AI game is not complete.' });

    const gameId = `AI-${randomUUID()}`;
    const humanUid = req.firebaseUser.uid;
    const humanProfile = await adminDb.collection('users').doc(humanUid).get();
    const humanName = humanProfile.data()?.username || req.firebaseUser.name || 'Chess Player';
    const humanAvatar = humanProfile.data()?.avatar || '';
    const aiUid = 'chessmaster-ai';
    const humanWon = winnerColor === humanColor;
    const payload = {
      gameId, roomId: gameId, gameType: 'ai', gameMode: 'casual', aiDifficulty,
      whitePlayerUid: humanColor === 'w' ? humanUid : aiUid,
      blackPlayerUid: humanColor === 'b' ? humanUid : aiUid,
      whitePlayerName: humanColor === 'w' ? humanName : 'ChessMaster AI',
      blackPlayerName: humanColor === 'b' ? humanName : 'ChessMaster AI',
      whitePlayerAvatar: humanColor === 'w' ? humanAvatar : '',
      blackPlayerAvatar: humanColor === 'b' ? humanAvatar : '',
      participantUids: [humanUid], humanUid, humanColor,
      moves: normalizedMoves, moveCount: normalizedMoves.length,
      initialFen: new Chess().fen(), finalFen: chess.fen(),
      winnerUid: winnerColor ? (humanWon ? humanUid : aiUid) : null,
      result: winnerColor === 'w' ? '1-0' : winnerColor === 'b' ? '0-1' : '1/2-1/2',
      reason: finalReason, status: 'finished', ratingProcessed: false,
      timeControl: {
        initialSeconds: Math.min(86_400, Math.max(0, Number(timeControl?.initialSeconds) || 0)),
        incrementSeconds: Math.min(600, Math.max(0, Number(timeControl?.incrementSeconds) || 0)),
      },
      startedAt: new Date(Math.min(Date.now(), Math.max(Date.now() - 86_400_000, Number(startedAt) || Date.now()))), endedAt: FieldValue.serverTimestamp(),
      durationSeconds: Math.max(0, Math.round((Date.now() - Math.min(Date.now(), Math.max(Date.now() - 86_400_000, Number(startedAt) || Date.now()))) / 1000)),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    };
    await adminDb.collection('games').doc(gameId).create(payload);
    res.status(201).json({ gameId });
  } catch (error) { next(error); }
});

export default router;
