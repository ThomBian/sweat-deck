import type { Exercise } from '@/domain/exercise';

type Props = { exercise: Exercise | null };

export const ExercisePanel = ({ exercise }: Props) => {
  if (!exercise) {
    return <p className="text-deck-fg/60">Tap the deck to start</p>;
  }
  const detail = formatDetail(exercise);
  return (
    <div className="text-center">
      <p className="text-deck-fg/60 text-sm uppercase tracking-wider">Do this</p>
      <h2 className="text-3xl font-bold">{exercise.name}</h2>
      {detail && <p className="text-deck-accent mt-2 text-2xl font-semibold">{detail}</p>}
    </div>
  );
};

const formatDetail = (ex: Exercise): string | null => {
  if (ex.reps !== undefined) return `× ${ex.reps}`;
  if (ex.durationSec !== undefined) return `${ex.durationSec}s`;
  if (ex.distanceM !== undefined) return `${ex.distanceM}m`;
  return null;
};
