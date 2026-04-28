import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { HelpCircle } from 'lucide-react';
import type { SetupConfig } from '@/domain/config';
import SetupWizard from '@/components/SetupWizard';
import { Button } from '@/components/ui/button';
import { LocaleToggle } from '@/components/LocaleToggle';
import { SetupLandingDeck } from '@/components/SetupLandingDeck';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { getLandingVariants } from '@/lib/landingMotion';
import { MAIN_PAD, SCROLL_PAD_FIXED_FOOTER_SETUP, SETUP_CONTENT, SHELL_SETUP } from '@/lib/layout';
import { cn } from '@/lib/utils';

const helpButtonClassName =
  'inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-border/50 bg-card/60 text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type SetupLocationState = { config?: SetupConfig; skipLandingEntrance?: boolean } | null;

export default function Setup() {
  const location = useLocation();
  const navigate = useNavigate();
  const setupState = location.state as SetupLocationState;
  const returnedConfig = setupState?.config;
  const skipLandingEntrance = setupState?.skipLandingEntrance === true;
  const [phase, setPhase] = useState<'landing' | 'wizard'>(() => (returnedConfig ? 'wizard' : 'landing'));
  const [setupMode, setSetupMode] = useState<'guided' | 'manual'>('guided');
  const reduceMotion = useReducedMotion();
  const landingV = getLandingVariants(!!reduceMotion, skipLandingEntrance);

  const isLanding = phase === 'landing';

  return (
    <main
      id="main-content"
      className={cn(
        'relative flex flex-col',
        SHELL_SETUP,
        isLanding
          ? cn(MAIN_PAD, 'h-dvh min-h-0 overflow-y-auto pb-8 sm:pb-10')
          : 'h-dvh min-h-0 flex-col overflow-hidden px-5 sm:px-6 pt-2 sm:pt-4',
      )}
    >
      {isLanding ? (
        <motion.div
          className={cn(SETUP_CONTENT, 'flex min-h-0 flex-1 flex-col')}
          variants={landingV.container}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={landingV.item}
            className="flex w-full min-w-0 shrink-0 items-center justify-between gap-2 sm:pt-0.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="sr-only" id="setup-landing-i18n-hint">
                <Trans>Applies to the whole app—screens, cards, and prompts.</Trans>
              </span>
              <LocaleToggle descriptionId="setup-landing-i18n-hint" />
            </div>
            <Link
              to="/onboarding?replay=1"
              className={helpButtonClassName}
              aria-label={t`Replay tutorial`}
            >
              <HelpCircle className="size-5" aria-hidden />
            </Link>
          </motion.div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 py-6 text-center sm:gap-8 sm:py-10 md:py-12">
            <motion.div variants={landingV.item} className="w-full min-w-0">
              <SetupLandingDeck reduceMotion={!!reduceMotion} />
            </motion.div>
            <div className="flex w-full min-w-0 flex-col gap-3 sm:gap-3.5">
              <motion.h1
                variants={landingV.item}
                className="[overflow-wrap:anywhere] text-balance break-words md:tracking-tight"
              >
                <Trans>Build your deck</Trans>
              </motion.h1>
              <motion.p
                variants={landingV.item}
                className="text-pretty break-words text-base leading-[1.75] text-muted-foreground [overflow-wrap:anywhere] sm:text-lg sm:leading-[1.7]"
              >
                <Trans>
                  Let us configure your deck step by step — or go manual and assign every card yourself.
                </Trans>
              </motion.p>
            </div>
          </div>

          <motion.div
            variants={landingV.item}
            className="w-full shrink-0 border-t border-border/25 pt-6 text-center sm:pt-8"
          >
            <div className="flex w-full flex-col gap-3 text-center">
              <div
                className="relative flex w-full gap-1 overflow-hidden rounded-lg border border-border/50 bg-muted/30 p-1"
                role="group"
                aria-label={t`Setup mode`}
              >
                {(['guided', 'manual'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={setupMode === m}
                    onClick={() => setSetupMode(m)}
                    className={cn(
                      'relative z-10 min-h-11 min-w-0 flex-1 touch-manipulation rounded-md px-3 text-sm font-medium',
                      'outline-none transition-[color,transform] duration-150',
                      'focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-0',
                      setupMode === m
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {m === 'guided' ? <Trans>Guided</Trans> : <Trans>Manual</Trans>}
                  </button>
                ))}
              </div>

              <div className="min-h-11 text-center text-sm text-muted-foreground [overflow-wrap:anywhere]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={setupMode}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -3 }}
                    transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: EASE_OUT }}
                    className="text-pretty"
                  >
                    {setupMode === 'guided' ? (
                      <Trans>We&apos;ll build your deck based on your level and gear.</Trans>
                    ) : (
                      <Trans>Assign an exercise to every card yourself.</Trans>
                    )}
                  </motion.p>
                </AnimatePresence>
              </div>

              <motion.div
                whileHover={{ scale: reduceMotion ? 1 : 1.02 }}
                whileTap={{ scale: reduceMotion ? 1 : 0.98 }}
                transition={{ duration: DURATION.fast, ease: EASE_OUT }}
              >
                <Button
                  type="button"
                  className="h-auto min-h-11 w-full touch-manipulation px-8 py-3"
                  onClick={() => {
                    if (setupMode === 'manual') {
                      navigate('/deck', { state: { mode: 'manual' } });
                    } else {
                      setPhase('wizard');
                    }
                  }}
                >
                  <Trans>Go!</Trans>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <div
          className={cn(
            'flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-clip overflow-y-auto overscroll-y-contain',
            SCROLL_PAD_FIXED_FOOTER_SETUP,
          )}
        >
          <SetupWizard
            onLeaveToLanding={() => setPhase('landing')}
            {...(returnedConfig != null ? { initialConfig: returnedConfig } : {})}
          />
        </div>
      )}
    </main>
  );
}
