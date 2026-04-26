import { cn } from '@/lib/utils';

/** Decorative suit-colored pulses — deck metaphor; use on entry/loading surfaces. */
export function DeckGlyphPulse({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1.5', className)} aria-hidden>
      <span className="size-2 animate-pulse rounded-full bg-suit-hearts" />
      <span className="size-2 animate-pulse rounded-full bg-suit-clubs delay-75" />
      <span className="size-2 animate-pulse rounded-full bg-deck-reward delay-150" />
    </div>
  );
}
