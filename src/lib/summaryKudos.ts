import { t } from '@lingui/core/macro';
import type { Difficulty } from '@/domain/difficulty';

export function tSummaryKudoFor(args: {
  difficulty: Difficulty;
  endReason: 'deck' | 'manual';
  completedDeck: boolean;
  endedInOvertime: boolean;
}): string {
  if (args.endedInOvertime) {
    return t`You went past the bell—bonus round for real.`;
  }
  if (args.endReason === 'deck' && args.completedDeck && args.difficulty === 'hell') {
    return t`You finished the deck. On Hell. That's a flex.`;
  }
  if (args.endReason === 'manual' && !args.completedDeck && args.difficulty === 'beginner') {
    return t`Start somewhere—you started today.`;
  }
  if (args.endReason === 'deck' && args.completedDeck) {
    return t`You ran the table. Deck cleared.`;
  }
  if (args.endReason === 'manual') {
    return t`Session in the books—on your own terms.`;
  }
  return t`Respect. Work logged.`;
}
