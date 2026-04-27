import type { Card } from '@/domain/card';
import { cn } from '@/lib/utils';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_TEXT: Record<string, string> = {
  hearts: 'text-suit-hearts',
  diamonds: 'text-suit-diamonds',
  clubs: 'text-suit-clubs',
  spades: 'text-suit-spades',
};

type Props = { card: Card | null; faceDown?: boolean; className?: string };

export const CardFace = ({ card, faceDown = false, className }: Props) => {
  if (faceDown || !card) {
    return (
      <div
        className={cn(
          'font-display flex h-48 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-deck-accent to-deck-accent-deep shadow-xl ring-1 ring-white/15',
          className,
        )}
      >
        <div className="h-40 w-24 rounded-xl border-2 border-white/35" />
      </div>
    );
  }

  const label = labelFor(card);
  const suit = card.type === 'joker' ? null : card.suit;
  const colorClass = suit ? SUIT_TEXT[suit] : 'text-deck-wild';

  return (
    <div
      className={cn(
        'font-display flex h-48 w-32 flex-col justify-between rounded-2xl bg-deck-card p-3 shadow-xl ring-1 ring-border/50',
        colorClass,
        className,
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
