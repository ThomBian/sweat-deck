import { describe, it, expect } from 'vitest';
import { buildPlan, buildManualSlots } from '@/domain/plan';
import type { SetupConfig } from '@/domain/config';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

describe('buildPlan', () => {
  it('returns exactly 7 slots in order: hearts diamonds clubs spades J Q K', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    expect(slots).toHaveLength(7);
    expect(slots.map((s) => s.key)).toEqual([
      'suit:hearts',
      'suit:diamonds',
      'suit:clubs',
      'suit:spades',
      'face:J',
      'face:Q',
      'face:K',
    ]);
  });

  it('defaultExercise is the first option', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    for (const slot of slots) {
      expect(slot.options[0]).toEqual(slot.defaultExercise);
    }
  });

  it('selected equals default id when no overrides', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    for (const slot of slots) {
      expect(slot.selected).toBe(slot.defaultExercise.id);
    }
  });

  it('selected reflects a valid override', () => {
    const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': { id: 'pike-pushups' } } });
    const hearts = slots.find((s) => s.key === 'suit:hearts')!;
    expect(hearts.selected).toBe('pike-pushups');
  });

  it('applies an override id not in curated options', () => {
    const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': { id: 'bench-press' } } });
    const hearts = slots.find((s) => s.key === 'suit:hearts')!;
    expect(hearts.selected).toBe('bench-press');
  });

  it('selected reflects id in SlotOverride', () => {
    const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': { id: 'pike-pushups' } } });
    const hearts = slots.find((s) => s.key === 'suit:hearts')!;
    expect(hearts.selected).toBe('pike-pushups');
  });

  it('face slot prescriptionOverride is set when override has reps', () => {
    const slots = buildPlan({ config: cfg, overrides: { 'face:J': { reps: 30 } } });
    const j = slots.find((s) => s.key === 'face:J')!;
    expect(j.prescriptionOverride).toEqual({ reps: 30 });
    expect(j.selected).toBe(j.defaultExercise.id);
  });

  it('face slot prescriptionOverride is undefined when no override', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    const j = slots.find((s) => s.key === 'face:J')!;
    expect(j.prescriptionOverride).toBeUndefined();
  });

  it('face slot prescriptionOverride combined with id override', () => {
    const slots = buildPlan({
      config: cfg,
      overrides: { 'face:J': { id: 'hollow-body-hold', durationSec: 90 } },
    });
    const j = slots.find((s) => s.key === 'face:J')!;
    expect(j.selected).toBe('hollow-body-hold');
    expect(j.prescriptionOverride).toEqual({ durationSec: 90 });
  });

  it('number slots have no prescriptionOverride', () => {
    const slots = buildPlan({ config: cfg, overrides: { 'suit:hearts': { id: 'pike-pushups' } } });
    const hearts = slots.find((s) => s.key === 'suit:hearts')!;
    expect(hearts.prescriptionOverride).toBeUndefined();
  });

  it('number slots have reps: 0 placeholder', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    const numberSlots = slots.filter((s) => s.key.startsWith('suit:'));
    for (const slot of numberSlots) {
      expect(slot.defaultExercise.reps).toBe(0);
    }
  });

  it('face slots have actual prescription', () => {
    const slots = buildPlan({ config: cfg, overrides: {} });
    const j = slots.find((s) => s.key === 'face:J')!;
    expect(j.defaultExercise.id).toBe('burpees');
    expect(j.defaultExercise.reps).toBe(15);
  });

  it('cardio=true changes face slot sources', () => {
    const slots = buildPlan({ config: { ...cfg, cardio: true }, overrides: {} });
    const j = slots.find((s) => s.key === 'face:J')!;
    expect(j.defaultExercise.id).toBe('skierg');
  });
});

describe('buildManualSlots', () => {
  it('returns 7 slot keys in order: hearts diamonds clubs spades J Q K', () => {
    const keys = buildManualSlots();
    expect(keys).toEqual([
      'suit:hearts',
      'suit:diamonds',
      'suit:clubs',
      'suit:spades',
      'face:J',
      'face:Q',
      'face:K',
    ]);
  });
});
