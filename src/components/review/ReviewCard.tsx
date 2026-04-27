import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { tExercise } from '@/i18n/exercises';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { Button } from '@/components/ui/button';
import { ExerciseSearchSheet } from '@/components/review/ExerciseSearchSheet';
import type { FaceRank } from '@/domain/card';
import { faceFreePickPrescription } from '@/domain/exerciseDb';
import type { PlanSlot } from '@/domain/plan';
import type { ExerciseId } from '@/domain/exercise';
import type { SetupConfig } from '@/domain/config';
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

type Props = { config: SetupConfig; slot: PlanSlot; onPick: (id: ExerciseId) => void };

export function ReviewCard({ config, slot, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const hasAlts = slot.options.length > 1;

  const scrollSectionIntoView = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [reduceMotion]);

  /** Keep the active swap UI in view: search sheet opens immediately; alt list after expand. */
  useEffect(() => {
    if (!open && !searchOpen) return;

    if (searchOpen) {
      const id = requestAnimationFrame(() => scrollSectionIntoView());
      return () => cancelAnimationFrame(id);
    }

    if (open && hasAlts) {
      const ms = reduceMotion ? 0 : Math.round(DURATION.pageOut * 1000);
      const timeoutId = window.setTimeout(scrollSectionIntoView, ms);
      return () => clearTimeout(timeoutId);
    }
  }, [open, searchOpen, hasAlts, reduceMotion, scrollSectionIntoView]);

  const isOverridden = slot.selected !== slot.defaultExercise.id;
  const suitMatch = slot.key.match(/^suit:(.+)$/);
  const faceMatch = slot.key.match(/^face:(.+)$/);
  const glyph = suitMatch ? SUIT_GLYPH[suitMatch[1]!] : faceMatch?.[1] ?? '';
  const suitColor = suitMatch ? SUIT_COLOR[suitMatch[1]!] : undefined;
  const selectedOpt = (() => {
    const fromOptions = slot.options.find((o) => o.id === slot.selected);
    if (fromOptions) return fromOptions;
    const face = slot.key.match(/^face:(.+)$/);
    if (face) {
      const rank = face[1] as FaceRank;
      const d = slot.defaultExercise;
      const defaultSrc: { reps?: number; durationSec?: number; distanceM?: number } = {};
      if (d.reps !== undefined) defaultSrc.reps = d.reps;
      if (d.durationSec !== undefined) defaultSrc.durationSec = d.durationSec;
      if (d.distanceM !== undefined) defaultSrc.distanceM = d.distanceM;
      const rx = faceFreePickPrescription(slot.selected, defaultSrc, rank);
      return { id: slot.selected, ...rx } as PlanSlot['options'][number];
    }
    return { ...slot.defaultExercise, id: slot.selected } as PlanSlot['options'][number];
  })();
  const selectedName = tExercise(slot.selected as ExerciseId);
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

  const handleCardActivate = () => {
    if (hasAlts) setOpen((v) => !v);
    else setSearchOpen(true);
  };

  const cardSurface = cn(
    'relative flex min-h-14 min-w-0 w-full flex-col gap-2.5 rounded-xl border py-3 ps-4 pe-10 text-left text-base font-medium break-words outline-none',
    'transition-[border-color,background-color,color,box-shadow,transform] duration-200 ease-out',
    isOverridden
      ? 'border-primary bg-primary/15 ring-2 ring-primary/40'
      : 'border-border/50 bg-card/60',
  );

  const statusCorner = isOverridden ? (
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
    <div
      ref={sectionRef}
      className="relative flex min-w-0 w-full scroll-mt-4 flex-col gap-3 sm:scroll-mt-5"
    >
      <motion.button
        ref={toggleRef}
        type="button"
        aria-expanded={hasAlts ? open : undefined}
        aria-haspopup={hasAlts ? undefined : 'dialog'}
        {...(open && hasAlts ? { 'aria-controls': altPanelId } : {})}
        aria-label={
          hasAlts
            ? t`Swap ${selectedName}`
            : t`Search or change ${selectedName}`
        }
        onClick={handleCardActivate}
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
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full touch-manipulation text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Trans>Search all exercises</Trans>
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ExerciseSearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        slotKey={slot.key}
        config={config}
        selected={slot.selected}
        {...(slot.key.startsWith('face:')
          ? (() => {
              const d = slot.defaultExercise;
              const defaultSrc: { reps?: number; durationSec?: number; distanceM?: number } = {};
              if (d.reps !== undefined) defaultSrc.reps = d.reps;
              if (d.durationSec !== undefined) defaultSrc.durationSec = d.durationSec;
              if (d.distanceM !== undefined) defaultSrc.distanceM = d.distanceM;
              return {
                facePrescriptionCtx: { rank: slot.key.slice(5) as FaceRank, defaultSrc },
              };
            })()
          : {})}
        onPick={(id) => {
          onPick(id);
          setOpen(false);
        }}
      />
    </div>
  );
}
