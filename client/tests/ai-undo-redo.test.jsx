import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useChessGame from '../src/hooks/useChessGame';
import { getAIUndoPlyCount } from '../src/utils/aiTurnHistory';
import { SettingsContext } from '../src/context/SettingsContext';
import { DEFAULT_SETTINGS } from '../src/config/settings';

const play = (hook, moves) => {
  for (const [from, to, promotion] of moves) {
    act(() => { expect(hook.current.makeMove(from, to, promotion)).toBe(true); });
  }
};

describe('AI turn history', () => {
  it('undoes and redoes complete human/AI turns and clears redo on a branch', () => {
    const { result } = renderHook(() => useChessGame());
    play(result, [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6']]);
    const fullFen = result.current.fen;
    act(() => { expect(result.current.undo(2)).toBe(2); });
    expect(result.current.history).toHaveLength(4);
    act(() => { expect(result.current.undo(2)).toBe(2); });
    expect(result.current.history.map((move) => move.san)).toEqual(['e4', 'e5']);
    expect(result.current.canRedo).toBe(true);
    act(() => { expect(result.current.redo()).toBe(2); });
    expect(result.current.history).toHaveLength(4);
    act(() => { expect(result.current.redo()).toBe(2); });
    expect(result.current.fen).toBe(fullFen);
    act(() => { result.current.undo(2); });
    play(result, [['d2', 'd3']]);
    expect(result.current.canRedo).toBe(false);
    act(() => { result.current.resetGame(); });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('finds the previous human decision point for either color', () => {
    expect(getAIUndoPlyCount(2, 'w')).toBe(2);
    expect(getAIUndoPlyCount(1, 'w')).toBe(1);
    expect(getAIUndoPlyCount(1, 'b')).toBe(0);
    expect(getAIUndoPlyCount(2, 'b')).toBe(1);
    expect(getAIUndoPlyCount(3, 'b')).toBe(2);
  });

  it('restores castling, en passant, and promotion exactly', () => {
    const { result } = renderHook(() => useChessGame());
    play(result, [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6'], ['e1', 'g1']]);
    const castled = result.current.fen;
    act(() => { result.current.undo(); }); act(() => { result.current.redo(); });
    expect(result.current.fen).toBe(castled);
    act(() => { result.current.resetGame(); });
    play(result, [['e2', 'e4'], ['a7', 'a6'], ['e4', 'e5'], ['d7', 'd5'], ['e5', 'd6']]);
    const enPassant = result.current.fen;
    act(() => { result.current.undo(); }); act(() => { result.current.redo(); });
    expect(result.current.fen).toBe(enPassant);
    act(() => { result.current.game.load('7k/P7/8/8/8/8/8/7K w - - 0 1'); });
    act(() => { expect(result.current.makeMove('a7', 'a8', 'n')).toBe(true); });
    const promoted = result.current.fen;
    act(() => { result.current.undo(); }); act(() => { result.current.redo(); });
    expect(result.current.fen).toBe(promoted);
  });

  it('auto-queen applies a legal promotion without opening selection state', () => {
    const wrapper = ({ children }) => <SettingsContext.Provider value={{ settings: { ...DEFAULT_SETTINGS, autoQueen: true }, updateSetting: () => {}, resetSettings: () => {}, saveStatus: 'idle' }}>{children}</SettingsContext.Provider>;
    const { result } = renderHook(() => useChessGame(), { wrapper });
    act(() => { result.current.game.load('7k/P7/8/8/8/8/8/7K w - - 0 1'); });
    act(() => { result.current.selectSquare('a7'); });
    act(() => { result.current.selectSquare('a8'); });
    expect(result.current.game.get('a8')?.type).toBe('q');
    expect(result.current.pendingPromotion).toBeNull();
  });
});
