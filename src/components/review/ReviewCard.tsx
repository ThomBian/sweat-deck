import { useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { tExercise } from '@/i18n/exercises';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import type { PlanSlot } from '@/domain/plan';
import type { ExerciseId } from '@/domain/exercise';
import { DURATION, EASE_OUT } from '@/lib/motion';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};
const SUIT_COLOR: Record<string, string> = {
  hearts: 'text-suit-hearts',
  diamonds: 'text-suit-diamonds',
  clubs: 'text-suit-clubs',
  spades: 'text-suit-spades',
};

function prescriptionLabel(opt: PlanSlot['options'][number]): string {
  if (opt.reps === 0) return t`×N reps`;
  if (opt.reps != null) return t`×${opt.reps} reps`;
  if (opt.durationSec != null) return t`${opt.durationSec}s`;
  if (opt.distanceM != null) return t`${opt.distanceM}m`;
  return '';
}

type Props = { slot: PlanSlot; onPick: (id: ExerciseId) => void };

export function ReviewCard({ slot, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const isOverridden = slot.selected !== slot.defaultExercise.id;
  const suitMatch = slot.key.match(/^suit:(.+)$/);
  const faceMatch = slot.key.match(/^face:(.+)$/);
  const glyph = suitMatch ? SUIT_GLYPH[suitMatch[1]!] : faceMatch?.[1] ?? '';
  const suitColor = suitMatch ? SUIT_COLOR[suitMatch[1]!] : undefined;
  const hasAlts = slot.options.length > 1;
  const selectedOpt = slot.options.find((o) => o.id === slot.selected) ?? slot.defaultExercise;

  const handlePick = (id: ExerciseId) => {
    onPick(id);
    setOpen(false);
  };

  return (
    <div className="relative flex flex-col gap-2">
      <button
        type="button"
        disabled={!hasAlts}
        aria-expanded={open}
        aria-label={hasAlts ? t`Swap ${tExercise(slot.selected as ExerciseId)}` : undefined}
        onClick={() => hasAlts && setOpen((v) => !v)}
        className={cn(
          'relative flex flex-col gap-1.5 rounded-2xl border p-3 text-left transition-[border-color,box-shadow] duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          isOverridden
            ? 'border-primary ring-2 ring-primary/40'
            : 'border-border/50 bg-card/60',
          !hasAlts && 'cursor-default opacity-70',
        )}
      >
        <span className={cn('font-display text-xl font-bold', suitColor)}>{glyph}</span>
        <span className="text-sm font-semibold leading-snug break-words">
          {tExercise(slot.selected as ExerciseId)}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {prescriptionLabel(selectedOpt)}
        </span>
        {isOverridden && (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" aria-hidden />
        )}
        {!hasAlts && (
          <span className="mt-0.5 text-xs text-muted-foreground/70">
            <Trans>No alternatives</Trans>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="radiogroup"
            aria-label={t`Alternative exercises for this slot`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : DURATION.pageOut, ease: EASE_OUT }}
            className="flex flex-col gap-1.5 overflow-hidden"
          >
            {slot.options.map((opt) => (
              <SetupOptionButton
                key={opt.id}
                selected={opt.id === slot.selected}
                aria-pressed={opt.id === slot.selected}
                onClick={() => handlePick(opt.id as ExerciseId)}
              >
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{tExercise(opt.id as ExerciseId)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {prescriptionLabel(opt)}
                  </span>
                </span>
              </SetupOptionButton>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
