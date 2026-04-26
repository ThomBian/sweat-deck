import { describe, it, expect } from 'vitest';
import {
  computeEffortSec,
  getTimerPhase,
  getLimitSecFromConfig,
  isUnlimitedTime,
} from '@/lib/sessionTimer';
import { DEFAULT_CONFIG, type SetupConfig } from '@/domain/config';

describe('computeEffortSec', () => {
  it('counts wall time minus pauses (single segment)', () => {
    const startedAt = 1_000_000;
    const live = 1_000_000 + 10_000;
    expect(computeEffortSec({ startedAt, pausedAt: null, pausedAccumMs: 0 }, live)).toBe(10);
  });

  it('freezes when paused at live=pausedAt', () => {
    const startedAt = 1_000_000;
    const pausedAt = 1_000_000 + 4_200;
    expect(computeEffortSec({ startedAt, pausedAt, pausedAccumMs: 0 }, 9_000_000)).toBe(4);
  });

  it('applies multiple pause segments via pausedAccumMs', () => {
    const startedAt = 0;
    // 5s running + 2s "paused" already folded into accum + 3s running, live at 5+2+3
    const pausedAccumMs = 2_000;
    const live = 10_000;
    expect(computeEffortSec({ startedAt, pausedAt: null, pausedAccumMs }, live)).toBe(8);
  });
});

describe('getTimerPhase', () => {
  it('stopwatch when unlimited', () => {
    const c: SetupConfig = { ...DEFAULT_CONFIG, timeLimitMin: undefined };
    const a = getTimerPhase(c, 125);
    expect(a.phase).toBe('stopwatch');
    expect(a.limitSec).toBeNull();
  });

  it('countdown then overtime in timed mode', () => {
    const c: SetupConfig = { ...DEFAULT_CONFIG, timeLimitMin: 1 };
    expect(getTimerPhase(c, 30).phase).toBe('countdown');
    expect(getTimerPhase(c, 30).remainingSec).toBe(30);
    expect(getTimerPhase(c, 60).phase).toBe('countdown');
    expect(getTimerPhase(c, 61).phase).toBe('overtime');
  });
});

describe('isUnlimitedTime / getLimitSecFromConfig', () => {
  it('treats 0 and undefined as unlimited', () => {
    expect(isUnlimitedTime({ ...DEFAULT_CONFIG, timeLimitMin: 0 })).toBe(true);
    expect(getLimitSecFromConfig({ ...DEFAULT_CONFIG, timeLimitMin: 0 })).toBeNull();
  });
  it('returns seconds for a positive cap', () => {
    expect(getLimitSecFromConfig({ ...DEFAULT_CONFIG, timeLimitMin: 2 })).toBe(120);
  });
});
