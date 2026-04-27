import { cn } from '@/lib/utils';
import { formatMSS } from '@/lib/formatTime';
import { useLongPress } from '@/hooks/useLongPress';

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
  const step = STEP[type];
  const floor = FLOOR[type];
  const atFloor = value - step < floor;

  const decrement = () => {
    if (value - step >= floor) onChange(value - step);
  };
  const increment = () => onChange(value + step);

  const decrementHandlers = useLongPress({ onPress: decrement, onHold: decrement });
  const incrementHandlers = useLongPress({ onPress: increment, onHold: increment });

  const stepperBtn = cn(
    'flex size-11 items-center justify-center rounded-lg text-lg font-semibold',
    'touch-manipulation transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Decrease"
        disabled={atFloor}
        className={cn(
          stepperBtn,
          atFloor
            ? 'cursor-not-allowed text-muted-foreground/30'
            : 'text-foreground/70 hover:bg-muted active:bg-muted/80',
        )}
        {...decrementHandlers}
      >
        −
      </button>

      <span className="min-w-[5ch] text-center text-sm font-semibold tabular-nums">
        {formatPrescriptionLabel(value, type)}
      </span>

      <button
        type="button"
        aria-label="Increase"
        className={cn(stepperBtn, 'text-foreground/70 hover:bg-muted active:bg-muted/80')}
        {...incrementHandlers}
      >
        +
      </button>
    </div>
  );
}
