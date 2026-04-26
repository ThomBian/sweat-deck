import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import SetupWizard from '@/components/SetupWizard';
import { TrainingIntroStep } from '@/components/setup/TrainingIntroStep';
import { Button } from '@/components/ui/button';
import { DeckGlyphPulse } from '@/components/DeckGlyphPulse';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { MAIN_PAD } from '@/lib/layout';
import { SETUP_LANDING_WHISPERS, pickRandom } from '@/lib/delightCopy';

export default function Setup() {
  const [phase, setPhase] = useState<'landing' | 'wizard'>('landing');
  const [landingWhisper] = useState(() => pickRandom(SETUP_LANDING_WHISPERS));
  const reduceMotion = useReducedMotion();
  const t = reduceMotion ? 0.1 : DURATION.pageIn;

  return (
    <main
      id="main-content"
      className={`relative flex min-h-dvh flex-col bg-gradient-to-b from-background via-background to-card/40 ${MAIN_PAD} pb-6 pt-2 sm:pt-4`}
    >
      <div className="flex shrink-0 justify-end">
        <Link
          to="/onboarding?replay=1"
          className="inline-flex size-11 touch-manipulation items-center justify-center rounded-lg border border-border/50 bg-card/60 text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Replay tutorial"
        >
          <HelpCircle className="size-5" aria-hidden />
        </Link>
      </div>

      {phase === 'landing' ? (
        <motion.div
          className="flex flex-1 flex-col justify-center gap-10 pt-4 pb-8"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: t, ease: EASE_OUT }}
        >
          <div className="mx-auto min-w-0 w-full max-w-lg text-left">
            <DeckGlyphPulse className="mb-6" />
            <p className="ui-kicker tracking-[0.18em]">Quick setup</p>
            <h1 className="mt-3 text-balance break-words">Start a new training</h1>
            <div className="mt-6 max-w-[65ch] break-words">
              <TrainingIntroStep />
            </div>
            <p className="mt-6 max-w-[65ch] text-pretty break-words text-sm font-medium leading-relaxed text-deck-reward">
              {landingWhisper}
            </p>
          </div>
          <div className="mx-auto min-w-0 w-full max-w-lg">
            <motion.div
              whileHover={{ scale: reduceMotion ? 1 : 1.02 }}
              whileTap={{ scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              className="mx-auto w-full sm:max-w-xs"
            >
              <Button
                type="button"
                className="h-auto min-h-11 w-full touch-manipulation px-8 py-3"
                onClick={() => setPhase('wizard')}
              >
                Continue
              </Button>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col pt-2">
          <SetupWizard onLeaveToLanding={() => setPhase('landing')} />
        </div>
      )}
    </main>
  );
}
