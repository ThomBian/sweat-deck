import type { Card } from './card';
import type { SetupConfig } from './config';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';

export type Exercise = {
  name: string;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};

type ResolveArgs = { card: Card; config: SetupConfig };

export const resolve = ({ card, config }: ResolveArgs): Exercise => {
  if (card.type === 'ace') return { name: 'Water Break', durationSec: 60 };

  if (card.type === 'number') {
    const movement = NUMBER_MOVEMENTS[config.theme][card.suit][config.equipment];
    return { name: movement.name, reps: card.value };
  }

  if (card.type === 'face') {
    if (config.cardio) return { ...FACE_CHALLENGES_CARDIO[card.rank] };
    return { ...FACE_CHALLENGES[card.rank][config.equipment] };
  }

  return { name: 'Joker (resolved by joker module)' };
};
