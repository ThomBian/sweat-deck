import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { listSavedDecks, deleteSavedDeck, type SavedDeckRow } from '@/store/db';
import { buildPlan } from '@/domain/plan';
import { tExercise } from '@/i18n/exercises';
import { slotHeaderParts } from '@/lib/reviewSlotContext';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { SCROLL_CLEAR_FIXED_FOOTER_SETUP, SHELL_SETUP } from '@/lib/layout';
import { cn } from '@/lib/utils';

function summaryLine(deck: SavedDeckRow): string {
  const slots = buildPlan({ config: deck.config, overrides: deck.overrides });
  return slots
    .map((s) => `${slotHeaderParts(s.key).glyph} ${tExercise(s.selected)}`)
    .join(' · ');
}

export default function SavedDecks() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const setSavedDeckId = useGameStore((s) => s.setSavedDeckId);
  const [rows, setRows] = useState<SavedDeckRow[] | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const refresh = async () => {
    const next = await listSavedDecks();
    setRows(next);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handlePick = (deck: SavedDeckRow) => {
    if (deck.id == null) return;
    setSavedDeckId(deck.id);
    navigate('/deck', {
      state: {
        mode: 'guided',
        config: deck.config,
        overrides: deck.overrides,
        savedDeckId: deck.id,
        from: 'saved-decks',
      },
    });
  };

  const handleDelete = async (id: number) => {
    await deleteSavedDeck(id);
    setConfirmId(null);
    await refresh();
  };

  if (rows === null) return null;

  return (
    <main
      id="main-content"
      className={cn('relative flex min-h-dvh min-h-0 flex-col overflow-hidden', SHELL_SETUP)}
    >
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-y-contain',
          'px-5 sm:px-6',
          'pt-[max(1.25rem,env(safe-area-inset-top))]',
          SCROLL_CLEAR_FIXED_FOOTER_SETUP,
        )}
      >
        <header className="flex flex-col gap-2 pb-4">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            <Trans>Saved decks</Trans>
          </h1>
        </header>

        {rows.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm text-pretty text-base text-muted-foreground">
              <Trans>No saved decks yet. Finish a workout and save your deck to replay it.</Trans>
            </p>
          </div>
        ) : (
          <motion.ul
            className="flex flex-col gap-3 pb-2 sm:gap-4"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : DURATION.pageIn, ease: EASE_OUT }}
          >
            {rows.map((deck) => (
              <li key={deck.id} className="rounded-lg border border-border/50 bg-card/85">
                <div className="flex items-stretch gap-2 p-3 sm:p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    aria-label={deck.name}
                    onClick={() => handlePick(deck)}
                  >
                    <p className="font-display text-base font-semibold sm:text-lg">{deck.name}</p>
                    <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
                      {summaryLine(deck)}
                    </p>
                  </button>
                  {confirmId === deck.id ? (
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmId(null)}>
                        <Trans>Cancel</Trans>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        aria-label={t`Confirm delete`}
                        onClick={() => void handleDelete(deck.id!)}
                      >
                        <Trans>Confirm delete</Trans>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t`Delete ${deck.name}`}
                      onClick={() => setConfirmId(deck.id ?? null)}
                    >
                      <Trash2 className="size-5" aria-hidden />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </motion.ul>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
        <div className="mx-auto flex min-w-0 max-w-lg justify-start">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 touch-manipulation"
            onClick={() => navigate('/setup')}
          >
            <Trans>Back</Trans>
          </Button>
        </div>
      </footer>
    </main>
  );
}
