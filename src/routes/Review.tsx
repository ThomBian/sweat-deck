import { useEffect, useState } from 'react';
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
import { MAIN_PAD, SHELL_SETUP } from '@/lib/layout';
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
    try {
      await saveLastConfig(config);
    } catch {
      // non-blocking
    }
    start(config);
    setShowShuffle(true);
  };

  return (
    <main
      id="main-content"
      className={['relative flex flex-col', SHELL_SETUP, MAIN_PAD, 'min-h-dvh pb-32'].join(' ')}
    >
      <motion.div
        className="flex flex-col gap-6"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.1 : DURATION.pageIn, ease: EASE_OUT }}
      >
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl">
            <Trans>Review your deck</Trans>
          </h1>
          <p className="text-sm text-muted-foreground">
            <Trans>Tap a card to swap</Trans>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label={t`Exercise slots`}>
          {plan.map((slot) => (
            <ReviewCard key={slot.key} slot={slot} onPick={(id) => handlePick(slot.key, id)} />
          ))}
        </div>
      </motion.div>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex min-w-0 max-w-lg items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 touch-manipulation"
            onClick={() => navigate('/setup', { state: { config } })}
          >
            <Trans>Back</Trans>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 touch-manipulation text-muted-foreground"
              disabled={!hasOverrides}
              onClick={() => resetOverrides()}
            >
              <Trans>Reset swaps</Trans>
            </Button>
            <Button type="button" className="min-h-11 touch-manipulation" onClick={() => void handleStart()}>
              <Trans>Start workout</Trans>
            </Button>
          </div>
        </div>
      </footer>

      {showShuffle ? (
        <ShuffleTransition onComplete={() => navigate('/play', { replace: true })} />
      ) : null}
    </main>
  );
}
