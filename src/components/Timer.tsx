import { t } from '@lingui/core/macro';
import { useGameStore } from '@/store/gameStore';
import { useTimer } from '@/hooks/useTimer';
import { getLimitSecFromConfig, getTimerPhase, isUnlimitedTime } from '@/lib/sessionTimer';
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
  const unlimited = isUnlimitedTime(config);
  const limit = getLimitSecFromConfig(config);
  const showCountdown = limit != null && (phase === 'countdown' || phase === 'overtime');

  const copy =
    phase === 'overtime'
      ? t`Bonus round — past the timer`
      : showCountdown
        ? t`Time remaining`
        : t`Session time`;

  const main =
    phase === 'overtime'
      ? `+${fmt(overtimeSec)}`
      : showCountdown
        ? fmt(remainingSec)
        : fmt(elapsedSec);

  return (
    <div className="flex flex-col items-end gap-0.5 text-right sm:min-w-[5.5rem]">
      <p className="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">{copy}</p>
      <time
        className={cn(
          'text-lg font-semibold tabular-nums tracking-tight',
          phase === 'overtime' && 'text-destructive animate-pulse',
          (phase === 'countdown' || phase === 'stopwatch') && 'text-deck-reward',
        )}
        dateTime={showCountdown && limit != null ? `PT${limit}S` : `PT${elapsedSec}S`}
        aria-label={unlimited || phase === 'stopwatch' ? t`Session elapsed` : t`Time remaining in session`}
      >
        {main}
      </time>
    </div>
  );
};
