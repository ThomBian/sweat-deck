import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Layers, Trash2 } from 'lucide-react';
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

  const loading = rows === null;

  return (
    <main
      id="main-content"
      className={cn('relative flex min-h-dvh min-h-0 flex-col overflow-hidden', SHELL_SETUP)}
      aria-busy={loading ? true : undefined}
    >
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-y-contain',
          'px-5 sm:px-6',
          'pt-[max(1.25rem,env(safe-area-inset-top))]',
          SCROLL_CLEAR_FIXED_FOOTER_SETUP,
        )}
      >
        <motion.header
          className="flex flex-col gap-2 pb-4"
          initial={{ opacity: 1, y: reduceMotion ? 0 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
        >
          <h1 id="saved-decks-heading" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            <Trans>Saved decks</Trans>
          </h1>
        </motion.header>

        {loading ? (
          <p role="status" aria-live="polite" className="pb-8 text-sm text-muted-foreground">
            <span className="animate-pulse">
              <Trans>Loading</Trans>
            </span>
          </p>
        ) : rows.length === 0 ? (
          <motion.div
            role="region"
            aria-labelledby="saved-decks-heading"
            className="flex min-h-[min(40vh,calc(100dvh-11rem))] flex-col items-center justify-center gap-6 px-1 text-center"
            initial={{ opacity: 1, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : DURATION.pageIn, ease: EASE_OUT }}
          >
            <Layers aria-hidden className="size-11 shrink-0 text-muted-foreground/30" strokeWidth={1.15} />
            <p className="max-w-[min(100%,38ch)] text-pretty text-sm leading-relaxed text-muted-foreground">
              <Trans>
                Save a deck from the finish screen, deck review, or builder—then replay it from Setup’s Replay tab.
              </Trans>
            </p>
          </motion.div>
        ) : (
          <ul
            className="flex flex-col gap-3 pb-2 sm:gap-4"
            aria-labelledby="saved-decks-heading"
          >
            {rows.map((deck, index) => {
              const confirming = confirmId === deck.id;
              const enterDelay = reduceMotion ? 0 : 0.04 + index * 0.05;
              return (
                <motion.li
                  key={deck.id}
                  initial={{
                    opacity: reduceMotion ? 1 : 0,
                    y: reduceMotion ? 0 : 8,
                  }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : DURATION.fast,
                    ease: EASE_OUT,
                    delay: enterDelay,
                  }}
                  className={cn(
                    'rounded-lg border border-border/50 bg-card/85 transition-colors duration-150',
                    'hover:border-border/65 focus-within:border-border/75',
                  )}
                >
                  <div className="flex flex-col gap-3 p-3 sm:gap-3.5 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <motion.button
                        type="button"
                        className="-m-2 min-w-0 flex-1 rounded-xl p-2 text-left outline-none transition-colors duration-150 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        title={deck.name}
                        aria-label={t`Open ${deck.name}`}
                        onClick={() => handlePick(deck)}
                        {...(!reduceMotion ? { whileTap: { scale: 0.985 } as const } : {})}
                        transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                      >
                        <p className="truncate font-display text-base font-semibold sm:text-lg">{deck.name}</p>
                        <p className="mt-1 break-words text-xs text-muted-foreground sm:text-sm">
                          {summaryLine(deck)}
                        </p>
                      </motion.button>
                      {!confirming ? (
                        <motion.div {...(!reduceMotion ? { whileTap: { scale: 0.88 } as const } : {})} className="shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="touch-manipulation"
                            aria-label={t`Delete ${deck.name}`}
                            onClick={() => setConfirmId(deck.id ?? null)}
                          >
                            <Trash2 className="size-5" aria-hidden />
                          </Button>
                        </motion.div>
                      ) : null}
                    </div>
                    <AnimatePresence initial={false}>
                      {confirming ? (
                        <motion.div
                          key="confirm"
                          initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                          className="flex flex-col gap-2 border-t border-border/40 pt-3"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 w-full touch-manipulation"
                            onClick={() => setConfirmId(null)}
                          >
                            <Trans>Cancel</Trans>
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="h-11 w-full touch-manipulation"
                            aria-label={t`Confirm delete`}
                            onClick={() => void handleDelete(deck.id!)}
                          >
                            <Trans>Confirm delete</Trans>
                          </Button>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      <motion.footer
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6"
        initial={{ opacity: 1, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0.1 : DURATION.pageIn,
          ease: EASE_OUT,
          delay: reduceMotion ? 0 : 0.04,
        }}
      >
        <div className="mx-auto flex min-w-0 max-w-lg justify-start">
          <motion.div {...(!reduceMotion ? { whileTap: { scale: 0.98 } as const } : {})}>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 touch-manipulation"
              onClick={() => navigate('/setup')}
            >
              <Trans>Back</Trans>
            </Button>
          </motion.div>
        </div>
      </motion.footer>
    </main>
  );
}
