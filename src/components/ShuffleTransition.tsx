import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const DURATION_MS = 1500;

type Props = { onComplete: () => void };

export function ShuffleTransition({ onComplete }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const ms = reduce ? 0 : DURATION_MS;
    const id = window.setTimeout(onComplete, ms);
    return () => window.clearTimeout(id);
  }, [onComplete, reduce]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background/96 px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.01 : 0.2 }}
      role="status"
      aria-live="polite"
      aria-label="Shuffling deck"
    >
      <div className="relative h-28 w-40 sm:h-32 sm:w-44">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-xl border-2 border-border/60 bg-card shadow-lg"
            initial={reduce ? false : { x: 0, y: 0, rotate: 0 }}
            animate={
              reduce
                ? {}
                : {
                    x: [0, (i % 2 === 0 ? 1 : -1) * 18, (i % 2 === 0 ? -1 : 1) * 14, 0],
                    y: [0, -6 - i * 2, 4 + i, 0],
                    rotate: [0, (i - 1.5) * 8, (i - 1.5) * -6, 0],
                  }
            }
            transition={
              reduce
                ? {}
                : {
                    duration: DURATION_MS / 1000,
                    ease: 'easeInOut',
                    times: [0, 0.35, 0.7, 1],
                  }
            }
            style={{
              zIndex: 4 - i,
              transformOrigin: '50% 100%',
            }}
          />
        ))}
      </div>
      <p className="text-center text-sm font-medium text-muted-foreground">Shuffling the deck…</p>
    </motion.div>
  );
}
