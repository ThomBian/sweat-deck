import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

const startSession = () => {
  useGameStore.getState().reset();
  useGameStore.getState().start({
    difficulty: 'intermediate',
    equipment: 'bodyweight',
    theme: 'full',
    cardio: false,
  });
};

describe('drawNext — joker block before draw 10', () => {
  beforeEach(() => {
    startSession();
  });

  it('never produces a joker in the first 10 draws across many seeded sessions', () => {
    for (let session = 0; session < 50; session++) {
      startSession();
      for (let i = 0; i < 10; i++) {
        useGameStore.getState().drawNext();
      }
      const drawn = useGameStore.getState().drawn;
      expect(drawn).toHaveLength(10);
      const jokerCount = drawn.filter((c) => c.type === 'joker').length;
      expect(jokerCount).toBe(0);
    }
  });

  it('jokers remain in the deck during the block window', () => {
    for (let i = 0; i < 10; i++) useGameStore.getState().drawNext();
    const remainingJokers = useGameStore
      .getState()
      .deck.filter((c) => c.type === 'joker').length;
    expect(remainingJokers).toBe(2);
  });

  it('jokers become eligible after draw 10', () => {
    let sawJokerAfter = false;
    for (let session = 0; session < 30; session++) {
      startSession();
      for (let i = 0; i < 30; i++) useGameStore.getState().drawNext();
      const after = useGameStore.getState().drawn.slice(10);
      if (after.some((c) => c.type === 'joker')) {
        sawJokerAfter = true;
        break;
      }
    }
    expect(sawJokerAfter).toBe(true);
  });
});
