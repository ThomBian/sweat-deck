import { type Card, type NumberCard, type NumberValue, SUITS, NUMBER_VALUES, FACE_RANKS } from './card';
import { type Difficulty, NUMBER_DIST } from './difficulty';
import { type Rng, sampleNormal, sampleInt } from '@/lib/rng';

const VALUES_2_10: readonly NumberValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Values in [2,10] furthest from `mean` (ties include all furthest). Used for CONCEPT 5% tail cap. */
export const farExtremesForMean = (mean: number): NumberValue[] => {
  let maxD = -1;
  const out: NumberValue[] = [];
  for (const v of VALUES_2_10) {
    const d = Math.abs(v - mean);
    if (d > maxD) {
      maxD = d;
      out.length = 0;
      out.push(v);
    } else if (d === maxD) {
      out.push(v);
    }
  }
  return out;
};

export const build54 = (): Card[] => {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    cards.push({ type: 'ace', suit });
    for (const value of NUMBER_VALUES) cards.push({ type: 'number', suit, value });
    for (const rank of FACE_RANKS) cards.push({ type: 'face', suit, rank });
  }
  cards.push({ type: 'joker', id: 1 }, { type: 'joker', id: 2 });
  return cards;
};

/** Both jokers only — for local UI/testing. Enable via `gameStore` start when dev + `localStorage` flag (see gameStore). */
export const buildDevJokersOnly = (): Card[] => [
  { type: 'joker', id: 1 },
  { type: 'joker', id: 2 },
];

type DrawArgs = { remaining: Card[]; difficulty: Difficulty; rng: Rng };
export type DrawResult = { card: Card; remaining: Card[] };

/** Draw only from non-Ace cards; all Aces stay in the returned remaining pile. */
export const drawNonAce = ({ remaining, difficulty, rng }: DrawArgs): DrawResult | null => {
  const pool = remaining.filter((c) => c.type !== 'ace');
  if (pool.length === 0) return null;
  const { card, remaining: poolRem } = draw({ remaining: pool, difficulty, rng });
  const aces = remaining.filter((c) => c.type === 'ace');
  return { card, remaining: [...poolRem, ...aces] };
};

/** Draw only from non-Joker cards; all Jokers stay in the returned remaining pile. */
export const drawNonJoker = ({ remaining, difficulty, rng }: DrawArgs): DrawResult | null => {
  const pool = remaining.filter((c) => c.type !== 'joker');
  if (pool.length === 0) return null;
  const { card, remaining: poolRem } = draw({ remaining: pool, difficulty, rng });
  const jokers = remaining.filter((c) => c.type === 'joker');
  return { card, remaining: [...poolRem, ...jokers] };
};

export const draw = ({ remaining, difficulty, rng }: DrawArgs): DrawResult => {
  if (remaining.length === 0) throw new Error('cannot draw from empty deck');

  const numbers = remaining.filter((c): c is NumberCard => c.type === 'number');
  const others = remaining.filter((c) => c.type !== 'number');

  const drawNumber = numbers.length > 0 && rng() < numbers.length / remaining.length;

  if (drawNumber) {
    const target = pickTargetValue({ numbers, difficulty, rng });
    const idx = remaining.findIndex((c) => c.type === 'number' && c.value === target);
    return { card: remaining[idx]!, remaining: removeAt(remaining, idx) };
  }

  const idx = sampleInt({ rng, min: 0, max: others.length - 1 });
  const picked = others[idx]!;
  const realIdx = remaining.indexOf(picked);
  return { card: picked, remaining: removeAt(remaining, realIdx) };
};

type PickArgs = { numbers: NumberCard[]; difficulty: Difficulty; rng: Rng };

const pickTargetValue = ({ numbers, difficulty, rng }: PickArgs): NumberValue => {
  const { mean, sigma } = NUMBER_DIST[difficulty];
  const available = new Set(numbers.map((c) => c.value));
  const extremeSet = new Set(farExtremesForMean(mean));
  for (let attempt = 0; attempt < 40; attempt++) {
    const raw = sampleNormal({ rng, mean, sigma, min: 2, max: 10 });
    let rounded = Math.round(raw) as NumberValue;
    if (rounded < 2) rounded = 2;
    if (rounded > 10) rounded = 10;
    if (!available.has(rounded)) continue;
    if (extremeSet.has(rounded) && attempt < 39) {
      if (rng() < 0.55) continue;
    }
    return rounded;
  }
  const nonExtreme = [...available].filter((v) => !extremeSet.has(v));
  if (nonExtreme.length > 0) {
    const i = sampleInt({ rng, min: 0, max: nonExtreme.length - 1 });
    return nonExtreme[i]!;
  }
  return numbers[sampleInt({ rng, min: 0, max: numbers.length - 1 })]!.value;
};

const removeAt = <T>(arr: readonly T[], idx: number): T[] => {
  const next = arr.slice();
  next.splice(idx, 1);
  return next;
};
