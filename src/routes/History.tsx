import { motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from '@/lib/motion';
import { MAIN_PAD } from '@/lib/layout';

export default function History() {
  const reduce = useReducedMotion();

  return (
    <main
      id="main-content"
      className={`flex min-h-dvh flex-col items-center justify-center gap-4 ${MAIN_PAD}`}
    >
      <motion.h1
        className="text-center text-balance"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.1 : 0.28, ease: EASE_OUT }}
      >
        History — coming soon
      </motion.h1>
      <motion.p
        className="max-w-prose text-center text-sm leading-relaxed text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24, delay: reduce ? 0 : 0.06, ease: EASE_OUT }}
      >
        Past sessions will land here.
      </motion.p>
    </main>
  );
}
