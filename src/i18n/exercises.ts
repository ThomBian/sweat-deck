import { t } from '@lingui/core/macro';
import type { ExerciseId } from '@/domain/exercise';

export const tExercise = (id: ExerciseId): string => {
  switch (id) {
    // --- Push / Chest / Shoulders / Triceps (bodyweight) ---
    case 'pushups':
      return t`Push-ups`;
    case 'diamond-pushups':
      return t`Diamond Push-ups`;
    case 'decline-pushups':
      return t`Decline Push-ups`;
    case 'dips':
      return t`Dips`;
    case 'tricep-dips':
      return t`Tricep Dips`;
    case 'pike-pushups':
      return t`Pike Push-ups`;
    // --- Push / Chest / Shoulders / Triceps (weights) ---
    case 'dumbbell-floor-press':
      return t`Dumbbell Floor Press`;
    case 'dumbbell-press':
      return t`Dumbbell Press`;
    case 'incline-dumbbell-press':
      return t`Incline Dumbbell Press`;
    case 'chest-fly':
      return t`Chest Fly`;
    case 'arnold-press':
      return t`Arnold Press`;
    case 'lateral-raises':
      return t`Lateral Raises`;
    case 'skull-crushers':
      return t`Skull Crushers`;
    case 'overhead-tricep-extension':
      return t`Overhead Tricep Extension`;
    // --- Push / Chest / Shoulders / Triceps (gym) ---
    case 'bench-press':
      return t`Bench Press`;
    case 'incline-bench-press':
      return t`Incline Bench Press`;
    case 'decline-bench-press':
      return t`Decline Bench Press`;
    case 'machine-chest-press':
      return t`Machine Chest Press`;
    case 'cable-chest-fly':
      return t`Cable Chest Fly`;
    case 'overhead-press':
      return t`Overhead Press`;
    case 'shoulder-press':
      return t`Shoulder Press`;
    case 'tricep-pushdown':
      return t`Tricep Pushdown`;
    case 'plank-to-pushup':
      return t`Plank to Push-up`;
    // --- Pull / Back / Biceps (bodyweight) ---
    case 'bodyweight-rows':
      return t`Bodyweight Rows`;
    case 'chin-ups':
      return t`Chin-ups`;
    case 'inverted-rows':
      return t`Inverted Rows`;
    case 'pullups':
      return t`Pull-ups`;
    // --- Pull / Back / Biceps (weights) ---
    case 'dumbbell-rows':
      return t`Dumbbell Rows`;
    case 'renegade-rows':
      return t`Renegade Rows`;
    case 'face-pulls':
      return t`Face Pulls`;
    case 'hammer-curls':
      return t`Hammer Curls`;
    case 'dumbbell-curls':
      return t`Dumbbell Curls`;
    // --- Pull / Back / Biceps (gym) ---
    case 'lat-pulldown':
      return t`Lat Pulldown`;
    case 'cable-rows':
      return t`Cable Rows`;
    case 'bent-over-rows':
      return t`Bent-over Rows`;
    case 't-bar-rows':
      return t`T-Bar Rows`;
    case 'chest-supported-rows':
      return t`Chest-Supported Rows`;
    case 'straight-arm-pulldown':
      return t`Straight-Arm Pulldown`;
    case 'barbell-curls':
      return t`Barbell Curls`;
    case 'cable-curls':
      return t`Cable Curls`;
    case 'preacher-curls':
      return t`Preacher Curls`;
    // --- Legs / Quads (bodyweight) ---
    case 'squats':
      return t`Squats`;
    case 'jump-squats':
      return t`Jump Squats`;
    case 'box-jumps':
      return t`Box Jumps`;
    case 'step-ups':
      return t`Step-ups`;
    case 'pistol-squats':
      return t`Pistol Squats`;
    case 'lunges':
      return t`Lunges`;
    // --- Legs / Quads (weights) ---
    case 'walking-lunges':
      return t`Walking Lunges`;
    case 'goblet-squats':
      return t`Goblet Squats`;
    case 'sumo-squats':
      return t`Sumo Squats`;
    case 'dumbbell-step-ups':
      return t`Dumbbell Step-ups`;
    // --- Legs / Quads (gym) ---
    case 'back-squats':
      return t`Back Squats`;
    case 'front-squats':
      return t`Front Squats`;
    case 'bulgarian-split-squats':
      return t`Bulgarian Split Squats`;
    case 'leg-press':
      return t`Leg Press`;
    case 'hack-squats':
      return t`Hack Squats`;
    case 'leg-extensions':
      return t`Leg Extensions`;
    // --- Posterior Chain / Hinge / Glutes (bodyweight) ---
    case 'glute-bridges':
      return t`Glute Bridges`;
    case 'single-leg-glute-bridges':
      return t`Single-Leg Glute Bridges`;
    case 'nordic-curls':
      return t`Nordic Curls`;
    case 'good-mornings':
      return t`Good Mornings`;
    // --- Posterior Chain / Hinge / Glutes (weights) ---
    case 'hip-thrusts':
      return t`Hip Thrusts`;
    case 'kettlebell-swings':
      return t`Kettlebell Swings`;
    case 'sumo-deadlifts':
      return t`Sumo Deadlifts`;
    // --- Posterior Chain / Hinge / Glutes (gym) ---
    case 'romanian-deadlifts':
      return t`Romanian Deadlifts`;
    case 'barbell-hip-thrusts':
      return t`Barbell Hip Thrusts`;
    case 'leg-curls':
      return t`Leg Curls`;
    case 'rack-pulls':
      return t`Rack Pulls`;
    case 'cable-kickbacks':
      return t`Cable Kickbacks`;
    // --- Calves ---
    case 'calf-raises':
      return t`Calf Raises`;
    case 'weighted-calf-raises':
      return t`Weighted Calf Raises`;
    case 'standing-calf-raises':
      return t`Standing Calf Raises`;
    // --- Face Challenges ---
    case 'burpees':
      return t`Burpees`;
    case 'box-jump-burpees':
      return t`Box Jump Burpees`;
    case 'thrusters':
      return t`Thrusters`;
    case 'wall-balls':
      return t`Wall Balls`;
    case 'devil-press':
      return t`Devil Press`;
    case 'db-snatch':
      return t`Dumbbell Snatch`;
    case 'clean-and-press':
      return t`Clean & Press`;
    case 'man-makers':
      return t`Man-Makers`;
    case 'kettlebell-complex':
      return t`Kettlebell Complex`;
    case 'hollow-body-hold':
      return t`Hollow Body Hold`;
    case 'weighted-plank':
      return t`Weighted Plank`;
    case 'plank-hold':
      return t`Plank Hold`;
    case 'wall-sit':
      return t`Wall Sit`;
    case 'broad-jumps':
      return t`Broad Jumps`;
    case 'heavy-sled-push':
      return t`Heavy Sled Push`;
    case 'assault-bike':
      return t`Assault Bike`;
    case 'jump-rope':
      return t`Jump Rope`;
    case 'skierg':
      return t`SkiErg`;
    case 'battle-ropes':
      return t`Battle Ropes`;
    case 'row':
      return t`Row`;
    // --- Joker / Special ---
    case 'water-break':
      return t`Water Break`;
    case 'max-effort-leg-burnout':
      return t`Fast Jumping Jacks`;
    case 'sudden-death-50-burpees':
      return t`50 Burpees`;
    case 'sudden-death-100m-sprint':
      return t`100m Sprint`;
    case 'sudden-death-500m-skierg':
      return t`500m SkiErg Sprint`;
    case 'double-up':
      return t`Double up`;
  }
};
