import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import type { MealType, IntensityLevel } from './types';
import type { FoodItem, WorkoutExercise } from '@/lib/supabase/database.types';

// ─── Hydration ────────────────────────────────────────────────────────────────

export function useAddHydrationLog() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount_ml: number) => {
      const { error } = await supabase.from('hydration_logs').insert({
        user_id: session!.user.id,
        amount_ml,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'hydration'] });
    },
  });
}

export function useDeleteHydrationLog() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hydration_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', session!.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'hydration'] });
    },
  });
}

export function useLowerLatestHydrationLog() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const { data: latestLog, error: fetchError } = await supabase
        .from('hydration_logs')
        .select('id, amount_ml')
        .eq('user_id', session!.user.id)
        .gte('logged_at', start.toISOString())
        .lte('logged_at', end.toISOString())
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!latestLog) {
        throw new Error('No hydration entry to lower.');
      }

      const { error: deleteError } = await supabase
        .from('hydration_logs')
        .delete()
        .eq('id', latestLog.id)
        .eq('user_id', session!.user.id);

      if (deleteError) throw deleteError;
      return latestLog;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'hydration'] });
    },
  });
}

// ─── Sleep ────────────────────────────────────────────────────────────────────

interface AddSleepInput {
  hours: number;
  quality_rating: number | null;
}

export function useAddSleepLog() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ hours, quality_rating }: AddSleepInput) => {
      const sleep_end = new Date();
      const sleep_start = new Date(sleep_end.getTime() - hours * 60 * 60 * 1000);
      const { error } = await supabase.from('sleep_logs').insert({
        user_id: session!.user.id,
        sleep_start: sleep_start.toISOString(),
        sleep_end: sleep_end.toISOString(),
        quality_rating: quality_rating ?? null,
        source: 'manual',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'sleep'] });
    },
  });
}

export function useDeleteSleepLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sleep_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'sleep'] });
    },
  });
}

// ─── Body Metrics ─────────────────────────────────────────────────────────────

interface AddBodyMetricInput {
  metric_type: string;
  value: number;
  notes?: string;
}

export function useAddBodyMetric() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ metric_type, value, notes }: AddBodyMetricInput) => {
      const { error } = await supabase.from('body_metrics').insert({
        user_id: session!.user.id,
        metric_type,
        value,
        recorded_at: new Date().toISOString(),
        notes: notes ?? null,
        source: 'manual',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'metrics'] });
    },
  });
}

export function useDeleteBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('body_metrics').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'metrics'] });
    },
  });
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

interface AddWorkoutInput {
  workout_type: string;
  name?: string;
  duration_minutes: number;
  intensity: IntensityLevel;
  exercises?: WorkoutExercise[];
}

export function useAddWorkoutLog() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workout_type, name, duration_minutes, intensity, exercises }: AddWorkoutInput) => {
      const started_at = new Date();
      const ended_at = new Date(started_at.getTime() + duration_minutes * 60 * 1000);
      const { error } = await supabase.from('workout_logs').insert({
        user_id: session!.user.id,
        workout_type,
        name: name || null,
        started_at: started_at.toISOString(),
        ended_at: ended_at.toISOString(),
        duration_minutes,
        intensity,
        exercises: exercises ?? null,
        source: 'manual',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'workouts'] });
    },
  });
}

export function useDeleteWorkoutLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'workouts'] });
    },
  });
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

interface AddNutritionInput {
  meal_type: MealType;
  notes: string;
  total_calories: number;
  total_protein_g?: number;
  total_carbs_g?: number;
  total_fat_g?: number;
  food_items?: FoodItem[];
}

export function useAddNutritionLog() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meal_type,
      notes,
      total_calories,
      total_protein_g,
      total_carbs_g,
      total_fat_g,
      food_items,
    }: AddNutritionInput) => {
      const { error } = await supabase.from('nutrition_logs').insert({
        user_id: session!.user.id,
        meal_type,
        logged_at: new Date().toISOString(),
        food_items: food_items ?? [],
        notes,
        total_calories,
        total_protein_g: total_protein_g ?? null,
        total_carbs_g: total_carbs_g ?? null,
        total_fat_g: total_fat_g ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'nutrition'] });
    },
  });
}

export function useDeleteNutritionLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('nutrition_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'nutrition'] });
    },
  });
}

// ─── Goals ────────────────────────────────────────────────────────────────────

interface UpdateGoalsInput {
  goal_type?: 'lose' | 'maintain' | 'gain' | 'perform';
  daily_calorie_target?: number | null;
  daily_water_target_ml?: number;
  sleep_target_minutes?: number;
}

export function useUpdateGoals() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateGoalsInput) => {
      const { error } = await supabase.from('user_goals').upsert({
        user_id: session!.user.id,
        ...input,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body', 'goals'] });
    },
  });
}

// ─── Profile ──────────────────────────────────────────────────────────────────

interface UpdateProfileInput {
  full_name?: string;
  height_cm?: number | null;
  units?: 'metric' | 'imperial';
}

export function useUpdateProfile() {
  const { session, refreshProfile } = useAuth();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { error } = await supabase
        .from('profiles')
        .update(input)
        .eq('id', session!.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
    },
  });
}
