import { Chess } from 'chess.js';

export const LIVE_MATCH_PREVIEW_BEFORE_MOVE_FEN =
  'r3r1k1/bppq1pp1/p1n2n1p/3bp3/8/2PPBNNP/PPB2PP1/R2QR1K1 b - - 3 15';
export const LIVE_MATCH_PREVIEW_LAST_MOVE = { from: 'a8', to: 'd8' };

const previewGame = new Chess(LIVE_MATCH_PREVIEW_BEFORE_MOVE_FEN);
const previewMove = previewGame.move(LIVE_MATCH_PREVIEW_LAST_MOVE);

if (!previewMove) {
  throw new Error('The Live Match preview contains an invalid last move.');
}

export const LIVE_MATCH_PREVIEW_FEN = previewGame.fen();
export const LIVE_MATCH_PREVIEW_BOARD = previewGame.board();

// Curated from a short Stockfish self-play continuation of the displayed position.
// Every move is still validated by chess.js at runtime before it is shown.
export const LIVE_MATCH_PREVIEW_MOVES = Object.freeze([
  'Bxa7',
  'Bxf3',
  'Qd2',
  'Nxa7',
  'Qe3',
  'Bxg2',
  'Kxg2',
  'Nc8',
  'Kh2',
  'a5',
  'Qf3',
  'b6',
  'Rad1',
  'Ne7',
  'a3',
  'Ng6',
  'Re3',
  'Nd5',
  'Re4',
  'Ndf4',
  'Ne2',
  'Qf5',
  'Nxf4',
  'exf4',
  'Rde1',
  'Qb5',
  'Rxe8+',
  'Rxe8',
  'd4',
  'Rxe1',
  'Bd3',
  'Qg5',
  'Qa8+',
  'Nf8',
  'f3',
  'Qg3#',
]);

export const LIVE_MATCH_MOVE_ANIMATION_MS = 380;
export const LIVE_MATCH_RESTART_DELAY_MS = 2600;

const MOVE_PAUSES_MS = [1200, 1450, 1750, 1550, 1950, 1350, 1800, 1500];

export const getLiveMatchMovePause = (moveIndex) => MOVE_PAUSES_MS[moveIndex % MOVE_PAUSES_MS.length];

export const createLiveMatchPreviewGame = () => new Chess(LIVE_MATCH_PREVIEW_FEN);

const pieceAt = (board, square) => {
  const fileIndex = square.charCodeAt(0) - 97;
  const rankIndex = 8 - Number(square[1]);
  return board[rankIndex]?.[fileIndex] || null;
};

export const getLiveMatchAnimatedPieces = (board, move) => {
  const movingPiece = pieceAt(board, move.from);
  const animatedPieces = movingPiece ? [{ from: move.from, to: move.to, piece: movingPiece }] : [];

  if (move.flags.includes('k')) {
    const rank = move.from[1];
    const rookFrom = `h${rank}`;
    const rook = pieceAt(board, rookFrom);
    if (rook) animatedPieces.push({ from: rookFrom, to: `f${rank}`, piece: rook });
  } else if (move.flags.includes('q')) {
    const rank = move.from[1];
    const rookFrom = `a${rank}`;
    const rook = pieceAt(board, rookFrom);
    if (rook) animatedPieces.push({ from: rookFrom, to: `d${rank}`, piece: rook });
  }

  return animatedPieces;
};

// Fail immediately during development if the curated line ever stops matching its FEN.
const validationGame = createLiveMatchPreviewGame();
for (const move of LIVE_MATCH_PREVIEW_MOVES) validationGame.move(move);
