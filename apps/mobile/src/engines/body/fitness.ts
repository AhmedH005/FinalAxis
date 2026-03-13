import type { GoalType } from '@/lib/supabase/database.types';
import type { WorkoutLog } from '@/lib/supabase/database.types';
import type { IntensityLevel } from './types';
import { estimateWorkoutExpenditure } from './energy';
import {
  getExerciseById,
  getExerciseCatalog,
  type MovementPattern,
} from './exercise-providers';

export interface WorkoutRecommendation {
  title: string;
  summary: string;
  workout_type: string;
  duration_minutes: number;
  intensity: IntensityLevel;
  exercise_ids: string[];
  focus_patterns: MovementPattern[];
  estimated_expenditure_calories: number | null;
  reason: string;
  energy_note: string;
  readiness_note: string;
  alternatives: string[];
}

export function getExercisesForWorkoutType(workoutType: string) {
  return getExerciseCatalog().filter((exercise) => exercise.workout_types.includes(workoutType));
}

function getWorkoutPatterns(workout: WorkoutLog) {
  return Array.from(new Set(
    (workout.exercises ?? [])
      .map((exercise) => exercise.exercise_id)
      .filter((exerciseId): exerciseId is string => Boolean(exerciseId))
      .map((exerciseId) => getExerciseById(exerciseId)?.movement_pattern)
      .filter((pattern): pattern is MovementPattern => Boolean(pattern)),
  ));
}

export function getWorkoutDisplayName(workout: WorkoutLog) {
  const explicitName = workout.name?.trim();
  if (explicitName) return explicitName;

  const workoutType = workout.workout_type?.trim() || 'Workout';
  if (!/strength/i.test(workoutType)) return workoutType;

  const patterns = getWorkoutPatterns(workout);
  const hasUpper = patterns.some((pattern) => ['push', 'pull', 'carry'].includes(pattern));
  const hasLower = patterns.some((pattern) => ['squat', 'hinge'].includes(pattern));
  const hasConditioning = patterns.includes('conditioning');
  const hasCore = patterns.includes('core');

  if (hasConditioning && !hasUpper && !hasLower) {
    return hasCore ? 'Conditioning + Core' : 'Conditioning';
  }

  if (hasUpper && hasLower) return 'Full Body';
  if (hasLower && !hasUpper) return 'Lower Body';
  if (hasUpper && !hasLower) {
    if (patterns.includes('push') && !patterns.includes('pull')) return 'Push';
    if (patterns.includes('pull') && !patterns.includes('push')) return 'Pull';
    return 'Upper Body';
  }

  return workoutType;
}

export function getWorkoutExercisePreview(workout: WorkoutLog, limit = 2) {
  const names = (workout.exercises ?? [])
    .map((exercise) => exercise.name?.trim())
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) return null;
  if (names.length <= limit) return names.join(' · ');
  return `${names.slice(0, limit).join(' · ')} +${names.length - limit} more`;
}

export function summarizeWorkoutHistory(workouts: WorkoutLog[]) {
  const recentExercises = workouts
    .flatMap((workout) => workout.exercises ?? [])
    .map((exercise) => exercise.exercise_id)
    .filter((exerciseId): exerciseId is string => Boolean(exerciseId));

  const movementCounts: Record<MovementPattern, number> = {
    push: 0,
    pull: 0,
    squat: 0,
    hinge: 0,
    carry: 0,
    core: 0,
    conditioning: 0,
  };

  for (const exerciseId of recentExercises) {
    const exercise = getExerciseById(exerciseId);
    if (!exercise) continue;
    movementCounts[exercise.movement_pattern] += 1;
  }

  return {
    recentExercises,
    movementCounts,
  };
}

function getLeastTrainedMovement(workouts: WorkoutLog[]) {
  const summary = summarizeWorkoutHistory(workouts);
  const ordered = Object.entries(summary.movementCounts).sort((a, b) => a[1] - b[1]);
  return ordered[0]?.[0] as MovementPattern | undefined;
}

function getExercisesForMovement(movement: MovementPattern, workoutType: string) {
  return getExerciseCatalog()
    .filter((exercise) => exercise.movement_pattern === movement && exercise.workout_types.includes(workoutType))
    .map((exercise) => exercise.id);
}

function pickUniqueExercises(exerciseIds: string[], fallbackIds: string[], limit = 4) {
  const seen = new Set<string>();
  const merged = [...exerciseIds, ...fallbackIds].filter((exerciseId) => {
    if (!exerciseId || seen.has(exerciseId)) return false;
    seen.add(exerciseId);
    return true;
  });

  return merged.slice(0, limit);
}

