// Auto-generated types from Supabase schema.
// Regenerate with: npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
//
// Until you have a local Supabase setup, this file provides minimal hand-written types
// sufficient to get TypeScript compiling. Replace with generated types after running migrations.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UnitSystem = 'metric' | 'imperial';
export type BiologicalSex = 'male' | 'female' | 'other';
export type GoalType = 'lose' | 'maintain' | 'gain' | 'perform';
export type MetricSource = 'manual' | 'healthkit' | 'health_connect' | 'onboarding' | 'phone_estimate';

export interface Profile {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  biological_sex: BiologicalSex | null;
  height_cm: number | null;
  timezone: string | null;
  units: UnitSystem;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  metric_type: string;
  value: number;
  recorded_at: string;
  notes: string | null;
  source: MetricSource;
  created_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  logged_at: string;
  food_items: FoodItem[];
  total_calories: number | null;
  total_protein_g: number | null;
  total_carbs_g: number | null;
  total_fat_g: number | null;
  notes: string | null;
  created_at: string;
}

export interface FoodItem {
  food_id: string | null;
  name: string;
  serving_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrition_details?: {
    source: 'local' | 'open_food_facts' | 'usda' | 'edamam';
    nutrients: Array<{
      key: string;
      label: string;
      unit: string;
      amount_per_100g: number;
    }>;
  } | null;
}

export interface HydrationLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  created_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  sleep_start: string;
  sleep_end: string;
  duration_minutes: number | null;
  quality_rating: number | null;
  notes: string | null;
  source: MetricSource;
  sleep_kind?: 'tracked_sleep' | 'time_in_bed' | null;
  source_label?: string | null;
  created_at: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  name: string | null;
  workout_type: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  intensity: 'low' | 'moderate' | 'high' | null;
  exercises: WorkoutExercise[] | null;
  notes: string | null;
  source: MetricSource;
  created_at: string;
}

export interface WorkoutExercise {
  exercise_id?: string | null;
  name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  notes: string | null;
}

export interface UserGoal {
  id: string;
  user_id: string;
  goal_type: GoalType;
  daily_calorie_target: number | null;
  daily_water_target_ml: number | null;
  sleep_target_minutes: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Mind Engine ──────────────────────────────────────────────────────────────

export type EntryType = 'journal' | 'quick_thought' | 'note' | 'reflection';
export type HabitCategory = 'mind' | 'body' | 'time' | 'life';

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  entry_type: EntryType;
  entry_date: string;
  mood_score: number | null;
  tags: string[];
  word_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface MoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  mood_score: number;
  energy_level: number | null;
  stress_level: number | null;
  note: string | null;
  tags: string[];
  journal_entry_id: string | null;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  target_days: number[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string;
  completed: boolean;
  note: string | null;
  created_at: string;
}

// Minimal Database type wrapper — replace with generated version after migrations
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      body_metrics: {
        Row: BodyMetric;
        Insert: Omit<BodyMetric, 'id' | 'created_at'> & { id?: string };
        Update: Partial<BodyMetric>;
      };
      nutrition_logs: {
        Row: NutritionLog;
        Insert: Omit<NutritionLog, 'id' | 'created_at'> & { id?: string };
        Update: Partial<NutritionLog>;
      };
      hydration_logs: {
        Row: HydrationLog;
        Insert: Omit<HydrationLog, 'id' | 'created_at'> & { id?: string };
        Update: Partial<HydrationLog>;
      };
      sleep_logs: {
        Row: SleepLog;
        Insert: Omit<SleepLog, 'id' | 'created_at'> & { id?: string };
        Update: Partial<SleepLog>;
      };
      workout_logs: {
        Row: WorkoutLog;
        Insert: Omit<WorkoutLog, 'id' | 'created_at'> & { id?: string };
        Update: Partial<WorkoutLog>;
      };
      user_goals: {
        Row: UserGoal;
        Insert: Omit<UserGoal, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<UserGoal>;
      };
    };
  };
}
