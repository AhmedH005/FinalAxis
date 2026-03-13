import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  buildMetricProgressSnapshot,
  buildRecentDayRange,
  buildWeightProgressSnapshot,
  buildWorkoutProgressSnapshot,
  formatDuration,
  formatHydration,
  useDailyEnergySummary,
  useGoals,
  useLatestWeight,
  useRecentWorkouts,
  useWeightHistory,
  useWeeklyHydration,
  useWeeklyNutrition,
  useWeeklySleep,
  weightLabel,
} from '@/engines/body';
import { useAuth } from '@/providers/AuthProvider';

const WINDOW_DAYS = 7;
const HISTORY_DAYS = 14;

export function useProgressScreen() {
  const { profile } = useAuth();
  const units = profile?.units ?? 'metric';
  const unit = weightLabel(units);

  const { data: goals } = useGoals();
  const { summary: energy } = useDailyEnergySummary();
  const { data: nutritionLogs = [], isLoading: nutritionLoading } = useWeeklyNutrition(HISTORY_DAYS);
  const { data: hydrationLogs = [], isLoading: hydrationLoading } = useWeeklyHydration(HISTORY_DAYS);
  const { data: sleepLogs = [], isLoading: sleepLoading } = useWeeklySleep(HISTORY_DAYS);
  const { data: weightHistory = [], isLoading: weightLoading } = useWeightHistory(30);
  const { data: latestWeight } = useLatestWeight();
  const { data: recentWorkouts = [] } = useRecentWorkouts(14);

  const currentDays = useMemo(() => buildRecentDayRange(WINDOW_DAYS), []);
  const priorDays = useMemo(() => buildRecentDayRange(WINDOW_DAYS, WINDOW_DAYS), []);

  const nutrition = useMemo(() => buildMetricProgressSnapshot({
    entries: nutritionLogs,
    currentDays,
    priorDays,
    getDateKey: (log) => format(new Date(log.logged_at), 'yyyy-MM-dd'),
    getValue: (log) => log.total_calories ?? 0,
    target: goals?.daily_calorie_target ?? 2000,
  }), [currentDays, goals?.daily_calorie_target, nutritionLogs, priorDays]);

  const hydration = useMemo(() => buildMetricProgressSnapshot({
    entries: hydrationLogs,
    currentDays,
    priorDays,
    getDateKey: (log) => format(new Date(log.logged_at), 'yyyy-MM-dd'),
    getValue: (log) => log.amount_ml,
    target: goals?.daily_water_target_ml ?? 2500,
  }), [currentDays, goals?.daily_water_target_ml, hydrationLogs, priorDays]);

  const sleep = useMemo(() => buildMetricProgressSnapshot({
    entries: sleepLogs,
    currentDays,
    priorDays,
    getDateKey: (log) => format(new Date(log.sleep_end), 'yyyy-MM-dd'),
    getValue: (log) => log.duration_minutes ?? 0,
    target: goals?.sleep_target_minutes ?? 480,
  }), [currentDays, goals?.sleep_target_minutes, priorDays, sleepLogs]);

  const weight = useMemo(() => buildWeightProgressSnapshot({
    weightHistory,
    latestWeightKg: latestWeight?.value ?? null,
    units,
  }), [latestWeight?.value, units, weightHistory]);

  const workouts = useMemo(
    () => buildWorkoutProgressSnapshot(recentWorkouts),
    [recentWorkouts],
  );

  const isLoading = nutritionLoading || hydrationLoading || sleepLoading || weightLoading;
  const hasData = nutritionLogs.length > 0
    || hydrationLogs.length > 0
    || sleepLogs.length > 0
    || weightHistory.length > 0
    || recentWorkouts.length > 0;

  return {
    unit,
    goals,
    energy,
    isLoading,
    hasData,
    nutritionDays: currentDays,
    nutrition,
    hydration,
    sleep,
    weight,
    workouts,
    weightEntryCount: weightHistory.length,
    hasNutritionData: nutritionLogs.length > 0,
    hasHydrationData: hydrationLogs.length > 0,
    hasSleepData: sleepLogs.length > 0,
    hasWorkoutData: recentWorkouts.length > 0,
    hasWeightData: weight.latestDisplay !== null,
    formattedNutritionAverage: nutrition.average !== null ? `${nutrition.average} kcal` : '—',
    formattedHydrationAverage: hydration.average !== null ? formatHydration(hydration.average) : '—',
    formattedSleepAverage: sleep.average !== null ? formatDuration(sleep.average) : '—',
  };
}
