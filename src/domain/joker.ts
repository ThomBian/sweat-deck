import type { Card, Suit } from './card';
import type { Exercise } from './exercise';
import { type Rng, sampleInt } from '@/lib/rng';

export type JokerEffectKind = 'combo-breaker' | 'double-up' | 'sudden-death';

export type JokerEffect = {
  kind: JokerEffectKind;
  exercise: Exercise;
};

export const COMBO_BREAKER_EXERCISE: Exercise = {
  name: 'Max-Effort Leg Burnout',
  durationSec: 120,
};

const SUDDEN_DEATH_OPTIONS: Exercise[] = [
  { name: '50 Burpees', reps: 50 },
  { name: '100m Sprint', distanceM: 100 },
  { name: '500m SkiErg Sprint', distanceM: 500 },
];

const UPPER_SUITS: ReadonlySet<Suit> = new Set(['hearts', 'diamonds']);

type PickArgs = { history: Card[]; rng: Rng };

export const pickJokerEffect = ({ history, rng }: PickArgs): JokerEffect => {
  if (isAllUpperBody(history.slice(-3))) {
    return { kind: 'combo-breaker', exercise: COMBO_BREAKER_EXERCISE };
  }

  const kinds: JokerEffectKind[] = ['combo-breaker', 'double-up', 'sudden-death'];
  const kind = kinds[sampleInt({ rng, min: 0, max: kinds.length - 1 })]!;

  if (kind === 'sudden-death') {
    const ex = SUDDEN_DEATH_OPTIONS[sampleInt({ rng, min: 0, max: SUDDEN_DEATH_OPTIONS.length - 1 })]!;
    return { kind, exercise: ex };
  }
  if (kind === 'double-up') {
    return { kind, exercise: { name: 'Combine the last 2 exercises — 10 reps each' } };
  }
  return { kind, exercise: COMBO_BREAKER_EXERCISE };
};

const isAllUpperBody = (cards: Card[]): boolean => {
  if (cards.length < 3) return false;
  return cards.every((c) => c.type === 'number' && UPPER_SUITS.has(c.suit));
};
