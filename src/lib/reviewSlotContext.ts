import { t } from '@lingui/core/macro';
import type { SlotKey } from '@/domain/plan';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_FAMILY: Record<string, string> = {
  hearts: 'Push',
  diamonds: 'Pull',
  clubs: 'Legs',
  spades: 'Posterior',
};

/** Suit / face label used next to the glyph in review + search (matches deck slot). */
export function slotHeaderParts(slotKey: SlotKey): { glyph: string; family: string } {
  const m = slotKey.match(/^suit:(.+)$/);
  if (m) {
    const suit = m[1]!;
    return { glyph: SUIT_GLYPH[suit] ?? '', family: SUIT_FAMILY[suit] ?? suit };
  }
  const fm = slotKey.match(/^face:(.+)$/);
  if (fm) return { glyph: fm[1]!, family: t`Challenge` };
  return { glyph: '', family: '' };
}
