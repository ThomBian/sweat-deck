import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { usePersistedConfig } from '@/hooks/usePersistedConfig';

export default function Setup() {
  const { config, loaded } = usePersistedConfig();
  const start = useGameStore((s) => s.start);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loaded) return;
    start(config);
    navigate('/play', { replace: true });
  }, [loaded, config, start, navigate]);

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-deck-fg/60">Preparing the deck…</p>
    </main>
  );
}
