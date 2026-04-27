import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Four sample faces — fanned; suit hues from theme. */
const FAN = [
  { rank: '7', suit: 'hearts' as const, glyph: '♥', rot: -20, x: -56, z: 2, stack: 10 },
  { rank: '3', suit: 'diamonds' as const, glyph: '♦', rot: -6, x: -18, z: 10, stack: 20 },
  { rank: 'A', suit: 'clubs' as const, glyph: '♣', rot: 6, x: 18, z: 10, stack: 30 },
  { rank: 'K', suit: 'spades' as const, glyph: '♠', rot: 20, x: 56, z: 2, stack: 40 },
] as const;

const SUIT_TEXT: Record<(typeof FAN)[number]['suit'], string> = {
  hearts: 'text-suit-hearts',
  diamonds: 'text-suit-diamonds',
  clubs: 'text-suit-clubs',
  spades: 'text-suit-spades',
};

type Props = {
  reduceMotion: boolean;
  className?: string;
};

/**
 * Fanned playing-card treatment for Setup landing: 3D perspective + subtle
 * pointer tilt. Static 2D fan when `reduceMotion` is set.
 */
export function SetupLandingDeck({ reduceMotion, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const stiff = reduceMotion ? 800 : 150;
  const damp = reduceMotion ? 60 : 28;
  const smx = useSpring(mx, { stiffness: stiff, damping: damp, mass: 0.35 });
  const smy = useSpring(my, { stiffness: stiff, damping: damp, mass: 0.35 });
  const rotateX = useTransform(smy, [0, 1], [7, -7]);
  const rotateY = useTransform(smx, [0, 1], [-11, 11]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduceMotion) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    mx.set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    my.set(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  const reset = () => {
    if (reduceMotion) return;
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <div
      ref={ref}
      className={cn(
        'relative w-full touch-pan-y',
        !reduceMotion && 'cursor-default',
        className,
      )}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      aria-hidden
    >
      <div className="pointer-events-none relative aspect-[4/2.4] w-full [perspective:1000px] sm:aspect-[5/2.5]">
        <motion.div
          className="absolute inset-0 [transform-style:preserve-3d] will-change-transform"
          style={
            reduceMotion
              ? {
                  rotateX: 4,
                  rotateY: -3,
                  transformStyle: 'preserve-3d',
                }
              : {
                  rotateX,
                  rotateY,
                  transformStyle: 'preserve-3d',
                }
          }
        >
          {FAN.map((c) => (
            <div
              key={c.suit}
              className={cn(
                'pointer-events-none absolute bottom-0 left-1/2 -ml-9 w-[4.5rem] sm:-ml-10 sm:w-20',
                'h-[6.4rem] sm:h-28 [transform-origin:50%_100%] [transform-style:preserve-3d]',
              )}
              style={{
                zIndex: c.stack,
                transform: `translateX(${c.x}px) translateZ(${c.z}px) rotateZ(${c.rot}deg)`,
              }}
            >
              <div
                className={cn(
                  'flex h-full w-full select-none flex-col justify-between rounded-xl border border-border/45 bg-deck-card p-2 shadow-[0_12px_32px_rgba(0,0,0,0.35),0_1px_0_rgba(255,255,255,0.1)_inset] ring-1 ring-black/8',
                  SUIT_TEXT[c.suit],
                )}
              >
                <span className="font-display text-base font-bold leading-none tabular-nums sm:text-lg">
                  {c.rank}
                </span>
                <span
                  className="pointer-events-none self-center text-[1.7rem] leading-none sm:text-3xl"
                  aria-hidden
                >
                  {c.glyph}
                </span>
                <span
                  className="rotate-180 self-end font-display text-base font-bold leading-none tabular-nums sm:text-lg"
                  aria-hidden
                >
                  {c.rank}
                </span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
