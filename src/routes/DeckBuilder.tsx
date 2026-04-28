import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BookmarkCheck } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { DEFAULT_CONFIG, type SetupConfig } from '@/domain/config';
import type { PlanOverrides, SlotKey } from '@/domain/plan';
import { DeckSlotCard } from '@/components/deck/DeckSlotCard';
import type { PrescriptionType } from '@/components/deck/PrescriptionStepper';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { ShuffleTransition } from '@/components/ShuffleTransition';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { SHELL_SETUP } from '@/lib/layout';
import { cn } from '@/lib/utils';
import { useDeckComposer } from '@/hooks/useDeckComposer';
import { SaveDeckSheet } from '@/components/SaveDeckSheet';
import { listSavedDecks } from '@/store/db';

type LocationState = {
  mode?: 'guided' | 'manual';
  config?: SetupConfig;
  overrides?: PlanOverrides;
  savedDeckId?: number;
  from?: 'saved-decks';
} | null;

export default function DeckBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const mode = state?.mode ?? 'guided';
  const config = state?.config;
  const initialOverrides = state?.overrides;
  const stateSavedDeckId = state?.savedDeckId;
  const fromSavedDecks = state?.from === 'saved-decks';
  const setSavedDeckId = useGameStore((s) => s.setSavedDeckId);

  useEffect(() => {
    if (mode === 'guided' && !config) {
      navigate('/setup', { replace: true });
      return;
    }
    if (stateSavedDeckId !== undefined) {
      setSavedDeckId(stateSavedDeckId);
    } else if (!fromSavedDecks) {
      setSavedDeckId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mode === 'guided' && !config) return null;

  const composerInput =
    mode === 'manual'
      ? { mode: 'manual' as const, ...(initialOverrides ? { initialOverrides } : {}) }
      : { mode: 'guided' as const, config: config!, ...(initialOverrides ? { initialOverrides } : {}) };

  return (
    <DeckBuilderInner config={config} composerInput={composerInput} fromSavedDecks={fromSavedDecks} />
  );
}

function DeckBuilderInner({
  config,
  composerInput,
  fromSavedDecks,
}: {
  config: SetupConfig | undefined;
  composerInput:
    | { mode: 'guided'; config: SetupConfig; initialOverrides?: PlanOverrides }
    | { mode: 'manual'; initialOverrides?: PlanOverrides };
  fromSavedDecks: boolean;
}) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const mergePrescriptionOverride = useGameStore((s) => s.mergePrescriptionOverride);
  const overrides = useGameStore((s) => s.overrides);
  const savedDeckId = useGameStore((s) => s.savedDeckId);
  const { slots, isReady, setSlot, handleStart, footerLocked, showShuffle, hasOverrides, resetOverrides } =
    useDeckComposer(composerInput);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [savedDeckName, setSavedDeckName] = useState<string | undefined>(undefined);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (savedDeckId == null) {
      setSavedDeckName(undefined);
      return;
    }
    void listSavedDecks().then((rows) => {
      const found = rows.find((r) => r.id === savedDeckId);
      setSavedDeckName(found?.name);
    });
  }, [savedDeckId]);

  const handlePrescriptionChange = (key: SlotKey, field: PrescriptionType, value: number) => {
    mergePrescriptionOverride(key, field, value);
  };

  const sheetConfig = composerInput.mode === 'guided' ? composerInput.config : DEFAULT_CONFIG;
  const handleSheetClose = () => {
    setSheetOpen(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const handleBack = () => {
    if (fromSavedDecks) {
      navigate('/saved-decks');
      return;
    }
    navigate('/setup', {
      state: config ? { config } : { skipLandingEntrance: true },
    });
  };

  /** Same title + lede in guided and manual — slot cards show empty/filled; behavior differs (e.g. Start disabled). */
  const heading = t`Review your deck`;
  const subheading = t`Tap a card to pick or change each exercise. On J, Q, and K, adjust reps, time, or distance below the name.`;

  return (
    <Fragment>
      <main
        id="main-content"
        inert={showShuffle ? true : undefined}
        className={cn('relative flex h-dvh min-h-0 flex-col overflow-hidden', SHELL_SETUP)}
      >
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-y-contain',
            'px-5 sm:px-6',
            'pt-[max(1.25rem,env(safe-area-inset-top))] sm:pt-6',
            'max-md:pb-[max(10rem,calc(env(safe-area-inset-bottom)+6.25rem))]',
            'md:pb-[max(8.5rem,calc(env(safe-area-inset-bottom)+5.5rem))]',
          )}
        >
          <motion.div
            className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : DURATION.pageIn, ease: EASE_OUT }}
          >
            <header className="flex flex-col gap-2 sm:gap-3">
              <h1 className="min-w-0 font-display text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl">
                {heading}
              </h1>
              <p className="max-w-[65ch] text-pretty text-balance break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {subheading}
              </p>
            </header>

            <div
              className={cn(
                'grid gap-x-4 gap-y-5 [&>*]:min-w-0 sm:gap-x-5 sm:gap-y-6',
                'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
              )}
              aria-label={t`Exercise slots`}
            >
              {slots.map((slot) => (
                <DeckSlotCard
                  key={slot.key}
                  config={composerInput.mode === 'guided' ? composerInput.config : DEFAULT_CONFIG}
                  slot={slot}
                  onPick={(id) => setSlot(slot.key, id)}
                  onPrescriptionChange={(field, value) => handlePrescriptionChange(slot.key, field, value)}
                />
              ))}
            </div>

            {hasOverrides ? (
              <div className="mt-2 border-t border-border/40 pt-4 sm:pt-5">
                <motion.div
                  whileTap={{ scale: reduceMotion || footerLocked ? 1 : 0.98 }}
                  transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-h-11 w-full touch-manipulation justify-start px-2 text-left text-muted-foreground sm:w-auto"
                    disabled={footerLocked}
                    onClick={() => resetOverrides()}
                  >
                    <span className="text-pretty break-words">
                      <Trans>Reset swaps</Trans>
                    </span>
                  </Button>
                </motion.div>
              </div>
            ) : null}

            <div className="mt-2 border-t border-border/40 pt-5 sm:pt-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reduceMotion ? 0.1 : DURATION.fast, ease: EASE_OUT }}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full touch-manipulation sm:w-auto"
                  disabled={footerLocked || !isReady}
                  onClick={() => setSheetOpen(true)}
                >
                  {savedFlash ? (
                    <span className="inline-flex items-center gap-2">
                      <BookmarkCheck className="size-4 shrink-0 text-primary" aria-hidden />
                      <Trans>Saved</Trans>
                    </span>
                  ) : savedDeckId != null ? (
                    <Trans>Update saved deck</Trans>
                  ) : (
                    <Trans>Save deck</Trans>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
          <div className="mx-auto flex min-w-0 max-w-lg items-center justify-between gap-3">
            <motion.div
              className="min-w-0 shrink"
              whileTap={{ scale: reduceMotion || footerLocked ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            >
              <Button
                type="button"
                variant="outline"
                className="min-h-11 touch-manipulation"
                disabled={footerLocked}
                onClick={handleBack}
              >
                <Trans>Back</Trans>
              </Button>
            </motion.div>

            <motion.div
              className="min-w-0 shrink"
              whileHover={{ scale: reduceMotion || footerLocked || !isReady ? 1 : 1.02 }}
              whileTap={{ scale: reduceMotion || footerLocked || !isReady ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            >
              <Button
                type="button"
                className="min-h-11 touch-manipulation"
                disabled={footerLocked || !isReady}
                onClick={() => void handleStart()}
              >
                <Trans>Start workout</Trans>
              </Button>
            </motion.div>
          </div>
        </footer>
      </main>
      {showShuffle ? (
        <ShuffleTransition onComplete={() => navigate('/play', { replace: true })} />
      ) : null}
      <SaveDeckSheet
        open={sheetOpen}
        onClose={handleSheetClose}
        config={sheetConfig}
        overrides={overrides}
        {...(savedDeckId != null ? { savedDeckId } : {})}
        {...(savedDeckName != null ? { initialName: savedDeckName } : {})}
      />
    </Fragment>
  );
}
