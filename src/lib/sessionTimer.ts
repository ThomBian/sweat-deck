import type { SetupConfig } from '@/domain/config';

export type TimerPhase = 'countdown' | 'overtime' | 'stopwatch';

type TimerStateSource = {
  startedAt: number;
  pausedAt: number | null;
  pausedAccumMs: number;
};

/** Wall-clock–aligned effort time; pauses excluded. */
export function computeEffortSec(
  s: TimerStateSource,
  now: number = Date.now(),
): number {
  const live = s.pausedAt ?? now;
  return Math.max(0, Math.floor((live - s.startedAt - s.pausedAccumMs) / 1000));
}

export function isUnlimitedTime(config: SetupConfig): boolean {
  return config.timeLimitMin == null || config.timeLimitMin <= 0;
}

export function getLimitSecFromConfig(config: SetupConfig): number | null {
  if (isUnlimitedTime(config)) return null;
  return config.timeLimitMin! * 60;
}

export function getTimerPhase(
  config: SetupConfig,
  effortSec: number,
): { phase: TimerPhase; remainingSec: number; overtimeSec: number; limitSec: number | null } {
  const limit = getLimitSecFromConfig(config);
  if (limit == null) {
    return { phase: 'stopwatch', remainingSec: effortSec, overtimeSec: 0, limitSec: null };
  }
  const remain = Math.max(0, limit - effortSec);
  const ovt = Math.max(0, effortSec - limit);
  return {
    phase: ovt > 0 ? 'overtime' : 'countdown',
    remainingSec: remain,
    overtimeSec: ovt,
    limitSec: limit,
  };
}

export function isDeckEffortOnlyCard(card: { type: string } | null | undefined): boolean {
  if (!card) return false;
  return card.type === 'number' || card.type === 'face';
}
