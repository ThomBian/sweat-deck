import { describe, it, expect } from 'vitest';
import { resolve } from '@/domain/exercise';
import type { SetupConfig } from '@/domain/config';

const baseConfig: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

describe('resolve', () => {
  it('maps a number card to suit movement with reps = card value', () => {
    const ex = resolve({ card: { type: 'number', suit: 'hearts', value: 7 }, config: baseConfig });
    expect(ex.id).toBe('pushups');
    expect(ex.reps).toBe(7);
  });

  it('maps an ace to a 60s water break', () => {
    const ex = resolve({ card: { type: 'ace', suit: 'spades' }, config: baseConfig });
    expect(ex.id).toBe('water-break');
    expect(ex.durationSec).toBe(60);
  });

  it('maps J to a face challenge with fixed reps', () => {
    const ex = resolve({ card: { type: 'face', suit: 'clubs', rank: 'J' }, config: baseConfig });
    expect(ex.id).toBe('burpees');
    expect(ex.reps).toBe(15);
  });

  it('uses cardio face challenges when cardio is true', () => {
    const ex = resolve({
      card: { type: 'face', suit: 'clubs', rank: 'K' },
      config: { ...baseConfig, cardio: true },
    });
    expect(ex.id).toBe('row');
    expect(ex.distanceM).toBe(500);
  });

  it('returns a placeholder for joker cards (handled separately by joker module)', () => {
    const ex = resolve({ card: { type: 'joker', id: 1 }, config: baseConfig });
    expect(ex.id).toBe('max-effort-leg-burnout');
  });
});
