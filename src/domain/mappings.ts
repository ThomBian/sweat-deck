import type { Suit, FaceRank } from './card';
import type { Equipment, Theme } from './config';

export type MovementId =
  | 'pushups'
  | 'dumbbell-floor-press'
  | 'bench-press'
  | 'bodyweight-rows'
  | 'dumbbell-rows'
  | 'pullups'
  | 'jump-squats'
  | 'goblet-squats'
  | 'back-squats'
  | 'glute-bridges'
  | 'kettlebell-swings'
  | 'romanian-deadlifts'
  | 'dumbbell-press'
  | 'lat-pulldown'
  | 'pike-pushups'
  | 'shoulder-press'
  | 'overhead-press'
  | 'plank-to-pushup'
  | 'renegade-rows'
  | 'cable-rows'
  | 'lunges'
  | 'walking-lunges'
  | 'bulgarian-split-squats'
  | 'squats'
  | 'hip-thrusts'
  | 'barbell-hip-thrusts'
  | 'calf-raises'
  | 'weighted-calf-raises'
  | 'standing-calf-raises';

export type FaceChallengeId =
  | 'burpees'
  | 'thrusters'
  | 'wall-balls'
  | 'hollow-body-hold'
  | 'weighted-plank'
  | 'plank-hold'
  | 'broad-jumps'
  | 'man-makers'
  | 'heavy-sled-push'
  | 'skierg'
  | 'battle-ropes'
  | 'row';

type SuitMovement = { id: MovementId };

export const NUMBER_MOVEMENTS: Record<Theme, Record<Suit, Record<Equipment, SuitMovement>>> = {
  full: {
    hearts: {
      bodyweight: { id: 'pushups' },
      weights: { id: 'dumbbell-floor-press' },
      gym: { id: 'bench-press' },
    },
    diamonds: {
      bodyweight: { id: 'bodyweight-rows' },
      weights: { id: 'dumbbell-rows' },
      gym: { id: 'pullups' },
    },
    clubs: {
      bodyweight: { id: 'jump-squats' },
      weights: { id: 'goblet-squats' },
      gym: { id: 'back-squats' },
    },
    spades: {
      bodyweight: { id: 'glute-bridges' },
      weights: { id: 'kettlebell-swings' },
      gym: { id: 'romanian-deadlifts' },
    },
  },
  upper: {
    hearts: {
      bodyweight: { id: 'pushups' },
      weights: { id: 'dumbbell-press' },
      gym: { id: 'bench-press' },
    },
    diamonds: {
      bodyweight: { id: 'pullups' },
      weights: { id: 'dumbbell-rows' },
      gym: { id: 'lat-pulldown' },
    },
    clubs: {
      bodyweight: { id: 'pike-pushups' },
      weights: { id: 'shoulder-press' },
      gym: { id: 'overhead-press' },
    },
    spades: {
      bodyweight: { id: 'plank-to-pushup' },
      weights: { id: 'renegade-rows' },
      gym: { id: 'cable-rows' },
    },
  },
  lower: {
    hearts: {
      bodyweight: { id: 'lunges' },
      weights: { id: 'walking-lunges' },
      gym: { id: 'bulgarian-split-squats' },
    },
    diamonds: {
      bodyweight: { id: 'squats' },
      weights: { id: 'goblet-squats' },
      gym: { id: 'back-squats' },
    },
    clubs: {
      bodyweight: { id: 'glute-bridges' },
      weights: { id: 'hip-thrusts' },
      gym: { id: 'barbell-hip-thrusts' },
    },
    spades: {
      bodyweight: { id: 'calf-raises' },
      weights: { id: 'weighted-calf-raises' },
      gym: { id: 'standing-calf-raises' },
    },
  },
};

type FaceChallenge = {
  id: FaceChallengeId;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};

export const FACE_CHALLENGES: Record<FaceRank, Record<Equipment, FaceChallenge>> = {
  J: {
    bodyweight: { id: 'burpees', reps: 15 },
    weights: { id: 'thrusters', reps: 15 },
    gym: { id: 'wall-balls', reps: 15 },
  },
  Q: {
    bodyweight: { id: 'hollow-body-hold', durationSec: 60 },
    weights: { id: 'weighted-plank', durationSec: 60 },
    gym: { id: 'plank-hold', durationSec: 60 },
  },
  K: {
    bodyweight: { id: 'broad-jumps', reps: 20 },
    weights: { id: 'man-makers', reps: 20 },
    gym: { id: 'heavy-sled-push', distanceM: 20 },
  },
};

export const FACE_CHALLENGES_CARDIO: Record<FaceRank, FaceChallenge> = {
  J: { id: 'skierg', reps: 15 },
  Q: { id: 'battle-ropes', durationSec: 60 },
  K: { id: 'row', distanceM: 500 },
};
