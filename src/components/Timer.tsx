import { t } from '@lingui/core/macro';
import { useGameStore } from '@/store/gameStore';
import { useTimer } from '@/hooks/useTimer';
import { getLimitSecFromConfig, getTimerPhase } from '@/lib/sessionTimer';
import { cn } from '@/lib/utils';

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const Timer = () => {
  useTimer();
  const config = useGameStore((s) => s.config);
  const elapsedSec = useGameStore((s) => s.elapsedSec);
  const { phase, remainingSec, overtimeSec } = getTimerPhase(config, elapsedSec);
  const limit = getLimitSecFromConfig(config);
  const showCountdown = limit != null && (phase === 'countdown' || phase === 'overtime');

  const copy =
    phase === 'overtime'
      ? t`Overtime`
      : showCountdown
        ? t`Time left`
        : t`Session`;

  const main =
    phase === 'overtime'
      ? `+${fmt(overtimeSec)}`
      : showCountdown
        ? fmt(remainingSec)
        : fmt(elapsedSec);

  return (
    <div className="flex min-w-0 flex-col items-end gap-0.5 text-right sm:min-w-[5.5rem]">
      {/* Long labels + uppercase crowd narrow screens; full phase stays in aria-label on <time> */}
      <p className="text-xs font-medium text-muted-foreground max-sm:sr-only">
        {copy}
      </p>
      <time
        className={cn(
          'text-xl font-semibold tabular-nums tracking-tight sm:text-lg',
          phase === 'overtime' && 'text-destructive animate-pulse',
          (phase === 'countdown' || phase === 'stopwatch') && 'text-deck-reward',
        )}
        dateTime={showCountdown && limit != null ? `PT${limit}S` : `PT${elapsedSec}S`}
        aria-label={`${copy} ${main}`}
      >
        {main}
      </time>
    </div>
  );
};
