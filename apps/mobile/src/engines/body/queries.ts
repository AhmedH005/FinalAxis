import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { dayStart, dayEnd, todayStr, daysAgoStr } from './utils';
import { getTodayRecoveryCheckIn as getStoredTodayRecoveryCheckIn } from './recovery';
import { buildDailyEnergySummary } from './energy';
import { getAppleHealthSleepRecords, getAppleHealthSnapshot, getAppleHealthWorkoutEnergy } from './apple-health';
import type { RecoveryCheckIn } from './recovery';
import type { SleepLog, WorkoutLog } from '@/lib/supabase/database.types';
import { attachAxisSleepScores, mergeAxisSleepRecords, normalizeAppleHealthSleepRecord, normalizeManualSleepLog } from './sleep';

function mergeRecoveryEntry(
  storedEntry: RecoveryCheckIn | null,
  healthSnapshot: Awaited<ReturnType<typeof getAppleHealthSnapshot>>,
) {
  if (!storedEntry && !healthSnapshot?.steps) return null;

  return {
    date: storedEntry?.date ?? healthSnapshot?.date ?? todayStr(),
    steps: healthSnapshot?.steps ?? storedEntry?.steps ?? null,
    energy: storedEntry?.energy ?? null,
    fatigue: storedEntry?.fatigue ?? null,
    soreness: storedEntry?.soreness ?? null,
  };
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export function useGoals() {
  return useQuery({
    queryKey: ['body', 'goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Hydration ───────────────────────────────────────────────────────────────

export function useTodayHydrationLogs() {
  const date = todayStr();
  return useQuery({
    queryKey: ['body', 'hydration', 'logs', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hydration_logs')
        .select('*')
        .gte('logged_at', dayStart(date))
        .lte('logged_at', dayEnd(date))
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTodayHydrationTotal() {
  const { data: logs, ...rest } = useTodayHydrationLogs();
  const total_ml = logs?.reduce((sum, l) => sum + l.amount_ml, 0) ?? 0;
  return { total_ml, logs, ...rest };
}

// ─── Sleep ───────────────────────────────────────────────────────────────────

export function useRecentSleepLogs(limit = 10) {
  const { data: goals } = useGoals();
  const sleepTarget = goals?.sleep_target_minutes ?? 480;

  const query = useQuery({
    queryKey: ['body', 'sleep', 'recent', limit],
    queryFn: async () => {
      const fetchLimit = Math.max(limit * 2, 14);
      const [{ data, error }, healthRecords] = await Promise.all([
        supabase
        .from('sleep_logs')
        .select('*')
        .order('sleep_end', { ascending: false })
        .limit(fetchLimit),
        getAppleHealthSleepRecords(fetchLimit),
      ]);
      if (error) throw error;
      const normalizedManual = (data ?? []).map((log) => normalizeManualSleepLog(log as SleepLog));
      const normalizedHealth = healthRecords.map((record) => normalizeAppleHealthSleepRecord(record));
      return mergeAxisSleepRecords([...normalizedHealth, ...normalizedManual], limit);
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 60 * 1000,
  });

  const data = useMemo(
    () => attachAxisSleepScores(query.data ?? [], sleepTarget),
    [query.data, sleepTarget],
  );

  return { ...query, data };
}

export function useLastNightSleep() {
  const { data: logs, ...rest } = useRecentSleepLogs(1);
  return { log: logs?.[0] ?? null, ...rest };
}

// ─── Body Metrics ─────────────────────────────────────────────────────────────

export function useWeightHistory(days = 30) {
  return useQuery({
    queryKey: ['body', 'metrics', 'weight', days],
    queryFn: async () => {
      const start = subDays(startOfDay(new Date()), days - 1);
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .eq('metric_type', 'weight_kg')
        .gte('recorded_at', start.toISOString())
        .order('recorded_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLatestWeight() {
  return useQuery({
    queryKey: ['body', 'metrics', 'weight', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_metrics')
        .select('*')
        .eq('metric_type', 'weight_kg')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export function useTodayWorkouts() {
  const date = todayStr();
  return useQuery({
    queryKey: ['body', 'workouts', 'today', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .gte('started_at', dayStart(date))
        .lte('started_at', dayEnd(date))
        .order('started_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRecentWorkouts(limit = 20) {
  return useQuery({
    queryKey: ['body', 'workouts', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export function useTodayNutritionLogs() {
  const date = todayStr();
  return useQuery({
    queryKey: ['body', 'nutrition', 'logs', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .gte('logged_at', dayStart(date))
        .lte('logged_at', dayEnd(date))
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkoutLog(workoutId: string | null | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['body', 'workouts', 'detail', workoutId],
    enabled: Boolean(workoutId && session?.user.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('id', workoutId)
        .eq('user_id', session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useWorkoutMeasuredEnergy(workout: WorkoutLog | null | undefined) {
  return useQuery({
    queryKey: ['body', 'workouts', 'energy', workout?.id, workout?.started_at, workout?.ended_at],
    enabled: Boolean(workout?.started_at && workout?.ended_at),
    queryFn: async () => getAppleHealthWorkoutEnergy({
      startDate: workout!.started_at,
      endDate: workout!.ended_at!,
    }),
    staleTime: 60 * 1000,
  });
}

export function useTodayRecoveryCheckIn() {
  const date = todayStr();
  return useQuery({
    queryKey: ['body', 'recovery', 'today', date],
    queryFn: async () => {
      const [storedEntry, healthSnapshot] = await Promise.all([
        getStoredTodayRecoveryCheckIn(),
        getAppleHealthSnapshot(),
      ]);
      return mergeRecoveryEntry(storedEntry, healthSnapshot);
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 60 * 1000,
  });
}

export function useRecentNutritionLogs(limit = 12) {
  return useQuery({
    queryKey: ['body', 'nutrition', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .order('logged_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTodayNutritionSummary() {
  const { data: logs, ...rest } = useTodayNutritionLogs();
  const summary = {
    total_calories: logs?.reduce((s, l) => s + (l.total_calories ?? 0), 0) ?? 0,
    total_protein_g: logs?.reduce((s, l) => s + (l.total_protein_g ?? 0), 0) ?? 0,
    total_carbs_g: logs?.reduce((s, l) => s + (l.total_carbs_g ?? 0), 0) ?? 0,
    total_fat_g: logs?.reduce((s, l) => s + (l.total_fat_g ?? 0), 0) ?? 0,
    meal_count: logs?.length ?? 0,
  };
  return { summary, logs, ...rest };
}

export function useDailyEnergySummary() {
  const { profile } = useAuth();
  const date = todayStr();
  const { summary: nutrition, isLoading: nutritionLoading } = useTodayNutritionSummary();
  const { data: workouts = [], isLoading: workoutsLoading } = useTodayWorkouts();
  const { data: latestWeight, isLoading: weightLoading } = useLatestWeight();
  const { data: recoveryEntry, isLoading: recoveryLoading } = useTodayRecoveryCheckIn();

  const summary = buildDailyEnergySummary({
    date,
    profile,
    bodyWeightKg: latestWeight?.value ?? null,
    intakeCalories: nutrition.total_calories,
    steps: recoveryEntry?.steps ?? null,
    workouts,
  });

  return {
    summary,
    isLoading: nutritionLoading || workoutsLoading || weightLoading || recoveryLoading,
    workouts,
    recoveryEntry,
    latestWeight,
  };
}

// ─── Progress (weekly) ────────────────────────────────────────────────────────

export function useWeeklyNutrition(days = 7) {
  return useQuery({
    queryKey: ['body', 'nutrition', 'week', days],
    queryFn: async () => {
      const start = dayStart(daysAgoStr(days - 1));
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('logged_at, total_calories, total_protein_g, total_carbs_g, total_fat_g')
        .gte('logged_at', start)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWeeklyHydration(days = 7) {
  return useQuery({
    queryKey: ['body', 'hydration', 'week', days],
    queryFn: async () => {
      const start = dayStart(daysAgoStr(days - 1));
      const { data, error } = await supabase
        .from('hydration_logs')
        .select('logged_at, amount_ml')
        .gte('logged_at', start)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWeeklySleep(days = 7) {
  return useQuery({
    queryKey: ['body', 'sleep', 'week', days],
    queryFn: async () => {
      const start = dayStart(daysAgoStr(days - 1));
      const { data, error } = await supabase
        .from('sleep_logs')
        .select('sleep_end, duration_minutes, quality_rating')
        .gte('sleep_end', start)
        .order('sleep_end', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
