import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { tExercise } from '@/i18n/exercises';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { Button } from '@/components/ui/button';
import { ExercisePickerSheet } from '@/components/deck/ExercisePickerSheet';
import { PrescriptionStepper } from '@/components/deck/PrescriptionStepper';
import type { PrescriptionType } from '@/components/deck/PrescriptionStepper';
import type { FaceRank } from '@/domain/card';
import { faceFreePickPrescription } from '@/domain/exerciseDb';
import type { PlanSlot, SlotOverride } from '@/domain/plan';
import type { ExerciseId } from '@/domain/exercise';
import type { SetupConfig } from '@/domain/config';
import type { ComposerSlot } from '@/hooks/useDeckComposer';
import { formatMSS } from '@/lib/formatTime';
import { slotHeaderParts } from '@/lib/reviewSlotContext';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { slotOverrideEqual } from '@/lib/planDiff';

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

/** Shown on the main slot button only. Omits the reps placeholder (`reps: 0`) so suit/number cards match face cards: either a real dose or no pill — never generic “×N reps” on the card. */
function compactCardPrescriptionLabel(opt: PlanSlot['options'][number]): string {
  if (opt.reps === 0) return '';
  if (opt.reps != null) return t`×${opt.reps} reps`;
  if (opt.durationSec != null) return formatMSS(opt.durationSec);
  if (opt.distanceM != null) return t`${opt.distanceM}m`;
  return '';
}

function getPrescriptionType(opt: PlanSlot['options'][number]): PrescriptionType | null {
  if (opt.reps != null && opt.reps !== 0) return 'reps';
  if (opt.durationSec != null) return 'durationSec';
  if (opt.distanceM != null) return 'distanceM';
  return null;
}

type Props = {
  config: SetupConfig;
  slot: ComposerSlot;
  onPick: (id: ExerciseId) => void;
  onPrescriptionChange?: (field: PrescriptionType, value: number) => void;
};

