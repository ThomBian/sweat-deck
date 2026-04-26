/** Short, deck-specific lines — avoid generic loading jokes (delight skill). */

export const ONBOARDING_WHISPERS = [
  "That's the gist—short enough to remember between sets.",
  'When you tap draw, the deck does the programming.',
  'Aces are built-in permission to catch your breath.',
  'Jokers watch what you already pulled—same deck, different curveball.',
] as const;

export const SETUP_LANDING_WHISPERS = [
  'Defaults are tuned for a quick start—change anything in a tap.',
  'Your last session’s picks load automatically when you’ve played before.',
  'No program builder. Just five choices, then the cards.',
] as const;

/** One line per wizard step index (0–4). */
export const WIZARD_STEP_NUDGES = [
  'Draws skew heavier as difficulty rises—still a card game, not a spreadsheet.',
  'Gear changes which moves you see for each suit.',
  'Theme nudges upper, lower, or full-body patterns into the mix.',
  'When this is on, face cards can pull from your cardio pick.',
  'A cap ends the run at time; no limit means you play the stack.',
] as const;

export const WIZARD_LOADING_LINES = [
  'Finding your last setup in the stack…',
  'If you’re new here, we’ll start from friendly defaults.',
] as const;

export function pickRandom<T extends readonly string[]>(lines: T): T[number] {
  return lines[Math.floor(Math.random() * lines.length)]!;
}
