import type { WorkoutLog } from '@/lib/supabase/database.types';
import { computeRecoveryScore } from './recovery-score';
import type {
  DailyBodySummary,
  DailyEnergySummary,
  DailyHydrationSummary,
  DailyNutritionSummary,
  DailyRecoverySummary,
} from './types';

interface SleepSummaryInput {
  duration_minutes: number | null;
  quality_rating: number | null;
  sleep_score?: {
    value: number | null;
  } | null;
}

interface RecoveryEntryInput {
  steps: number | null;
  energy: number | null;
  fatigue: number | null;
  soreness: number | null;
}

export function buildDailyNutritionSummary(args: {
  date: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  calorieTarget: number | null;
}): DailyNutritionSummary {
  return {
    date: args.date,
    total_calories: Math.round(args.totalCalories),
    total_protein_g: Math.round(args.totalProteinG * 10) / 10,
    total_carbs_g: Math.round(args.totalCarbsG * 10) / 10,
    total_fat_g: Math.round(args.totalFatG * 10) / 10,
    calorie_target: args.calorieTarget,
  };
}

export function buildDailyHydrationSummary(args: {
  date: string;
  totalMl: number;
  targetMl: number | null;
}): DailyHydrationSummary {
  return {
    date: args.date,
    total_ml: Math.round(args.totalMl),
    target_ml: args.targetMl,
  };
}

export function buildDailyRecoverySummary(args: {
  date: string;
  recoveryEntry: RecoveryEntryInput | null;
  sleepRecord: SleepSummaryInput | null;
  sleepTargetMinutes?: number;
}): DailyRecoverySummary | null {
  const sleepMinutes = args.sleepRecord?.duration_minutes ?? null;
  const steps = args.recoveryEntry?.steps ?? null;
  const energy = args.recoveryEntry?.energy ?? null;
  const fatigue = args.recoveryEntry?.fatigue ?? null;
  const soreness = args.recoveryEntry?.soreness ?? null;
  const recoveryScore = computeRecoveryScore({
    sleepMinutes,
    energy,
    fatigue,
    soreness,
    sleepTargetMinutes: args.sleepTargetMinutes,
  });

  if (
    steps === null
    && energy === null
    && fatigue === null
    && soreness === null
    && recoveryScore === null
  ) {
    return null;
  }

  return {
    date: args.date,
    steps,
    energy,
    fatigue,
    soreness,
    recovery_score: recoveryScore,
  };
}

export function buildDailyBodySummary(args: {
  date: string;
  nutrition: DailyNutritionSummary | null;
  hydration: DailyHydrationSummary | null;
  energy: DailyEnergySummary | null;
  recoveryEntry: RecoveryEntryInput | null;
  sleepRecord: SleepSummaryInput | null;
  workouts?: Array<Pick<WorkoutLog, 'id'>>;
  latestWeightKg?: number | null;
  sleepTargetMinutes?: number;
}): DailyBodySummary {
  const recovery = buildDailyRecoverySummary({
    date: args.date,
    recoveryEntry: args.recoveryEntry,
    sleepRecord: args.sleepRecord,
    sleepTargetMinutes: args.sleepTargetMinutes,
  });

  return {
    date: args.date,
    nutrition: args.nutrition,
    hydration: args.hydration,
    recovery,
    energy: args.energy,
    sleep_minutes: args.sleepRecord?.duration_minutes ?? null,
    sleep_quality: args.sleepRecord?.sleep_score?.value ?? args.sleepRecord?.quality_rating ?? null,
    workout_count: args.workouts?.length ?? 0,
    latest_weight_kg: args.latestWeightKg ?? null,
  };
}
