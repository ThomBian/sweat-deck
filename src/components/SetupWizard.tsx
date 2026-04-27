import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion';
import { usePersistedConfig } from '@/hooks/usePersistedConfig';
import { saveLastConfig } from '@/store/db';
import { DEFAULT_CONFIG, type SetupConfig } from '@/domain/config';
import { Button } from '@/components/ui/button';
import { DeckGlyphPulse } from '@/components/DeckGlyphPulse';
import { DifficultyStep } from '@/components/setup/DifficultyStep';
import { EquipmentStep } from '@/components/setup/EquipmentStep';
import { ThemeStep } from '@/components/setup/ThemeStep';
import { CardioStep } from '@/components/setup/CardioStep';
import { TimeStep } from '@/components/setup/TimeStep';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { SCROLL_CLEAR_FIXED_FOOTER_SETUP } from '@/lib/layout';
import { cn } from '@/lib/utils';

type Props = { onLeaveToLanding?: () => void; initialConfig?: SetupConfig };

export default function SetupWizard({ onLeaveToLanding, initialConfig }: Props) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { config: persisted, loaded, loadFailed } = usePersistedConfig();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<SetupConfig>(DEFAULT_CONFIG);
  const seededRef = useRef(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadingLineIdx] = useState(() => Math.floor(Math.random() * 2));

  const steps = [
    { title: t`How hard?`, key: 'difficulty' as const },
    { title: t`What equipment?`, key: 'equipment' as const },
    { title: t`Which focus?`, key: 'theme' as const },
    { title: t`Cardio mode?`, key: 'cardio' as const },
    { title: t`Time limit?`, key: 'time' as const },
  ] as const;

  const stepNudges = [
    t`Difficulty affects the odds of drawing harder cards, and the default exercises you're assigned.`,
    t`Gear changes which moves you see for each suit.`,
    t`Theme nudges upper, lower, or full-body patterns into the mix.`,
    t`Enabling cardio mode favors high-intensity movements.`,
  ] as const;

  const loadingLines = [
    t`Finding your last setup in the stack…`,
    t`If you're new here, we'll start from friendly defaults.`,
  ] as const;
  const loadingLine = loadingLines[loadingLineIdx]!;

  useEffect(() => {
    if (!loaded || seededRef.current) return;
    setDraft(initialConfig ?? persisted);
    if (initialConfig) {
      setStep(4);
    }
    seededRef.current = true;
  }, [loaded, persisted, initialConfig]);

  useEffect(
    () => () => {
      if (advanceTimerRef.current != null) {
        clearTimeout(advanceTimerRef.current);
      }
    },
    [],
  );

  const handleGoToReview = async () => {
    try {
      await saveLastConfig(draft);
    } catch {
      // non-blocking; config save failure shouldn't block review
    }
    navigate('/review', { state: { config: draft } });
  };

  const selectAndMaybeAdvance = (patch: (prev: SetupConfig) => SetupConfig) => {
    setDraft(patch);
    if (advanceTimerRef.current != null) {
      clearTimeout(advanceTimerRef.current);
    }
    const delayMs = reduceMotion ? 55 : Math.round(DURATION.setupCommit * 1000);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, delayMs);
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
  const stepPanelTransition: Transition = reduceMotion
    ? { duration: 0.05, ease: EASE_OUT }
    : {
        opacity: { duration: DURATION.pageIn, ease: EASE_OUT },
        x: { duration: DURATION.pageIn, ease: EASE_OUT },
      };

  return (
    <>
      <div
        className={cn(
          /* No flex-1: column must size to its content so the outer overflow-y-auto
             can scroll the full list above the fixed footer. */
          'flex w-full min-w-0 flex-col gap-6',
          SCROLL_CLEAR_FIXED_FOOTER_SETUP,
        )}
      >
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

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          className="flex flex-col gap-6"
          initial={reduceMotion ? false : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          {...(!reduceMotion ? { exit: { opacity: 0, x: -22 } as const } : {})}
          transition={stepPanelTransition}
        >
          <h1 className="min-w-0 font-display text-2xl font-semibold tracking-tight text-balance break-words sm:text-3xl">
            {title}
          </h1>

          {step < stepNudges.length ? (
            <p className="-mt-2 max-w-[65ch] text-pretty break-words text-sm font-medium leading-relaxed text-deck-reward">
              {stepNudges[step]!}
            </p>
          ) : null}

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
                setDraft((d) => {
                  const next: SetupConfig = { ...d };
                  if (v === undefined) delete next.timeLimitMin;
                  else next.timeLimitMin = v;
                  return next;
                });
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/90 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6">
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
                  setStep((s) => s + 1);
                }}
              >
                <Trans>Next</Trans>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              className="min-w-0"
              whileHover={{ scale: reduceMotion ? 1 : 1.02 }}
              whileTap={{ scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
            >
              <Button
                type="button"
                className="min-h-11 touch-manipulation"
                onClick={() => void handleGoToReview()}
              >
                <Trans>Review your deck</Trans>
              </Button>
            </motion.div>
          )}
        </div>
      </footer>
    </>
  );
}
