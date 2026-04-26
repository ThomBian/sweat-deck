import type { Card } from './card';
import type { SetupConfig } from './config';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';
import type { MovementId, FaceChallengeId } from './mappings';

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

type ResolveArgs = { card: Card; config: SetupConfig };

export const resolve = ({ card, config }: ResolveArgs): Exercise => {
  if (card.type === 'ace') return { id: 'water-break', durationSec: 60 };

  if (card.type === 'number') {
    const movement = NUMBER_MOVEMENTS[config.theme][card.suit][config.equipment];
    return { id: movement.id, reps: card.value };
  }

  if (card.type === 'face') {
    const src = config.cardio
      ? FACE_CHALLENGES_CARDIO[card.rank]
      : FACE_CHALLENGES[card.rank][config.equipment];
    return { ...src };
  }

  return { id: 'max-effort-leg-burnout' };
};
