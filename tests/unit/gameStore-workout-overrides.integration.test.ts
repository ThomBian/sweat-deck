import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import type { SetupConfig } from '@/domain/config';

/**
 * Integration: Review-time overrides must flow through start() → drawNext() → resolve
 * (same path as the real workout). We drain the deck so every card type appears — no RNG flakiness.
 */
const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('workout uses review overrides (store + drawNext)', () => {
  it('applies suit:hearts number-card override for every hearts number draw', () => {
    useGameStore.getState().setOverride('suit:hearts', 'pike-pushups');
    useGameStore.getState().start(cfg);

    let heartsNumberCount = 0;
    while (useGameStore.getState().deck.length > 0) {
      useGameStore.getState().drawNext();
      const s = useGameStore.getState();
      const last = s.drawn.at(-1);
      if (last?.type === 'number' && last.suit === 'hearts') {
        heartsNumberCount += 1;
        expect(s.current?.id).toBe('pike-pushups');
        expect(s.current?.reps).toBe(last.value);
      }
    }

    expect(heartsNumberCount).toBe(9);
  });

  it('applies face:J override for every Jack face draw', () => {
    useGameStore.getState().setOverride('face:J', 'hollow-body-hold');
    useGameStore.getState().start(cfg);

    let jackCount = 0;
    while (useGameStore.getState().deck.length > 0) {
      useGameStore.getState().drawNext();
      const s = useGameStore.getState();
      const last = s.drawn.at(-1);
      if (last?.type === 'face' && last.rank === 'J') {
        jackCount += 1;
        expect(s.current?.id).toBe('hollow-body-hold');
        expect(s.current?.durationSec).toBe(45);
        expect(s.current?.reps).toBeUndefined();
      }
    }

    expect(jackCount).toBe(4);
  });

  it('applies out-of-catalog suit override through the full deck drain', () => {
    useGameStore.getState().setOverride('suit:hearts', 'bench-press');
    useGameStore.getState().start(cfg);

    while (useGameStore.getState().deck.length > 0) {
      useGameStore.getState().drawNext();
      const s = useGameStore.getState();
      const last = s.drawn.at(-1);
      if (last?.type === 'number' && last.suit === 'hearts') {
        expect(s.current?.id).toBe('bench-press');
        expect(s.current?.reps).toBe(last.value);
      }
    }
  });
});
