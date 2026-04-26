import { motion } from 'framer-motion';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { useSetupOptionsMotion } from '@/lib/setupMotion';

type Props = {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
};

const OPTIONS: { value: number | undefined; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: undefined, label: 'No limit' },
];

export function TimeStep({ value, onChange }: Props) {
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
          <motion.div key={opt.label} variants={item} className="min-w-0 w-full">
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
