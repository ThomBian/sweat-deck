import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DURATION, EASE_OUT } from '@/lib/motion';

type Props = {
  selected: boolean;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick: () => void;
  'aria-pressed'?: boolean | 'true' | 'false' | 'mixed';
};

export function SetupOptionButton({
  selected,
  children,
  className,
  type = 'button',
  disabled,
  onClick,
  'aria-pressed': ariaPressed,
}: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      disabled={disabled}
      aria-pressed={ariaPressed}
      onClick={onClick}
      className={cn(
        'min-h-14 w-full min-w-0 touch-manipulation rounded-xl border px-4 py-3 text-left text-base font-medium break-words outline-none',
        'transition-[border-color,background-color,color,box-shadow,transform] duration-200 ease-out',
        'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
        selected
          ? 'border-primary bg-primary/15 text-foreground ring-2 ring-primary/40'
          : 'border-border/50 bg-card/60 text-foreground hover:bg-card/90',
        className
      )}
      whileHover={{ scale: reduceMotion ? 1 : 1.012 }}
      whileTap={{ scale: reduceMotion ? 1 : 0.985 }}
      transition={{ duration: DURATION.fast, ease: EASE_OUT }}
    >
      {children}
    </motion.button>
  );
}
