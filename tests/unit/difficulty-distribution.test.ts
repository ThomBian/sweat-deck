import { describe, it, expect } from 'vitest';
import { build54, draw, farExtremesForMean } from '@/domain/deck';
import { createRng } from '@/lib/rng';
import { NUMBER_DIST, type Difficulty } from '@/domain/difficulty';

const TRIALS = 10_000;

const mode = (arr: number[]): number | null => {
  const c = new Map<number, number>();
  for (const v of arr) c.set(v, (c.get(v) ?? 0) + 1);
  let bestN = 0;
  let best: number | null = null;
  c.forEach((n, v) => {
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  });
  return best;
};

describe('farExtremesForMean & sample distribution', () => {
  it.each([
    { d: 'beginner' as const, mean: 2 },
    { d: 'intermediate' as const, mean: 5 },
    { d: 'hard' as const, mean: 7 },
    { d: 'advanced' as const, mean: 9 },
    { d: 'hell' as const, mean: 10 },
  ] as const)('extreme value frequency ≤6% and mode within ±1 of mean for $d', ({ d, mean }) => {
    const rng = createRng(7_000 + mean);
    const values: number[] = [];
    for (let i = 0; i < TRIALS; i++) {
      const onlyNumbers = build54().filter((c) => c.type === 'number');
      const { card } = draw({ remaining: onlyNumbers, difficulty: d, rng });
      if (card.type === 'number') values.push(card.value);
    }
    const extremes = new Set(farExtremesForMean(NUMBER_DIST[d].mean));
    const extremeN = values.filter((v) => extremes.has(v)).length;
    const ratio = extremeN / values.length;
    expect(ratio).toBeLessThanOrEqual(0.06);
    const m = mode(values);
    expect(m).not.toBeNull();
    expect(Math.abs((m as number) - mean)).toBeLessThanOrEqual(1);
  });

  it('regression: histogram for intermediate is roughly unimodal (mode dominates)', () => {
    const rng = createRng(42_001);
    const d: Difficulty = 'intermediate';
    const counts = new Map<number, number>();
    for (let i = 0; i < 2000; i++) {
      const onlyNumbers = build54().filter((c) => c.type === 'number');
      const { card } = draw({ remaining: onlyNumbers, difficulty: d, rng });
      if (card.type === 'number') {
        counts.set(card.value, (counts.get(card.value) ?? 0) + 1);
      }
    }
    const total = 2000;
    const m = 5; // expect peak near mean 5
    const c5 = (counts.get(m) ?? 0) / total;
    expect(c5).toBeGreaterThan(0.12);
  });
});
