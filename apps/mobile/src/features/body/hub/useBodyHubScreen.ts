import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { appRoutes } from '@/types/navigation';
import {
  buildBodyFocusSummary,
  computeRecoveryScore,
  formatDuration,
  formatHydration,
  progressPct,
  toDisplayWeight,
  useGoals,
  useLastNightSleep,
  useLatestWeight,
  useTodayHydrationTotal,
  useTodayNutritionSummary,
  useTodayRecoveryCheckIn,
  useTodayWorkouts,
  weightLabel,
  type BodyFocusTarget,
} from '@/engines/body';

function routeForTarget(target: BodyFocusTarget) {
  switch (target) {
    case 'hydration':
      return appRoutes.bodyHydration;
    case 'nutrition':
      return appRoutes.bodyNutrition;
    case 'sleep':
      return appRoutes.bodySleep;
    case 'recovery':
      return appRoutes.bodyRecovery;
  }
}

export function useBodyHubScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const units = profile?.units ?? 'metric';

  const { data: goals } = useGoals();
  const { total_ml } = useTodayHydrationTotal();
  const { summary: nutrition } = useTodayNutritionSummary();
  const { log: sleepLog } = useLastNightSleep();
  const { data: workouts = [] } = useTodayWorkouts();
  const { data: latestWeight } = useLatestWeight();
  const { data: recoveryEntry } = useTodayRecoveryCheckIn();

  const waterTarget = goals?.daily_water_target_ml ?? 2500;
  const hydrationPct = progressPct(total_ml, waterTarget);
  const hydrationRemaining = Math.max(waterTarget - total_ml, 0);

  const calorieTarget = goals?.daily_calorie_target ?? null;
  const calories = Math.round(nutrition.total_calories);
  const nutritionPct = calorieTarget ? progressPct(calories, calorieTarget) : undefined;

  const sleepTarget = goals?.sleep_target_minutes ?? 480;
  const sleepMinutes = sleepLog?.duration_minutes ?? null;
  const sleepPct = sleepMinutes ? progressPct(sleepMinutes, sleepTarget) : undefined;

  const recoveryScore = useMemo(() => computeRecoveryScore({
    sleepMinutes,
    energy: recoveryEntry?.energy ?? null,
    fatigue: recoveryEntry?.fatigue ?? null,
    soreness: recoveryEntry?.soreness ?? null,
    sleepTargetMinutes: sleepTarget,
  }), [recoveryEntry?.energy, recoveryEntry?.fatigue, recoveryEntry?.soreness, sleepMinutes, sleepTarget]);

  const focus = useMemo(() => buildBodyFocusSummary({
    hydrationRemainingMl: hydrationRemaining,
    calories,
    sleepMinutes,
    recoveryScore,
  }), [calories, hydrationRemaining, recoveryScore, sleepMinutes]);

  const openFocus = useCallback(() => router.push(routeForTarget(focus.target)), [router, focus.target]);
  const openNutrition = useCallback(() => router.push(appRoutes.bodyNutrition), [router]);
  const openHydration = useCallback(() => router.push(appRoutes.bodyHydration), [router]);
  const openSleep = useCallback(() => router.push(appRoutes.bodySleep), [router]);
  const openRecovery = useCallback(() => router.push(appRoutes.bodyRecovery), [router]);
  const openWorkouts = useCallback(() => router.push(appRoutes.bodyWorkouts), [router]);
  const openMetrics = useCallback(() => router.push(appRoutes.bodyMetrics), [router]);

  return {
    units,
    weightUnit: weightLabel(units),
    latestWeightValue: latestWeight ? toDisplayWeight(latestWeight.value, units) : null,
    totalMl: total_ml,
    hydrationRemaining,
    hydrationPct,
    nutrition,
    calories,
    nutritionPct,
    sleepLog,
    sleepMinutes,
    sleepPct,
    recoveryScore,
    workouts,
    focus,
    openFocus,
    openNutrition,
    openHydration,
    openSleep,
    openRecovery,
    openWorkouts,
    openMetrics,
    formatHydration,
    formatDuration,
  };
}
