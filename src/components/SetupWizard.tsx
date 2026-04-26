import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { usePersistedConfig } from '@/hooks/usePersistedConfig';
import { saveLastConfig } from '@/store/db';
import { DEFAULT_CONFIG, type SetupConfig } from '@/domain/config';
import { Button } from '@/components/ui/button';
import { ShuffleTransition } from '@/components/ShuffleTransition';
import { DeckGlyphPulse } from '@/components/DeckGlyphPulse';
import { DifficultyStep } from '@/components/setup/DifficultyStep';
import { EquipmentStep } from '@/components/setup/EquipmentStep';
import { ThemeStep } from '@/components/setup/ThemeStep';
import { CardioStep } from '@/components/setup/CardioStep';
import { TimeStep } from '@/components/setup/TimeStep';
import { DURATION, EASE_OUT } from '@/lib/motion';

type Props = { onLeaveToLanding?: () => void };

export default function SetupWizard({ onLeaveToLanding }: Props) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { config: persisted, loaded, loadFailed } = usePersistedConfig();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<SetupConfig>(DEFAULT_CONFIG);
  const [showShuffle, setShowShuffle] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const seededRef = useRef(false);
  const [loadingLineIdx] = useState(() => Math.floor(Math.random() * 2));

  const steps = [
    { title: t`How hard?`, key: 'difficulty' as const },
    { title: t`What equipment?`, key: 'equipment' as const },
    { title: t`Which focus?`, key: 'theme' as const },
    { title: t`Specialty cardio?`, key: 'cardio' as const },
    { title: t`Time limit?`, key: 'time' as const },
  ] as const;

  const stepNudges = [
    t`Draws skew heavier as difficulty rises—still a card game, not a spreadsheet.`,
    t`Gear changes which moves you see for each suit.`,
    t`Theme nudges upper, lower, or full-body patterns into the mix.`,
    t`When this is on, face cards can pull from your cardio pick.`,
    t`A cap ends the run at time; no limit means you play the stack.`,
  ] as const;

  const loadingLines = [
    t`Finding your last setup in the stack…`,
    t`If you're new here, we'll start from friendly defaults.`,
  ] as const;
  const loadingLine = loadingLines[loadingLineIdx]!;

  useEffect(() => {
    if (!loaded || seededRef.current) return;
    setDraft(persisted);
    seededRef.current = true;
  }, [loaded, persisted]);

  const handleStart = async () => {
    if (starting) return;
    setStartError(false);
    setStarting(true);
    try {
      await saveLastConfig(draft);
      useGameStore.getState().start(draft);
      setShowShuffle(true);
    } catch {
      setStartError(true);
    } finally {
      setStarting(false);
    }
  };

  const selectAndMaybeAdvance = (patch: (prev: SetupConfig) => SetupConfig) => {
    setStartError(false);
    setDraft(patch);
    setStep((s) => (s < steps.length - 1 ? s + 1 : s));
  };

  if (!loaded) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-4 px-1 py-12" role="status">
        <DeckGlyphPulse />
        <p className="max-w-md text-center text-sm leading-relaxed break-words text-muted-foreground">
          {loadingLine}
        </p>
        <p className="sr-only">
          <Trans>Loading your last setup</Trans>
        </p>
      </div>
    );
  }

  const { title } = steps[step]!;
  const nudge = stepNudges[step]!;
  const nudgeTransition = reduceMotion
    ? { duration: 0.05, ease: EASE_OUT }
    : { duration: DURATION.pageOut, ease: EASE_OUT };

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 pb-28">
        <p className="sr-only" aria-live="polite">
          <Trans>
            Step {step + 1} of {steps.length}: {title}
          </Trans>
        </p>

        {loadFailed ? (
          <p className="text-xs leading-relaxed break-words text-muted-foreground" role="status">
            <Trans>Couldn&apos;t read your last setup. Showing defaults—you can change anything below.</Trans>
          </p>
        ) : null}

        <div className="flex min-w-0 gap-1.5" aria-hidden>
          {steps.map((_, i) => {
            const filled = i <= step;
            const active = i === step;
            return (
              <motion.div
                key={i}
                className={`h-1.5 min-w-0 flex-1 rounded-full ${filled ? 'bg-primary' : 'bg-muted'}`}
                initial={false}
                animate={{
                  scaleY: reduceMotion || !active ? 1 : [1, 1.28, 1],
                }}
                transition={{
                  duration: active && !reduceMotion ? 0.42 : 0.2,
                  ease: EASE_OUT,
                }}
              />
            );
          })}
        </div>

        <h1 className="min-w-0 font-display text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl">
          {title}
        </h1>

        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={step}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={nudgeTransition}
            className="-mt-2 max-w-[65ch] text-pretty break-words text-sm font-medium leading-relaxed text-deck-reward"
          >
            {nudge}
          </motion.p>
        </AnimatePresence>

        {step === 0 && (
          <DifficultyStep
            value={draft.difficulty}
            onChange={(v) => selectAndMaybeAdvance((d) => ({ ...d, difficulty: v }))}
          />
        )}
        {step === 1 && (
          <EquipmentStep
            value={draft.equipment}
            onChange={(v) => selectAndMaybeAdvance((d) => ({ ...d, equipment: v }))}
          />
        )}
        {step === 2 && (
          <ThemeStep value={draft.theme} onChange={(v) => selectAndMaybeAdvance((d) => ({ ...d, theme: v }))} />
        )}
        {step === 3 && (
          <CardioStep value={draft.cardio} onChange={(v) => selectAndMaybeAdvance((d) => ({ ...d, cardio: v }))} />
        )}
        {step === 4 && (
          <TimeStep
            value={draft.timeLimitMin}
            onChange={(v) => {
              setStartError(false);
              setDraft((d) => {
                const next: SetupConfig = { ...d };
                if (v === undefined) delete next.timeLimitMin;
                else next.timeLimitMin = v;
                return next;
              });
            }}
          />
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex min-w-0 max-w-lg items-center justify-between gap-3">
          {step > 0 ? (
            <motion.div
              className="min-w-0 shrink"
              whileTap={{ scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            >
              <Button
                type="button"
                variant="outline"
                className="min-h-11 touch-manipulation"
                onClick={() => {
                  setStartError(false);
                  setStep((s) => s - 1);
                }}
              >
                <Trans>Back</Trans>
              </Button>
            </motion.div>
          ) : onLeaveToLanding ? (
            <motion.div
              className="min-w-0 shrink"
              whileTap={{ scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            >
              <Button
                type="button"
                variant="outline"
                className="min-h-11 touch-manipulation"
                onClick={() => {
                  setStartError(false);
                  onLeaveToLanding();
                }}
              >
                <Trans>Back</Trans>
              </Button>
            </motion.div>
          ) : (
            <span className="min-w-0 shrink-0" />
          )}
          {step < steps.length - 1 ? (
            <motion.div
              className="min-w-0 shrink"
              whileHover={{ scale: reduceMotion ? 1 : 1.02 }}
              whileTap={{ scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            >
              <Button
                type="button"
                className="min-h-11 touch-manipulation"
                onClick={() => {
                  setStartError(false);
                  setStep((s) => s + 1);
                }}
              >
                <Trans>Next</Trans>
              </Button>
            </motion.div>
          ) : (
            <div className="flex min-w-0 flex-col items-end gap-2">
              {startError ? (
                <p
                  className="max-w-[min(100%,18rem)] text-right text-xs leading-relaxed break-words text-destructive"
                  role="alert"
                >
                  <Trans>Couldn&apos;t save setup. Check device storage, then try again.</Trans>
                </p>
              ) : null}
              <motion.div
                className="min-w-0"
                whileHover={{ scale: reduceMotion ? 1 : 1.02 }}
                whileTap={{ scale: reduceMotion ? 1 : 0.98 }}
                transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              >
                <Button
                  type="button"
                  className="min-h-11 touch-manipulation"
                  disabled={starting}
                  aria-busy={starting}
                  onClick={() => void handleStart()}
                >
                  {starting ? <Trans>Saving…</Trans> : <Trans>Deal the workout</Trans>}
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </footer>

      {showShuffle ? (
        <ShuffleTransition onComplete={() => navigate('/play', { replace: true })} />
      ) : null}
    </>
  );
}
