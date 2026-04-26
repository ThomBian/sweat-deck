import { motion } from 'framer-motion';
import type { Equipment } from '@/domain/config';
import { tEquipment } from '@/i18n/labels';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { useSetupOptionsMotion } from '@/lib/setupMotion';

const VALUES: readonly Equipment[] = ['bodyweight', 'weights', 'gym'];

type Props = { value: Equipment; onChange: (v: Equipment) => void };

export function EquipmentStep({ value, onChange }: Props) {
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
        return (
          <motion.div key={v} variants={item} className="min-w-0 w-full">
            <SetupOptionButton
              selected={selected}
              aria-pressed={selected}
              onClick={() => onChange(v)}
            >
              {tEquipment(v)}
            </SetupOptionButton>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
