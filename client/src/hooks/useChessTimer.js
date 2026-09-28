import { useState, useEffect, useRef, useCallback } from 'react';

export const TIME_PRESETS = [
  { id: 'bullet_1_0', name: 'Bullet 1+0', initialSeconds: 60, increment: 0, category: 'Bullet' },
  { id: 'blitz_3_2', name: 'Blitz 3+2', initialSeconds: 180, increment: 2, category: 'Blitz' },
  { id: 'blitz_5_0', name: 'Blitz 5+0', initialSeconds: 300, increment: 0, category: 'Blitz' },
  { id: 'rapid_10_0', name: 'Rapid 10+0', initialSeconds: 600, increment: 0, category: 'Rapid' },
  { id: 'classical_15_10', name: 'Classical 15+10', initialSeconds: 900, increment: 10, category: 'Classical' },
  { id: 'unlimited', name: 'Casual (Unlimited)', initialSeconds: 0, increment: 0, category: 'Casual' },
];

export const useChessTimer = ({
  turn,
  isGameOver,
  moveCount,
  onTimeout,
  initialPresetId = 'rapid_10_0',
}) => {
  const [currentPreset, setCurrentPreset] = useState(() => {
    return TIME_PRESETS.find((p) => p.id === initialPresetId) || TIME_PRESETS[3];
  });

  const [whiteTime, setWhiteTime] = useState(currentPreset.initialSeconds);
  const [blackTime, setBlackTime] = useState(currentPreset.initialSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const prevTurnRef = useRef(turn);
  const prevMoveCountRef = useRef(moveCount);

  const isUnlimited = currentPreset.initialSeconds === 0;

  // Reset clocks
  const resetClocks = useCallback((preset = currentPreset) => {
    setWhiteTime(preset.initialSeconds);
    setBlackTime(preset.initialSeconds);
    setIsTimerRunning(false);
  }, [currentPreset]);

  // Switch preset
  const selectPreset = useCallback((preset) => {
    setCurrentPreset(preset);
    resetClocks(preset);
  }, [resetClocks]);

  // History edits must not be mistaken for newly played moves (and therefore
  // must not award increments). Existing clock values remain authoritative.
  const syncMoveState = useCallback((nextMoveCount, nextTurn) => {
    prevMoveCountRef.current = nextMoveCount;
    prevTurnRef.current = nextTurn;
    setIsTimerRunning(nextMoveCount > 0 && !isUnlimited);
  }, [isUnlimited]);

  // Handle move increment & start timer after 1st move
  useEffect(() => {
    if (moveCount > 0 && !isGameOver && !isUnlimited) {
      setIsTimerRunning(true);
    }

    // Add increment to the player who just finished their move
    if (moveCount > prevMoveCountRef.current && currentPreset.increment > 0 && !isUnlimited) {
      const movedColor = prevTurnRef.current; // the player who just played
      if (movedColor === 'w') {
        setWhiteTime((t) => t + currentPreset.increment);
      } else {
        setBlackTime((t) => t + currentPreset.increment);
      }
    }

    prevTurnRef.current = turn;
    prevMoveCountRef.current = moveCount;
  }, [moveCount, turn, currentPreset, isGameOver, isUnlimited]);

  // Countdown loop
  useEffect(() => {
    if (!isTimerRunning || isGameOver || isUnlimited) return;

    const interval = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            onTimeout?.('w'); // White ran out of time, Black wins
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            onTimeout?.('b'); // Black ran out of time, White wins
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, turn, isGameOver, isUnlimited, onTimeout]);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds) => {
    if (isUnlimited) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(mins)}:${pad(secs)}`;
  };

  return {
    whiteTime,
    blackTime,
    whiteTimeFormatted: formatTime(whiteTime),
    blackTimeFormatted: formatTime(blackTime),
    isWhiteLowTime: !isUnlimited && whiteTime < 30 && whiteTime > 0,
    isBlackLowTime: !isUnlimited && blackTime < 30 && blackTime > 0,
    isTimerRunning,
    currentPreset,
    selectPreset,
    resetClocks,
    syncMoveState,
    isUnlimited,
  };
};

export default useChessTimer;
