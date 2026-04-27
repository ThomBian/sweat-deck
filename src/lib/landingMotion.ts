import { EASE_OUT } from '@/lib/motion';

/** Staggered landing reveal — one beat per block; disabled when `reduceMotion` is true. */
export function getLandingVariants(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      container: {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.12 } },
      },
      item: {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.1 } },
      },
    } as const;
  }
  return {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.07,
          delayChildren: 0.05,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 8 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.28, ease: EASE_OUT },
      },
    },
  } as const;
}
