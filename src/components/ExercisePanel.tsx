import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import type { Exercise } from '@/domain/exercise';
import { tExercise } from '@/i18n/exercises';
import { DURATION, EASE_OUT } from '@/lib/motion';
import type { ReactNode } from 'react';

type Props = { exercise: Exercise | null };

export const ExercisePanel = ({ exercise }: Props) => {
  const reduceMotion = useReducedMotion();

  if (!exercise) {
    return (
      <p className="max-w-prose text-center text-base leading-relaxed text-muted-foreground">
        <Trans>Tap the stack to draw your first card.</Trans>
      </p>
    );
  }
  const detail = formatDetail(exercise);
  const motionKey = `${exercise.id}-${detail ?? 'x'}`;

  return (
    <div className="max-w-[min(100%,36rem)] text-center">
      <p className="ui-label-caps mb-2">
        <Trans>This move</Trans>
      </p>
      <AnimatePresence mode="wait">
        <motion.div
          key={motionKey}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? DURATION.fast : 0.28, ease: EASE_OUT }}
        >
          <h2 className="text-balance break-words text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            {tExercise(exercise.id)}
          </h2>
          {detail && (
            <p className="text-deck-reward mt-4 font-sans text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-4xl">
              {detail}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const formatDetail = (ex: Exercise): ReactNode | null => {
  if (ex.reps !== undefined) {
    return (
      <span>
        <Plural value={ex.reps} one="# rep" other="# reps" />
      </span>
    );
  }
  if (ex.durationSec !== undefined) return t`${ex.durationSec}s`;
  if (ex.distanceM !== undefined) return t`${ex.distanceM}m`;
  return null;
};
