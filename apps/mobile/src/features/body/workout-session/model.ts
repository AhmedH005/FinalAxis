import {
  getExerciseById,
  getExercisesByPattern,
  type ExerciseDefinition,
  type IntensityLevel,
  type MovementPattern,
  type ProgramDay,
  type WorkoutExercise,
} from '@/engines/body';
import type { WorkoutSessionRouteParams } from '@/types/navigation';

export interface SessionSet {
  reps: string;
  weight: string;
  done: boolean;
}

export interface SessionExercise {
  exercise: ExerciseDefinition;
  sets: SessionSet[];
}

export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = '8';

export const INTENSITIES: { value: IntensityLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#43D9A3' },
  { value: 'moderate', label: 'Moderate', color: '#F9B24E' },
  { value: 'high', label: 'High', color: '#FF6B6B' },
];

const QUICK_DAY_PATTERNS: Partial<Record<string, MovementPattern>> = {
  push: 'push',
  pull: 'pull',
  legs: 'squat',
  cardio: 'conditioning',
  core: 'core',
};

export function createSessionExercise(exercise: ExerciseDefinition): SessionExercise {
  return {
    exercise,
    sets: Array.from({ length: DEFAULT_SETS }, () => ({
      reps: DEFAULT_REPS,
      weight: '',
      done: false,
    })),
  };
}

export function isIntensityLevel(value: string | undefined): value is IntensityLevel {
  return value === 'low' || value === 'moderate' || value === 'high';
}

export function getInitialIntensity(value: string | undefined): IntensityLevel {
  return isIntensityLevel(value) ? value : 'moderate';
}

export function getWorkoutSessionDayLabel(
  params: WorkoutSessionRouteParams,
  programDay: ProgramDay | null,
) {
  return params.dayLabel ?? programDay?.name ?? 'Workout';
}

export function getWorkoutSessionType(
  params: WorkoutSessionRouteParams,
  programDay: ProgramDay | null,
) {
  if (params.workoutType) return params.workoutType;

  const dayId = params.dayId ?? '';
  if (programDay?.movement_patterns.includes('conditioning')) return 'Running';
  if (programDay?.movement_patterns.includes('core') && programDay.movement_patterns.length === 1) {
    return 'HIIT';
  }
  if (dayId === 'cardio' || dayId === 'conditioning') return 'Running';
  if (dayId === 'core') return 'HIIT';
  return 'Strength';
}

export function buildSessionExercises(
  params: WorkoutSessionRouteParams,
  programDay: ProgramDay | null,
) {
  let exerciseIds: string[] = [];

  if (params.exerciseIds) {
    exerciseIds = params.exerciseIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  } else if (programDay) {
    exerciseIds = [
      ...programDay.primary_exercise_ids,
      ...programDay.accessory_exercise_ids.slice(0, 2),
    ];
  } else if (params.dayId) {
    if (params.dayId === 'upper') {
      const pushExercises = getExercisesByPattern('push')
        .filter((exercise) => exercise.focus === 'compound')
        .slice(0, 2);
      const pullExercises = getExercisesByPattern('pull')
        .filter((exercise) => exercise.focus === 'compound')
        .slice(0, 2);
      exerciseIds = [
        ...pushExercises.map((exercise) => exercise.id),
        ...pullExercises.map((exercise) => exercise.id),
      ];
    } else if (params.dayId === 'lower') {
      const squatExercises = getExercisesByPattern('squat')
        .filter((exercise) => exercise.focus === 'compound')
        .slice(0, 2);
      const hingeExercises = getExercisesByPattern('hinge')
        .filter((exercise) => exercise.focus === 'compound')
        .slice(0, 2);
      exerciseIds = [
        ...squatExercises.map((exercise) => exercise.id),
        ...hingeExercises.map((exercise) => exercise.id),
      ];
    } else {
      const pattern = QUICK_DAY_PATTERNS[params.dayId];
      if (pattern) {
        exerciseIds = getExercisesByPattern(pattern)
          .filter((exercise) => exercise.focus === 'compound')
          .slice(0, 3)
          .map((exercise) => exercise.id);
      }
    }
  }

  return exerciseIds
    .map((id) => getExerciseById(id))
    .filter((exercise): exercise is ExerciseDefinition => exercise !== null)
    .map(createSessionExercise);
}

export function toCompletedWorkoutExercises(exercises: SessionExercise[]): WorkoutExercise[] {
  return exercises
    .filter((entry) => entry.sets.some((set) => set.done))
    .map((entry) => {
      const completedSets = entry.sets.filter((set) => set.done);
      const averageReps = Math.round(
        completedSets.reduce((sum, set) => sum + (parseInt(set.reps, 10) || 0), 0) / completedSets.length,
      );
      const averageWeight = completedSets.some((set) => parseFloat(set.weight) > 0)
        ? completedSets.reduce((sum, set) => sum + (parseFloat(set.weight) || 0), 0) / completedSets.length
        : undefined;

      return {
        exercise_id: entry.exercise.id,
        name: entry.exercise.name,
        sets: completedSets.length,
        reps: averageReps || null,
        weight_kg: averageWeight ? Math.round(averageWeight * 10) / 10 : null,
        duration_seconds: null,
        notes: null,
      };
    });
}

export function isBodyweightExercise(exercise: ExerciseDefinition) {
  const equipment = exercise.equipment ?? [];
  return equipment.includes('bodyweight')
    && !equipment.some((item) => ['barbell', 'dumbbells', 'machine', 'cables'].includes(item));
}
