import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  buildPlan,
  buildManualSlots,
  type SlotKey,
  type PlanSlot,
  type SlotOverride,
  type PlanOverrides,
} from '@/domain/plan';
import { DEFAULT_CONFIG, type SetupConfig } from '@/domain/config';
import type { ExerciseId } from '@/domain/exercise';
import { saveLastConfig } from '@/store/db';
import { overridesEqual } from '@/lib/planDiff';

export type ComposerMode =
  | { mode: 'guided'; config: SetupConfig; initialOverrides?: PlanOverrides }
  | { mode: 'manual'; initialOverrides?: PlanOverrides };

export type ComposerSlot = {
  key: SlotKey;
  selected: ExerciseId | undefined;
  options: PlanSlot['options'];
  defaultExercise: PlanSlot['defaultExercise'] | undefined;
  prescriptionOverride?: PlanSlot['prescriptionOverride'];
  baselineOverride?: SlotOverride;
};

function prescriptionFromOverride(ov: SlotOverride | undefined): PlanSlot['prescriptionOverride'] {
  if (!ov) return undefined;
  if (ov.reps === undefined && ov.durationSec === undefined && ov.distanceM === undefined) return undefined;
  return {
    ...(ov.reps !== undefined && { reps: ov.reps }),
    ...(ov.durationSec !== undefined && { durationSec: ov.durationSec }),
    ...(ov.distanceM !== undefined && { distanceM: ov.distanceM }),
  };
}

export type DeckComposerState = {
  slots: ComposerSlot[];
  isReady: boolean;
  setSlot: (key: SlotKey, id: ExerciseId) => void;
  handleStart: () => Promise<void>;
  footerLocked: boolean;
  showShuffle: boolean;
  hasUnsavedChanges: boolean;
  resetOverrides: () => void;
};

export function useDeckComposer(input: ComposerMode): DeckComposerState {
  const overrides = useGameStore((s) => s.overrides);
  const setOverride = useGameStore((s) => s.setOverride);
  const storeResetOverrides = useGameStore((s) => s.resetOverrides);
  const savedBaseline = useGameStore((s) => s.savedBaseline);
  const start = useGameStore((s) => s.start);
  const [showShuffle, setShowShuffle] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (input.initialOverrides && Object.keys(input.initialOverrides).length > 0) {
      storeResetOverrides();
      for (const [key, ov] of Object.entries(input.initialOverrides)) {
        if (ov) setOverride(key as SlotKey, ov);
      }
    } else {
      storeResetOverrides();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const config = input.mode === 'guided' ? input.config : DEFAULT_CONFIG;

  const hasUnsavedChanges =
    input.mode === 'guided' &&
    (savedBaseline
      ? !overridesEqual(overrides, savedBaseline.overrides)
      : Object.keys(overrides).length > 0);

  const baseSlots: ComposerSlot[] =
    input.mode === 'guided'
      ? buildPlan({ config, overrides }).map((s) => ({
          key: s.key,
          selected: s.selected,
          options: s.options,
          defaultExercise: s.defaultExercise,
          prescriptionOverride: s.prescriptionOverride,
        }))
      : buildManualSlots().map((key) => {
          const ov = overrides[key];
          return {
            key,
            selected: ov?.id,
            options: [] as PlanSlot['options'],
            defaultExercise: undefined,
            prescriptionOverride: prescriptionFromOverride(ov),
          };
        });

  const slots: ComposerSlot[] = baseSlots.map((s) =>
    savedBaseline?.overrides[s.key]
      ? { ...s, baselineOverride: savedBaseline.overrides[s.key] }
      : s,
  );

  const isReady =
    input.mode === 'guided' ? true : slots.every((s) => s.selected !== undefined);

  const setSlot = (key: SlotKey, id: ExerciseId) => {
    setOverride(key, { id });
  };

  const resetOverrides = () => {
    if (savedBaseline) {
      storeResetOverrides();
      for (const [key, ov] of Object.entries(savedBaseline.overrides)) {
        if (ov) setOverride(key as SlotKey, ov);
      }
    } else {
      storeResetOverrides();
    }
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
    hasUnsavedChanges,
    resetOverrides,
  };
}
