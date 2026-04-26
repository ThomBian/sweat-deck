import { motion } from 'framer-motion';
import type { Difficulty } from '@/domain/difficulty';
import { DIFFICULTY_META } from '@/domain/difficultyMeta';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { useSetupOptionsMotion } from '@/lib/setupMotion';

const VALUES: readonly Difficulty[] = ['beginner', 'intermediate', 'hard', 'advanced', 'hell'];

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
      {VALUES.map((v) => {
        const selected = v === value;
        const meta = DIFFICULTY_META[v];
        return (
          <motion.div key={v} variants={item} className="min-w-0 w-full">
            <SetupOptionButton
              selected={selected}
              aria-pressed={selected}
              aria-label={meta.label}
              onClick={() => onChange(v)}
            >
              <span className="block font-display text-base font-semibold">{meta.label}</span>
              <span className="mt-1.5 block text-sm font-normal text-muted-foreground">
                {meta.description}
              </span>
              <span className="mt-1.5 block text-xs font-medium text-muted-foreground/90">
                {meta.repHint}
              </span>
            </SetupOptionButton>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
