import type { Card } from './card';
import type { SetupConfig } from './config';
import { faceFreePickPrescription } from './exerciseDb';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';
import type { MovementId, FaceChallengeId } from './mappings';
import type { PlanOverrides } from './plan';

export type ExerciseId = MovementId | FaceChallengeId | 'water-break' | JokerExerciseId;

export type JokerExerciseId =
  | 'max-effort-leg-burnout'
  | 'sudden-death-50-burpees'
  | 'sudden-death-100m-sprint'
  | 'sudden-death-500m-skierg'
  | 'double-up';

export type Exercise = {
  id: ExerciseId;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};

type ResolveArgs = { card: Card; config: SetupConfig; overrides?: PlanOverrides };

export const resolve = ({ card, config, overrides }: ResolveArgs): Exercise => {
  if (card.type === 'ace') return { id: 'water-break', durationSec: 60 };

  if (card.type === 'number') {
    const movement = NUMBER_MOVEMENTS[config.theme][card.suit][config.equipment];
    const ov = overrides?.[`suit:${card.suit}`];
    const id = (ov?.id !== undefined ? ov.id : movement.id) as ExerciseId;
    return { id, reps: card.value };
  }

  if (card.type === 'face') {
    const src = config.cardio ? FACE_CHALLENGES_CARDIO[card.rank] : FACE_CHALLENGES[card.rank][config.equipment];
    const { alts: _alts, ...srcRest } = src as typeof src & { alts?: unknown };
    const ov = overrides?.[`face:${card.rank}`];
    const ovId = ov?.id;

    let ex: Exercise;
    if (ovId) {
      const altEntry = (src.alts ?? []).find((a) => a.id === ovId);
      if (altEntry) {
        const { id, reps, durationSec, distanceM } = altEntry;
        ex = { id: id as ExerciseId };
        if (reps !== undefined) ex.reps = reps;
        if (durationSec !== undefined) ex.durationSec = durationSec;
        if (distanceM !== undefined) ex.distanceM = distanceM;
      } else {
        const defaultSrc: { reps?: number; durationSec?: number; distanceM?: number } = {};
        if (src.reps !== undefined) defaultSrc.reps = src.reps;
        if (src.durationSec !== undefined) defaultSrc.durationSec = src.durationSec;
        if (src.distanceM !== undefined) defaultSrc.distanceM = src.distanceM;
        const rx = faceFreePickPrescription(ovId as ExerciseId, defaultSrc, card.rank);
        ex = { id: ovId as ExerciseId };
        if (rx.reps !== undefined) ex.reps = rx.reps;
        if (rx.durationSec !== undefined) ex.durationSec = rx.durationSec;
        if (rx.distanceM !== undefined) ex.distanceM = rx.distanceM;
      }
    } else {
      ex = { ...srcRest, id: src.id as ExerciseId };
    }

    if (ov?.reps !== undefined) ex.reps = ov.reps;
    if (ov?.durationSec !== undefined) ex.durationSec = ov.durationSec;
    if (ov?.distanceM !== undefined) ex.distanceM = ov.distanceM;

    return ex;
  }

  return { id: 'max-effort-leg-burnout' };
};
