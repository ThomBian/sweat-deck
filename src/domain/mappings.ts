import type { FaceRank, Suit } from './card';
import type { Equipment, Theme } from './config';

export type MovementId =
  // --- Push / Chest ---
  | 'pushups'
  | 'diamond-pushups'
  | 'decline-pushups'
  | 'dips'
  | 'tricep-dips'
  | 'pike-pushups'
  | 'dumbbell-floor-press'
  | 'dumbbell-press'
  | 'incline-dumbbell-press'
  | 'chest-fly'
  | 'arnold-press'
  | 'lateral-raises'
  | 'skull-crushers'
  | 'overhead-tricep-extension'
  | 'bench-press'
  | 'incline-bench-press'
  | 'decline-bench-press'
  | 'machine-chest-press'
  | 'cable-chest-fly'
  | 'overhead-press'
  | 'shoulder-press'
  | 'tricep-pushdown'
  | 'plank-to-pushup'
  // --- Pull / Back / Biceps ---
  | 'bodyweight-rows'
  | 'chin-ups'
  | 'inverted-rows'
  | 'pullups'
  | 'dumbbell-rows'
  | 'renegade-rows'
  | 'face-pulls'
  | 'hammer-curls'
  | 'dumbbell-curls'
  | 'lat-pulldown'
  | 'cable-rows'
  | 'bent-over-rows'
  | 't-bar-rows'
  | 'chest-supported-rows'
  | 'straight-arm-pulldown'
  | 'barbell-curls'
  | 'cable-curls'
  | 'preacher-curls'
  // --- Legs / Quads ---
  | 'squats'
  | 'jump-squats'
  | 'box-jumps'
  | 'step-ups'
  | 'pistol-squats'
  | 'lunges'
  | 'walking-lunges'
  | 'goblet-squats'
  | 'sumo-squats'
  | 'dumbbell-step-ups'
  | 'back-squats'
  | 'front-squats'
  | 'bulgarian-split-squats'
  | 'leg-press'
  | 'hack-squats'
  | 'leg-extensions'
  // --- Posterior Chain / Hinge / Glutes ---
  | 'glute-bridges'
  | 'single-leg-glute-bridges'
  | 'nordic-curls'
  | 'good-mornings'
  | 'hip-thrusts'
  | 'kettlebell-swings'
  | 'sumo-deadlifts'
  | 'romanian-deadlifts'
  | 'barbell-hip-thrusts'
  | 'leg-curls'
  | 'rack-pulls'
  | 'cable-kickbacks'
  // --- Calves ---
  | 'calf-raises'
  | 'weighted-calf-raises'
  | 'standing-calf-raises';

export type FaceChallengeId =
  | 'burpees'
  | 'box-jump-burpees'
  | 'thrusters'
  | 'wall-balls'
  | 'devil-press'
  | 'db-snatch'
  | 'clean-and-press'
  | 'man-makers'
  | 'kettlebell-complex'
  | 'hollow-body-hold'
  | 'weighted-plank'
  | 'plank-hold'
  | 'wall-sit'
  | 'broad-jumps'
  | 'heavy-sled-push'
  | 'assault-bike'
  | 'jump-rope'
  | 'skierg'
  | 'battle-ropes'
  | 'row';

type SuitMovement = { id: MovementId; alts?: MovementId[] };

