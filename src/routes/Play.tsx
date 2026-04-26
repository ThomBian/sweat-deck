import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { CircleStop, Pause, Play as PlayIcon } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { Deck } from '@/components/Deck';
import { ExercisePanel } from '@/components/ExercisePanel';
import { Timer } from '@/components/Timer';
import { Button } from '@/components/ui/button';
import { EASE_OUT } from '@/lib/motion';
import { MAIN_PAD, SHELL_PLAY } from '@/lib/layout';
import { useVisibilityPause } from '@/hooks/useVisibilityPause';
import { DIFFICULTY_TONE, DIFFICULTY_TONE_PILL } from '@/domain/difficultyMeta';
import { tDifficulty, tDifficultyDescription, tDifficultyRepHint } from '@/i18n/labels';
import { cn } from '@/lib/utils';

const stagger = 0.06;

export default function Play() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [detail, setDetail] = useState(false);
  const startedAt = useGameStore((s) => s.startedAt);
  const deck = useGameStore((s) => s.deck);
  const current = useGameStore((s) => s.current);
  const drawNext = useGameStore((s) => s.drawNext);
  const finish = useGameStore((s) => s.finish);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const pausedAt = useGameStore((s) => s.pausedAt);
  const config = useGameStore((s) => s.config);
  const tone = DIFFICULTY_TONE[config.difficulty];

  useVisibilityPause();

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetail(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  if (startedAt == null) {
    return <Navigate to="/setup" replace />;
  }

  const handleFinish = async () => {
    await finish({ reason: 'manual', completedDeck: false });
    navigate('/summary');
  };

  const y = 8;
  const base = { duration: 0.26, ease: EASE_OUT };
  const item = (i: number) =>
    reduce
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.01, delay: 0, ease: EASE_OUT },
        }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { ...base, delay: i * stagger },
        };

  return (
    <main
      id="main-content"
      className={`relative flex min-h-dvh flex-col gap-4 ${SHELL_PLAY} ${MAIN_PAD}`}
      aria-labelledby="play-page-title"
    >
      <motion.header className="flex w-full min-w-0 flex-col gap-2 pb-1" {...item(0)}>
        <h1 className="sr-only" id="play-page-title">
          <Trans>Workout</Trans>
        </h1>

        {detail ? (
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default bg-background/50 backdrop-blur-[2px] sm:hidden"
            aria-label={t`Close difficulty details`}
            onClick={() => setDetail(false)}
          />
        ) : null}

        <div className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3.5">
          <div className="relative min-w-0 max-w-[min(100%,13.5rem)] shrink sm:max-w-[14rem]">
            <button
              type="button"
              onClick={() => setDetail((p) => !p)}
              className={cn(
                'min-h-11 max-w-full truncate rounded-lg border px-2.5 py-1.5 text-left text-sm font-medium transition-colors',
                'sm:min-h-9',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                DIFFICULTY_TONE_PILL[tone],
              )}
              aria-expanded={detail}
              aria-label={t`View difficulty details`}
              title={tDifficultyDescription(config.difficulty)}
            >
              {tDifficulty(config.difficulty)}
            </button>
            {detail ? (
              <div
                className={cn(
                  'z-30 max-h-[min(70dvh,22rem)] overflow-y-auto rounded-xl border border-border/60 bg-card/95 p-3 text-left shadow-lg backdrop-blur',
                  'max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-1/2 max-sm:mt-0 max-sm:max-h-[min(80dvh,24rem)] max-sm:-translate-y-1/2',
                  'sm:absolute sm:left-0 sm:top-full sm:mt-2 sm:max-h-none sm:translate-y-0',
                  'w-[min(100%,20rem)] max-sm:w-auto sm:w-[min(100vw-2rem,20rem)]',
                )}
                role="region"
                aria-label={t`Difficulty details`}
              >
                <p className="text-pretty text-sm text-muted-foreground">
                  {tDifficultyDescription(config.difficulty)}
                </p>
                <p className="mt-2 text-pretty text-xs text-muted-foreground/90">
                  {tDifficultyRepHint(config.difficulty)}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-2.5">
            <Timer />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-11 min-h-11 min-w-11 shrink-0 touch-manipulation sm:size-10 sm:min-h-10 sm:min-w-10"
              onClick={() => (pausedAt ? resume() : pause('user'))}
              aria-pressed={!!pausedAt}
              aria-label={pausedAt ? t`Resume` : t`Pause`}
            >
              {pausedAt ? <PlayIcon className="size-5" /> : <Pause className="size-5" />}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="min-h-11 min-w-11 shrink-0 touch-manipulation sm:hidden"
              onClick={handleFinish}
              aria-label={t`Finish session`}
            >
              <CircleStop className="size-5" aria-hidden />
            </Button>
            <Button
              variant="secondary"
              onClick={handleFinish}
              className="hidden min-h-10 shrink-0 px-3.5 sm:inline-flex"
            >
              <Trans>Finish</Trans>
            </Button>
          </div>
        </div>
      </motion.header>
      <motion.section
        className="flex flex-1 flex-col items-center justify-center gap-7 sm:gap-8"
        {...item(1)}
      >
        <Deck remaining={deck.length} onDraw={drawNext} drawDisabled={!!pausedAt} />
        <ExercisePanel exercise={current} />
      </motion.section>
      {pausedAt ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label={t`Paused`}
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card/95 p-6 text-center">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              <Trans>Paused</Trans>
            </p>
            <p className="text-pretty text-sm text-muted-foreground">
              <Trans>Clock stopped—resume or finish the session.</Trans>
            </p>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button className="min-h-11 flex-1" onClick={() => resume()}>
                <Trans>Resume</Trans>
              </Button>
              <Button variant="secondary" className="min-h-11 flex-1" onClick={handleFinish}>
                <Trans>Finish</Trans>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
