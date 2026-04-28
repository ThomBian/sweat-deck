import { useEffect, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Trans } from '@lingui/react/macro';
import type { SetupConfig } from '@/domain/config';
import type { PlanOverrides } from '@/domain/plan';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { saveDeck, updateSavedDeck } from '@/store/db';
import { useGameStore } from '@/store/gameStore';

type Props = {
  open: boolean;
  onClose: () => void;
  config: SetupConfig;
  overrides: PlanOverrides;
  savedDeckId?: number;
  initialName?: string;
};

export function SaveDeckSheet({
  open,
  onClose,
  config,
  overrides,
  savedDeckId,
  initialName,
}: Props) {
  const [name, setName] = useState(initialName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const setSavedDeckId = useGameStore((s) => s.setSavedDeckId);

  useEffect(() => {
    if (open) setName(initialName ?? '');
  }, [open, initialName]);

  const isUpdate = savedDeckId !== undefined;
  const trimmed = name.trim();
  const disabled = trimmed.length === 0 || submitting;

  const handleConfirm = async () => {
    if (disabled) return;
    setSubmitting(true);
    try {
      if (isUpdate) {
        await updateSavedDeck(savedDeckId!, { name: trimmed, config, overrides });
      } else {
        const id = await saveDeck({ name: trimmed, config, overrides });
        setSavedDeckId(id);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {({ dragControls, reduceMotion }) => (
        <>
          <div
            className="touch-none select-none"
            onPointerDown={(e) => {
              if (reduceMotion) return;
              void dragControls.start(e);
            }}
          >
            <div
              className="flex min-h-11 shrink-0 cursor-grab items-center justify-center pt-2 active:cursor-grabbing"
              aria-hidden
            >
              <span className="mb-1 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="px-5 sm:px-6">
              <Dialog.Title className="px-0.5 font-display text-xl font-semibold tracking-tight text-balance">
                {isUpdate ? <Trans>Update saved deck</Trans> : <Trans>Save deck</Trans>}
              </Dialog.Title>
              <Dialog.Description className="px-0.5 pt-1.5 text-sm leading-relaxed text-muted-foreground">
                <Trans>Name your deck so you can find it when you replay.</Trans>
              </Dialog.Description>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 px-5 pb-2 pt-3 sm:px-6">
            <label className="block text-sm font-medium" htmlFor="save-deck-name">
              <Trans>Deck name</Trans>
            </label>
            <input
              id="save-deck-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="min-h-12 w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-base outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          <div className="mt-auto flex shrink-0 justify-end gap-2 border-t border-border/40 px-5 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              <Trans>Cancel</Trans>
            </Button>
            <Button type="button" onClick={() => void handleConfirm()} disabled={disabled}>
              {isUpdate ? <Trans>Update</Trans> : <Trans>Save</Trans>}
            </Button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
