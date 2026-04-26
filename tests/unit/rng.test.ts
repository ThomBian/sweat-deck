import { describe, it, expect } from 'vitest';
import { createRng, sampleNormal, sampleInt } from '@/lib/rng';

describe('createRng', () => {
  it('produces deterministic sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('sampleNormal', () => {
  it('clamps results to [min, max]', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = sampleNormal({ rng, mean: 5, sigma: 2, min: 2, max: 10 });
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('mean of samples is close to requested mean', () => {
    const rng = createRng(99);
    let sum = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) sum += sampleNormal({ rng, mean: 5, sigma: 1.5, min: 2, max: 10 });
    expect(sum / n).toBeCloseTo(5, 0);
  });
});

describe('sampleInt', () => {
  it('returns integers in [min, max] inclusive', () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      const v = sampleInt({ rng, min: 1, max: 6 });
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});
