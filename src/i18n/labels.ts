import { t } from '@lingui/core/macro';
import type { Equipment, Theme } from '@/domain/config';
import type { Suit } from '@/domain/card';
import type { Difficulty } from '@/domain/difficulty';

export const tEquipment = (e: Equipment): string => {
  switch (e) {
    case 'bodyweight':
      return t`Bodyweight`;
    case 'weights':
      return t`Weights`;
    case 'gym':
      return t`Full Gym`;
  }
};

export const tTheme = (theme: Theme): string => {
  switch (theme) {
    case 'upper':
      return t`Upper Body`;
    case 'lower':
      return t`Lower Body`;
    case 'full':
      return t`Full Body`;
  }
};

/** Shorter labels used on the theme setup step. */
export const tThemeWizard = (theme: Theme): string => {
  switch (theme) {
    case 'upper':
      return t`Upper`;
    case 'lower':
      return t`Lower`;
    case 'full':
      return t`Full Body`;
  }
};

export const tDifficulty = (d: Difficulty): string => {
  switch (d) {
    case 'beginner':
      return t`Beginner`;
    case 'intermediate':
      return t`Intermediate`;
    case 'hard':
      return t`Hard`;
    case 'advanced':
      return t`Advanced`;
    case 'hell':
      return t`Hell`;
  }
};

export const tDifficultyDescription = (d: Difficulty): string => {
  switch (d) {
    case 'beginner':
      return t`A forgiving spread—plenty of low reps to build the habit.`;
    case 'intermediate':
      return t`The balanced lane—enough work to feel it, not enough to drown.`;
    case 'hard':
      return t`More volume, less rest. Expect 6s, 7s, 8s as your normal.`;
    case 'advanced':
      return t`Intensity goes up—8s, 9s, 10s are the new normal.`;
    case 'hell':
      return t`Nines and tens dominate. A low card is a gift from the deck.`;
  }
};

export const tDifficultyRepHint = (d: Difficulty): string => {
  switch (d) {
    case 'beginner':
      return t`Most: 2–4 · Rare: 9–10`;
    case 'intermediate':
      return t`Most: 4–6 · Rare: 2 or 10`;
    case 'hard':
      return t`Most: 6–8 · Rare: 2–3`;
    case 'advanced':
      return t`Most: 8–10 · Rare: 2–3`;
    case 'hell':
      return t`Most: 9–10 · Rare: 2`;
  }
};

export const tSuit = (s: Suit): string => {
  switch (s) {
    case 'hearts':
      return t`Hearts`;
    case 'diamonds':
      return t`Diamonds`;
    case 'clubs':
      return t`Clubs`;
    case 'spades':
      return t`Spades`;
  }
};
