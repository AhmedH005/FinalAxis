import type { BiologicalSex, Profile, WorkoutExercise, WorkoutLog } from '@/lib/supabase/database.types';
import type { DailyEnergySummary, IntensityLevel } from './types';
import { getExerciseById } from './exercise-providers';

export interface WorkoutExerciseEnergyBreakdown {
  exercise_id: string | null;
  name: string;
  sets: number;
  reps: number | null;
  weight_kg: number | null;
  duration_minutes: number;
  estimated_calories: number;
}

export interface WorkoutEnergyBreakdown {
  exercises: WorkoutExerciseEnergyBreakdown[];
  total_estimated_calories: number;
  total_estimated_minutes: number;
  generic_estimated_calories: number;
  duration_source: 'recorded' | 'modeled';
}

function getAgeYears(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const birthdayPassed = (
    now.getMonth() > dob.getMonth()
    || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())
  );

  if (!birthdayPassed) age -= 1;
  return age > 0 ? age : null;
}

export function estimateBaselineExpenditure(args: {
  weightKg: number | null;
  heightCm: number | null;
  biologicalSex: BiologicalSex | null | undefined;
  dateOfBirth: string | null | undefined;
}) {
  const { weightKg, heightCm, biologicalSex, dateOfBirth } = args;
  if (!weightKg) return null;

  const age = getAgeYears(dateOfBirth);

  if (heightCm && age && biologicalSex && biologicalSex !== 'other') {
    const sexOffset = biologicalSex === 'male' ? 5 : -161;
    return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + sexOffset);
  }

  // Conservative fallback when profile data is incomplete.
  return Math.round(weightKg * 22);
}

