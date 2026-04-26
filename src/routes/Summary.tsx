import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';

export default function Summary() {
  const navigate = useNavigate();
  const drawn = useGameStore((s) => s.drawn);
  const elapsedSec = useGameStore((s) => s.elapsedSec);
  const reset = useGameStore((s) => s.reset);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Workout complete</h1>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-center">
        <dt className="text-deck-fg/60">Cards drawn</dt>
        <dd className="text-2xl font-semibold">{drawn.length}</dd>
        <dt className="text-deck-fg/60">Time</dt>
        <dd className="text-2xl font-semibold">
          {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
        </dd>
      </dl>
      <Button
        onClick={() => {
          reset();
          navigate('/');
        }}
      >
        Done
      </Button>
    </main>
  );
}
