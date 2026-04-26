import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useHasOnboarded } from '@/hooks/useHasOnboarded';
import { Button } from '@/components/ui/button';
import { DeckGlyphPulse } from '@/components/DeckGlyphPulse';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { MAIN_PAD } from '@/lib/layout';
import { ONBOARDING_WHISPERS, pickRandom } from '@/lib/delightCopy';

const RULES = [
  'You play with a full 54-card deck (jokers included).',
  'Each suit maps to a movement pattern.',
  'Number cards use the face value as your rep count.',
  'Face cards are fixed high-intensity challenges.',
  'Aces are a one-minute rest break.',
  'Jokers are chaos—wildcard rounds that react to cards you already drew.',
] as const;

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const replay = searchParams.get('replay') === '1';
  const navigate = useNavigate();
  const { markOnboarded } = useHasOnboarded();
  const reduceMotion = useReducedMotion();
  const [whisper] = useState(() =>
    replay
      ? "Rules haven't changed—here's the quick refresher."
      : pickRandom(ONBOARDING_WHISPERS)
  );
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
          {replay ? 'Quick refresher' : 'How it works'}
        </motion.p>

        <motion.h1 variants={block} className="mt-3 text-balance break-words">
          Welcome to Sweat Deck
        </motion.h1>

        <motion.ol
          variants={list}
          className="mt-8 list-decimal space-y-4 pl-6 text-base leading-relaxed text-muted-foreground marker:font-display marker:font-semibold marker:text-deck-reward"
        >
          {RULES.map((line) => (
            <motion.li key={line} variants={block} className="text-pretty break-words">
              {line}
            </motion.li>
          ))}
        </motion.ol>

        <motion.p
          variants={block}
          className="mt-8 max-w-[65ch] text-pretty break-words text-sm font-medium leading-relaxed text-deck-reward"
        >
          {whisper}
        </motion.p>

        {saveError ? (
          <motion.div
            variants={block}
            role="alert"
            className="mt-8 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
          >
            <p className="break-words leading-relaxed">
              Couldn&apos;t save your progress to this device. Check storage permissions or try again.
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
                {submitting ? 'Saving…' : 'Try again'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full min-w-0 touch-manipulation sm:w-auto"
                disabled={submitting}
                onClick={handleContinueWithoutSaving}
              >
                Continue without saving
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
                {submitting ? 'Saving…' : 'Got it'}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </main>
  );
}
