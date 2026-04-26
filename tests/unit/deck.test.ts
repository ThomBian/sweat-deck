import { describe, it, expect } from 'vitest';
import { build54, draw } from '@/domain/deck';
import { createRng } from '@/lib/rng';

describe('build54', () => {
  it('returns 54 cards', () => {
    expect(build54()).toHaveLength(54);
  });

  it('contains 2 jokers', () => {
    const jokers = build54().filter((c) => c.type === 'joker');
    expect(jokers).toHaveLength(2);
  });

  it('contains 4 aces, one per suit', () => {
    const aces = build54().filter((c) => c.type === 'ace');
    expect(aces).toHaveLength(4);
    const suits = new Set(aces.map((c) => (c.type === 'ace' ? c.suit : '')));
    expect(suits.size).toBe(4);
  });

  it('contains 12 face cards (3 ranks × 4 suits)', () => {
    expect(build54().filter((c) => c.type === 'face')).toHaveLength(12);
  });

  it('contains 36 number cards (9 values × 4 suits)', () => {
    expect(build54().filter((c) => c.type === 'number')).toHaveLength(36);
  });
});

describe('draw', () => {
  it('returns one card and decrements remaining by one', () => {
    const deck = build54();
    const rng = createRng(1);
    const result = draw({ remaining: deck, difficulty: 'intermediate', rng });
    expect(result.remaining).toHaveLength(53);
    expect(deck).toContainEqual(result.card);
  });

  it('throws when remaining is empty', () => {
    expect(() => draw({ remaining: [], difficulty: 'intermediate', rng: createRng(1) })).toThrow();
  });

  it('beginner difficulty biases toward low number cards', () => {
    const rng = createRng(123);
    let lowDraws = 0;
    let highDraws = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      const numbers = build54().filter((c) => c.type === 'number');
      const result = draw({ remaining: numbers, difficulty: 'beginner', rng });
      if (result.card.type === 'number') {
        if (result.card.value <= 4) lowDraws++;
        if (result.card.value >= 8) highDraws++;
      }
    }
    expect(lowDraws).toBeGreaterThan(highDraws * 2);
  });

  it('hell difficulty biases toward high number cards', () => {
    const rng = createRng(456);
    let lowDraws = 0;
    let highDraws = 0;
    const trials = 5000;
    for (let i = 0; i < trials; i++) {
      const numbers = build54().filter((c) => c.type === 'number');
      const result = draw({ remaining: numbers, difficulty: 'hell', rng });
      if (result.card.type === 'number') {
        if (result.card.value <= 4) lowDraws++;
        if (result.card.value >= 8) highDraws++;
      }
    }
    expect(highDraws).toBeGreaterThan(lowDraws * 2);
  });
});
