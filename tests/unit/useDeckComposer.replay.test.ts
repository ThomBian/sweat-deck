import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeckComposer } from '@/hooks/useDeckComposer';
import { useGameStore } from '@/store/gameStore';
import type { SetupConfig } from '@/domain/config';

const cfg: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};

beforeEach(() => {
  useGameStore.getState().reset();
});

describe('useDeckComposer with initialOverrides', () => {
  it('seeds gameStore overrides on mount when provided (guided)', () => {
    renderHook(() =>
      useDeckComposer({
        mode: 'guided',
        config: cfg,
        initialOverrides: {
          'suit:hearts': { id: 'pike-pushups' },
          'face:K': { id: 'burpees', reps: 12 },
        },
      }),
    );
    expect(useGameStore.getState().overrides).toEqual({
      'suit:hearts': { id: 'pike-pushups' },
      'face:K': { id: 'burpees', reps: 12 },
    });
  });

  it('seeds gameStore overrides on mount when provided (manual)', () => {
    renderHook(() =>
      useDeckComposer({
        mode: 'manual',
        initialOverrides: {
          'suit:hearts': { id: 'pushups' },
          'suit:diamonds': { id: 'squats' },
          'suit:clubs': { id: 'pullups' },
          'suit:spades': { id: 'lunges' },
          'face:J': { id: 'burpees' },
          'face:Q': { id: 'plank' },
          'face:K': { id: 'deadlift' },
        },
      }),
    );
    expect(Object.keys(useGameStore.getState().overrides).length).toBe(7);
  });

  it('resets overrides when no initialOverrides provided', () => {
    useGameStore.getState().setOverride('suit:hearts', { id: 'pike-pushups' });
    renderHook(() => useDeckComposer({ mode: 'guided', config: cfg }));
    expect(useGameStore.getState().overrides).toEqual({});
  });
});
