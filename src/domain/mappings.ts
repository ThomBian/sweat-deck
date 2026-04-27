import type { FaceRank, Suit } from './card';
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

type SuitMovement = { id: MovementId; alts?: MovementId[] };

export const NUMBER_MOVEMENTS: Record<Theme, Record<Suit, Record<Equipment, SuitMovement>>> = {
  full: {
    hearts: {
      bodyweight: { id: 'pushups', alts: ['pike-pushups'] },
      weights: { id: 'dumbbell-floor-press', alts: ['dumbbell-press'] },
      gym: { id: 'bench-press', alts: ['overhead-press'] },
    },
    diamonds: {
      bodyweight: { id: 'bodyweight-rows' },
      weights: { id: 'dumbbell-rows', alts: ['renegade-rows'] },
      gym: { id: 'pullups', alts: ['lat-pulldown'] },
    },
    clubs: {
      bodyweight: { id: 'jump-squats', alts: ['squats'] },
      weights: { id: 'goblet-squats', alts: ['walking-lunges'] },
      gym: { id: 'back-squats', alts: ['bulgarian-split-squats'] },
    },
    spades: {
      bodyweight: { id: 'glute-bridges', alts: ['lunges'] },
      weights: { id: 'kettlebell-swings', alts: ['hip-thrusts'] },
      gym: { id: 'romanian-deadlifts', alts: ['barbell-hip-thrusts'] },
    },
  },
  upper: {
    hearts: {
      bodyweight: { id: 'pushups', alts: ['pike-pushups'] },
      weights: { id: 'dumbbell-press', alts: ['shoulder-press'] },
      gym: { id: 'bench-press', alts: ['overhead-press'] },
    },
    diamonds: {
      bodyweight: { id: 'pullups', alts: ['bodyweight-rows'] },
      weights: { id: 'dumbbell-rows', alts: ['renegade-rows'] },
      gym: { id: 'lat-pulldown', alts: ['pullups', 'cable-rows'] },
    },
    clubs: {
      bodyweight: { id: 'pike-pushups', alts: ['pushups'] },
      weights: { id: 'shoulder-press', alts: ['dumbbell-press'] },
      gym: { id: 'overhead-press', alts: ['bench-press'] },
    },
    spades: {
      bodyweight: { id: 'plank-to-pushup' },
      weights: { id: 'renegade-rows', alts: ['dumbbell-rows'] },
      gym: { id: 'cable-rows', alts: ['lat-pulldown'] },
    },
  },
  lower: {
    hearts: {
      bodyweight: { id: 'lunges', alts: ['squats'] },
      weights: { id: 'walking-lunges', alts: ['goblet-squats'] },
      gym: { id: 'bulgarian-split-squats', alts: ['back-squats'] },
    },
    diamonds: {
      bodyweight: { id: 'squats', alts: ['jump-squats', 'lunges'] },
      weights: { id: 'goblet-squats', alts: ['walking-lunges'] },
      gym: { id: 'back-squats', alts: ['bulgarian-split-squats'] },
    },
    clubs: {
      bodyweight: { id: 'glute-bridges' },
      weights: { id: 'hip-thrusts', alts: ['kettlebell-swings'] },
      gym: { id: 'barbell-hip-thrusts', alts: ['romanian-deadlifts'] },
    },
    spades: {
      bodyweight: { id: 'calf-raises' },
      weights: { id: 'weighted-calf-raises' },
      gym: { id: 'standing-calf-raises' },
    },
  },
};

export type FaceAlt = {
  id: FaceChallengeId;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
};

type FaceChallenge = {
  id: FaceChallengeId;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
  alts?: FaceAlt[];
};

export const FACE_CHALLENGES: Record<FaceRank, Record<Equipment, FaceChallenge>> = {
  J: {
    bodyweight: { id: 'burpees', reps: 15, alts: [{ id: 'hollow-body-hold', durationSec: 45 }] },
    weights: { id: 'thrusters', reps: 15, alts: [{ id: 'man-makers', reps: 10 }] },
    gym: { id: 'wall-balls', reps: 15, alts: [{ id: 'thrusters', reps: 12 }] },
  },
  Q: {
    bodyweight: { id: 'hollow-body-hold', durationSec: 60, alts: [{ id: 'burpees', reps: 10 }] },
    weights: { id: 'weighted-plank', durationSec: 60, alts: [{ id: 'man-makers', reps: 8 }] },
    gym: { id: 'plank-hold', durationSec: 60, alts: [{ id: 'wall-balls', reps: 12 }] },
  },
  K: {
    bodyweight: { id: 'broad-jumps', reps: 20, alts: [{ id: 'burpees', reps: 15 }] },
    weights: { id: 'man-makers', reps: 20, alts: [{ id: 'thrusters', reps: 15 }] },
    gym: { id: 'heavy-sled-push', distanceM: 20, alts: [{ id: 'wall-balls', reps: 25 }] },
  },
};

export const FACE_CHALLENGES_CARDIO: Record<FaceRank, FaceChallenge> = {
  J: { id: 'skierg', reps: 15, alts: [{ id: 'row', distanceM: 300 }] },
  Q: { id: 'battle-ropes', durationSec: 60, alts: [{ id: 'skierg', durationSec: 45 }] },
  K: { id: 'row', distanceM: 500, alts: [{ id: 'battle-ropes', durationSec: 90 }] },
};