function getStrengthTemplate(pattern: MovementPattern | undefined) {
  const fallbackByPattern: Record<MovementPattern, string[]> = {
    push: ['bench-press', 'overhead-press', 'incline-dumbbell-press', 'lateral-raise'],
    pull: ['pull-up', 'barbell-row', 'lat-pulldown', 'face-pull'],
    squat: ['barbell-squat', 'goblet-squat', 'walking-lunge', 'leg-extension'],
    hinge: ['romanian-deadlift', 'hip-thrust', 'back-extension', 'dead-bug'],
    carry: ['farmer-carry', 'plank', 'dumbbell-row', 'walking-lunge'],
    core: ['plank', 'dead-bug', 'hanging-knee-raise', 'farmer-carry'],
    conditioning: ['incline-walk', 'tempo-run', 'bike-interval', 'plank'],
  };

  const targetPattern = pattern ?? 'push';
  const patternExercises = getExercisesForMovement(targetPattern, 'Strength');

  if (targetPattern === 'push') {
    return pickUniqueExercises(patternExercises, fallbackByPattern.push);
  }

  if (targetPattern === 'pull') {
    return pickUniqueExercises(patternExercises, fallbackByPattern.pull);
  }

  if (targetPattern === 'squat' || targetPattern === 'hinge') {
    return pickUniqueExercises(
      [...getExercisesForMovement('squat', 'Strength'), ...getExercisesForMovement('hinge', 'Strength')],
      [...fallbackByPattern.squat, ...fallbackByPattern.hinge],
    );
  }

  return pickUniqueExercises(patternExercises, fallbackByPattern[targetPattern]);
}

function getConditioningTemplate() {
  return ['tempo-run', 'incline-walk', 'walking-lunge', 'plank'];
}

function buildRecommendation(args: {
  title: string;
  summary: string;
  workout_type: string;
  duration_minutes: number;
  intensity: IntensityLevel;
  exercise_ids: string[];
  focus_patterns: MovementPattern[];
  reason: string;
  readiness_note: string;
  energy_note: string;
  alternatives: string[];
  bodyWeightKg: number | null;
}): WorkoutRecommendation {
  const recommendation = {
    title: args.title,
    summary: args.summary,
    workout_type: args.workout_type,
    duration_minutes: args.duration_minutes,
    intensity: args.intensity,
    exercise_ids: args.exercise_ids,
    focus_patterns: args.focus_patterns,
    estimated_expenditure_calories: args.bodyWeightKg
      ? estimateWorkoutExpenditure({
        workoutType: args.workout_type,
        durationMinutes: args.duration_minutes,
        intensity: args.intensity,
        bodyWeightKg: args.bodyWeightKg,
      })
      : null,
    reason: args.reason,
    readiness_note: args.readiness_note,
    energy_note: args.energy_note,
    alternatives: args.alternatives,
  };

  return recommendation;
}

