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
