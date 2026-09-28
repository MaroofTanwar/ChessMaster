import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { useSettings } from '../context/SettingsContext';

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export const useChessGame = () => {
  const { settings } = useSettings();
  // Single persistent Chess instance whose full history is preserved
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(() => game.fen());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [gameStatus, setGameStatus] = useState(null); // { type: 'resigned' | 'draw_agreed', winner?: 'w' | 'b' }
  const [redoStack, setRedoStack] = useState([]);

  // Game Derived State from current FEN
  const board = useMemo(() => fen ? game.board() : [], [game, fen]);
  const turn = game.turn(); // 'w' | 'b' (color whose turn it is next)
  const isCheck = game.inCheck();
  const isCheckmate = game.isCheckmate();
  const isStalemate = game.isStalemate();
  const isDraw = game.isDraw();
  const history = useMemo(() => fen ? game.history({ verbose: true }) : [], [game, fen]);

  // Determine winner: in checkmate, the player whose turn it currently is was mated, so the opponent won!
  const winner = useMemo(() => {
    if (gameStatus?.winner) return gameStatus.winner;
    if (isCheckmate) return turn === 'b' ? 'w' : 'b';
    return null;
  }, [gameStatus, isCheckmate, turn]);

  // Human-readable game over description
  const gameOverReason = useMemo(() => {
    if (isCheckmate) {
      const winnerName = turn === 'b' ? 'White' : 'Black';
      return `${winnerName} won by checkmate`;
    }
    if (gameStatus?.type === 'resigned') {
      const winnerName = gameStatus.winner === 'w' ? 'White' : 'Black';
      return `${winnerName} won by resignation`;
    }
    if (gameStatus?.type === 'timeout') {
      const winnerName = gameStatus.winner === 'w' ? 'White' : 'Black';
      return `${winnerName} won on time`;
    }
    if (gameStatus?.type === 'draw_agreed') {
      return 'Draw agreed by both players';
    }
    if (isStalemate) {
      return 'Draw by stalemate (no legal moves)';
    }
    try {
      if (game.isThreefoldRepetition()) return 'Draw by threefold repetition';
      if (game.isInsufficientMaterial()) return 'Draw by insufficient material';
    } catch {
      // safe fallback
    }
    if (isDraw) {
      return 'Draw by 50-move rule';
    }
    return null;
  }, [isCheckmate, gameStatus, isStalemate, isDraw, game, turn]);

  // Derive last move directly from history so undo/redo automatically updates it
  const lastMove = useMemo(() => {
    if (history.length === 0) return null;
    const latest = history[history.length - 1];
    return { from: latest.from, to: latest.to };
  }, [history]);

  // Find King square if currently in check
  const inCheckSquare = useMemo(() => {
    if (!isCheck) return null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === turn) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          return `${files[c]}${8 - r}`;
        }
      }
    }
    return null;
  }, [board, isCheck, turn]);

  // Calculate Legal Moves for Selected Square
  const legalMoves = useMemo(() => {
    if (!selectedSquare || !fen) return [];
    try {
      const moves = game.moves({ square: selectedSquare, verbose: true });
      return moves.map((m) => ({
        to: m.to,
        isCapture: m.captured !== undefined || m.flags.includes('e'),
        isPromotion: m.flags.includes('p'),
      }));
    } catch {
      return [];
    }
  }, [game, selectedSquare, fen]);

  // Calculate Captured Pieces and Material Advantage
  const { capturedWhite, capturedBlack, materialAdvantage } = useMemo(() => {
    const initialCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentCounts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type !== 'k') {
          currentCounts[p.color][p.type]++;
        }
      }
    }

    const capturedW = [];
    const capturedB = [];
    let whiteValue = 0;
    let blackValue = 0;

    Object.keys(initialCounts).forEach((type) => {
      const lostW = initialCounts[type] - currentCounts.w[type];
      const lostB = initialCounts[type] - currentCounts.b[type];

      for (let i = 0; i < lostW; i++) capturedW.push(type);
      for (let i = 0; i < lostB; i++) capturedB.push(type);

      whiteValue += currentCounts.w[type] * PIECE_VALUES[type];
      blackValue += currentCounts.b[type] * PIECE_VALUES[type];
    });

    return {
      capturedWhite: capturedW,
      capturedBlack: capturedB,
      materialAdvantage: whiteValue - blackValue,
    };
  }, [board]);

  // Execute Move
  const makeMove = useCallback((from, to, promotionPiece = 'q') => {
    try {
      const move = game.move({
        from,
        to,
        promotion: promotionPiece,
      });

      if (move) {
        setFen(game.fen());
        setRedoStack([]); // New move invalidates redo history
        setSelectedSquare(null);
        setPendingPromotion(null);
        setGameStatus(null);
        return true;
      }
    } catch (err) {
      console.warn('[Move Error]', err.message);
    }
    return false;
  }, [game]);

  // Square Click Handler
  const selectSquare = useCallback((square) => {
    if (game.isGameOver() || gameStatus) return;

    const piece = game.get(square);

    // If square already selected and clicking on valid move target
    if (selectedSquare) {
      const targetMove = legalMoves.find((m) => m.to === square);

      if (targetMove) {
        // Check if move requires pawn promotion
        const sourcePiece = game.get(selectedSquare);
        const isPromotion =
          sourcePiece?.type === 'p' &&
          ((sourcePiece.color === 'w' && square.endsWith('8')) ||
            (sourcePiece.color === 'b' && square.endsWith('1')));

        if (isPromotion) {
          if (settings.autoQueen) {
            makeMove(selectedSquare, square, 'q');
            return;
          }
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        makeMove(selectedSquare, square);
        return;
      }
    }

    // Select piece of current turn's color
    if (piece && piece.color === turn) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  }, [game, selectedSquare, legalMoves, turn, gameStatus, makeMove, settings.autoQueen]);

  // Complete Pawn Promotion Selection
  const completePromotion = useCallback((pieceType) => {
    if (pendingPromotion) {
      makeMove(pendingPromotion.from, pendingPromotion.to, pieceType);
    }
  }, [pendingPromotion, makeMove]);

  // Undo one move by default. Callers such as VS AI can group several plies
  // into one history action so redo restores that exact turn atomically.
  const undo = useCallback((plies = 1) => {
    const undone = [];
    const requested = Math.max(1, Number.isFinite(plies) ? Math.floor(plies) : 1);
    for (let index = 0; index < requested; index += 1) {
      const move = game.undo();
      if (!move) break;
      undone.push({ from: move.from, to: move.to, promotion: move.promotion || undefined });
    }
    if (undone.length) {
      setRedoStack((prev) => [...prev, undone]);
      setFen(game.fen());
      setSelectedSquare(null);
      setPendingPromotion(null);
      setGameStatus(null);
      return undone.length;
    }
    return 0;
  }, [game]);

  // Redo the most recently undone action. A local-chess action contains one
  // ply; an AI action can contain the human and AI plies together.
  const redo = useCallback(() => {
    if (redoStack.length === 0) return false;
    const batch = redoStack[redoStack.length - 1];
    try {
      let restored = 0;
      for (const move of [...batch].reverse()) {
        if (!game.move(move)) throw new Error('An undone move is no longer legal.');
        restored += 1;
      }
      setRedoStack((prev) => prev.slice(0, -1));
      setFen(game.fen());
      setSelectedSquare(null);
      setPendingPromotion(null);
      setGameStatus(null);
      return restored;
    } catch (err) {
      console.warn('[Redo Error]', err);
    }
    return false;
  }, [game, redoStack]);

  // Reset Game
  const resetGame = useCallback(() => {
    game.reset();
    setFen(game.fen());
    setRedoStack([]);
    setSelectedSquare(null);
    setPendingPromotion(null);
    setGameStatus(null);
  }, [game]);

  // Flip Board Perspective
  const flipBoard = useCallback(() => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  }, []);

  // Resign Match
  const resign = useCallback((resigningColor) => {
    setGameStatus({
      type: 'resigned',
      winner: resigningColor === 'w' ? 'b' : 'w',
    });
  }, []);

  const endGame = useCallback((type, winningColor = null) => {
    setGameStatus({ type, winner: winningColor });
  }, []);

  // Draw Offer / Agreed
  const agreeDraw = useCallback(() => {
    setGameStatus({
      type: 'draw_agreed',
      winner: null,
    });
  }, []);

  const isGameOver = isCheckmate || isStalemate || isDraw || !!gameStatus;

  return {
    game,
    fen,
    board,
    turn,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    isGameOver,
    winner,
    gameOverReason,
    inCheckSquare,
    selectedSquare,
    legalMoves,
    lastMove,
    capturedWhite,
    capturedBlack,
    materialAdvantage,
    history,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    pendingPromotion,
    boardOrientation,
    gameStatus,
    selectSquare,
    makeMove,
    completePromotion,
    cancelPromotion: () => setPendingPromotion(null),
    undo,
    redo,
    resetGame,
    flipBoard,
    resign,
    endGame,
    agreeDraw,
  };
};

export default useChessGame;
