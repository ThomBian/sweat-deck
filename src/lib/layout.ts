/**
 * Route shell: horizontal padding + notched-device safe insets
 * (min padding vs. env(safe-area-inset)).
 */
export const MAIN_PAD =
  'px-5 sm:px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]';

/**
 * Per-route page mood (subtle `via` / `to` tints, same base). Improves wayfinding
 * (Jamie: story arc; Alex: calmer in-session; Riley: “where am I in the app”).
 */
export const SHELL_ONBOARD = [
  'bg-gradient-to-b from-background',
  'via-muted/20',
  'to-suit-diamonds/[0.12]',
].join(' ');

export const SHELL_SETUP = [
  'bg-gradient-to-b from-background',
  'via-background',
  'to-card/40',
].join(' ');

export const SHELL_PLAY = [
  'bg-gradient-to-b from-background',
  'via-muted/12',
  'to-suit-spades/[0.08]',
].join(' ');

export const SHELL_SUMMARY = [
  'bg-gradient-to-b from-background',
  'via-muted/15',
  'to-deck-reward/15',
].join(' ');

export const SHELL_HISTORY = [
  'bg-gradient-to-b from-background',
  'via-background',
  'to-muted/25',
].join(' ');