function getWorkoutMet(workoutType: string, intensity: IntensityLevel | null | undefined) {
  const type = workoutType.trim().toLowerCase();
  const level = intensity ?? 'moderate';

  const byType: Array<{ match: RegExp; mets: Record<IntensityLevel, number> }> = [
    { match: /(run|jog)/, mets: { low: 7, moderate: 9.8, high: 11.5 } },
    { match: /(walk|hike)/, mets: { low: 2.8, moderate: 3.5, high: 4.3 } },
    { match: /(cycle|bike|spin)/, mets: { low: 4, moderate: 6.8, high: 8.8 } },
    { match: /(strength|lift|hypertrophy|push|pull|legs)/, mets: { low: 3.5, moderate: 5, high: 6.5 } },
    { match: /(hiit|conditioning|circuit)/, mets: { low: 6, moderate: 8.5, high: 10 } },
    { match: /(yoga|pilates|mobility)/, mets: { low: 2.5, moderate: 3, high: 3.5 } },
  ];

  const match = byType.find((entry) => entry.match.test(type));
  return match?.mets[level] ?? { low: 4, moderate: 5.5, high: 7 }[level];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getExerciseMet(
  exercise: WorkoutExercise,
  workoutType: string,
  intensity: IntensityLevel | null | undefined,
) {
  const definition = exercise.exercise_id ? getExerciseById(exercise.exercise_id) : null;
  const level = intensity ?? 'moderate';

  if (definition?.movement_pattern === 'conditioning') {
    return { low: 6.2, moderate: 8.4, high: 10 }[level];
  }

  if (definition?.focus === 'isolation') {
    return { low: 2.8, moderate: 4.1, high: 5.2 }[level];
  }

  if (definition?.focus === 'compound') {
    return { low: 3.8, moderate: 5.6, high: 7 }[level];
  }

  return getWorkoutMet(workoutType, intensity);
}

function estimateExerciseDurationMinutes(exercise: WorkoutExercise, workoutType: string) {
  const definition = exercise.exercise_id ? getExerciseById(exercise.exercise_id) : null;
  const sets = Math.max(exercise.sets ?? 0, 0);
  const reps = Math.max(exercise.reps ?? 0, 0);
  if (sets === 0) return 0;

  const compound = definition?.focus !== 'isolation';
  const conditioning = definition?.movement_pattern === 'conditioning' || /run|walk|cycle|row|hiit/i.test(workoutType);
  const minimumMinutes = conditioning ? 4.5 : compound ? 5 : 4;

  if (exercise.duration_seconds && exercise.duration_seconds > 0) {
    return Math.max(exercise.duration_seconds / 60, minimumMinutes);
  }

  const secondsPerRep = conditioning ? 3 : compound ? 5 : 4;
  const activeSeconds = reps > 0
    ? sets * Math.max(conditioning ? 40 : compound ? 32 : 24, reps * secondsPerRep)
    : sets * (conditioning ? 75 : compound ? 40 : 30);
  const restSeconds = Math.max(sets - 1, 0) * (conditioning ? 35 : compound ? 105 : 70);
  const transitionSeconds = conditioning ? 30 : compound ? 45 : 35;

  return Math.max((activeSeconds + restSeconds + transitionSeconds) / 60, minimumMinutes);
}

function estimateExerciseLoadFactor(exercise: WorkoutExercise, bodyWeightKg: number) {
  const definition = exercise.exercise_id ? getExerciseById(exercise.exercise_id) : null;
  const sets = Math.max(exercise.sets ?? 0, 0);
  const reps = Math.max(exercise.reps ?? 0, 0);
  const totalReps = sets * Math.max(reps, 1);
  const weightKg = Math.max(exercise.weight_kg ?? 0, 0);
  const bodyweight = (definition?.equipment ?? []).includes('bodyweight');

  if (weightKg > 0) {
    const relativeVolume = (weightKg * totalReps) / Math.max(bodyWeightKg * 100, 1);
    return clamp(0.9 + (relativeVolume * 0.28), 0.9, 1.4);
  }

  if (bodyweight) {
    return clamp(0.95 + (totalReps / 120), 0.95, 1.25);
  }

  return clamp(0.9 + (totalReps / 160), 0.9, 1.2);
}

export function buildWorkoutExpenditureBreakdown(args: {
  workoutType: string;
  durationMinutes: number | null;
  intensity: IntensityLevel | null | undefined;
  bodyWeightKg: number | null;
  exercises?: WorkoutExercise[] | null;
}): WorkoutEnergyBreakdown {
  const { workoutType, durationMinutes, intensity, bodyWeightKg, exercises } = args;

  if (!bodyWeightKg) {
    return {
      exercises: [],
      total_estimated_calories: 0,
      total_estimated_minutes: 0,
      generic_estimated_calories: 0,
      duration_source: 'recorded',
    };
  }

  const met = getWorkoutMet(workoutType, intensity);
  const genericEstimate = durationMinutes && durationMinutes > 0
    ? (met * 3.5 * bodyWeightKg / 200) * durationMinutes
    : 0;

  if (!exercises?.length) {
    return {
      exercises: [],
      total_estimated_calories: 0,
      total_estimated_minutes: 0,
      generic_estimated_calories: Math.round(genericEstimate),
      duration_source: 'recorded',
    };
  }

  const rawBreakdown = exercises.map((exercise) => {
    const duration = estimateExerciseDurationMinutes(exercise, workoutType);
    const loadFactor = estimateExerciseLoadFactor(exercise, bodyWeightKg);
    const metValue = getExerciseMet(exercise, workoutType, intensity);
    const calories = duration > 0
      ? (metValue * loadFactor * 3.5 * bodyWeightKg / 200) * duration
      : 0;

    return {
      exercise_id: exercise.exercise_id ?? null,
      name: exercise.name,
      sets: Math.max(exercise.sets ?? 0, 0),
      reps: exercise.reps ?? null,
      weight_kg: exercise.weight_kg ?? null,
      duration_minutes: duration,
      estimated_calories_raw: calories,
    };
  }).filter((exercise) => exercise.sets > 0);

  const rawMinutes = rawBreakdown.reduce((sum, exercise) => sum + exercise.duration_minutes, 0);
  const hasRecordedDuration = Boolean(durationMinutes && durationMinutes > 0);
  const recordedDurationIsPlausible = hasRecordedDuration
    && rawMinutes > 0
    && (durationMinutes as number) >= rawMinutes * 0.65;
  const scale = recordedDurationIsPlausible && rawMinutes > 0
    ? (durationMinutes as number) / rawMinutes
    : 1;
  const durationSource: WorkoutEnergyBreakdown['duration_source'] = recordedDurationIsPlausible ? 'recorded' : 'modeled';

  const exercisesWithCalories: WorkoutExerciseEnergyBreakdown[] = rawBreakdown.map((exercise) => ({
    exercise_id: exercise.exercise_id,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    weight_kg: exercise.weight_kg,
    duration_minutes: Math.round(exercise.duration_minutes * scale * 10) / 10,
    estimated_calories: Math.round(exercise.estimated_calories_raw * scale),
  }));

  return {
    exercises: exercisesWithCalories,
    total_estimated_calories: exercisesWithCalories.reduce((sum, exercise) => sum + exercise.estimated_calories, 0),
    total_estimated_minutes: Math.round(exercisesWithCalories.reduce((sum, exercise) => sum + exercise.duration_minutes, 0)),
    generic_estimated_calories: Math.round(genericEstimate),
    duration_source: durationSource,
  };
}

export function estimateWorkoutExpenditure(args: {
  workoutType: string;
  durationMinutes: number | null;
  intensity: IntensityLevel | null | undefined;
  bodyWeightKg: number | null;
  exercises?: WorkoutExercise[] | null;
}) {
  const { workoutType, durationMinutes, intensity, bodyWeightKg, exercises } = args;
  if (!bodyWeightKg) return 0;

  const met = getWorkoutMet(workoutType, intensity);
  const genericEstimate = durationMinutes && durationMinutes > 0
    ? (met * 3.5 * bodyWeightKg / 200) * durationMinutes
    : 0;

  if (!exercises?.length) return Math.round(genericEstimate);

  const fromExercises = buildWorkoutExpenditureBreakdown({
    workoutType,
    durationMinutes,
    intensity,
    bodyWeightKg,
    exercises,
  });

  if (!durationMinutes || durationMinutes <= 0) {
    return Math.round(fromExercises.total_estimated_calories || genericEstimate);
  }

  const normalizedExerciseCalories = fromExercises.total_estimated_calories;

  if (normalizedExerciseCalories <= 0) return Math.round(genericEstimate);

  return Math.round((normalizedExerciseCalories * 0.65) + (genericEstimate * 0.35));
}

export function estimateMovementExpenditure(args: {
  steps: number | null;
  bodyWeightKg: number | null;
}) {
  const { steps, bodyWeightKg } = args;
  if (!steps || !bodyWeightKg || steps <= 0) return null;

  const stepsAboveBaseline = Math.max(steps - 3000, 0);
  return Math.round(stepsAboveBaseline * bodyWeightKg * 0.00057);
}

export function buildDailyEnergySummary(args: {
  date: string;
  profile: Profile | null | undefined;
  bodyWeightKg: number | null;
  intakeCalories: number;
  steps: number | null;
  workouts: WorkoutLog[];
}) : DailyEnergySummary {
  const { date, profile, bodyWeightKg, intakeCalories, steps, workouts } = args;

  const baseline = estimateBaselineExpenditure({
    weightKg: bodyWeightKg,
    heightCm: profile?.height_cm ?? null,
    biologicalSex: profile?.biological_sex,
    dateOfBirth: profile?.date_of_birth,
  });

  const movement = estimateMovementExpenditure({
    steps,
    bodyWeightKg,
  });

  const workout = workouts.reduce((sum, item) => (
    sum + estimateWorkoutExpenditure({
      workoutType: item.workout_type,
      durationMinutes: item.duration_minutes,
      intensity: item.intensity,
      bodyWeightKg,
      exercises: item.exercises,
    })
  ), 0);

  const totalExpenditure = baseline !== null
    ? baseline + (movement ?? 0) + workout
    : null;

  const balance = totalExpenditure !== null
    ? Math.round(intakeCalories - totalExpenditure)
    : null;

  return {
    date,
    intake_calories: Math.round(intakeCalories),
    baseline_expenditure_calories: baseline,
    movement_expenditure_calories: movement,
    workout_expenditure_calories: workout,
    total_expenditure_calories: totalExpenditure,
    estimated_balance_calories: balance,
    body_weight_kg: bodyWeightKg,
    steps,
    note: totalExpenditure === null
      ? 'Estimate improves once weight and basic profile data are available.'
      : 'Estimated balance combines baseline needs, movement, and workouts. It is directional, not exact.',
  };
}
