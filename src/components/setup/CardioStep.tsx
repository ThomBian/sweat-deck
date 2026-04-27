import { motion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { useSetupOptionsMotion } from '@/lib/setupMotion';

type Props = { value: boolean; onChange: (v: boolean) => void };

export function CardioStep({ value, onChange }: Props) {
  const { list, item } = useSetupOptionsMotion();
  const options = [
    { v: false, label: t`Off` },
    { v: true, label: t`On` },
  ] as const;

  return (
    <motion.div
      className="flex min-w-0 flex-col gap-3"
      variants={list}
      initial="hidden"
      animate="show"
    >
      {options.map((opt) => {
        const selected = opt.v === value;
        return (
          <motion.div key={String(opt.v)} variants={item} className="min-w-0 w-full">
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
