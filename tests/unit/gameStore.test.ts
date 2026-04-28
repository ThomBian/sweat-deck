import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DEV_JOKER_ONLY_DECK_KEY, useGameStore } from '@/store/gameStore';

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('override actions', () => {
  it('overrides starts empty', () => {
    expect(useGameStore.getState().overrides).toEqual({});
  });

  it('setOverride stores a SlotOverride', () => {
    useGameStore.getState().setOverride('suit:hearts', { id: 'pike-pushups' });
    expect(useGameStore.getState().overrides['suit:hearts']).toEqual({ id: 'pike-pushups' });
  });

  it('clearOverride removes a single key', () => {
    useGameStore.getState().setOverride('suit:hearts', { id: 'pike-pushups' });
    useGameStore.getState().setOverride('face:J', { id: 'hollow-body-hold' });
    useGameStore.getState().clearOverride('suit:hearts');
    expect(useGameStore.getState().overrides['suit:hearts']).toBeUndefined();
    expect(useGameStore.getState().overrides['face:J']).toEqual({ id: 'hollow-body-hold' });
  });

  it('resetOverrides clears all keys', () => {
    useGameStore.getState().setOverride('suit:hearts', { id: 'pike-pushups' });
    useGameStore.getState().setOverride('face:K', { id: 'burpees' });
    useGameStore.getState().resetOverrides();
    expect(useGameStore.getState().overrides).toEqual({});
  });

  it('start() preserves overrides set before it is called', () => {
    useGameStore.getState().setOverride('suit:hearts', { id: 'pike-pushups' });
    useGameStore.getState().start({
      difficulty: 'intermediate',
      equipment: 'bodyweight',
      theme: 'full',
      cardio: false,
    });
    expect(useGameStore.getState().overrides['suit:hearts']).toEqual({ id: 'pike-pushups' });
  });

  it('reset() clears overrides', () => {
    useGameStore.getState().setOverride('suit:hearts', { id: 'pike-pushups' });
    useGameStore.getState().reset();
    expect(useGameStore.getState().overrides).toEqual({});
  });
});

describe.skipIf(!import.meta.env.DEV)('dev joker-only deck', () => {
  afterEach(() => {
    localStorage.removeItem(DEV_JOKER_ONLY_DECK_KEY);
    useGameStore.getState().reset();
  });

  it('start() uses two jokers when localStorage flag is set', () => {
    localStorage.setItem(DEV_JOKER_ONLY_DECK_KEY, '1');
    useGameStore.getState().start({
      difficulty: 'intermediate',
      equipment: 'bodyweight',
      theme: 'full',
      cardio: false,
    });
    const deck = useGameStore.getState().deck;
    expect(deck).toHaveLength(2);
    expect(deck.every((c) => c.type === 'joker')).toBe(true);
  });
});
