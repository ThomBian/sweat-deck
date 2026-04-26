import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LocaleToggle } from '@/components/LocaleToggle';
import { DURATION, EASE_OUT } from '@/lib/motion';

/**
 * One orchestrated page transition: opacity + small Y, GPU-friendly, reduced-motion safe.
 */
export function AnimatedLayout() {
  const location = useLocation();
  const reduce = useReducedMotion();
  const y = 10;

  return (
    <div className="min-h-dvh w-full">
      <LocaleToggle />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className="min-h-dvh w-full"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: DURATION.pageOut, ease: EASE_OUT } }
              : { opacity: 0, y: -8, transition: { duration: DURATION.pageOut, ease: EASE_OUT } }
          }
          transition={{ duration: DURATION.pageIn, ease: EASE_OUT }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
