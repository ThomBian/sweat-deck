import type { Difficulty } from './difficulty';

export type Equipment = 'bodyweight' | 'weights' | 'gym';
export type Theme = 'upper' | 'lower' | 'full';

export type SetupConfig = {
  difficulty: Difficulty;
  equipment: Equipment;
  theme: Theme;
  cardio: boolean;
  timeLimitMin?: number;
};

export const DEFAULT_CONFIG: SetupConfig = {
  difficulty: 'intermediate',
  equipment: 'bodyweight',
  theme: 'full',
  cardio: false,
};
