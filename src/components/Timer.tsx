import { t } from '@lingui/core/macro';
import { useGameStore } from '@/store/gameStore';
import { useTimer } from '@/hooks/useTimer';

export const Timer = () => {
  useTimer();
  const elapsed = useGameStore((s) => s.elapsedSec);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return (
    <time
      className="text-deck-reward text-lg font-semibold tabular-nums tracking-tight"
      dateTime={`PT${minutes}M${seconds}S`}
      aria-label={t`Elapsed session time`}
    >
      {minutes}:{String(seconds).padStart(2, '0')}
    </time>
  );
};
