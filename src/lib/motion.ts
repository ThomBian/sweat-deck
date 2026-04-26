/** Default ease — ease-out-quart; no bounce/elastic (animate skill). */
export const EASE_OUT = [0.25, 1, 0.5, 1] as const;

export const DURATION = {
  /** Route / panel enter */
  pageIn: 0.32,
  /** Route exit (slightly faster per animate skill) */
  pageOut: 0.22,
  /** Small UI feedback */
  fast: 0.14,
} as const;
