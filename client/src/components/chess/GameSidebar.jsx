import React, { useEffect, useRef, useState } from 'react';
import Card from '../ui/Card';
import MoveHistory from './MoveHistory';
import {
  Scroll,
  Info,
  MessageSquare,
  Copy,
  Check,
  RotateCcw,
  RotateCw,
  Flag,
  Handshake,
  Plus,
  FlipHorizontal,
  Volume2,
  VolumeX,
  Swords,
  Clock,
  Send,
  BookOpen,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { scrollContainerToEnd } from '../../utils/scrollWithinContainer';

export const GameSidebar = ({
  history = [],
  currentMoveIndex = -1,
  fen = '',
  opening = null,
  turn = 'w',
  isCheck = false,
  isCheckmate = false,
  isStalemate = false,
  isDraw = false,
  isGameOver = false,
  winner = null,
  gameStatus = null,
  canUndo = false,
  canRedo = false,
  currentPreset = null,
  isMuted = false,
  onUndo = () => {},
  onRedo = () => {},
  onResign = () => {},
  onOfferDraw = () => {},
  onNewGame = () => {},
  onRematch = () => {},
  onFlipBoard = () => {},
  onToggleSound = () => {},
  onOpenTimeControl = () => {},
  chatMessages: serverChatMessages = null,
  currentUserUid = null,
  onSendChatMessage = null,
  className = '',
  mobileSheet = false,
}) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('moves'); // 'moves' | 'info' | 'chat'
  const [copiedPgn, setCopiedPgn] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);

  const [localChatMessages, setLocalChatMessages] = useState([
    { id: 1, sender: 'System', text: 'Match started. Good luck!', time: '12:00' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef(null);
  const isServerChat = Array.isArray(serverChatMessages) && typeof onSendChatMessage === 'function';
  const chatMessages = isServerChat ? serverChatMessages : localChatMessages;

  useEffect(() => {
    if (activeTab === 'chat') scrollContainerToEnd(chatScrollRef.current, 'smooth');
  }, [activeTab, chatMessages]);

  const handleCopyPgn = () => {
    const movePairs = [];
    for (let i = 0; i < history.length; i += 2) {
      const num = Math.floor(i / 2) + 1;
      const w = history[i]?.san || '';
      const b = history[i + 1]?.san || '';
      movePairs.push(`${num}. ${w} ${b}`.trim());
    }
    const pgnString = movePairs.join(' ');
    navigator.clipboard.writeText(pgnString);
    setCopiedPgn(true);
    addToast('PGN copied to clipboard!', 'info');
    setTimeout(() => setCopiedPgn(false), 2000);
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(fen);
    setCopiedFen(true);
    addToast('FEN position copied!', 'info');
    setTimeout(() => setCopiedFen(false), 2000);
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim()) return;
    if (isServerChat) {
      const response = await onSendChatMessage(text.trim());
      if (response?.ok) setChatInput('');
      return;
    }
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setLocalChatMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'You', text: text.trim(), time: timeStr },
    ]);
    setChatInput('');
  };

  // Status text calculation
  const getStatusBadge = () => {
    if (isCheckmate) {
      const winnerName = winner === 'w' ? 'White' : 'Black';
      return {
        text: `Checkmate! ${winnerName} Wins!`,
        cls: 'text-amber-300 bg-amber-500/15 border-amber-400/40 font-black shadow-[0_0_12px_rgba(251,191,36,0.3)] animate-pulse',
      };
    }
    if (gameStatus?.type === 'resigned') {
      const winnerName = gameStatus.winner === 'w' ? 'White' : 'Black';
      return {
        text: `🏳 ${winnerName} Wins by Resignation`,
        cls: 'text-rose-400 bg-rose-500/15 border-rose-500/30 font-bold',
      };
    }
    if (gameStatus?.type === 'draw_agreed') {
      return { text: '½ Draw Agreed', cls: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold' };
    }
    if (isStalemate) {
      return { text: '½ Draw by Stalemate', cls: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold' };
    }
    if (isDraw) {
      return { text: '½ Game Drawn', cls: 'text-amber-400 bg-amber-500/15 border-amber-500/30 font-bold' };
    }
    if (isCheck) {
      return { text: 'Check!', cls: 'text-rose-400 bg-rose-500/15 border-rose-500/30 font-bold animate-pulse' };
    }
    return {
      text: turn === 'w' ? '⬜ White to move' : '⬛ Black to move',
      cls: 'text-slate-300 border-white/10 font-medium',
    };
  };

  const status = getStatusBadge();

  return (
    <Card data-testid="game-sidebar" className={clsx('flex flex-col border-white/10 overflow-hidden', mobileSheet && 'rounded-t-[1.75rem] rounded-b-xl sm:rounded-2xl', className)}>
      {/* Top Status Header */}
      <div className={clsx('flex items-center justify-between gap-2 border-b border-white/10 bg-black/20', mobileSheet ? 'p-2 sm:p-3.5' : 'p-3.5')}>
        <div className={`px-3 py-1 rounded-full border text-xs tracking-wide transition-all ${status.cls}`}>
          {status.text}
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenTimeControl}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Change Time Control"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentPreset?.name?.split(' ')[1] || '10+0'}</span>
          </button>

          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={onFlipBoard}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Flip Board Orientation"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Game panel" className="flex items-center border-b border-white/10 bg-slate-950/40">
        <button
          role="tab"
          aria-selected={activeTab === 'moves'}
          onClick={() => setActiveTab('moves')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2',
            activeTab === 'moves'
              ? 'border-cyan-400 text-cyan-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <Scroll className="w-3.5 h-3.5" />
          <span>Moves ({history.length})</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'info'}
          onClick={() => setActiveTab('info')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2',
            activeTab === 'info'
              ? 'border-cyan-400 text-cyan-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Game Info</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'chat'}
          onClick={() => setActiveTab('chat')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all border-b-2',
            activeTab === 'chat'
              ? 'border-cyan-400 text-cyan-300 bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className={clsx(
        'flex-1 min-h-0',
        activeTab === 'moves' ? 'overflow-hidden' : 'overflow-y-auto',
        mobileSheet ? 'h-[168px] min-h-[168px] max-h-[168px] p-2 sm:h-auto sm:min-h-[220px] sm:max-h-[340px] sm:p-3' : 'p-3 min-h-[220px] max-h-[340px]'
      )}>
        {/* Moves Tab */}
        {activeTab === 'moves' && (
          <div className={clsx('flex min-h-0 flex-col justify-between gap-3 overflow-hidden', mobileSheet ? 'h-[152px] sm:h-full' : 'h-full')}>
            <div className="flex-1 min-h-0 pr-1">
              <MoveHistory history={history} currentMoveIndex={currentMoveIndex} />
            </div>

            {/* Quick Copy Buttons */}
            {history.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={handleCopyPgn}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
                >
                  {copiedPgn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPgn ? 'Copied' : 'Copy PGN'}</span>
                </button>

                <button
                  onClick={handleCopyFen}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
                >
                  {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFen ? 'Copied' : 'Copy FEN'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Info & Opening Tab */}
        {activeTab === 'info' && (
          <div className="flex flex-col gap-3 text-xs">
            {/* Opening Book Card */}
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
                <BookOpen className="w-4 h-4" />
                <span>Opening Identification</span>
              </div>
              {opening ? (
                <div>
                  <div className="text-sm font-bold text-slate-100">{opening.name}</div>
                  <div className="text-[11px] font-mono text-cyan-300/80 mt-0.5">ECO: {opening.eco}</div>
                </div>
              ) : (
                <p className="text-slate-400 italic">Play standard opening moves to detect ECO opening.</p>
              )}
            </div>

            {/* Game Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Moves</div>
                <div className="text-lg font-black text-slate-100 mt-0.5">{history.length}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Turn State</div>
                <div className="text-sm font-bold text-slate-200 mt-1">
                  {isGameOver ? 'Finished' : isCheck ? 'Check!' : 'Normal'}
                </div>
              </div>
            </div>

            {/* FEN snapshot */}
            <div className="p-2 rounded-xl bg-black/40 border border-white/5">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">FEN Position</div>
              <div className="font-mono text-[10px] text-slate-400 break-all select-all">{fen}</div>
            </div>
          </div>
        )}

        {/* Chat / Reactions Tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full justify-between gap-2.5">
            {/* Messages Feed */}
            <div ref={chatScrollRef} className="flex-1 flex flex-col gap-2 overflow-y-auto overscroll-contain pr-1 [overflow-anchor:none]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={clsx(
                    'p-2 rounded-xl text-xs max-w-[85%]',
                    (msg.senderUid === currentUserUid || msg.sender === 'You')
                      ? 'bg-cyan-500/20 text-cyan-100 self-end border border-cyan-400/30'
                      : msg.sender === 'System'
                      ? 'bg-white/5 text-slate-400 self-center text-center italic text-[11px]'
                      : 'bg-slate-800 text-slate-200 self-start border border-white/10'
                  )}
                >
                  <div className="flex items-center gap-1 font-bold text-[10px] opacity-70 mb-0.5">
                    <span>{msg.senderUid === currentUserUid ? 'You' : (msg.senderName || msg.sender)}</span>
                    <span>•</span>
                    <span>{msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : msg.time}</span>
                  </div>
                  <div>{msg.message || msg.text}</div>
                </div>
              ))}
            </div>

            {/* Quick Reaction Chips */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {['Good luck!', 'Nice move!', 'Well played!', 'Thanks!'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleSendMessage(chip)}
                  className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-medium text-slate-300 hover:text-white shrink-0 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5 pt-2 border-t border-white/5"
            >
              <input
                type="text"
                placeholder="Send a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={300}
                className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Tournament Controls */}
      <div className={clsx('border-t border-white/10 bg-black/30', mobileSheet ? 'p-2 sm:p-3' : 'p-3')}>
        <div className="grid grid-cols-5 gap-1.5">
          <button
            onClick={onUndo}
            disabled={!canUndo || isGameOver}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed text-[11px] font-semibold transition-all"
            title="Undo Move"
          >
            <RotateCcw className="w-4 h-4 mb-0.5" />
            <span>Undo</span>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo || isGameOver}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed text-[11px] font-semibold transition-all"
            title="Redo Move"
          >
            <RotateCw className="w-4 h-4 mb-0.5" />
            <span>Redo</span>
          </button>

          <button
            onClick={onOfferDraw}
            disabled={isGameOver}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 disabled:opacity-20 disabled:cursor-not-allowed text-[11px] font-semibold transition-all"
            title="Offer Draw"
          >
            <Handshake className="w-4 h-4 mb-0.5" />
            <span>Draw</span>
          </button>

          <button
            onClick={onResign}
            disabled={isGameOver}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 disabled:opacity-20 disabled:cursor-not-allowed text-[11px] font-semibold transition-all"
            title="Resign Match"
          >
            <Flag className="w-4 h-4 mb-0.5" />
            <span>Resign</span>
          </button>

          <button
            onClick={isGameOver ? onRematch : onNewGame}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-cyan-200 text-[11px] font-semibold transition-all shadow-md shadow-cyan-950/40"
            title={isGameOver ? 'Rematch' : 'New Game'}
          >
            {isGameOver ? <Swords className="w-4 h-4 mb-0.5" /> : <Plus className="w-4 h-4 mb-0.5" />}
            <span>{isGameOver ? 'Rematch' : 'New'}</span>
          </button>
        </div>
      </div>
    </Card>
  );
};

export default GameSidebar;
