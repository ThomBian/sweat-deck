export type Difficulty = 'beginner' | 'intermediate' | 'hard' | 'advanced' | 'hell';

type DistParams = { mean: number; sigma: number };

export const NUMBER_DIST: Record<Difficulty, DistParams> = {
  beginner: { mean: 2, sigma: 2.5 },
  intermediate: { mean: 5, sigma: 2.5 },
  hard: { mean: 7, sigma: 2.5 },
  advanced: { mean: 9, sigma: 2.5 },
  hell: { mean: 10, sigma: 2.5 },
};
