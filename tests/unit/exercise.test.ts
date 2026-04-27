import { describe, it, expect } from 'vitest';
import { resolve } from '@/domain/exercise';
import type { SetupConfig } from '@/domain/config';
import type { PlanOverrides } from '@/domain/plan';

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

describe('resolve with overrides', () => {
  it('applies a number-card override and preserves reps from card value', () => {
    const overrides: PlanOverrides = { 'suit:hearts': 'pike-pushups' };
    const ex = resolve({
      card: { type: 'number', suit: 'hearts', value: 9 },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('pike-pushups');
    expect(ex.reps).toBe(9);
  });

  it('ignores a number-card override when id is not in the slot options', () => {
    const overrides: PlanOverrides = { 'suit:hearts': 'bench-press' }; // gym, not bodyweight
    const ex = resolve({
      card: { type: 'number', suit: 'hearts', value: 5 },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('pushups');
  });

  it('applies a face-card override with its own prescription', () => {
    const overrides: PlanOverrides = { 'face:J': 'hollow-body-hold' };
    const ex = resolve({
      card: { type: 'face', suit: 'clubs', rank: 'J' },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('hollow-body-hold');
    expect(ex.durationSec).toBe(45); // from alt definition in FACE_CHALLENGES
    expect(ex.reps).toBeUndefined();
  });

  it('ignores overrides for aces', () => {
    const overrides: PlanOverrides = { 'suit:hearts': 'pike-pushups' };
    const ex = resolve({
      card: { type: 'ace', suit: 'hearts' },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('water-break');
  });

  it('ignores overrides for jokers', () => {
    const overrides: PlanOverrides = { 'face:J': 'hollow-body-hold' };
    const ex = resolve({
      card: { type: 'joker', id: 1 },
      config: baseConfig,
      overrides,
    });
    expect(ex.id).toBe('max-effort-leg-burnout');
  });
});
