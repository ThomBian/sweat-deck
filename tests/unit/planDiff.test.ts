import { describe, it, expect } from 'vitest';
import { slotOverrideEqual, overridesEqual } from '@/lib/planDiff';
import type { PlanOverrides, SlotOverride } from '@/domain/plan';

describe('slotOverrideEqual', () => {
  it('treats undefined as equal', () => {
    expect(slotOverrideEqual(undefined, undefined)).toBe(true);
  });

  it('treats undefined vs empty object as equal', () => {
    expect(slotOverrideEqual(undefined, {})).toBe(true);
    expect(slotOverrideEqual({}, undefined)).toBe(true);
  });

  it('compares all four override fields', () => {
    const base: SlotOverride = { id: 'pushup', reps: 10 };
    expect(slotOverrideEqual(base, { id: 'pushup', reps: 10 })).toBe(true);
    expect(slotOverrideEqual(base, { id: 'pushup', reps: 12 })).toBe(false);
    expect(slotOverrideEqual(base, { id: 'squat', reps: 10 })).toBe(false);
    expect(
      slotOverrideEqual({ durationSec: 30 }, { durationSec: 60 }),
    ).toBe(false);
    expect(
      slotOverrideEqual({ distanceM: 100 }, { distanceM: 100 }),
    ).toBe(true);
  });
});

describe('overridesEqual', () => {
  it('returns true for identical maps', () => {
    const a: PlanOverrides = { 'suit:hearts': { id: 'pushup', reps: 10 } };
    const b: PlanOverrides = { 'suit:hearts': { id: 'pushup', reps: 10 } };
    expect(overridesEqual(a, b)).toBe(true);
  });

  it('returns false when a key differs', () => {
    const a: PlanOverrides = { 'suit:hearts': { id: 'pushup' } };
    const b: PlanOverrides = { 'suit:hearts': { id: 'squat' } };
    expect(overridesEqual(a, b)).toBe(false);
  });

  it('returns false when one side has an extra key', () => {
    const a: PlanOverrides = { 'suit:hearts': { id: 'pushup' } };
    const b: PlanOverrides = {
      'suit:hearts': { id: 'pushup' },
      'face:Q': { id: 'plank' },
    };
    expect(overridesEqual(a, b)).toBe(false);
  });

  it('treats empty equivalents the same', () => {
    expect(overridesEqual({}, {})).toBe(true);
  });
});
