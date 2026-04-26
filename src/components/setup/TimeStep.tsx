import { motion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { useSetupOptionsMotion } from '@/lib/setupMotion';

type Props = {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
};

export function TimeStep({ value, onChange }: Props) {
  const { list, item } = useSetupOptionsMotion();

  const options = [
    { value: 15 as const, label: t`15 min` },
    { value: 30 as const, label: t`30 min` },
    { value: 45 as const, label: t`45 min` },
    { value: undefined, label: t`No limit` },
  ] as const;

  return (
    <motion.div
      className="flex min-w-0 flex-col gap-3"
      variants={list}
      initial="hidden"
      animate="show"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <motion.div key={String(opt.value)} variants={item} className="min-w-0 w-full">
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
