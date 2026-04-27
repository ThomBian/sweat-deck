import { describe, it, expect } from 'vitest';
import { ALL_EXERCISES, faceFreePickPrescription, recommendedFor } from '@/domain/exerciseDb';
import type { SetupConfig } from '@/domain/config';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

describe('ALL_EXERCISES', () => {
  it('includes every movement id at least once', () => {
    const ids = new Set(ALL_EXERCISES.map((e) => e.id));
    expect(ids.has('pushups')).toBe(true);
    expect(ids.has('bench-press')).toBe(true);
  });

  it('tags face challenges with group challenge', () => {
    const burpees = ALL_EXERCISES.find((e) => e.id === 'burpees');
    expect(burpees?.group).toBe('challenge');
  });
});

describe('recommendedFor', () => {
  it('returns default then alts for a suit slot', () => {
    const rows = recommendedFor({ slotKey: 'suit:hearts', config: cfg });
    expect(rows.map((r) => r.id)).toEqual([
      'pushups',
      'pike-pushups',
      'diamond-pushups',
      'decline-pushups',
      'dips',
      'tricep-dips',
    ]);
  });

  it('uses theme and equipment for suit recommendations', () => {
    const rows = recommendedFor({
      slotKey: 'suit:hearts',
      config: { ...cfg, theme: 'upper', equipment: 'gym' },
    });
    expect(rows[0]?.id).toBe('bench-press');
  });

  it('includes cardio face challenges when config.cardio is true', () => {
    const rows = recommendedFor({
      slotKey: 'face:J',
      config: { ...cfg, cardio: true },
    });
    expect(rows.some((r) => r.id === 'skierg')).toBe(true);
  });
});

describe('faceFreePickPrescription', () => {
  it('maps a movement to rank fallback reps when default is distance', () => {
    const rx = faceFreePickPrescription('pullups', { distanceM: 500 }, 'K');
    expect(rx).toEqual({ reps: 20 });
  });

  it('keeps default reps for a movement when the slot default is rep-based', () => {
    const rx = faceFreePickPrescription('pullups', { reps: 15 }, 'J');
    expect(rx).toEqual({ reps: 15 });
  });

  it('derives reps from duration when default is time-based', () => {
    const rx = faceFreePickPrescription('pushups', { durationSec: 60 }, 'Q');
    expect(rx.reps).toBe(12);
  });

  it('uses catalog rx for another face challenge id', () => {
    const rx = faceFreePickPrescription('burpees', { distanceM: 500 }, 'K');
    expect(rx.reps).toBe(15);
  });
});
