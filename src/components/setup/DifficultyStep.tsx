import { motion } from 'framer-motion';
import type { Difficulty } from '@/domain/difficulty';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { useSetupOptionsMotion } from '@/lib/setupMotion';

const OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'hard', label: 'Hard' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'hell', label: 'Hell' },
];

type Props = { value: Difficulty; onChange: (v: Difficulty) => void };

export function DifficultyStep({ value, onChange }: Props) {
  const { list, item } = useSetupOptionsMotion();

  return (
    <motion.div
      className="flex min-w-0 flex-col gap-3"
      variants={list}
      initial="hidden"
      animate="show"
    >
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <motion.div key={opt.value} variants={item} className="min-w-0 w-full">
            <SetupOptionButton
              selected={selected}
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </SetupOptionButton>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