export function DeckSlotCard({ config, slot, onPick, onPrescriptionChange }: Props) {
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

  const isEmpty = slot.selected === undefined;

  const currentOverrideForCompare = (() => {
    const ov: SlotOverride = {};
    if (slot.selected !== undefined) ov.id = slot.selected;
    const rx = slot.prescriptionOverride;
    if (rx?.reps !== undefined) ov.reps = rx.reps;
    if (rx?.durationSec !== undefined) ov.durationSec = rx.durationSec;
    if (rx?.distanceM !== undefined) ov.distanceM = rx.distanceM;
    return ov;
  })();

  const isOverridden = (() => {
    if (isEmpty) return false;
    if (slot.baselineOverride) {
      return !slotOverrideEqual(currentOverrideForCompare, slot.baselineOverride);
    }
    const swappedFromDefault =
      slot.defaultExercise !== undefined && slot.selected !== slot.defaultExercise.id;
    const rxCustom = slot.prescriptionOverride != null;
    return swappedFromDefault || rxCustom;
  })();

  const isFaceSlot = slot.key.startsWith('face:');

  const suitMatch = slot.key.match(/^suit:(.+)$/);
  const faceMatch = slot.key.match(/^face:(.+)$/);
  const glyph = suitMatch ? SUIT_GLYPH[suitMatch[1]!] : faceMatch?.[1] ?? '';
  const suitColor = suitMatch ? SUIT_COLOR[suitMatch[1]!] : undefined;

  const selectedOpt = (() => {
    if (!slot.selected) return undefined;
    const fromOptions = slot.options.find((o) => o.id === slot.selected);
    if (fromOptions) return fromOptions;
    const face = slot.key.match(/^face:(.+)$/);
    if (face) {
      const rank = face[1] as FaceRank;
      const d = slot.defaultExercise;
      const defaultSrc: { reps?: number; durationSec?: number; distanceM?: number } = {};
      if (d?.reps !== undefined) defaultSrc.reps = d.reps;
      if (d?.durationSec !== undefined) defaultSrc.durationSec = d.durationSec;
      if (d?.distanceM !== undefined) defaultSrc.distanceM = d.distanceM;
      const rx = faceFreePickPrescription(slot.selected, defaultSrc, rank);
      return { id: slot.selected, ...rx } as PlanSlot['options'][number];
    }
    return slot.defaultExercise
      ? ({ ...slot.defaultExercise, id: slot.selected } as PlanSlot['options'][number])
      : undefined;
  })();

  const prescriptionType =
    isFaceSlot && !isEmpty && selectedOpt ? getPrescriptionType(selectedOpt) : null;
  const prescriptionValue =
    prescriptionType && selectedOpt
      ? (slot.prescriptionOverride?.[prescriptionType] ?? selectedOpt[prescriptionType] ?? 1)
      : 0;

  const selectedName = slot.selected ? tExercise(slot.selected) : t`Assign exercise`;
  const slotParts = slotHeaderParts(slot.key);
  const swapContextHeadingId = `review-swap-h-${slot.key.replaceAll(':', '-')}`;
  const altPanelId = `review-alts-${slot.key.replaceAll(':', '-')}`;
  const rxLabel = selectedOpt ? compactCardPrescriptionLabel(selectedOpt) : '';

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
    isEmpty
      ? 'border-dashed border-border/50 bg-muted/20 text-muted-foreground'
      : isOverridden
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

  const cardBody =
    isFaceSlot && prescriptionType && !isEmpty ? (
      <div className={cn(cardSurface, 'gap-3 pb-4')}>
        {statusCorner}
        <motion.button
          ref={toggleRef}
          type="button"
          aria-expanded={hasAlts ? open : undefined}
          aria-haspopup={hasAlts ? undefined : 'dialog'}
          {...(open && hasAlts ? { 'aria-controls': altPanelId } : {})}
          aria-label={hasAlts ? t`Swap ${selectedName}` : t`Search or change ${selectedName}`}
          onClick={handleCardActivate}
          className={cn(
            'flex min-w-0 items-start gap-2.5 rounded-sm text-left touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            !isOverridden ? 'hover:opacity-80' : 'hover:opacity-90',
          )}
          {...(!reduceMotion ? { whileTap: { scale: 0.985 } } : {})}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
        >
          <span className="font-display text-xl font-bold leading-none">{glyph}</span>
          <span className="min-w-0 text-sm font-semibold leading-snug break-words">{selectedName}</span>
        </motion.button>
        <div className="mt-0.5 border-t border-border/30 pt-3">
          <PrescriptionStepper
            value={prescriptionValue}
            type={prescriptionType}
            onChange={(v) => onPrescriptionChange?.(prescriptionType, v)}
          />
        </div>
      </div>
    ) : (
      <motion.button
        ref={toggleRef}
        type="button"
        aria-expanded={hasAlts ? open : undefined}
        aria-haspopup={hasAlts ? undefined : 'dialog'}
        {...(open && hasAlts ? { 'aria-controls': altPanelId } : {})}
        aria-label={hasAlts ? t`Swap ${selectedName}` : t`Search or change ${selectedName}`}
        onClick={handleCardActivate}
        className={cn(
          cardSurface,
          'touch-manipulation focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          !isOverridden
            ? isEmpty
              ? 'hover:border-border/60 hover:bg-muted/35'
              : 'hover:bg-card/90'
            : 'hover:bg-primary/20',
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
    );

  return (
    <div
      ref={sectionRef}
      className="relative flex min-w-0 w-full scroll-mt-4 flex-col gap-3 sm:scroll-mt-5 sm:gap-4"
    >
      {cardBody}

      <AnimatePresence>
        {open && hasAlts ? (
          <motion.div
            id={altPanelId}
            role="radiogroup"
            aria-labelledby={swapContextHeadingId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduceMotion ? 0.05 : DURATION.pageOut, ease: EASE_OUT }}
            className="flex flex-col gap-3 overflow-hidden"
          >
            <div className="flex flex-col gap-1.5">
              <h3
                id={swapContextHeadingId}
                className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                <Trans>Choose an alternative</Trans>
              </h3>
              <p className="text-sm text-foreground/90 [overflow-wrap:anywhere]">
                <span className={cn('font-display text-lg font-bold leading-none', suitColor)}>
                  {slotParts.glyph}
                </span>
                <span className="text-muted-foreground"> · </span>
                <span>{slotParts.family}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="font-medium">{selectedName}</span>
              </p>
            </div>
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

      <ExercisePickerSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        slotKey={slot.key}
        config={config}
        {...(slot.selected !== undefined ? { selected: slot.selected } : {})}
        {...(slot.key.startsWith('face:')
          ? (() => {
              const d = slot.defaultExercise;
              const defaultSrc: { reps?: number; durationSec?: number; distanceM?: number } = {};
              if (d?.reps !== undefined) defaultSrc.reps = d.reps;
              if (d?.durationSec !== undefined) defaultSrc.durationSec = d.durationSec;
              if (d?.distanceM !== undefined) defaultSrc.distanceM = d.distanceM;
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
