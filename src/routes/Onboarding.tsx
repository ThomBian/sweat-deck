import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { ChevronDown } from 'lucide-react';
import { useHasOnboarded } from '@/hooks/useHasOnboarded';
import { Button } from '@/components/ui/button';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { MAIN_PAD, SHELL_ONBOARD } from '@/lib/layout';

export default function Onboarding() {
  const rulesFull = [
    t`You play with a full 54-card deck (jokers included).`,
    t`Each suit maps to a movement pattern.`,
    t`Number cards use the face value as your rep count.`,
    t`Face cards are fixed high-intensity challenges.`,
    t`Aces are a one-minute rest break.`,
    t`Jokers are chaos—wildcard rounds that react to cards you already drew.`,
  ] as const;

  const essentials = [
    t`Full deck, 54 cards—each suit is a movement pattern; the number is your rep count.`,
    t`Face cards are high-intensity. Aces are a one-minute rest break.`,
    t`Jokers are wild rounds that react to what you have already drawn.`,
  ] as const;

  const [searchParams] = useSearchParams();
  const replay = searchParams.get('replay') === '1';
  const navigate = useNavigate();
  const { markOnboarded } = useHasOnboarded();
  const reduceMotion = useReducedMotion();
  const [whisperIdx] = useState(() => (replay ? -1 : Math.floor(Math.random() * 4)));
  const whisperLines = [
    t`That's the gist—short enough to remember between sets.`,
    t`When you tap draw, the deck does the programming.`,
    t`Aces are built-in permission to catch your breath.`,
    t`Jokers watch what you already pulled—same deck, different curveball.`,
  ] as const;
  const whisper = whisperIdx < 0 ? null : whisperLines[whisperIdx]!;
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [fullRulesOpen, setFullRulesOpen] = useState(replay);

  const { root, block, list } = useMemo(() => {
    const instant = !!reduceMotion;
    const dur = instant ? 0.01 : DURATION.pageIn;
    return {
      root: {
        hidden: {},
        show: {
          transition: {
            staggerChildren: instant ? 0 : 0.09,
            delayChildren: instant ? 0 : 0.04,
          },
        },
      },
      block: {
        hidden: { opacity: instant ? 1 : 0, y: instant ? 0 : 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: dur, ease: EASE_OUT },
        },
      },
      list: {
        hidden: {},
        show: {
          transition: {
            staggerChildren: instant ? 0 : 0.05,
            delayChildren: instant ? 0 : 0.05,
          },
        },
      },
    };
  }, [reduceMotion]);

  const handleGotIt = async () => {
    if (submitting) return;
    if (replay) {
      navigate('/setup', { replace: true });
      return;
    }
    setSaveError(false);
    setSubmitting(true);
    const ok = await markOnboarded();
    setSubmitting(false);
    if (ok) {
      navigate('/setup', { replace: true });
    } else {
      setSaveError(true);
    }
  };

  const handleContinueWithoutSaving = () => {
    navigate('/setup', { replace: true });
  };

  return (
    <main
      id="main-content"
      className={`flex min-h-dvh flex-col justify-center ${SHELL_ONBOARD} ${MAIN_PAD}`}
    >
      <motion.div
        className="mx-auto min-w-0 w-full max-w-lg text-left"
        variants={root}
        initial="hidden"
        animate="show"
      >
        <motion.p variants={block} className="ui-kicker tracking-[0.18em]">
          {replay ? <Trans>Quick refresher</Trans> : <Trans>How it works</Trans>}
        </motion.p>

        <motion.h1 variants={block} className="mt-2 text-balance break-words sm:mt-3">
          <Trans>Welcome to Sweat Deck</Trans>
        </motion.h1>

        {replay ? (
          <motion.p
            variants={block}
            className="mt-3 max-w-[65ch] text-pretty break-words text-sm leading-relaxed text-muted-foreground"
          >
            <Trans>Same deck-to-workout flow—open below for the full rules list when you need it.</Trans>
          </motion.p>
        ) : (
          <>
            <motion.p
              variants={block}
              className="mt-3 max-w-[65ch] text-pretty break-words text-sm leading-relaxed text-muted-foreground"
            >
              <Trans>
                Sweat Deck is a workout app: you train with a shuffled playing deck—each card sets your next move, reps, and a few wildcards—so you build variety and a bit of play into every session.
              </Trans>
            </motion.p>
            <motion.p
              variants={block}
              className="mt-3 max-w-[65ch] text-pretty break-words text-sm leading-relaxed text-muted-foreground"
            >
              <Trans>Three quick ideas before your first card; the rest is optional.</Trans>
            </motion.p>
          </>
        )}

        <motion.ol
          variants={list}
          className="mt-5 list-decimal space-y-3.5 pl-5 text-base leading-relaxed text-muted-foreground sm:mt-6 sm:space-y-4 sm:pl-6 sm:text-[1.05rem] marker:font-display marker:font-semibold marker:text-deck-reward"
        >
          {essentials.map((line) => (
            <motion.li key={line} variants={block} className="text-pretty break-words pl-0.5 [overflow-wrap:anywhere]">
              {line}
            </motion.li>
          ))}
        </motion.ol>

        {whisper && !replay ? (
          <motion.p
            variants={block}
            className="mt-6 text-pretty break-words text-sm font-medium leading-relaxed text-deck-reward [overflow-wrap:anywhere]"
          >
            {whisper}
          </motion.p>
        ) : null}

        <motion.div variants={block} className="mt-6 w-full [overflow-wrap:anywhere] sm:mt-6">
          <details
            className="group rounded-xl border border-border/50 bg-card/30 open:bg-card/45"
            open={fullRulesOpen}
            onToggle={(e) => {
              setFullRulesOpen((e.currentTarget as HTMLDetailsElement).open);
            }}
          >
            <summary className="flex list-none cursor-pointer items-center justify-between gap-2 rounded-t-xl px-4 py-3 font-medium text-foreground outline-none sm:px-5 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 text-pretty font-display text-sm sm:text-base">
                <Trans>All rules (full list)</Trans>
              </span>
              <ChevronDown
                className="size-4 shrink-0 text-deck-reward transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="border-t border-border/40 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                <Trans>For deep dives, replays, or if you are teaching a friend.</Trans>
              </p>
              <ol className="list-decimal space-y-2.5 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-deck-reward/90 sm:pl-5">
                {rulesFull.map((line) => (
                  <li key={line} className="text-pretty break-words pl-0.5 [overflow-wrap:anywhere]">
                    {line}
                  </li>
                ))}
              </ol>
            </div>
          </details>
        </motion.div>

        {saveError ? (
          <motion.div
            variants={block}
            role="alert"
            className="mt-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground sm:mt-8"
          >
            <p className="break-words leading-relaxed [overflow-wrap:anywhere]">
              <Trans>Couldn&apos;t save your progress to this device. Check storage permissions or try again.</Trans>
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full min-w-0 touch-manipulation sm:w-auto"
                disabled={submitting}
                aria-busy={submitting}
                onClick={() => void handleGotIt()}
              >
                {submitting ? <Trans>Saving…</Trans> : <Trans>Try again</Trans>}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full min-w-0 touch-manipulation sm:w-auto"
                disabled={submitting}
                onClick={handleContinueWithoutSaving}
              >
                <Trans>Continue without saving</Trans>
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={block} className="mt-6 sm:mt-8">
            <motion.div
              whileHover={{ scale: reduceMotion ? 1 : 1.02 }}
              whileTap={{ scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              className="w-full min-w-0 sm:w-auto"
            >
              <Button
                type="button"
                className="h-auto min-h-12 w-full min-w-0 touch-manipulation px-8 py-3.5 sm:min-h-11 sm:py-3"
                disabled={submitting}
                aria-busy={submitting}
                onClick={() => void handleGotIt()}
              >
                {submitting ? <Trans>Saving…</Trans> : <Trans>Got it</Trans>}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
