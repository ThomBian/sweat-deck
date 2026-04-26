import { describe, it, expect } from 'vitest';
import { i18n } from '@/i18n';
import { tExercise } from '@/i18n/exercises';

describe('tExercise', () => {
  it('returns English by default', () => {
    i18n.activate('en');
    expect(tExercise('pushups')).toBe('Push-ups');
    expect(tExercise('water-break')).toBe('Water Break');
  });

  it('returns French when fr is active', () => {
    i18n.activate('fr');
    expect(tExercise('pushups')).toBe('Pompes');
    expect(tExercise('water-break')).toBe('Pause hydratation');
  });
});
