import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Plural, Trans } from '@lingui/react/macro';
import { CardFace } from '@/components/CardFace';
import type { Card } from '@/domain/card';
import type { Exercise } from '@/domain/exercise';
import { resolve } from '@/domain/exercise';
import { tExercise } from '@/i18n/exercises';
import { formatMSS } from '@/lib/formatTime';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { useGameStore } from '@/store/gameStore';
import type { ReactNode } from 'react';

type Props = { exercise: Exercise | null };

export const ExercisePanel = ({ exercise }: Props) => {
  const reduceMotion = useReducedMotion();
  const drawn = useGameStore((s) => s.drawn);
  const config = useGameStore((s) => s.config);
  const overrides = useGameStore((s) => s.overrides);
  const topCard = drawn[drawn.length - 1] ?? null;

  if (!exercise) {
    return (
      <p className="mx-auto w-full max-w-prose text-center text-base leading-relaxed text-muted-foreground">
        <Trans>Tap the stack to draw your first card.</Trans>
      </p>
    );
  }
  const detail = formatDetail(exercise);
  const motionKey = `${exercise.id}-${detail ?? 'x'}`;

  if (exercise.id === 'double-up' && topCard?.type === 'joker') {
    const pair = lastTwoExercises({ drawn, config, overrides });
    if (pair) {
      const [a, b] = pair;
      const nameA = tExercise(a.exercise.id);
      const nameB = tExercise(b.exercise.id);
      return (
        <div className="w-full text-center">
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
              <div
                className="mt-4 flex items-center justify-center gap-3"
                role="img"
                aria-label={t`Combine ${nameA} and ${nameB} — 10 reps each`}
              >
                <div className="flex flex-col items-center gap-1" aria-hidden>
                  <CardFace card={a.card} className="!h-24 !w-16 p-2 text-sm [&>span.text-5xl]:text-2xl [&>span.text-2xl]:text-base" />
                  <span className="text-xs text-muted-foreground">{nameA}</span>
                </div>
                <span className="text-xl text-muted-foreground" aria-hidden>+</span>
                <div className="flex flex-col items-center gap-1" aria-hidden>
                  <CardFace card={b.card} className="!h-24 !w-16 p-2 text-sm [&>span.text-5xl]:text-2xl [&>span.text-2xl]:text-base" />
                  <span className="text-xs text-muted-foreground">{nameB}</span>
                </div>
              </div>
              <p className="text-deck-reward mt-4 font-sans text-3xl font-semibold tabular-nums leading-none tracking-tight sm:text-4xl">
                <Trans>10 reps each</Trans>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }
  }

  return (
    <div className="w-full text-center">
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

type ResolvedPair = { card: Card; exercise: Exercise };

const lastTwoExercises = ({
  drawn,
  config,
  overrides,
}: {
  drawn: Card[];
  config: Parameters<typeof resolve>[0]['config'];
  overrides: Parameters<typeof resolve>[0]['overrides'];
}): [ResolvedPair, ResolvedPair] | null => {
  const picked: ResolvedPair[] = [];
  for (let i = drawn.length - 2; i >= 0 && picked.length < 2; i--) {
    const card = drawn[i]!;
    if (card.type !== 'number' && card.type !== 'face') continue;
    picked.push({ card, exercise: resolve({ card, config, overrides }) });
  }
  if (picked.length < 2) return null;
  return [picked[1]!, picked[0]!];
};

const formatDetail = (ex: Exercise): ReactNode | null => {
  if (ex.reps !== undefined) {
    return (
      <span>
        <Plural value={ex.reps} one="# rep" other="# reps" />
      </span>
    );
  }
  if (ex.durationSec !== undefined) return formatMSS(ex.durationSec);
  if (ex.distanceM !== undefined) return t`${ex.distanceM}m`;
  return null;
};
