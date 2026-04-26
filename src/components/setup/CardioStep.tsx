import { motion } from 'framer-motion';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { useSetupOptionsMotion } from '@/lib/setupMotion';

type Props = { value: boolean; onChange: (v: boolean) => void };

export function CardioStep({ value, onChange }: Props) {
  const { list, item } = useSetupOptionsMotion();
  const options: { v: boolean; label: string }[] = [
    { v: false, label: 'Off' },
    { v: true, label: 'On' },
  ];

  return (
    <motion.div
      className="flex min-w-0 flex-col gap-3"
      variants={list}
      initial="hidden"
      animate="show"
    >
      <motion.p variants={item} className="text-sm break-words text-muted-foreground">
        Affects face cards
      </motion.p>
      {options.map((opt) => {
        const selected = opt.v === value;
        return (
          <motion.div key={opt.label} variants={item} className="min-w-0 w-full">
            <SetupOptionButton
              selected={selected}
              aria-pressed={selected}
              onClick={() => onChange(opt.v)}
            >
              {opt.label}
            </SetupOptionButton>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
