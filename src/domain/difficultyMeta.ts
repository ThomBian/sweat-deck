import type { Difficulty } from './difficulty';

export type DifficultyTone = 'calm' | 'warm' | 'hot' | 'inferno';

/**
 * English source copy (Lingui: wrap at display or extract via macro in components as needed).
 */
export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; description: string; repHint: string; tone: DifficultyTone }
> = {
  beginner: {
    label: 'Beginner',
    description: 'A forgiving spread—plenty of low reps to build the habit.',
    repHint: 'Most: 2–4 · Rare: 9–10',
    tone: 'calm',
  },
  intermediate: {
    label: 'Intermediate',
    description: 'The balanced lane—enough work to feel it, not enough to drown.',
    repHint: 'Most: 4–6 · Rare: 2 or 10',
    tone: 'warm',
  },
  hard: {
    label: 'Hard',
    description: 'More volume, fewer breathers. Expect 6s, 7s, 8s as your normal.',
    repHint: 'Most: 6–8 · Rare: 2–3',
    tone: 'hot',
  },
  advanced: {
    label: 'Advanced',
    description: 'The bell curve slides high—8s, 9s, 10s are the new normal.',
    repHint: 'Most: 8–10 · Rare: 2–3',
    tone: 'hot',
  },
  hell: {
    label: 'Hell',
    description: 'Nines and tens dominate. A low card is a gift from the deck.',
    repHint: 'Most: 9–10 · Rare: 2',
    tone: 'inferno',
  },
};

export const DIFFICULTY_TONE_PILL: Record<DifficultyTone, string> = {
  calm: 'border-border/50 bg-muted/50 text-foreground',
  warm: 'border-amber-500/35 bg-amber-500/15 text-amber-100',
  hot: 'border-deck-accent/40 bg-deck-accent/15 text-deck-reward',
  inferno: 'border-destructive/45 bg-destructive/20 text-destructive',
};
