import { useEffect, useRef, useState } from 'react';
import { t } from '@lingui/core/macro';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tExercise } from '@/i18n/exercises';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import type { PlanSlot } from '@/domain/plan';
import type { ExerciseId } from '@/domain/exercise';
import { formatMSS } from '@/lib/formatTime';
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
  if (opt.durationSec != null) return formatMSS(opt.durationSec);
  if (opt.distanceM != null) return t`${opt.distanceM}m`;
  return '';
}

type Props = { slot: PlanSlot; onPick: (id: ExerciseId) => void };

export function ReviewCard({ slot, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);

  const isOverridden = slot.selected !== slot.defaultExercise.id;
  const suitMatch = slot.key.match(/^suit:(.+)$/);
  const faceMatch = slot.key.match(/^face:(.+)$/);
  const glyph = suitMatch ? SUIT_GLYPH[suitMatch[1]!] : faceMatch?.[1] ?? '';
  const suitColor = suitMatch ? SUIT_COLOR[suitMatch[1]!] : undefined;
  const hasAlts = slot.options.length > 1;
  const selectedOpt = slot.options.find((o) => o.id === slot.selected) ?? slot.defaultExercise;
  const selectedName = tExercise(slot.selected as ExerciseId);
  const lockedLabel = t`${selectedName} — no alternatives to swap`;
  const altPanelId = `review-alts-${slot.key.replaceAll(':', '-')}`;
  const rxLabel = prescriptionLabel(selectedOpt);

  useEffect(() => {
    if (!hasAlts || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      queueMicrotask(() => toggleRef.current?.focus());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasAlts, open]);

  const handlePick = (id: ExerciseId) => {
    onPick(id);
    setOpen(false);
  };

  const cardSurface = cn(
    /* pe-10: keep titles/pills clear of corner status (lock / override dot) */
    'relative flex min-h-14 min-w-0 w-full flex-col gap-2.5 rounded-xl border py-3 ps-4 pe-10 text-left text-base font-medium break-words outline-none',
    'transition-[border-color,background-color,color,box-shadow,transform] duration-200 ease-out',
    isOverridden
      ? 'border-primary bg-primary/15 ring-2 ring-primary/40'
      : 'border-border/50 bg-card/60',
  );

  const statusCorner = !hasAlts ? (
    <span
      className="pointer-events-none absolute end-3 top-3 flex size-7 items-center justify-center rounded-md border border-border/40 bg-background/30 text-muted-foreground"
      aria-hidden
    >
      <Lock className="size-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
    </span>
  ) : isOverridden ? (
    <span className="absolute end-3 top-3 size-2 rounded-full bg-primary" aria-hidden />
  ) : null;

  const cardMain = (
    <>
      <span className={cn('font-display text-xl font-bold leading-none', suitColor)}>{glyph}</span>
      <span className="min-w-0 text-sm font-semibold leading-snug break-words">{selectedName}</span>
      {rxLabel ? (
        <span className="inline-block max-w-full rounded-full bg-muted px-2 py-0.5 text-xs font-medium break-words text-muted-foreground/90">
          {rxLabel}
        </span>
      ) : null}
      {statusCorner}
    </>
  );

  return (
    <div className="relative flex min-w-0 w-full flex-col gap-3">
      {hasAlts ? (
        <motion.button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          {...(open ? { 'aria-controls': altPanelId } : {})}
          aria-label={t`Swap ${selectedName}`}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            cardSurface,
            'touch-manipulation focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
            !isOverridden ? 'hover:bg-card/90' : 'hover:bg-primary/20',
          )}
          {...(!reduceMotion
            ? {
                whileHover: { y: -2 },
                whileTap: { scale: 0.985 },
              }
            : {})}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
        >
          {cardMain}
        </motion.button>
      ) : (
        <div role="group" aria-label={lockedLabel} className={cn(cardSurface, 'cursor-default')}>
          {cardMain}
        </div>
      )}

      <AnimatePresence>
        {open && hasAlts ? (
          <motion.div
            id={altPanelId}
            role="radiogroup"
            aria-label={t`Alternative exercises for this slot`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : DURATION.pageOut, ease: EASE_OUT }}
            className="flex flex-col gap-3 overflow-hidden"
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
                  <span className="min-w-0 max-w-[45%] shrink truncate text-right text-xs text-muted-foreground">
                    {prescriptionLabel(opt)}
                  </span>
                </span>
              </SetupOptionButton>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
