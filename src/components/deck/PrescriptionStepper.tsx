import { useId, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { cn } from '@/lib/utils';
import { formatMSS } from '@/lib/formatTime';
import { useLongPress } from '@/hooks/useLongPress';
import { DURATION, EASE_OUT } from '@/lib/motion';

export type PrescriptionType = 'reps' | 'durationSec' | 'distanceM';

const STEP: Record<PrescriptionType, number> = { reps: 1, durationSec: 5, distanceM: 10 };
const FLOOR: Record<PrescriptionType, number> = { reps: 1, durationSec: 5, distanceM: 10 };

/** Upper bounds keep UI, storage, and workouts within sensible ranges. */
const CEILING: Record<PrescriptionType, number> = {
  reps: 500,
  durationSec: 3600,
  distanceM: 10000,
};

/** Snap to valid step ladder; non-finite values fall back to floor. */
export function alignToPrescriptionStep(value: unknown, type: PrescriptionType): number {
  const floor = FLOOR[type];
  const step = STEP[type];
  const max = CEILING[type];
  const n = typeof value === 'number' && Number.isFinite(value) ? value : floor;
  const clamped = Math.min(max, Math.max(floor, Math.trunc(n)));
  const stepsFromFloor = Math.round((clamped - floor) / step);
  const aligned = floor + stepsFromFloor * step;
  return Math.min(max, Math.max(floor, aligned));
}

export function formatPrescriptionLabel(value: number, type: PrescriptionType): string {
  if (type === 'reps') return `×${value} reps`;
  if (type === 'durationSec') return formatMSS(value);
  return `${value}m`;
}

type Props = {
  value: number;
  type: PrescriptionType;
  onChange: (value: number) => void;
};

export function PrescriptionStepper({ value, type, onChange }: Props) {
  const reduceMotion = useReducedMotion();
  const groupId = useId();
  const valueId = `${groupId}-value`;

  const aligned = useMemo(() => alignToPrescriptionStep(value, type), [value, type]);

  const step = STEP[type];
  const floor = FLOOR[type];
  const max = CEILING[type];
  const atFloor = aligned <= floor;
  const atCeiling = aligned >= max;

  const decrement = () => {
    const next = aligned - step;
    if (next >= floor) onChange(next);
  };
  const increment = () => {
    const next = aligned + step;
    if (next <= max) onChange(next);
  };

  const decrementHandlers = useLongPress({ onPress: decrement, onHold: decrement });
  const incrementHandlers = useLongPress({ onPress: increment, onHold: increment });

  const tapTransition = { duration: DURATION.fast, ease: EASE_OUT };

  const stepperBtn = cn(
    'flex size-12 shrink-0 items-center justify-center rounded-xl text-xl font-semibold md:size-11 md:text-lg',
    'touch-manipulation select-none transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  );

  const minusMotion =
    !reduceMotion && !atFloor
      ? {
          whileHover: { scale: 1.05, y: -2 },
          whileTap: { scale: 0.9 },
        }
      : {};

  const plusMotion =
    !reduceMotion && !atCeiling
      ? {
          whileHover: { scale: 1.05, y: -2 },
          whileTap: { scale: 0.9 },
        }
      : {};

  const labelText =
    type === 'reps'
      ? t`×${aligned} reps`
      : type === 'durationSec'
        ? formatMSS(aligned)
        : t`${aligned}m`;

  return (
    <div
      role="group"
      className="flex min-w-0 items-stretch justify-between gap-3 sm:gap-3 md:gap-2.5"
      aria-labelledby={valueId}
    >
      <motion.button
        type="button"
        aria-label={t`Decrease`}
        aria-controls={valueId}
        disabled={atFloor}
        className={cn(
          stepperBtn,
          atFloor
            ? 'cursor-not-allowed text-muted-foreground/30'
            : 'text-foreground/70 hover:bg-muted active:bg-muted/80',
        )}
        transition={tapTransition}
        {...minusMotion}
        {...decrementHandlers}
      >
        −
      </motion.button>

      <span
        id={valueId}
        className="flex min-h-12 min-w-0 max-w-[min(100%,13rem)] flex-1 items-center justify-center self-center rounded-lg bg-muted/30 px-2 py-1.5 text-center text-base font-semibold tabular-nums [overflow-wrap:anywhere] break-words md:min-h-11 md:text-sm"
      >
        {labelText}
      </span>

      <motion.button
        type="button"
        aria-label={t`Increase`}
        aria-controls={valueId}
        disabled={atCeiling}
        className={cn(
          stepperBtn,
          atCeiling
            ? 'cursor-not-allowed text-muted-foreground/30'
            : 'text-foreground/70 hover:bg-muted active:bg-muted/80',
        )}
        transition={tapTransition}
        {...plusMotion}
        {...incrementHandlers}
      >
        +
      </motion.button>
    </div>
  );
}
