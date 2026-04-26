import { useGameStore } from '@/store/gameStore';
import { useTimer } from '@/hooks/useTimer';

export const Timer = () => {
  useTimer();
  const elapsed = useGameStore((s) => s.elapsedSec);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return (
    <span className="font-mono text-lg tabular-nums">
      {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  );
};
