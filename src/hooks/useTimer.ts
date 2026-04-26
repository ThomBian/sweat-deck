import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export const useTimer = () => {
  const tick = useGameStore((s) => s.tick);
  const finished = useGameStore((s) => s.finished);
  const startedAt = useGameStore((s) => s.startedAt);
  const pausedAt = useGameStore((s) => s.pausedAt);

  useEffect(() => {
    if (!startedAt || finished || pausedAt) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick, finished, startedAt, pausedAt]);
};
