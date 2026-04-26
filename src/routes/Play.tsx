import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trans } from '@lingui/react/macro';
import { useGameStore } from '@/store/gameStore';
import { Deck } from '@/components/Deck';
import { ExercisePanel } from '@/components/ExercisePanel';
import { Timer } from '@/components/Timer';
import { Button } from '@/components/ui/button';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { MAIN_PAD } from '@/lib/layout';

const stagger = 0.06;

export default function Play() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const deck = useGameStore((s) => s.deck);
  const current = useGameStore((s) => s.current);
  const drawNext = useGameStore((s) => s.drawNext);
  const finish = useGameStore((s) => s.finish);

  const handleFinish = async () => {
    await finish();
    navigate('/summary');
  };

  const y = 8;
  const base = { duration: 0.26, ease: EASE_OUT };
  const item = (i: number) =>
    reduce
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.01, delay: 0, ease: EASE_OUT },
        }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { ...base, delay: i * stagger },
        };

  return (
    <main id="main-content" className={`flex min-h-dvh flex-col gap-6 ${MAIN_PAD}`}>
      <motion.header
        className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4"
        {...item(0)}
      >
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            <Trans>Sweat Deck</Trans>
          </h1>
          <span className="hidden text-sm leading-snug text-muted-foreground sm:inline" aria-hidden>
            <Trans>draw · move · repeat</Trans>
          </span>
        </div>
        <Timer />
      </motion.header>
      <motion.section
        className="flex flex-1 flex-col items-center justify-center gap-10"
        {...item(1)}
      >
        <Deck remaining={deck.length} onDraw={drawNext} />
        <ExercisePanel exercise={current} />
      </motion.section>
      <motion.div className="w-full sm:ml-auto sm:w-auto" {...item(2)}>
        <motion.div
          whileHover={reduce ? { scale: 1 } : { scale: 1.02 }}
          whileTap={reduce ? { scale: 1 } : { scale: 0.98 }}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
          className="w-full sm:w-auto"
        >
          <Button variant="secondary" onClick={handleFinish} className="w-full min-h-11 sm:w-auto">
            <Trans>Finish</Trans>
          </Button>
        </motion.div>
      </motion.div>
    </main>
  );
}
