import { motion } from 'framer-motion';
import type { Theme } from '@/domain/config';
import { tThemeWizard } from '@/i18n/labels';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { useSetupOptionsMotion } from '@/lib/setupMotion';

const VALUES: readonly Theme[] = ['upper', 'lower', 'full'];

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
      {VALUES.map((v) => {
        const selected = v === value;
        return (
          <motion.div key={v} variants={item} className="min-w-0 w-full">
            <SetupOptionButton
              selected={selected}
              aria-pressed={selected}
              onClick={() => onChange(v)}
            >
              {tThemeWizard(v)}
            </SetupOptionButton>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
