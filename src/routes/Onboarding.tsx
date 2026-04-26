import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useHasOnboarded } from '@/hooks/useHasOnboarded';
import { Button } from '@/components/ui/button';
import { DeckGlyphPulse } from '@/components/DeckGlyphPulse';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { MAIN_PAD } from '@/lib/layout';

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const replay = searchParams.get('replay') === '1';
  const navigate = useNavigate();
  const { markOnboarded } = useHasOnboarded();
  const reduceMotion = useReducedMotion();
  const rules = [
    t`You play with a full 54-card deck (jokers included).`,
    t`Each suit maps to a movement pattern.`,
    t`Number cards use the face value as your rep count.`,
    t`Face cards are fixed high-intensity challenges.`,
    t`Aces are a one-minute rest break.`,
    t`Jokers are chaos—wildcard rounds that react to cards you already drew.`,
  ] as const;
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
            staggerChildren: instant ? 0 : 0.055,
            delayChildren: instant ? 0 : 0.06,
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
      className={`flex min-h-dvh flex-col justify-center bg-gradient-to-b from-background via-background to-card/40 ${MAIN_PAD}`}
    >
      <motion.div
        className="mx-auto min-w-0 w-full max-w-lg text-left"
        variants={root}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={block}>
          <DeckGlyphPulse className="mb-6" />
        </motion.div>

        <motion.p variants={block} className="ui-kicker tracking-[0.18em]">
          {replay ? <Trans>Quick refresher</Trans> : <Trans>How it works</Trans>}
        </motion.p>

        <motion.h1 variants={block} className="mt-3 text-balance break-words">
          <Trans>Welcome to Sweat Deck</Trans>
        </motion.h1>

        <motion.ol
          variants={list}
          className="mt-8 list-decimal space-y-4 pl-6 text-base leading-relaxed text-muted-foreground marker:font-display marker:font-semibold marker:text-deck-reward"
        >
          {rules.map((line) => (
            <motion.li key={line} variants={block} className="text-pretty break-words">
              {line}
            </motion.li>
          ))}
        </motion.ol>

        <motion.p
          variants={block}
          className="mt-8 max-w-[65ch] text-pretty break-words text-sm font-medium leading-relaxed text-deck-reward"
        >
          {replay ? (
            <Trans>Rules haven&apos;t changed—here&apos;s the quick refresher.</Trans>
          ) : (
            whisper
          )}
        </motion.p>

        {saveError ? (
          <motion.div
            variants={block}
            role="alert"
            className="mt-8 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
          >
            <p className="break-words leading-relaxed">
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
          <motion.div variants={block} className="mt-8">
            <motion.div
              whileHover={{ scale: reduceMotion ? 1 : 1.02 }}
              whileTap={{ scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              className="w-full min-w-0 sm:w-auto"
            >
              <Button
                type="button"
                className="h-auto min-h-11 w-full min-w-0 touch-manipulation px-8 py-3 sm:w-auto"
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
