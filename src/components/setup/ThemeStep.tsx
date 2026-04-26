import { motion } from 'framer-motion';
import type { Theme } from '@/domain/config';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { useSetupOptionsMotion } from '@/lib/setupMotion';

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'upper', label: 'Upper' },
  { value: 'lower', label: 'Lower' },
  { value: 'full', label: 'Full Body' },
];

type Props = { value: Theme; onChange: (v: Theme) => void };

export function ThemeStep({ value, onChange }: Props) {
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