export function getRecommendedWorkout(args: {
  goalType: GoalType | null | undefined;
  recoveryScore: number | null;
  energyBalanceCalories: number | null;
  bodyWeightKg: number | null;
  workoutsThisWeek: number;
  latestWorkoutType: string | null;
  recentWorkouts?: WorkoutLog[];
}): WorkoutRecommendation {
  const {
    goalType,
    recoveryScore,
    energyBalanceCalories,
    bodyWeightKg,
    workoutsThisWeek,
    latestWorkoutType,
    recentWorkouts = [],
  } = args;
  const leastTrainedMovement = getLeastTrainedMovement(recentWorkouts);
  const lowRecovery = (recoveryScore ?? 100) < 45;
  const moderateRecovery = (recoveryScore ?? 100) < 65;
  const deepDeficit = energyBalanceCalories !== null && energyBalanceCalories <= -500;
  const surplus = energyBalanceCalories !== null && energyBalanceCalories >= 250;
  const repeatedStrength = latestWorkoutType?.toLowerCase() === 'strength';
  const recoveryNote = lowRecovery
    ? 'Body readiness is low today. Reduce intensity and keep momentum.'
    : moderateRecovery
    ? 'Readiness is moderate, so quality matters more than extra volume.'
    : 'Readiness is supportive of a more productive session.';
  const energyNote = energyBalanceCalories === null
    ? 'Energy estimate is still incomplete, so this recommendation leans on recovery and recent training.'
    : deepDeficit
    ? 'You are likely in a deeper deficit today, so the engine is protecting load and session size.'
    : surplus
    ? 'Energy availability looks supportive, so the engine can lean into a fuller session.'
    : 'Energy balance looks moderate, so the engine is keeping the session productive but repeatable.';

  if (lowRecovery) {
    return buildRecommendation({
      title: 'Recovery-focused session',
      summary: 'Keep load light and prioritize circulation and mobility today.',
      workout_type: 'Walking',
      duration_minutes: 30,
      intensity: 'low',
      exercise_ids: ['incline-walk', 'plank', 'dead-bug'],
      focus_patterns: ['conditioning', 'core'],
      reason: 'Recovery score is low, so the engine is protecting load.',
      readiness_note: recoveryNote,
      energy_note: energyNote,
      alternatives: ['Yoga', 'Pilates'],
      bodyWeightKg,
    });
  }

  if (goalType === 'perform') {
    const strengthFocus = leastTrainedMovement && leastTrainedMovement !== 'conditioning'
      ? leastTrainedMovement
      : 'pull';
    const strengthExercises = getStrengthTemplate(strengthFocus);
    const runningDay = repeatedStrength;

    return buildRecommendation({
      title: 'Performance builder',
      summary: 'Blend conditioning with compound work to keep output high.',
      workout_type: runningDay ? 'Running' : 'Strength',
      duration_minutes: runningDay ? 35 : moderateRecovery ? 40 : 48,
      intensity: moderateRecovery ? 'moderate' : 'high',
      exercise_ids: runningDay ? getConditioningTemplate() : strengthExercises,
      focus_patterns: runningDay ? ['conditioning', 'core'] : [strengthFocus, 'core'],
      reason: 'Performance goals benefit from alternating conditioning and compound work.',
      readiness_note: recoveryNote,
      energy_note: energyNote,
      alternatives: runningDay ? ['Cycling', 'Strength'] : ['Running', 'Cycling'],
      bodyWeightKg,
    });
  }

  if (goalType === 'gain') {
    const muscleFocus = leastTrainedMovement && leastTrainedMovement !== 'conditioning'
      ? leastTrainedMovement
      : repeatedStrength
      ? 'pull'
      : 'push';
    const exerciseIds = getStrengthTemplate(muscleFocus);

    return buildRecommendation({
      title: deepDeficit ? 'Fuel-aware strength session' : 'Hypertrophy bias',
      summary: deepDeficit
        ? 'Keep the session focused so you can train well without digging the hole deeper.'
        : 'Compound lifts first, then a small amount of accessory work.',
      workout_type: 'Strength',
      duration_minutes: deepDeficit ? 38 : moderateRecovery ? 44 : 52,
      intensity: deepDeficit ? 'moderate' : moderateRecovery ? 'moderate' : 'high',
      exercise_ids: exerciseIds,
      focus_patterns: [muscleFocus],
      reason: muscleFocus
        ? `Recent history is lighter on ${muscleFocus} work, so the plan tilts there.`
        : 'Goal set to gain, so the engine favors compound strength work.',
      readiness_note: recoveryNote,
      energy_note: energyNote,
      alternatives: ['Walking', 'Pilates'],
      bodyWeightKg,
    });
  }

  if (goalType === 'lose') {
    const conditioningFirst = surplus || workoutsThisWeek < 3;
    return buildRecommendation({
      title: 'Lean out session',
      summary: 'Use a steady moderate session to keep consistency high.',
      workout_type: conditioningFirst ? 'HIIT' : 'Walking',
      duration_minutes: conditioningFirst ? 26 : 35,
      intensity: conditioningFirst ? 'moderate' : 'low',
      exercise_ids: conditioningFirst ? getConditioningTemplate() : ['incline-walk', 'plank'],
      focus_patterns: conditioningFirst ? ['conditioning', 'core'] : ['conditioning'],
      reason: conditioningFirst
        ? 'Energy and weekly load leave room for a sharper conditioning session.'
        : workoutsThisWeek >= 3
        ? 'Weekly load is already decent, so the engine biases consistency over extra strain.'
        : 'Fat-loss support starts with simple repeatable conditioning.',
      readiness_note: recoveryNote,
      energy_note: energyNote,
      alternatives: conditioningFirst ? ['Running', 'Cycling'] : ['Cycling', 'Yoga'],
      bodyWeightKg,
    });
  }

  const balancedFocus = leastTrainedMovement && leastTrainedMovement !== 'conditioning'
    ? leastTrainedMovement
    : repeatedStrength
    ? 'squat'
    : 'pull';
  const balancedExerciseIds = getStrengthTemplate(balancedFocus);

  return buildRecommendation({
    title: 'Balanced full-body',
    summary: 'A simple repeatable session that covers the main movement patterns.',
    workout_type: 'Strength',
    duration_minutes: moderateRecovery ? 38 : 44,
    intensity: moderateRecovery ? 'moderate' : 'high',
    exercise_ids: balancedExerciseIds,
    focus_patterns: [balancedFocus, 'core'],
    reason: balancedFocus
      ? `The engine sees less recent ${balancedFocus} work and is nudging balance.`
      : 'This is the default full-body recommendation.',
    readiness_note: recoveryNote,
    energy_note: energyNote,
    alternatives: ['Walking', 'Cycling'],
    bodyWeightKg,
  });
}
