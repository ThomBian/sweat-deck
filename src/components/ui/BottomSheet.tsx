import { type ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { motion, useDragControls, useReducedMotion, type PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';

const DISMISS_OFFSET_PX = 72;
const DISMISS_VELOCITY = 420;

export type BottomSheetRenderProps = {
  dragControls: ReturnType<typeof useDragControls>;
  reduceMotion: boolean;
};

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: (props: BottomSheetRenderProps) => ReactNode;
};

/**
 * Shared bottom sheet shell (drag handle, backdrop, dismiss physics) — matches {@link ExercisePickerSheet}.
 */
export function BottomSheet({ open, onOpenChange, children }: BottomSheetProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const dragControls = useDragControls();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-black/50" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-[101] flex max-h-[80dvh] w-full flex-col outline-none">
          <motion.div
            initial={false}
            className={cn(
              'flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-[1.25rem] border border-border/50 bg-background shadow-lg',
              'pb-[env(safe-area-inset-bottom)]',
            )}
            {...(reduceMotion
              ? { drag: false as const }
              : {
                  drag: 'y' as const,
                  dragControls,
                  dragListener: false as const,
                  dragConstraints: { top: 0, bottom: 320 },
                  dragElastic: { top: 0, bottom: 0.14 },
                  onDragEnd: (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
                    if (info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY) {
                      onOpenChange(false);
                    }
                  },
                })}
          >
            {children({ dragControls, reduceMotion })}
          </motion.div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