export const NUMBER_MOVEMENTS: Record<Theme, Record<Suit, Record<Equipment, SuitMovement>>> = {
  full: {
    hearts: {
      bodyweight: {
        id: 'pushups',
        alts: ['pike-pushups', 'diamond-pushups', 'decline-pushups', 'dips', 'tricep-dips'],
      },
      weights: {
        id: 'dumbbell-floor-press',
        alts: ['dumbbell-press', 'incline-dumbbell-press', 'chest-fly', 'arnold-press', 'skull-crushers', 'overhead-tricep-extension'],
      },
      gym: {
        id: 'bench-press',
        alts: ['overhead-press', 'incline-bench-press', 'decline-bench-press', 'machine-chest-press', 'cable-chest-fly', 'tricep-pushdown'],
      },
    },
    diamonds: {
      bodyweight: {
        id: 'bodyweight-rows',
        alts: ['chin-ups', 'inverted-rows'],
      },
      weights: {
        id: 'dumbbell-rows',
        alts: ['renegade-rows', 'face-pulls', 'hammer-curls', 'dumbbell-curls'],
      },
      gym: {
        id: 'pullups',
        alts: ['lat-pulldown', 'cable-rows', 'bent-over-rows', 't-bar-rows', 'chest-supported-rows', 'straight-arm-pulldown', 'barbell-curls', 'cable-curls', 'preacher-curls'],
      },
    },
    clubs: {
      bodyweight: {
        id: 'jump-squats',
        alts: ['squats', 'box-jumps', 'step-ups', 'pistol-squats'],
      },
      weights: {
        id: 'goblet-squats',
        alts: ['walking-lunges', 'sumo-squats', 'dumbbell-step-ups'],
      },
      gym: {
        id: 'back-squats',
        alts: ['bulgarian-split-squats', 'front-squats', 'leg-press', 'hack-squats', 'leg-extensions'],
      },
    },
    spades: {
      bodyweight: {
        id: 'glute-bridges',
        alts: ['lunges', 'single-leg-glute-bridges', 'nordic-curls', 'good-mornings'],
      },
      weights: {
        id: 'kettlebell-swings',
        alts: ['hip-thrusts', 'sumo-deadlifts', 'good-mornings'],
      },
      gym: {
        id: 'romanian-deadlifts',
        alts: ['barbell-hip-thrusts', 'leg-curls', 'sumo-deadlifts', 'rack-pulls', 'cable-kickbacks'],
      },
    },
  },

  upper: {
    hearts: {
      bodyweight: {
        id: 'pushups',
        alts: ['pike-pushups', 'diamond-pushups', 'decline-pushups', 'dips', 'tricep-dips'],
      },
      weights: {
        id: 'dumbbell-press',
        alts: ['shoulder-press', 'incline-dumbbell-press', 'chest-fly', 'arnold-press', 'lateral-raises', 'skull-crushers', 'overhead-tricep-extension'],
      },
      gym: {
        id: 'bench-press',
        alts: ['overhead-press', 'incline-bench-press', 'decline-bench-press', 'machine-chest-press', 'cable-chest-fly', 'tricep-pushdown'],
      },
    },
    diamonds: {
      bodyweight: {
        id: 'pullups',
        alts: ['bodyweight-rows', 'chin-ups', 'inverted-rows'],
      },
      weights: {
        id: 'dumbbell-rows',
        alts: ['renegade-rows', 'face-pulls', 'hammer-curls', 'dumbbell-curls'],
      },
      gym: {
        id: 'lat-pulldown',
        alts: ['pullups', 'cable-rows', 'bent-over-rows', 't-bar-rows', 'chest-supported-rows', 'straight-arm-pulldown', 'barbell-curls', 'cable-curls'],
      },
    },
    clubs: {
      bodyweight: {
        id: 'pike-pushups',
        alts: ['pushups', 'diamond-pushups', 'dips', 'tricep-dips'],
      },
      weights: {
        id: 'shoulder-press',
        alts: ['dumbbell-press', 'arnold-press', 'lateral-raises', 'skull-crushers', 'overhead-tricep-extension'],
      },
      gym: {
        id: 'overhead-press',
        alts: ['bench-press', 'machine-chest-press', 'tricep-pushdown', 'cable-chest-fly'],
      },
    },
    spades: {
      bodyweight: {
        id: 'plank-to-pushup',
        alts: [],
      },
      weights: {
        id: 'renegade-rows',
        alts: ['dumbbell-rows', 'face-pulls', 'hammer-curls'],
      },
      gym: {
        id: 'cable-rows',
        alts: ['lat-pulldown', 'bent-over-rows', 't-bar-rows', 'chest-supported-rows', 'straight-arm-pulldown', 'preacher-curls'],
      },
    },
  },

  lower: {
    hearts: {
      bodyweight: {
        id: 'lunges',
        alts: ['squats', 'step-ups', 'single-leg-glute-bridges', 'pistol-squats'],
      },
      weights: {
        id: 'walking-lunges',
        alts: ['goblet-squats', 'dumbbell-step-ups', 'sumo-squats'],
      },
      gym: {
        id: 'bulgarian-split-squats',
        alts: ['back-squats', 'front-squats', 'leg-press', 'leg-extensions'],
      },
    },
    diamonds: {
      bodyweight: {
        id: 'squats',
        alts: ['jump-squats', 'lunges', 'box-jumps', 'step-ups', 'pistol-squats'],
      },
      weights: {
        id: 'goblet-squats',
        alts: ['walking-lunges', 'sumo-squats', 'dumbbell-step-ups'],
      },
      gym: {
        id: 'back-squats',
        alts: ['bulgarian-split-squats', 'front-squats', 'leg-press', 'hack-squats', 'leg-extensions'],
      },
    },
    clubs: {
      bodyweight: {
        id: 'glute-bridges',
        alts: ['single-leg-glute-bridges', 'nordic-curls', 'good-mornings'],
      },
      weights: {
        id: 'hip-thrusts',
        alts: ['kettlebell-swings', 'sumo-deadlifts', 'good-mornings'],
      },
      gym: {
        id: 'barbell-hip-thrusts',
        alts: ['romanian-deadlifts', 'leg-curls', 'sumo-deadlifts', 'rack-pulls', 'cable-kickbacks'],
      },
    },
    spades: {
      bodyweight: {
        id: 'calf-raises',
        alts: [],
      },
      weights: {
        id: 'weighted-calf-raises',
        alts: [],
      },
      gym: {
        id: 'standing-calf-raises',
        alts: ['leg-curls'],
      },
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
    bodyweight: {
      id: 'burpees',
      reps: 15,
      alts: [
        { id: 'hollow-body-hold', durationSec: 45 },
        { id: 'box-jump-burpees', reps: 10 },
        { id: 'jump-rope', durationSec: 45 },
      ],
    },
    weights: {
      id: 'thrusters',
      reps: 15,
      alts: [
        { id: 'man-makers', reps: 10 },
        { id: 'db-snatch', reps: 12 },
        { id: 'devil-press', reps: 8 },
        { id: 'clean-and-press', reps: 12 },
      ],
    },
    gym: {
      id: 'wall-balls',
      reps: 15,
      alts: [
        { id: 'thrusters', reps: 12 },
        { id: 'db-snatch', reps: 12 },
        { id: 'devil-press', reps: 8 },
      ],
    },
  },
  Q: {
    bodyweight: {
      id: 'hollow-body-hold',
      durationSec: 60,
      alts: [
        { id: 'burpees', reps: 10 },
        { id: 'wall-sit', durationSec: 60 },
        { id: 'jump-rope', durationSec: 60 },
      ],
    },
    weights: {
      id: 'weighted-plank',
      durationSec: 60,
      alts: [
        { id: 'man-makers', reps: 8 },
        { id: 'kettlebell-complex', reps: 5 },
        { id: 'devil-press', reps: 6 },
      ],
    },
    gym: {
      id: 'plank-hold',
      durationSec: 60,
      alts: [
        { id: 'wall-balls', reps: 12 },
        { id: 'assault-bike', durationSec: 45 },
        { id: 'wall-sit', durationSec: 60 },
      ],
    },
  },
  K: {
    bodyweight: {
      id: 'broad-jumps',
      reps: 20,
      alts: [
        { id: 'burpees', reps: 15 },
        { id: 'box-jump-burpees', reps: 15 },
        { id: 'jump-rope', durationSec: 90 },
      ],
    },
    weights: {
      id: 'man-makers',
      reps: 20,
      alts: [
        { id: 'thrusters', reps: 15 },
        { id: 'devil-press', reps: 12 },
        { id: 'db-snatch', reps: 20 },
        { id: 'clean-and-press', reps: 15 },
      ],
    },
    gym: {
      id: 'heavy-sled-push',
      distanceM: 20,
      alts: [
        { id: 'wall-balls', reps: 25 },
        { id: 'assault-bike', durationSec: 60 },
      ],
    },
  },
};

export const FACE_CHALLENGES_CARDIO: Record<FaceRank, FaceChallenge> = {
  J: {
    id: 'skierg',
    reps: 15,
    alts: [
      { id: 'row', distanceM: 300 },
      { id: 'assault-bike', durationSec: 45 },
      { id: 'jump-rope', durationSec: 45 },
    ],
  },
  Q: {
    id: 'battle-ropes',
    durationSec: 60,
    alts: [
      { id: 'skierg', durationSec: 45 },
      { id: 'assault-bike', durationSec: 60 },
    ],
  },
  K: {
    id: 'row',
    distanceM: 500,
    alts: [
      { id: 'battle-ropes', durationSec: 90 },
      { id: 'assault-bike', durationSec: 90 },
    ],
  },
};
