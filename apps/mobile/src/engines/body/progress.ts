import { isThisWeek } from 'date-fns';
import type { BodyMetric, WorkoutLog } from '@/lib/supabase/database.types';
import type { UnitSystem } from '@/lib/supabase/database.types';
import { daysAgoStr, toDisplayWeight } from './utils';

export interface TrendDelta {
  pct: number;
  up: boolean;
}

export interface MetricProgressSnapshot {
  valueByDay: Record<string, number>;
  average: number | null;
  streak: number;
  trend: TrendDelta | null;
}

export interface WeightProgressSnapshot {
  latestDisplay: number | null;
  delta: number | null;
  trend: TrendDelta | null;
}

export interface WorkoutProgressSnapshot {
  sessionsThisWeek: number;
  workoutTypes: string[];
}

export function buildRecentDayRange(length: number, offset = 0): string[] {
  return Array.from({ length }, (_, index) => daysAgoStr(length - 1 - index + offset));
}

export function buildDailyTotalMap<T>({
  days,
  entries,
  getDateKey,
  getValue,
}: {
  days: string[];
  entries: T[];
  getDateKey: (entry: T) => string;
  getValue: (entry: T) => number;
}) {
  const totals = Object.fromEntries(days.map((day) => [day, 0])) as Record<string, number>;

  for (const entry of entries) {
    const day = getDateKey(entry);
    if (totals[day] === undefined) continue;
    totals[day] += getValue(entry);
  }

  return totals;
}

export function calcTargetStreak(
  days: string[],
  valueByDay: Record<string, number>,
  target: number,
  threshold = 0.8,
) {
  let streak = 0;

  for (let index = days.length - 1; index >= 0; index -= 1) {
    const value = valueByDay[days[index]] ?? 0;
    if (value >= target * threshold) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

export function calcTrendDelta(
  currentDays: string[],
  currentByDay: Record<string, number>,
  priorDays: string[],
  priorByDay: Record<string, number>,
): TrendDelta | null {
  const currentLoggedDays = currentDays.filter((day) => (currentByDay[day] ?? 0) > 0);
  const priorLoggedDays = priorDays.filter((day) => (priorByDay[day] ?? 0) > 0);

  const currentAverage = currentLoggedDays.length > 0
    ? currentLoggedDays.reduce((sum, day) => sum + (currentByDay[day] ?? 0), 0) / currentLoggedDays.length
    : 0;
  const priorAverage = priorLoggedDays.length > 0
    ? priorLoggedDays.reduce((sum, day) => sum + (priorByDay[day] ?? 0), 0) / priorLoggedDays.length
    : 0;

  if (priorAverage === 0) return null;

  const pct = Math.round(((currentAverage - priorAverage) / priorAverage) * 100);
  return {
    pct,
    up: pct >= 0,
  };
}

export function buildMetricProgressSnapshot<T>({
  entries,
  currentDays,
  priorDays,
  getDateKey,
  getValue,
  target,
  threshold = 0.8,
}: {
  entries: T[];
  currentDays: string[];
  priorDays: string[];
  getDateKey: (entry: T) => string;
  getValue: (entry: T) => number;
  target: number;
  threshold?: number;
}): MetricProgressSnapshot {
  const allDays = [...currentDays, ...priorDays];
  const valueByDay = buildDailyTotalMap({
    days: allDays,
    entries,
    getDateKey,
    getValue,
  });
  const priorByDay = Object.fromEntries(priorDays.map((day) => [day, valueByDay[day] ?? 0])) as Record<string, number>;
  const currentLoggedDays = currentDays.filter((day) => valueByDay[day] > 0);
  const average = currentLoggedDays.length > 0
    ? Math.round(currentLoggedDays.reduce((sum, day) => sum + valueByDay[day], 0) / currentLoggedDays.length)
    : null;

  return {
    valueByDay,
    average,
    streak: calcTargetStreak(currentDays, valueByDay, target, threshold),
    trend: calcTrendDelta(currentDays, valueByDay, priorDays, priorByDay),
  };
}

export function buildWeightProgressSnapshot({
  weightHistory,
  latestWeightKg,
  units,
}: {
  weightHistory: BodyMetric[];
  latestWeightKg: number | null;
  units: UnitSystem;
}): WeightProgressSnapshot {
  const latestDisplay = latestWeightKg !== null ? toDisplayWeight(latestWeightKg, units) : null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const sevenDaysAgoEntry = weightHistory.find((entry) => new Date(entry.recorded_at) <= cutoff);
  const delta = latestWeightKg !== null && sevenDaysAgoEntry
    ? toDisplayWeight(latestWeightKg, units) - toDisplayWeight(sevenDaysAgoEntry.value, units)
    : null;

  return {
    latestDisplay,
    delta,
    trend: delta !== null && latestDisplay !== null
      ? {
          pct: Math.abs(Math.round((delta / (latestDisplay || 1)) * 100)),
          up: delta < 0,
        }
      : null,
  };
}

export function buildWorkoutProgressSnapshot(workouts: WorkoutLog[]): WorkoutProgressSnapshot {
  const workoutsThisWeek = workouts.filter((workout) => isThisWeek(new Date(workout.started_at)));

  return {
    sessionsThisWeek: workoutsThisWeek.length,
    workoutTypes: [...new Set(workoutsThisWeek.map((workout) => workout.workout_type))],
  };
}
