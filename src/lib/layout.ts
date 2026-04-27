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

/** Setup landing + guided wizard: one reading column (deck, type, options, bar align). */
export const SETUP_CONTENT = 'w-full min-w-0 max-w-md mx-auto';

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

/**
 * Setup wizard: scrollable column must end above the fixed Back/Next bar on all
 * viewports (tall options + safe-area). Use on the inner column; put
 * `SCROLL_PAD_FIXED_FOOTER_SETUP` on the same `overflow-y-auto` root.
 * Do not use `flex-1` on that column — it can fight intrinsic height in flex+scroll.
 */
export const SCROLL_CLEAR_FIXED_FOOTER_SETUP = [
  'max-md:pb-[max(12rem,calc(env(safe-area-inset-bottom)+7.5rem))]',
  'md:pb-[max(10rem,calc(env(safe-area-inset-bottom)+6.5rem))]',
].join(' ');

export const SCROLL_PAD_FIXED_FOOTER_SETUP = [
  'max-md:scroll-pb-[max(12rem,calc(env(safe-area-inset-bottom)+7.5rem))]',
  'md:scroll-pb-[max(9rem,calc(env(safe-area-inset-bottom)+5.5rem))]',
].join(' ');
