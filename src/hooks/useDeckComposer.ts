import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { buildPlan, buildManualSlots, type SlotKey, type PlanSlot } from '@/domain/plan';
import { DEFAULT_CONFIG, type SetupConfig } from '@/domain/config';
import type { ExerciseId } from '@/domain/exercise';
import { saveLastConfig } from '@/store/db';

export type ComposerMode =
  | { mode: 'guided'; config: SetupConfig }
  | { mode: 'manual' };

export type ComposerSlot = {
  key: SlotKey;
  selected: ExerciseId | undefined;
  options: PlanSlot['options'];
  defaultExercise: PlanSlot['defaultExercise'] | undefined;
};

export type DeckComposerState = {
  slots: ComposerSlot[];
  isReady: boolean;
  setSlot: (key: SlotKey, id: ExerciseId) => void;
  handleStart: () => Promise<void>;
  footerLocked: boolean;
  showShuffle: boolean;
  hasOverrides: boolean;
  resetOverrides: () => void;
};

export function useDeckComposer(input: ComposerMode): DeckComposerState {
  const overrides = useGameStore((s) => s.overrides);
  const setOverride = useGameStore((s) => s.setOverride);
  const storeResetOverrides = useGameStore((s) => s.resetOverrides);
  const start = useGameStore((s) => s.start);
  const [showShuffle, setShowShuffle] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    storeResetOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const config = input.mode === 'guided' ? input.config : DEFAULT_CONFIG;

  const slots: ComposerSlot[] =
    input.mode === 'guided'
      ? (buildPlan({ config, overrides }) as ComposerSlot[])
      : buildManualSlots().map((key) => ({
          key,
          selected: overrides[key] as ExerciseId | undefined,
          options: [] as PlanSlot['options'],
          defaultExercise: undefined,
        }));

  const isReady =
    input.mode === 'guided' ? true : slots.every((s) => s.selected !== undefined);

  const hasOverrides = input.mode === 'guided' && Object.keys(overrides).length > 0;

  const setSlot = (key: SlotKey, id: ExerciseId) => {
    setOverride(key, id);
  };

  const handleStart = async () => {
    if (showShuffle || isStarting) return;
    setIsStarting(true);
    if (input.mode === 'guided') {
      try {
        await saveLastConfig(config);
      } catch {
        // non-blocking
      }
    }
    start(config);
    setShowShuffle(true);
  };

  return {
    slots,
    isReady,
    setSlot,
    handleStart,
    footerLocked: showShuffle || isStarting,
    showShuffle,
    hasOverrides,
    resetOverrides: storeResetOverrides,
  };
}
