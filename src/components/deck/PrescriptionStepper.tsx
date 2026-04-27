import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatMSS } from '@/lib/formatTime';
import { useLongPress } from '@/hooks/useLongPress';
import { DURATION, EASE_OUT } from '@/lib/motion';

export type PrescriptionType = 'reps' | 'durationSec' | 'distanceM';

const STEP: Record<PrescriptionType, number> = { reps: 1, durationSec: 5, distanceM: 10 };
const FLOOR: Record<PrescriptionType, number> = { reps: 1, durationSec: 5, distanceM: 10 };

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
  const step = STEP[type];
  const floor = FLOOR[type];
  const atFloor = value - step < floor;

  const decrement = () => {
    if (value - step >= floor) onChange(value - step);
  };
  const increment = () => onChange(value + step);

  const decrementHandlers = useLongPress({ onPress: decrement, onHold: decrement });
  const incrementHandlers = useLongPress({ onPress: increment, onHold: increment });

  const tapTransition = { duration: DURATION.fast, ease: EASE_OUT };

  const stepperBtn = cn(
    // 48×48 on small viewports (WCAG 2.5.5 / comfortable touch); 44×44 from md up
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

  const plusMotion = !reduceMotion
    ? {
        whileHover: { scale: 1.05, y: -2 },
        whileTap: { scale: 0.9 },
      }
    : {};

  return (
    <div className="flex items-center justify-between gap-4 md:gap-2">
      <motion.button
        type="button"
        aria-label="Decrease"
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

      <span className="min-w-[5ch] max-w-[min(100%,12rem)] flex-1 text-center text-base font-semibold tabular-nums md:text-sm">
        {formatPrescriptionLabel(value, type)}
      </span>

      <motion.button
        type="button"
        aria-label="Increase"
        className={cn(stepperBtn, 'text-foreground/70 hover:bg-muted active:bg-muted/80')}
        transition={tapTransition}
        {...plusMotion}
        {...incrementHandlers}
      >
        +
      </motion.button>
    </div>
  );
}
