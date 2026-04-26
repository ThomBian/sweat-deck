import { describe, it, expect } from 'vitest';
import { pickJokerEffect, COMBO_BREAKER_EXERCISE } from '@/domain/joker';
import type { Card } from '@/domain/card';
import { createRng } from '@/lib/rng';

const upperHistory: Card[] = [
  { type: 'number', suit: 'hearts', value: 8 },
  { type: 'number', suit: 'diamonds', value: 6 },
  { type: 'number', suit: 'hearts', value: 10 },
];

describe('pickJokerEffect', () => {
  it('returns combo-breaker leg burnout when last 3 are upper-body', () => {
    const result = pickJokerEffect({ history: upperHistory, rng: createRng(1) });
    expect(result.kind).toBe('combo-breaker');
    expect(result.exercise).toEqual(COMBO_BREAKER_EXERCISE);
  });

  it('returns one of the three effect kinds otherwise', () => {
    const result = pickJokerEffect({ history: [], rng: createRng(2) });
    expect(['combo-breaker', 'double-up', 'sudden-death']).toContain(result.kind);
  });

  it('is deterministic with the same seed', () => {
    const a = pickJokerEffect({ history: [], rng: createRng(7) });
    const b = pickJokerEffect({ history: [], rng: createRng(7) });
    expect(a).toEqual(b);
  });
});
