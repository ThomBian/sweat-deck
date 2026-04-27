import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { CardFace } from '@/components/CardFace';
import type { Exercise } from '@/domain/exercise';
import { tExercise } from '@/i18n/exercises';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { useGameStore } from '@/store/gameStore';
import type { ReactNode } from 'react';

type Props = { exercise: Exercise | null };

export const ExercisePanel = ({ exercise }: Props) => {
  const reduceMotion = useReducedMotion();
  const topCard = useGameStore((s) => s.drawn[s.drawn.length - 1] ?? null);

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
      <AnimatePresence mode="wait">
        <motion.div
          key={motionKey}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? DURATION.fast : 0.28, ease: EASE_OUT }}
        >
          {exercise.id === 'double-up' && topCard?.type === 'joker' ? (
            <div
              className="flex flex-col items-center gap-4"
              role="img"
              aria-label={t`Combine the last 2 exercises — 10 reps each`}
            >
              <div className="ring-offset-background rounded-2xl ring-2 ring-deck-wild/35 ring-offset-4" aria-hidden>
                <CardFace
                  card={topCard}
                  className="!h-56 !w-40 text-[1.05rem] shadow-2xl [&>span.text-5xl]:text-6xl"
                />
              </div>
              <p
                className="text-balance text-center text-lg font-semibold text-foreground/95 sm:text-xl"
                aria-hidden
              >
                {tExercise(exercise.id)}
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-balance break-words text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                {tExercise(exercise.id)}
              </h2>
              {detail && (
                <p className="text-deck-reward mt-4 font-sans text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-4xl">
                  {detail}
                </p>
              )}
            </>
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
