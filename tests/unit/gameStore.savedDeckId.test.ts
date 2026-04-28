import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('savedDeckId', () => {
  it('starts as null', () => {
    expect(useGameStore.getState().savedDeckId).toBeNull();
  });

  it('setSavedDeckId stores the id', () => {
    useGameStore.getState().setSavedDeckId(42);
    expect(useGameStore.getState().savedDeckId).toBe(42);
  });

  it('setSavedDeckId(null) clears it', () => {
    useGameStore.getState().setSavedDeckId(7);
    useGameStore.getState().setSavedDeckId(null);
    expect(useGameStore.getState().savedDeckId).toBeNull();
  });

  it('reset() clears savedDeckId', () => {
    useGameStore.getState().setSavedDeckId(7);
    useGameStore.getState().reset();
    expect(useGameStore.getState().savedDeckId).toBeNull();
  });

  it('start() preserves savedDeckId set before it is called', () => {
    useGameStore.getState().setSavedDeckId(9);
    useGameStore.getState().start({
      difficulty: 'intermediate',
      equipment: 'bodyweight',
      theme: 'full',
      cardio: false,
    });
    expect(useGameStore.getState().savedDeckId).toBe(9);
  });
});
