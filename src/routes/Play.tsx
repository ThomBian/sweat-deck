import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Deck } from '@/components/Deck';
import { ExercisePanel } from '@/components/ExercisePanel';
import { Timer } from '@/components/Timer';
import { Button } from '@/components/ui/button';

export default function Play() {
  const navigate = useNavigate();
  const deck = useGameStore((s) => s.deck);
  const current = useGameStore((s) => s.current);
  const drawNext = useGameStore((s) => s.drawNext);
  const finish = useGameStore((s) => s.finish);

  const handleFinish = async () => {
    await finish();
    navigate('/summary');
  };

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sweat Deck</h1>
        <Timer />
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-8">
        <Deck remaining={deck.length} onDraw={drawNext} />
        <ExercisePanel exercise={current} />
      </section>
      <Button variant="secondary" onClick={handleFinish}>
        Finish
      </Button>
    </main>
  );
}
