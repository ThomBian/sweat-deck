import type { Card } from './card';
import type { SetupConfig } from './config';
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
    const validIds: ExerciseId[] = [movement.id, ...(movement.alts ?? [])];
    const ov = overrides?.[`suit:${card.suit}`];
    const id = ov && (validIds as string[]).includes(ov) ? (ov as ExerciseId) : movement.id;
    return { id, reps: card.value };
  }

  if (card.type === 'face') {
    const src = config.cardio ? FACE_CHALLENGES_CARDIO[card.rank] : FACE_CHALLENGES[card.rank][config.equipment];
    const { alts: _alts, ...srcRest } = src as typeof src & { alts?: unknown };
    const ov = overrides?.[`face:${card.rank}`];
    if (ov) {
      const altEntry = (src.alts ?? []).find((a) => a.id === ov);
      if (altEntry) {
        const { id, reps, durationSec, distanceM } = altEntry;
        return { id: id as ExerciseId, reps, durationSec, distanceM };
      }
    }
    return { ...srcRest, id: src.id as ExerciseId };
  }

  return { id: 'max-effort-leg-burnout' };
};
