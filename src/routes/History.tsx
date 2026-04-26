import { motion, useReducedMotion } from 'framer-motion';
import { Trans } from '@lingui/react/macro';
import { EASE_OUT } from '@/lib/motion';
import { MAIN_PAD, SHELL_HISTORY } from '@/lib/layout';

export default function History() {
  const reduce = useReducedMotion();

  return (
    <main
      id="main-content"
      className={`flex min-h-dvh flex-col items-center justify-center gap-4 ${SHELL_HISTORY} ${MAIN_PAD}`}
    >
      <motion.h1
        className="text-center text-balance"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.1 : 0.28, ease: EASE_OUT }}
      >
        <Trans>History — coming soon</Trans>
      </motion.h1>
      <motion.p
        className="max-w-prose text-center text-sm leading-relaxed text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.24, delay: reduce ? 0 : 0.06, ease: EASE_OUT }}
      >
        <Trans>Past sessions will land here.</Trans>
      </motion.p>
    </main>
  );
}
