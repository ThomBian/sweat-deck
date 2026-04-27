import { motion, useReducedMotion } from 'framer-motion';
import { Trans } from '@lingui/react/macro';
import { useExerciseCountdown } from '@/hooks/useExerciseCountdown';
import { cn } from '@/lib/utils';

const R = 44;
const C = 2 * Math.PI * R;

type Props = { durationSec: number; isRest?: boolean };

function formatMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Circular countdown for timed cards; tap the ring in idle to start. Completion feedback is in the hook.
 */
export function ExerciseCountdown({ durationSec, isRest = false }: Props) {
  const reduce = useReducedMotion();
  const { phase, remaining, start } = useExerciseCountdown(durationSec);
  const warm = isRest ? 'text-sky-400' : 'text-deck-reward';
  const track = isRest ? 'text-sky-400/20' : 'text-deck-reward/20';
  const progress =
    phase === 'idle' ? 1 : phase === 'done' ? 0 : durationSec > 0 ? remaining / durationSec : 0;
  const offset = C * (1 - progress);
  const transition = reduce ? { duration: 0 } : { type: 'tween' as const, ease: 'easeInOut' as const, duration: 0.35 };

  return (
    <div className="mt-5 flex w-full max-w-sm flex-col items-center gap-2">
      <button
        type="button"
        onClick={start}
        disabled={phase !== 'idle'}
        className="relative size-40 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:size-44"
        aria-label={
          phase === 'idle'
            ? 'Start exercise timer'
            : phase === 'running'
              ? 'Timer running'
              : 'Timer complete'
        }
      >
        <svg className="size-full" viewBox="0 0 100 100" aria-hidden>
          <circle
            className={track}
            cx={50}
            cy={50}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={8}
          />
          <motion.circle
            className={cn(phase === 'idle' && 'opacity-50', warm)}
            cx={50}
            cy={50}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={8}
            strokeDasharray={C}
            transform="rotate(-90 50 50)"
            animate={{ strokeDashoffset: offset }}
            transition={transition}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-3 text-center">
          {phase === 'idle' ? (
            <>
              <span className="text-sm font-medium leading-tight text-foreground">
                <Trans>Tap to start</Trans>
              </span>
              <span className="text-lg font-semibold tabular-nums text-muted-foreground">
                {formatMSS(durationSec)}
              </span>
            </>
          ) : null}
          {phase === 'running' ? (
            <span className={cn('text-2xl font-semibold tabular-nums sm:text-3xl', warm)}>{formatMSS(remaining)}</span>
          ) : null}
          {phase === 'done' ? (
            <span className="text-2xl text-deck-reward" aria-hidden>
              ✓
            </span>
          ) : null}
        </div>
      </button>
    </div>
  );
}
