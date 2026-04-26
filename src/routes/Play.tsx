import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { Pause, Play as PlayIcon, X } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { Deck } from '@/components/Deck';
import { ExercisePanel } from '@/components/ExercisePanel';
import { Timer } from '@/components/Timer';
import { Button } from '@/components/ui/button';
import { EASE_OUT } from '@/lib/motion';
import { MAIN_PAD } from '@/lib/layout';
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
    <main id="main-content" className={`relative flex min-h-dvh flex-col gap-6 ${MAIN_PAD}`}>
      <motion.header
        className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4"
        {...item(0)}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
              <Trans>Sweat Deck</Trans>
            </h1>
            <span className="hidden text-sm leading-snug text-muted-foreground sm:inline" aria-hidden>
              <Trans>draw · move · repeat</Trans>
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setDetail((p) => !p)}
                className={cn(
                  'min-h-9 max-w-full rounded-lg border px-2.5 py-1.5 text-left text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                  DIFFICULTY_TONE_PILL[tone],
                )}
                aria-expanded={detail}
                aria-label={t`View difficulty details`}
              >
                {tDifficulty(config.difficulty)}
              </button>
              {detail ? (
                <div
                  className="absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,20rem)] rounded-xl border border-border/60 bg-card/95 p-3 text-left shadow-lg backdrop-blur"
                  role="region"
                >
                  <p className="text-sm text-muted-foreground">
                    {tDifficultyDescription(config.difficulty)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground/90">
                    {tDifficultyRepHint(config.difficulty)}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full"
                    onClick={() => setDetail(false)}
                  >
                    <Trans>Close</Trans>
                  </Button>
                </div>
              ) : null}
            </div>
            <Timer />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-10 shrink-0"
              onClick={() => (pausedAt ? resume() : pause('user'))}
              aria-pressed={!!pausedAt}
              aria-label={pausedAt ? t`Resume` : t`Pause`}
            >
              {pausedAt ? <PlayIcon className="size-5" /> : <Pause className="size-5" />}
            </Button>
            <Button variant="secondary" onClick={handleFinish} className="min-h-10">
              <Trans>Finish</Trans>
            </Button>
          </div>
        </div>
      </motion.header>
      <motion.section
        className="flex flex-1 flex-col items-center justify-center gap-10"
        {...item(1)}
      >
        <Deck remaining={deck.length} onDraw={drawNext} drawDisabled={!!pausedAt} />
        <ExercisePanel exercise={current} />
      </motion.section>
      {pausedAt ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/75 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label={t`Paused`}
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-border/60 bg-card/95 p-8 text-center shadow-lg">
            <X className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-2xl font-bold tracking-tight text-foreground">
              <Trans>Paused</Trans>
            </p>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
              <Trans>Take a breath. Your clock is on hold—resume when you are ready.</Trans>
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
