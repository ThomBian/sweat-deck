import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useGameStore } from '@/store/gameStore';
import { buildPlan } from '@/domain/plan';
import type { ExerciseId } from '@/domain/exercise';
import type { SlotKey } from '@/domain/plan';
import type { SetupConfig } from '@/domain/config';
import { ReviewCard } from '@/components/review/ReviewCard';
import { Button } from '@/components/ui/button';
import { ShuffleTransition } from '@/components/ShuffleTransition';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { SHELL_SETUP } from '@/lib/layout';
import { cn } from '@/lib/utils';
import { saveLastConfig } from '@/store/db';

export default function Review() {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const config: SetupConfig | undefined = (location.state as { config?: SetupConfig } | null)?.config;

  const overrides = useGameStore((s) => s.overrides);
  const setOverride = useGameStore((s) => s.setOverride);
  const resetOverrides = useGameStore((s) => s.resetOverrides);
  const start = useGameStore((s) => s.start);

  const [showShuffle, setShowShuffle] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!config) {
      navigate('/setup', { replace: true });
      return;
    }
    resetOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  if (!config) return null;

  const plan = buildPlan({ config, overrides });
  const hasOverrides = Object.keys(overrides).length > 0;

  const handlePick = (key: SlotKey, id: ExerciseId) => {
    setOverride(key, id);
  };

  const handleStart = async () => {
    if (showShuffle || isStarting) return;
    setIsStarting(true);
    try {
      await saveLastConfig(config);
    } catch {
      // non-blocking
    }
    start(config);
    setShowShuffle(true);
  };

  const footerLocked = showShuffle || isStarting;

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
            /* Clear fixed footer + safe area + extra for expanded alt rows */
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
                <Trans>Review your deck</Trans>
              </h1>
              <p className="max-w-[65ch] text-pretty break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                <Trans>Tap a card to swap or search the full list.</Trans>
              </p>
            </header>

            <div
              className={cn(
                /* Slightly looser row rhythm than column gap — easier vertical scan */
                'grid gap-x-3 gap-y-4 sm:gap-y-5 [&>*]:min-w-0',
                'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
              )}
              aria-label={t`Exercise slots`}
            >
              {plan.map((slot) => (
                <ReviewCard
                  key={slot.key}
                  config={config}
                  slot={slot}
                  onPick={(id) => handlePick(slot.key, id)}
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
                onClick={() => navigate('/setup', { state: { config } })}
              >
                <Trans>Back</Trans>
              </Button>
            </motion.div>
            <motion.div
              className="min-w-0 shrink"
              whileHover={{ scale: reduceMotion || footerLocked ? 1 : 1.02 }}
              whileTap={{ scale: reduceMotion || footerLocked ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            >
              <Button
                type="button"
                className="min-h-11 touch-manipulation"
                disabled={footerLocked}
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
    </Fragment>
  );
}
