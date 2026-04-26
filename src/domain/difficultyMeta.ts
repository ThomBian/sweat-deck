import type { Difficulty } from './difficulty';

export type DifficultyTone = 'calm' | 'warm' | 'hot' | 'inferno';

export const DIFFICULTY_TONE: Record<Difficulty, DifficultyTone> = {
  beginner: 'calm',
  intermediate: 'warm',
  hard: 'hot',
  advanced: 'hot',
  hell: 'inferno',
};

export const DIFFICULTY_TONE_PILL: Record<DifficultyTone, string> = {
  calm: 'border-border/50 bg-muted/50 text-foreground',
  warm: 'border-amber-500/35 bg-amber-500/15 text-amber-100',
  hot: 'border-deck-accent/40 bg-deck-accent/15 text-deck-reward',
  inferno: 'border-destructive/45 bg-destructive/20 text-destructive',
};
