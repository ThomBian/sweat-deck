import { type Card, type NumberCard, type NumberValue, SUITS, NUMBER_VALUES, FACE_RANKS } from './card';
import { type Difficulty, NUMBER_DIST } from './difficulty';
import { type Rng, sampleNormal, sampleInt } from '@/lib/rng';

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

type DrawArgs = { remaining: Card[]; difficulty: Difficulty; rng: Rng };
type DrawResult = { card: Card; remaining: Card[] };

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
  for (let attempt = 0; attempt < 16; attempt++) {
    const raw = sampleNormal({ rng, mean, sigma, min: 2, max: 10 });
    const rounded = Math.round(raw) as NumberValue;
    if (available.has(rounded)) return rounded;
  }
  return numbers[sampleInt({ rng, min: 0, max: numbers.length - 1 })]!.value;
};

const removeAt = <T>(arr: readonly T[], idx: number): T[] => {
  const next = arr.slice();
  next.splice(idx, 1);
  return next;
};
