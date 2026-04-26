import { motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { useGameStore } from '@/store/gameStore';
import { CardFace } from './CardFace';
import { DURATION, EASE_OUT } from '@/lib/motion';

type Props = { remaining: number; onDraw: () => void; drawDisabled?: boolean };

export const Deck = ({ remaining, onDraw, drawDisabled = false }: Props) => {
  const drawn = useGameStore((s) => s.drawn);
  const top = drawn[drawn.length - 1] ?? null;
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
      <motion.button
        type="button"
        aria-label={remaining === 0 ? t`No cards left in the deck` : t`Draw a card from the stack`}
        onClick={onDraw}
        disabled={remaining === 0 || drawDisabled}
        className="relative cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
        whileTap={remaining > 0 ? { scale: 0.97 } : { scale: 1 }}
        transition={{ duration: DURATION.fast, ease: EASE_OUT }}
      >
        <CardFace card={null} faceDown />
        <span className="absolute right-2 top-2 rounded-md border border-border/40 bg-muted/95 px-2 py-0.5 text-xs font-medium text-foreground tabular-nums shadow-sm">
          {remaining}
        </span>
      </motion.button>

      <motion.div
        key={drawn.length}
        initial={reduceMotion ? { opacity: 0 } : { rotateY: 180, opacity: 0 }}
        animate={
          reduceMotion ? { opacity: 1 } : { rotateY: 0, opacity: 1 }
        }
        transition={{
          duration: reduceMotion ? DURATION.fast : 0.38,
          ease: EASE_OUT,
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <CardFace card={top} />
      </motion.div>
    </div>
  );
};
