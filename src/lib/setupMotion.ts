import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { DURATION, EASE_OUT } from '@/lib/motion';

/** Staggered option-list entrance for setup steps; respects reduced motion. */
export function useSetupOptionsMotion() {
  const reduceMotion = useReducedMotion();
  return useMemo(() => {
    const instant = !!reduceMotion;
    const d = instant ? 0.01 : DURATION.pageOut;
    return {
      list: {
        hidden: { opacity: instant ? 1 : 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: instant ? 0 : 0.05,
            delayChildren: instant ? 0 : 0.03,
          },
        },
      },
      item: {
        hidden: { opacity: instant ? 1 : 0, y: instant ? 0 : 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: instant ? 0.01 : d, ease: EASE_OUT },
        },
      },
    };
  }, [reduceMotion]);
}
