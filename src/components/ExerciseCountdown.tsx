import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useExerciseCountdown } from '@/hooks/useExerciseCountdown';
import { Button } from '@/components/ui/button';
import { EASE_OUT, DURATION } from '@/lib/motion';
import { formatMSS } from '@/lib/formatTime';
import { cn } from '@/lib/utils';

/** Drives play-page shell color while the set timer is running. */
export type PlayTimerMood = 'off' | 'work' | 'rest';

type Props = {
  durationSec: number;
  isRest?: boolean;
  onTimerMoodChange?: (mood: PlayTimerMood) => void;
  /** 0–1 = fraction of time remaining; null when not in running phase (drives play-page fill). */
  onTimerFillChange?: (remainingRatio: number | null) => void;
};

/**
 * Start button + full-width, large-type countdown for timed cards (glanceable at a distance).
 * Completion haptics/sound stay in the hook.
 */
export function ExerciseCountdown({ durationSec, isRest = false, onTimerMoodChange, onTimerFillChange }: Props) {
  const reduce = useReducedMotion();
  const { phase, remaining, start } = useExerciseCountdown(durationSec);

  useEffect(() => {
    if (!onTimerMoodChange) return;
    if (phase !== 'running') {
      onTimerMoodChange('off');
      return;
    }
    onTimerMoodChange(isRest ? 'rest' : 'work');
  }, [phase, isRest, onTimerMoodChange]);

  useEffect(() => {
    onTimerFillChange?.(
      phase === 'running' && durationSec > 0
        ? Math.max(0, Math.min(1, remaining / durationSec))
        : null,
    );
  }, [phase, remaining, durationSec, onTimerFillChange]);
  const warm = isRest ? 'text-sky-400' : 'text-deck-reward';
  const fill = isRest ? 'bg-sky-400' : 'bg-deck-reward';
  const track = 'bg-muted/50';
  const fillRatio =
    durationSec > 0 && phase === 'running' ? Math.max(0, Math.min(1, remaining / durationSec)) : 0;

  if (phase === 'idle') {
    return (
      <div className="w-full max-w-md">
        <Button
          type="button"
          variant="default"
          onClick={start}
          className="min-h-12 w-full touch-manipulation px-4 text-base font-semibold shadow-sm"
        >
          <Trans>Start timer</Trans>
        </Button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div
        role="status"
        className={cn(
          'flex w-full flex-col items-center justify-center gap-3 py-6',
          'min-h-[min(40dvh,20rem)] sm:min-h-[min(35dvh,24rem)]',
        )}
      >
        <motion.span
          className="text-6xl text-deck-reward sm:text-7xl"
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: 'spring', stiffness: 400, damping: 24, mass: 0.4 }
          }
          aria-hidden
        >
          ✓
        </motion.span>
        <p className="text-balance text-center text-base font-medium text-foreground sm:text-lg">
          <Trans>Round complete</Trans>
        </p>
      </div>
    );
  }

  // running — “studio” ambient wash (globals.css) behind content for distance readability
  return (
    <div
      className={cn(
        'timer-ambient w-full',
        reduce && 'timer-ambient--reduced',
        'flex min-h-[min(55dvh,32rem)] flex-col justify-center py-2 sm:min-h-[min(50dvh,36rem)]',
      )}
    >
      <div
        className={cn(
          'timer-ambient__bloom',
          isRest ? 'timer-ambient__bloom--rest' : 'timer-ambient__bloom--work',
        )}
        aria-hidden
      />
      <div className="timer-ambient__content flex w-full flex-col justify-center gap-6 sm:gap-8">
        <div className="w-full px-1">
          <div
            className={cn(
              'h-4 w-full overflow-hidden rounded-full ring-1 ring-inset ring-foreground/8 sm:h-5 md:h-6',
              track,
            )}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={durationSec}
            aria-valuenow={remaining}
            aria-valuetext={t`${formatMSS(remaining)} of ${formatMSS(durationSec)}`}
          >
            <motion.div
              className={cn('h-full rounded-full', fill)}
              initial={false}
              animate={{ width: `${fillRatio * 100}%` }}
              transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE_OUT }}
              aria-hidden
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.p
              key={remaining}
              className={cn(
                'text-center font-display text-5xl font-bold leading-none tabular-nums tracking-tight',
                'sm:text-6xl md:text-7xl',
                'drop-shadow-[0_0.15em_0.35em_rgba(0,0,0,0.6)]',
                warm,
              )}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              {...(!reduce ? { exit: { opacity: 0, y: -8 } } : {})}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              aria-hidden
            >
              {formatMSS(remaining)}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
