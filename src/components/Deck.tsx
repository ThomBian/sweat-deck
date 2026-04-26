import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { CardFace } from './CardFace';

type Props = { remaining: number; onDraw: () => void };

export const Deck = ({ remaining, onDraw }: Props) => {
  const drawn = useGameStore((s) => s.drawn);
  const top = drawn[drawn.length - 1] ?? null;

  return (
    <div className="flex items-center gap-8">
      <button
        type="button"
        aria-label="Draw card"
        onClick={onDraw}
        disabled={remaining === 0}
        className="relative disabled:opacity-50"
      >
        <CardFace card={null} faceDown />
        <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs">
          {remaining}
        </span>
      </button>

      <motion.div
        key={drawn.length}
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <CardFace card={top} />
      </motion.div>
    </div>
  );
};
