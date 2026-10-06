import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { createAuthenticatedSocket } from '../socket/socket';
import { EVENTS } from '../socket/events';
import { useSettings } from '../context/SettingsContext';

const INITIAL_FEN = new Chess().fen();
const INITIAL_STATE = {
  roomId: null, status: 'idle', fen: INITIAL_FEN, turn: 'w', history: [], lastMove: null,
  players: { w: null, b: null }, clocks: { w: 600, b: 600, activeColor: null },
  result: null, gameMode: 'ranked', drawOfferBy: null, rematchRequestedBy: null,
};

export default function useMultiplayerGame(firebaseUser, user) {
  const { settings } = useSettings();
  const socketRef = useRef(null);
  const stateRef = useRef(INITIAL_STATE);
  const [state, setState] = useState(INITIAL_STATE);
  const [connectionState, setConnectionState] = useState('connecting');
  const [error, setError] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [nowTick, setNowTick] = useState(0);

  const applyState = useCallback((next) => {
    if (!next) return;
    const previousRoomId = stateRef.current.roomId;
    const positionChanged = stateRef.current.fen !== next.fen || stateRef.current.roomId !== next.roomId;
    stateRef.current = next;
    setState(next);
    if (positionChanged) {
      setSelectedSquare(null);
      setPendingPromotion(null);
    }
    if (previousRoomId !== next.roomId) setChatMessages([]);
  }, []);

  useEffect(() => {
    if (!firebaseUser) return undefined;
    const socket = createAuthenticatedSocket(firebaseUser);
    socketRef.current = socket;
    const onConnect = () => { setConnectionState('connected'); setError(null); };
    const onDisconnect = () => setConnectionState('reconnecting');
    const onConnectError = (problem) => {
      if (problem.data?.code === 'AUTH_FAILED') {
        setConnectionState('error');
        setError('Your multiplayer session could not be verified. Sign out and sign in again.');
        return;
      }
      setConnectionState('reconnecting');
      setError(null);
    };
    const onSocketError = (problem) => setError(problem?.message || 'The multiplayer server rejected that action.');
    const onState = (next) => applyState(next.state || next);
    const onChatMessage = (message) => {
      if (!message?.id) return;
      setChatMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on(EVENTS.SOCKET_ERROR, onSocketError);
    socket.on(EVENTS.MOVE_REJECTED, onSocketError);
    socket.on(EVENTS.CHAT_MESSAGE, onChatMessage);
    for (const event of [EVENTS.GAME_CREATED, EVENTS.PLAYER_JOINED, EVENTS.GAME_STARTED,
      EVENTS.GAME_STATE, EVENTS.MOVE_APPLIED, EVENTS.GAME_OVER, EVENTS.REMATCH_STARTED,
      EVENTS.DRAW_DECLINED, EVENTS.REMATCH_DECLINED, EVENTS.PLAYER_DISCONNECTED,
      EVENTS.PLAYER_RECONNECTED, EVENTS.DRAW_OFFERED, EVENTS.REMATCH_REQUESTED]) socket.on(event, onState);
    socket.connect();
    return () => { socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; };
  }, [firebaseUser, applyState]);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const emit = useCallback((event, payload = {}) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      const message = 'The multiplayer server is not connected.';
      setError(message);
      resolve({ ok: false, error: { code: 'NOT_CONNECTED', message } });
      return;
    }
    socket.timeout(8000).emit(event, payload, (timeoutError, response) => {
      if (timeoutError) {
        const message = 'The game server did not respond. Please try again.';
        setError(message);
        resolve({ ok: false, error: { code: 'TIMEOUT', message } });
        return;
      }
      if (!response?.ok) setError(response?.error?.message || 'The game action was rejected.');
      else {
        setError(null);
        if (response.data?.fen) applyState(response.data);
      }
      resolve(response);
    });
  }), [applyState]);

  const game = useMemo(() => {
    try { return new Chess(state.fen); } catch { return new Chess(); }
  }, [state.fen]);
  const board = useMemo(() => game.board(), [game]);
  const myColor = state.players.w?.uid === user?.uid ? 'w' : state.players.b?.uid === user?.uid ? 'b' : null;
  const legalMoves = useMemo(() => {
    if (!selectedSquare || state.status !== 'active' || state.turn !== myColor) return [];
    try {
      return game.moves({ square: selectedSquare, verbose: true }).map((move) => ({
        to: move.to, isCapture: Boolean(move.captured) || move.flags.includes('e'), isPromotion: move.flags.includes('p'),
      }));
    } catch { return []; }
  }, [game, selectedSquare, state.status, state.turn, myColor]);

  const sendMove = useCallback((from, to, promotion = 'q') => {
    setSelectedSquare(null);
    setPendingPromotion(null);
    return emit(EVENTS.MAKE_MOVE, { roomId: stateRef.current.roomId, from, to, promotion });
  }, [emit]);
  const selectSquare = useCallback((square) => {
    const current = stateRef.current;
    if (current.status !== 'active' || current.turn !== myColor) return;
    if (selectedSquare) {
      const target = legalMoves.find((move) => move.to === square);
      if (target) {
        const piece = game.get(selectedSquare);
        if (piece?.type === 'p' && (square.endsWith('8') || square.endsWith('1'))) {
          if (settings.autoQueen) void sendMove(selectedSquare, square, 'q');
          else setPendingPromotion({ from: selectedSquare, to: square });
        }
        else void sendMove(selectedSquare, square);
        return;
      }
    }
    const piece = game.get(square);
    setSelectedSquare(piece?.color === myColor && piece.color === current.turn ? square : null);
  }, [game, legalMoves, myColor, selectedSquare, sendMove, settings.autoQueen]);
  const clocks = useMemo(() => {
    const result = { ...state.clocks };
    if (state.status === 'active' && state.clocks.activeColor && state.serverNow) {
      const elapsed = Math.max(0, Math.floor((nowTick - state.serverNow) / 1000));
      result[state.clocks.activeColor] = Math.max(0, result[state.clocks.activeColor] - elapsed);
    }
    return result;
  }, [state.clocks, state.serverNow, state.status, nowTick]);
  const createGame = useCallback((gameMode = 'ranked') => emit(EVENTS.CREATE_GAME, { gameMode }), [emit]);
  const joinGame = useCallback(async (roomId) => {
    const requestedRoomId = typeof roomId === 'string' ? roomId.trim().toUpperCase() : '';
    const response = await emit(EVENTS.JOIN_GAME, { roomId: requestedRoomId });
    const current = stateRef.current;
    if (!response?.ok && current.status === 'waiting' && current.roomId !== requestedRoomId) {
      applyState(INITIAL_STATE);
    }
    return response;
  }, [emit, applyState]);
  const sendChatMessage = useCallback((message) => emit(EVENTS.SEND_CHAT_MESSAGE, {
    roomId: stateRef.current.roomId,
    message,
  }), [emit]);
  const roomAction = useCallback((event) => emit(event, { roomId: stateRef.current.roomId }), [emit]);
  const resign = useCallback(() => roomAction(EVENTS.RESIGN_GAME), [roomAction]);
  const offerDraw = useCallback(() => roomAction(EVENTS.OFFER_DRAW), [roomAction]);
  const acceptDraw = useCallback(() => roomAction(EVENTS.ACCEPT_DRAW), [roomAction]);
  const declineDraw = useCallback(() => roomAction(EVENTS.DECLINE_DRAW), [roomAction]);
  const requestRematch = useCallback(() => roomAction(EVENTS.REQUEST_REMATCH), [roomAction]);
  const acceptRematch = useCallback(() => roomAction(EVENTS.ACCEPT_REMATCH), [roomAction]);
  const declineRematch = useCallback(() => roomAction(EVENTS.DECLINE_REMATCH), [roomAction]);
  const leaveGame = useCallback(() => roomAction(EVENTS.LEAVE_GAME), [roomAction]);

  return {
    state, game, board, myColor, connectionState, error, selectedSquare, legalMoves, pendingPromotion, clocks,
    chatMessages,
    selectSquare,
    completePromotion: (piece) => pendingPromotion && sendMove(pendingPromotion.from, pendingPromotion.to, piece),
    cancelPromotion: () => setPendingPromotion(null),
    createGame, joinGame, sendChatMessage, resign, offerDraw, acceptDraw, declineDraw,
    requestRematch, acceptRematch, declineRematch, leaveGame,
  };
}
