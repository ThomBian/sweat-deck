import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { MAIN_PAD } from '@/lib/layout';

export default function Summary() {
  const [kudoIndex] = useState(() => Math.floor(Math.random() * 4));
  const navigate = useNavigate();
  const drawn = useGameStore((s) => s.drawn);
  const elapsedSec = useGameStore((s) => s.elapsedSec);
  const reset = useGameStore((s) => s.reset);
  const reduceMotion = useReducedMotion();
  const kudoLines = [t`Nice work`, t`You ran the table`, t`Session in the books`, t`Respect—deck served`] as const;
  const kudo = kudoLines[kudoIndex]!;

  const tMotion = reduceMotion ? 0.1 : 0.28;
  const statY = reduceMotion ? 0 : 6;

  return (
    <main
      id="main-content"
      className={`flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-background via-background to-card/40 ${MAIN_PAD}`}
    >
      <motion.div
        className="flex max-w-md flex-col items-center gap-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: tMotion, ease: EASE_OUT, delay: reduceMotion ? 0 : 0.04 }}
      >
        <p className="ui-kicker tracking-[0.18em]">{kudo}</p>
        <h1 className="text-balance">
          <Trans>Workout complete</Trans>
        </h1>
      </motion.div>
      <dl className="grid w-full max-w-sm grid-cols-2 gap-x-6 gap-y-4 text-center">
        <motion.div
          className="rounded-lg border border-border/50 bg-card/80 px-4 py-3"
          initial={{ opacity: 0, y: statY, scale: reduceMotion ? 1 : 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: tMotion, delay: reduceMotion ? 0 : 0.08, ease: EASE_OUT }}
        >
          <dt className="ui-label-caps">
            <Trans>Cards drawn</Trans>
          </dt>
          <dd className="text-deck-reward mt-2 font-sans text-3xl font-bold tabular-nums leading-none sm:text-4xl">
            {drawn.length}
          </dd>
        </motion.div>
        <motion.div
          className="rounded-lg border border-border/50 bg-card/80 px-4 py-3"
          initial={{ opacity: 0, y: statY, scale: reduceMotion ? 1 : 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: tMotion, delay: reduceMotion ? 0 : 0.14, ease: EASE_OUT }}
        >
          <dt className="ui-label-caps">
            <Trans>Elapsed</Trans>
          </dt>
          <dd className="text-deck-reward mt-2 font-sans text-3xl font-bold tabular-nums leading-none sm:text-4xl">
            {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
          </dd>
        </motion.div>
      </dl>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: tMotion, delay: reduceMotion ? 0 : 0.2, ease: EASE_OUT }}
      >
        <motion.div
          whileHover={reduceMotion ? { scale: 1 } : { scale: 1.02 }}
          whileTap={reduceMotion ? { scale: 1 } : { scale: 0.98 }}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
        >
          <Button
            onClick={() => {
              reset();
              navigate('/');
            }}
            className="w-full min-h-11 min-w-32 max-w-sm px-8 sm:w-auto"
          >
            <Trans>Done</Trans>
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}
