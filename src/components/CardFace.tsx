import type { Card } from '@/domain/card';
import { cn } from '@/lib/cn';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLOR: Record<string, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-deck-fg',
  spades: 'text-deck-fg',
};

type Props = { card: Card | null; faceDown?: boolean };

export const CardFace = ({ card, faceDown = false }: Props) => {
  if (faceDown || !card) {
    return (
      <div className="flex h-48 w-32 items-center justify-center rounded-2xl bg-deck-accent shadow-xl">
        <div className="h-40 w-24 rounded-xl border-2 border-white/40" />
      </div>
    );
  }

  const label = labelFor(card);
  const suit = card.type === 'joker' ? null : card.suit;
  const color = suit ? SUIT_COLOR[suit] : 'text-deck-fg';

  return (
    <div
      className={cn(
        'text-deck-bg flex h-48 w-32 flex-col justify-between rounded-2xl bg-white p-3 shadow-xl',
        color
      )}
    >
      <span className="text-2xl font-bold">{label}</span>
      {suit && <span className="self-center text-5xl">{SUIT_GLYPH[suit]}</span>}
      <span className="self-end rotate-180 text-2xl font-bold">{label}</span>
    </div>
  );
};

const labelFor = (card: Card): string => {
  if (card.type === 'number') return String(card.value);
  if (card.type === 'face') return card.rank;
  if (card.type === 'ace') return 'A';
  return '★';
};
