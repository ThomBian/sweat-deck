import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';

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
