import { t } from '@lingui/core/macro';
import type { ExerciseId } from '@/domain/exercise';

export const tExercise = (id: ExerciseId): string => {
  switch (id) {
    case 'pushups':
      return t`Push-ups`;
    case 'dumbbell-floor-press':
      return t`Dumbbell Floor Press`;
    case 'bench-press':
      return t`Bench Press`;
    case 'bodyweight-rows':
      return t`Bodyweight Rows`;
    case 'dumbbell-rows':
      return t`Dumbbell Rows`;
    case 'pullups':
      return t`Pull-ups`;
    case 'jump-squats':
      return t`Jump Squats`;
    case 'goblet-squats':
      return t`Goblet Squats`;
    case 'back-squats':
      return t`Back Squats`;
    case 'glute-bridges':
      return t`Glute Bridges`;
    case 'kettlebell-swings':
      return t`Kettlebell Swings`;
    case 'romanian-deadlifts':
      return t`Romanian Deadlifts`;
    case 'dumbbell-press':
      return t`Dumbbell Press`;
    case 'lat-pulldown':
      return t`Lat Pulldown`;
    case 'pike-pushups':
      return t`Pike Push-ups`;
    case 'shoulder-press':
      return t`Shoulder Press`;
    case 'overhead-press':
      return t`Overhead Press`;
    case 'plank-to-pushup':
      return t`Plank to Push-up`;
    case 'renegade-rows':
      return t`Renegade Rows`;
    case 'cable-rows':
      return t`Cable Rows`;
    case 'lunges':
      return t`Lunges`;
    case 'walking-lunges':
      return t`Walking Lunges`;
    case 'bulgarian-split-squats':
      return t`Bulgarian Split Squats`;
    case 'squats':
      return t`Squats`;
    case 'hip-thrusts':
      return t`Hip Thrusts`;
    case 'barbell-hip-thrusts':
      return t`Barbell Hip Thrusts`;
    case 'calf-raises':
      return t`Calf Raises`;
    case 'weighted-calf-raises':
      return t`Weighted Calf Raises`;
    case 'standing-calf-raises':
      return t`Standing Calf Raises`;
    case 'burpees':
      return t`Burpees`;
    case 'thrusters':
      return t`Thrusters`;
    case 'wall-balls':
      return t`Wall Balls`;
    case 'hollow-body-hold':
      return t`Hollow Body Hold`;
    case 'weighted-plank':
      return t`Weighted Plank`;
    case 'plank-hold':
      return t`Plank Hold`;
    case 'broad-jumps':
      return t`Broad Jumps`;
    case 'man-makers':
      return t`Man-Makers`;
    case 'heavy-sled-push':
      return t`Heavy Sled Push`;
    case 'skierg':
      return t`SkiErg`;
    case 'battle-ropes':
      return t`Battle Ropes`;
    case 'row':
      return t`Row`;
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
