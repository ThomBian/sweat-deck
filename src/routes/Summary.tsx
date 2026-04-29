import { Fragment, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trans } from '@lingui/react/macro';
import { SaveDeckSheet } from '@/components/SaveDeckSheet';
import { listSavedDecks } from '@/store/db';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { EASE_OUT } from '@/lib/motion';
import { MAIN_PAD, SETUP_CONTENT, SHELL_SUMMARY } from '@/lib/layout';
import { tSummaryKudoFor } from '@/lib/summaryKudos';
import { tDifficulty } from '@/i18n/labels';
import { getLimitSecFromConfig } from '@/lib/sessionTimer';
import { cn } from '@/lib/utils';
import { overridesEqual } from '@/lib/planDiff';

export default function Summary() {
  const navigate = useNavigate();
  const drawn = useGameStore((s) => s.drawn);
  const elapsedSec = useGameStore((s) => s.elapsedSec);
  const config = useGameStore((s) => s.config);
  const endReason = useGameStore((s) => s.endReason);
  const completedDeck = useGameStore((s) => s.completedDeck);
  const reset = useGameStore((s) => s.reset);
  const overrides = useGameStore((s) => s.overrides);
  const savedDeckId = useGameStore((s) => s.savedDeckId);
  const savedBaseline = useGameStore((s) => s.savedBaseline);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [savedDeckName, setSavedDeckName] = useState<string | undefined>(undefined);
  const reduceMotion = useReducedMotion();

  const hasUnsavedChanges = savedBaseline
    ? !overridesEqual(overrides, savedBaseline.overrides)
    : Object.keys(overrides).length > 0;
  const showSaveInvite = savedDeckId == null || hasUnsavedChanges;

  useEffect(() => {
    if (savedDeckId == null) {
      setSavedDeckName(undefined);
      return;
    }
    void listSavedDecks().then((rows) => {
      setSavedDeckName(rows.find((r) => r.id === savedDeckId)?.name);
    });
  }, [savedDeckId]);

  const limit = getLimitSecFromConfig(config);
  const endedInOvertime = limit != null && elapsedSec > limit;
  const kudo = tSummaryKudoFor({
    difficulty: config.difficulty,
    endReason: endReason === 'deck' || endReason === 'manual' ? endReason : 'manual',
    completedDeck,
    endedInOvertime,
  });

  const tMotion = reduceMotion ? 0.1 : 0.28;
  const timeStr = `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`;

  const finish = () => {
    reset();
    navigate('/setup');
  };

  return (
    <Fragment>
      <main id="main-content" className={cn('flex min-h-dvh flex-col justify-center', SHELL_SUMMARY, MAIN_PAD)}>
        <motion.div
          className={cn(SETUP_CONTENT, 'flex flex-col items-center text-center')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: tMotion, ease: EASE_OUT }}
        >
          <header className="flex w-full flex-col items-center gap-2 sm:gap-2.5">
            <p className="ui-kicker max-w-[min(100%,38ch)] text-pretty tracking-[0.18em]">{kudo}</p>
            <h1 className="text-balance">
              <Trans>Workout complete</Trans>
            </h1>
            <p className="text-sm leading-snug text-muted-foreground">{tDifficulty(config.difficulty)}</p>
          </header>

          <dl className="mt-10 grid w-full max-w-sm grid-cols-2 gap-x-8 sm:mt-12 sm:gap-x-10">
            <div className="min-w-0 text-center">
              <dt className="ui-label-caps">
                <Trans>Cards drawn</Trans>
              </dt>
              <dd className="text-deck-reward mt-2 font-sans text-3xl font-bold tabular-nums leading-none sm:text-4xl">
                {drawn.length}
              </dd>
            </div>
            <div className="min-w-0 text-center">
              <dt className="ui-label-caps">
                <Trans>Elapsed</Trans>
              </dt>
              <dd className="text-deck-reward mt-2 font-sans text-3xl font-bold tabular-nums leading-none sm:text-4xl">
                {timeStr}
              </dd>
            </div>
          </dl>

          {showSaveInvite ? (
            <>
              <p className="mt-10 max-w-[min(100%,34ch)] text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-12">
                <Trans>
                  Liked the workout?{' '}
                  <span className="font-medium text-deck-reward">Save it</span> — replays later with one tap.
                </Trans>
              </p>

              <div className="mt-4 flex w-full max-w-md flex-col gap-3 sm:gap-3.5">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full min-w-0 shrink touch-manipulation"
                  onClick={() => setSheetOpen(true)}
                >
                  <span className="truncate">
                    {savedDeckId != null ? <Trans>Update deck</Trans> : <Trans>Save deck</Trans>}
                  </span>
                </Button>
              </div>
            </>
          ) : null}

          <div className="mt-4 flex w-full max-w-md flex-col gap-3 sm:gap-3.5">
            <Button type="button" className="min-h-11 w-full min-w-0 shrink touch-manipulation" onClick={finish}>
              <span className="truncate">
                <Trans>Finish</Trans>
              </span>
            </Button>
          </div>
        </motion.div>
      </main>
      <SaveDeckSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        config={config}
        overrides={overrides}
        {...(savedDeckId != null ? { savedDeckId } : {})}
        {...(savedDeckName != null ? { initialName: savedDeckName } : {})}
      />
    </Fragment>
  );
}
