import { useCallback, useEffect, useRef, useState } from 'react';

export interface PracticeTimer {
  running: boolean;
  elapsed: number;
  startedAt: string | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setElapsed: (seconds: number) => void;
}

export function usePracticeTimer(initialElapsed = 0): PracticeTimer {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsedState] = useState(initialElapsed);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const accumulatedSecondsRef = useRef(initialElapsed);
  const currentRunStartMsRef = useRef<number | null>(null);
  const elapsedRef = useRef(elapsed);
  elapsedRef.current = elapsed;

  const updateElapsed = useCallback(() => {
    if (currentRunStartMsRef.current !== null) {
      const now = Date.now();
      const currentSegment = Math.max(0, Math.floor((now - currentRunStartMsRef.current) / 1000));
      const totalElapsed = accumulatedSecondsRef.current + currentSegment;
      if (totalElapsed !== elapsedRef.current) {
        setElapsedState(totalElapsed);
      }
    }
  }, []);

  useEffect(() => {
    if (!running) return;

    // Tick every 200ms for accurate UI updates while relying on timestamp difference
    const interval = window.setInterval(updateElapsed, 200);

    return () => {
      window.clearInterval(interval);
    };
  }, [running, updateElapsed]);

  const start = useCallback(() => {
    const nowISO = new Date().toISOString();
    setStartedAt(nowISO);
    accumulatedSecondsRef.current = 0;
    currentRunStartMsRef.current = Date.now();
    setElapsedState(0);
    elapsedRef.current = 0;
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (currentRunStartMsRef.current !== null) {
      const currentSegment = Math.max(0, Math.floor((Date.now() - currentRunStartMsRef.current) / 1000));
      accumulatedSecondsRef.current += currentSegment;
      currentRunStartMsRef.current = null;
      setElapsedState(accumulatedSecondsRef.current);
    }
    setRunning(false);
  }, []);

  const resume = useCallback(() => {
    currentRunStartMsRef.current = Date.now();
    setRunning(true);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    accumulatedSecondsRef.current = 0;
    currentRunStartMsRef.current = null;
    setElapsedState(0);
    elapsedRef.current = 0;
    setStartedAt(null);
  }, []);

  const setElapsed = useCallback((seconds: number) => {
    const valid = Math.max(0, seconds);
    accumulatedSecondsRef.current = valid;
    if (currentRunStartMsRef.current !== null) {
      currentRunStartMsRef.current = Date.now();
    }
    setElapsedState(valid);
    elapsedRef.current = valid;
  }, []);

  return {
    running,
    elapsed,
    startedAt,
    start,
    pause,
    resume,
    reset,
    setElapsed,
  };
}
