import type { FaceRank, Suit } from './card';
import type { SetupConfig } from './config';
import type { ExerciseId } from './exercise';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';
import type { MovementId } from './mappings';

export type SlotKey = `suit:${Suit}` | `face:${FaceRank}`;

export type SlotOverride = {
  id?: ExerciseId;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};

export type PlanOverrides = Partial<Record<SlotKey, SlotOverride>>;

export type PlanSlot = {
  key: SlotKey;
  defaultExercise: { id: ExerciseId; reps?: number; durationSec?: number; distanceM?: number };
  options: Array<{ id: ExerciseId; reps?: number; durationSec?: number; distanceM?: number }>;
  selected: ExerciseId;
  prescriptionOverride?: { reps?: number; durationSec?: number; distanceM?: number };
};

const SUIT_ORDER: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const FACE_ORDER: FaceRank[] = ['J', 'Q', 'K'];

export const buildPlan = ({
  config,
  overrides,
}: {
  config: SetupConfig;
  overrides: PlanOverrides;
}): PlanSlot[] => {
  const numberSlots: PlanSlot[] = SUIT_ORDER.map((suit) => {
    const key: SlotKey = `suit:${suit}`;
    const entry = NUMBER_MOVEMENTS[config.theme][suit][config.equipment];
    const defaultExercise = { id: entry.id as ExerciseId, reps: 0 };
    const options: PlanSlot['options'] = [
      defaultExercise,
      ...(entry.alts ?? []).map((id: MovementId) => ({ id: id as ExerciseId, reps: 0 })),
    ];
    const override = overrides[key];
    const selected: ExerciseId = override?.id ?? defaultExercise.id;
    return { key, defaultExercise, options, selected };
  });

  const faceSlots: PlanSlot[] = FACE_ORDER.map((rank) => {
    const key: SlotKey = `face:${rank}`;
    const entry = config.cardio
      ? FACE_CHALLENGES_CARDIO[rank]
      : FACE_CHALLENGES[rank][config.equipment];
    const { alts: _alts, ...rest } = entry as typeof entry & { alts?: unknown };
    const defaultExercise = { ...rest, id: entry.id as ExerciseId };
    const options: PlanSlot['options'] = [
      defaultExercise,
      ...((entry.alts ?? []) as Array<{ id: string; reps?: number; durationSec?: number; distanceM?: number }>).map(
        (a) => ({ ...a, id: a.id as ExerciseId }),
      ),
    ];
    const override = overrides[key];
    const selected: ExerciseId = override?.id ?? defaultExercise.id;
    const prescriptionOverride =
      override &&
      (override.reps !== undefined || override.durationSec !== undefined || override.distanceM !== undefined)
        ? {
            ...(override.reps !== undefined && { reps: override.reps }),
            ...(override.durationSec !== undefined && { durationSec: override.durationSec }),
            ...(override.distanceM !== undefined && { distanceM: override.distanceM }),
          }
        : undefined;
    return {
      key,
      defaultExercise,
      options,
      selected,
      ...(prescriptionOverride !== undefined ? { prescriptionOverride } : {}),
    };
  });

  return [...numberSlots, ...faceSlots];
};

export const MANUAL_SLOT_KEYS: readonly SlotKey[] = [
  'suit:hearts',
  'suit:diamonds',
  'suit:clubs',
  'suit:spades',
  'face:J',
  'face:Q',
  'face:K',
];

export const buildManualSlots = (): readonly SlotKey[] => MANUAL_SLOT_KEYS;
