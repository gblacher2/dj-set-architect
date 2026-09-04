import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePracticeTimer } from '../usePracticeTimer';

describe('usePracticeTimer Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default zero state', () => {
    const { result } = renderHook(() => usePracticeTimer());
    expect(result.current.running).toBe(false);
    expect(result.current.elapsed).toBe(0);
    expect(result.current.startedAt).toBeNull();
  });

  it('starts counting elapsed time accurately', () => {
    const { result } = renderHook(() => usePracticeTimer());

    act(() => {
      result.current.start();
    });

    expect(result.current.running).toBe(true);
    expect(result.current.startedAt).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.elapsed).toBe(5);
  });

  it('remains accurate even after background-tab throttling delay (60s jump without intermediate ticks)', () => {
    const { result } = renderHook(() => usePracticeTimer());

    act(() => {
      result.current.start();
    });

    // Simulate tab backgrounding by advancing timers 60s at once
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(result.current.elapsed).toBe(60);
  });

  it('correctly handles pause/resume with accumulated time across multiple run segments', () => {
    const { result } = renderHook(() => usePracticeTimer());

    // Segment 1: Start and run for 10 seconds
    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.elapsed).toBe(10);

    // Pause for 15 seconds
    act(() => {
      result.current.pause();
    });
    expect(result.current.running).toBe(false);

    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(result.current.elapsed).toBe(10); // Unchanged during pause

    // Segment 2: Resume and run for 20 seconds
    act(() => {
      result.current.resume();
    });
    expect(result.current.running).toBe(true);

    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(result.current.elapsed).toBe(30); // 10s + 20s = 30s accumulated

    // Segment 3: Pause and resume again with background drift (30s background jump)
    act(() => {
      result.current.pause();
    });
    expect(result.current.elapsed).toBe(30);

    act(() => {
      result.current.resume();
    });

    act(() => {
      vi.advanceTimersByTime(30000); // Background tab jump
    });
    expect(result.current.elapsed).toBe(60); // 30s + 30s = 60s
  });

  it('resets timer state cleanly', () => {
    const { result } = renderHook(() => usePracticeTimer());

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.running).toBe(false);
    expect(result.current.elapsed).toBe(0);
    expect(result.current.startedAt).toBeNull();
  });
});
