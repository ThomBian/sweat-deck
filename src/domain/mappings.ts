import type { Suit, FaceRank } from './card';
import type { Equipment, Theme } from './config';

type SuitMovement = { name: string };

export const NUMBER_MOVEMENTS: Record<Theme, Record<Suit, Record<Equipment, SuitMovement>>> = {
  full: {
    hearts: {
      bodyweight: { name: 'Push-ups' },
      weights: { name: 'Dumbbell Floor Press' },
      gym: { name: 'Bench Press' },
    },
    diamonds: {
      bodyweight: { name: 'Bodyweight Rows' },
      weights: { name: 'Dumbbell Rows' },
      gym: { name: 'Pull-ups' },
    },
    clubs: {
      bodyweight: { name: 'Jump Squats' },
      weights: { name: 'Goblet Squats' },
      gym: { name: 'Back Squats' },
    },
    spades: {
      bodyweight: { name: 'Glute Bridges' },
      weights: { name: 'Kettlebell Swings' },
      gym: { name: 'Romanian Deadlifts' },
    },
  },
  upper: {
    hearts: {
      bodyweight: { name: 'Push-ups' },
      weights: { name: 'Dumbbell Press' },
      gym: { name: 'Bench Press' },
    },
    diamonds: {
      bodyweight: { name: 'Pull-ups' },
      weights: { name: 'Dumbbell Rows' },
      gym: { name: 'Lat Pulldown' },
    },
    clubs: {
      bodyweight: { name: 'Pike Push-ups' },
      weights: { name: 'Shoulder Press' },
      gym: { name: 'Overhead Press' },
    },
    spades: {
      bodyweight: { name: 'Plank to Push-up' },
      weights: { name: 'Renegade Rows' },
      gym: { name: 'Cable Rows' },
    },
  },
  lower: {
    hearts: {
      bodyweight: { name: 'Lunges' },
      weights: { name: 'Walking Lunges' },
      gym: { name: 'Bulgarian Split Squats' },
    },
    diamonds: {
      bodyweight: { name: 'Squats' },
      weights: { name: 'Goblet Squats' },
      gym: { name: 'Back Squats' },
    },
    clubs: {
      bodyweight: { name: 'Glute Bridges' },
      weights: { name: 'Hip Thrusts' },
      gym: { name: 'Barbell Hip Thrusts' },
    },
    spades: {
      bodyweight: { name: 'Calf Raises' },
      weights: { name: 'Weighted Calf Raises' },
      gym: { name: 'Standing Calf Raises' },
    },
  },
};

type FaceChallenge = { name: string; reps?: number; durationSec?: number; distanceM?: number };

export const FACE_CHALLENGES: Record<FaceRank, Record<Equipment, FaceChallenge>> = {
  J: {
    bodyweight: { name: 'Burpees', reps: 15 },
    weights: { name: 'Thrusters', reps: 15 },
    gym: { name: 'Wall Balls', reps: 15 },
  },
  Q: {
    bodyweight: { name: 'Hollow Body Hold', durationSec: 60 },
    weights: { name: 'Weighted Plank', durationSec: 60 },
    gym: { name: 'Plank Hold', durationSec: 60 },
  },
  K: {
    bodyweight: { name: 'Broad Jumps', reps: 20 },
    weights: { name: 'Man-Makers', reps: 20 },
    gym: { name: 'Heavy Sled Push', distanceM: 20 },
  },
};

export const FACE_CHALLENGES_CARDIO: Record<FaceRank, FaceChallenge> = {
  J: { name: 'SkiErg', distanceM: 0, reps: 15 },
  Q: { name: 'Battle Ropes', durationSec: 60 },
  K: { name: 'Row', distanceM: 500 },
};
