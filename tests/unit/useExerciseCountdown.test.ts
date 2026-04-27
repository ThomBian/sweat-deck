import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useExerciseCountdown } from '@/hooks/useExerciseCountdown';

const store = { pausedAt: null as number | null };

vi.mock('@/store/gameStore', () => ({
  useGameStore: Object.assign(
    (selector: (s: { pausedAt: number | null }) => unknown) => selector({ pausedAt: store.pausedAt }),
    { getState: () => ({ pausedAt: store.pausedAt }) },
  ),
}));

describe('useExerciseCountdown', () => {
  let vibrateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    store.pausedAt = null;
    vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vibrateSpy,
    });
    vi.stubGlobal(
      'AudioContext',
      class {
        currentTime = 0;
        createOscillator() {
          return { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), type: 'sine' as const, frequency: { value: 0 } };
        }
        createGain() {
          return { connect: vi.fn(), gain: { value: 0 } };
        }
        get destination() {
          return {};
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('starts in idle with remaining === durationSec', () => {
    const { result } = renderHook(() => useExerciseCountdown(30));
    expect(result.current.phase).toBe('idle');
    expect(result.current.remaining).toBe(30);
  });

  it('start() → running, counts down each second', () => {
    const { result } = renderHook(() => useExerciseCountdown(5));
    act(() => result.current.start());
    expect(result.current.phase).toBe('running');
    expect(result.current.remaining).toBe(5);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.remaining).toBe(2);
  });

  it('reaches 0 → done, completion vibrate once', () => {
    const { result } = renderHook(() => useExerciseCountdown(3));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.phase).toBe('done');
    expect(result.current.remaining).toBe(0);
    expect(vibrateSpy).toHaveBeenCalledOnce();
  });

  it('resets to idle when durationSec changes (new card)', () => {
    const { result, rerender } = renderHook(({ d }) => useExerciseCountdown(d), { initialProps: { d: 10 } });
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.remaining).toBe(7);

    rerender({ d: 20 });
    expect(result.current.phase).toBe('idle');
    expect(result.current.remaining).toBe(20);
  });

  it('pauses when pausedAt; resumes without losing time', () => {
    const { result, rerender } = renderHook(() => useExerciseCountdown(10));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.remaining).toBe(7);

    store.pausedAt = Date.now();
    rerender();
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.remaining).toBe(7);

    store.pausedAt = null;
    rerender();
    act(() => vi.advanceTimersByTime(2000));
    expect(result.current.remaining).toBe(5);
    expect(result.current.phase).toBe('running');
  });
});
