import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { HelpCircle } from 'lucide-react';
import type { SetupConfig } from '@/domain/config';
import SetupWizard from '@/components/SetupWizard';
import { Button } from '@/components/ui/button';
import { DeckGlyphPulse } from '@/components/DeckGlyphPulse';
import { LocaleToggle } from '@/components/LocaleToggle';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { MAIN_PAD, SCROLL_PAD_FIXED_FOOTER_SETUP, SHELL_SETUP } from '@/lib/layout';
import { cn } from '@/lib/utils';

const helpButtonClassName =
  'inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-border/50 bg-card/60 text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function Setup() {
  const location = useLocation();
  const navigate = useNavigate();
  const returnedConfig = (location.state as { config?: SetupConfig } | null)?.config;
  const [phase, setPhase] = useState<'landing' | 'wizard'>(() => (returnedConfig ? 'wizard' : 'landing'));
  const [setupMode, setSetupMode] = useState<'guided' | 'manual'>('guided');
  const reduceMotion = useReducedMotion();
  const pageT = reduceMotion ? 0.1 : DURATION.pageIn;

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
          className="mx-auto flex w-full min-h-0 min-w-0 max-w-lg flex-1 flex-col"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: pageT, ease: EASE_OUT }}
        >
          <div className="flex w-full min-w-0 shrink-0 items-center justify-between gap-2 sm:pt-0.5">
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
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center py-6 sm:py-10 md:py-12">
            <div className="min-w-0 text-left">
              <DeckGlyphPulse className="mb-6 md:mb-8" />
              <h1 className="[overflow-wrap:anywhere] text-balance break-words md:tracking-tight">
                <Trans>Build your deck</Trans>
              </h1>
              <p className="mt-5 max-w-[min(100%,65ch)] text-pretty break-words text-base leading-[1.75] text-muted-foreground [overflow-wrap:anywhere] sm:mt-6 sm:text-lg sm:leading-[1.7]">
                <Trans>
                  Let us configure your deck step by step — or go manual and assign every card yourself.
                </Trans>
              </p>
            </div>
          </div>

          <div className="w-full shrink-0 pt-2 sm:pt-4">
            <div className="mx-auto flex w-full flex-col gap-4 sm:max-w-xs">
              <div
                className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1"
                role="group"
                aria-label={t`Setup mode`}
              >
                {(['guided', 'manual'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSetupMode(m)}
                    className={cn(
                      'min-h-9 min-w-0 flex-1 touch-manipulation rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150',
                      setupMode === m
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {m === 'guided' ? <Trans>Guided</Trans> : <Trans>Manual</Trans>}
                  </button>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {setupMode === 'guided' ? (
                  <Trans>We&apos;ll build your deck based on your level and gear.</Trans>
                ) : (
                  <Trans>Assign an exercise to every card yourself.</Trans>
                )}
              </p>

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
          </div>
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
