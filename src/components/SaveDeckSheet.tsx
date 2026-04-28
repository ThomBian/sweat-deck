import { useEffect, useState } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import type { SetupConfig } from '@/domain/config';
import type { PlanOverrides } from '@/domain/plan';
import { Button } from '@/components/ui/button';
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

  if (!open) return null;

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isUpdate ? t`Update saved deck` : t`Save deck`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-border/50 bg-card p-5 shadow-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-semibold">
          {isUpdate ? <Trans>Update saved deck</Trans> : <Trans>Save deck</Trans>}
        </h2>
        <label className="mt-4 block text-sm font-medium" htmlFor="save-deck-name">
          <Trans>Deck name</Trans>
        </label>
        <input
          id="save-deck-name"
          aria-label={t`Deck name`}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="mt-2 min-h-11 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-base outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            <Trans>Cancel</Trans>
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={disabled}>
            {isUpdate ? <Trans>Update</Trans> : <Trans>Save</Trans>}
          </Button>
        </div>
      </div>
    </div>
  );
}
