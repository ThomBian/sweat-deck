import { useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { useGameStore } from '@/store/gameStore';

export type ExerciseCountdownPhase = 'idle' | 'running' | 'done';

function playCompletion(): void {
  try {
    navigator.vibrate([200, 100, 200]);
  } catch {
    /* unsupported or denied */
  }
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const tone = (freq: number, at: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = freq;
      o.type = 'sine';
      g.gain.value = 0.15;
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.12);
    };
    tone(880, 0);
    tone(660, 0.18);
  } catch {
    /* AudioContext unavailable or blocked */
  }
}

/**
 * Countdown for timed exercises. Resets when `durationSec` changes (new card).
 * Respects `pausedAt` from the game store: clears the interval when paused, resumes if running when unpaused.
 */
export function useExerciseCountdown(durationSec: number | undefined): {
  phase: ExerciseCountdownPhase;
  remaining: number;
  start: () => void;
} {
  const pausedAt = useGameStore((s) => s.pausedAt);
  const [phase, setPhase] = useState<ExerciseCountdownPhase>('idle');
  const [remaining, setRemaining] = useState(
    () => (durationSec != null && durationSec > 0 ? durationSec : 0),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneFiredRef = useRef(false);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const runTick = useCallback(() => {
    setRemaining((r) => {
      if (r <= 1) {
        clearTick();
        setPhase('done');
        if (!doneFiredRef.current) {
          doneFiredRef.current = true;
          playCompletion();
        }
        return 0;
      }
      return r - 1;
    });
  }, [clearTick]);

  const beginInterval = useCallback(() => {
    clearTick();
    intervalRef.current = setInterval(runTick, 1000);
  }, [clearTick, runTick]);

  useEffect(() => {
    clearTick();
    doneFiredRef.current = false;
    const d = durationSec != null && durationSec > 0 ? durationSec : 0;
    startTransition(() => {
      setPhase('idle');
      setRemaining(d);
    });
  }, [durationSec, clearTick]);

  useEffect(() => {
    if (pausedAt) {
      clearTick();
      return;
    }
    if (phase === 'running' && remaining > 0) {
      if (intervalRef.current) return;
      beginInterval();
    }
  }, [pausedAt, phase, remaining, clearTick, beginInterval]);

  const start = useCallback(() => {
    if (useGameStore.getState().pausedAt) return;
    if (durationSec == null || durationSec <= 0) return;
    if (phase !== 'idle') return;
    doneFiredRef.current = false;
    setPhase('running');
    setRemaining(durationSec);
  }, [durationSec, phase]);

  return { phase, remaining, start };
}
