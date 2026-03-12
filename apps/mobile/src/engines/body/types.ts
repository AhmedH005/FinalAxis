// Body Engine — domain types
// These mirror the database types but are shaped for use in the UI layer.

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type IntensityLevel = 'low' | 'moderate' | 'high';
export type BodyMetricType = 'weight_kg' | 'body_fat_pct' | 'waist_cm' | 'hip_cm' | 'chest_cm';
export type TrainingGoal = 'general' | 'strength' | 'hypertrophy' | 'conditioning' | 'recovery';

export interface FoodItem {
  /** USDA FDC ID, Open Food Facts barcode, or null for custom entries */
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

export interface DailyNutritionSummary {
  date: string; // YYYY-MM-DD
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  calorie_target: number | null;
}

export interface DailyHydrationSummary {
  date: string;
  total_ml: number;
  target_ml: number | null;
}

export interface DailyRecoverySummary {
  date: string;
  steps: number | null;
  energy: number | null;
  fatigue: number | null;
  soreness: number | null;
  recovery_score: number | null;
}

export interface DailyEnergySummary {
  date: string;
  intake_calories: number;
  baseline_expenditure_calories: number | null;
  movement_expenditure_calories: number | null;
  workout_expenditure_calories: number;
  total_expenditure_calories: number | null;
  estimated_balance_calories: number | null;
  body_weight_kg: number | null;
  steps: number | null;
  note: string;
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

export interface DailyBodySummary {
  date: string;
  nutrition: DailyNutritionSummary | null;
  hydration: DailyHydrationSummary | null;
  recovery: DailyRecoverySummary | null;
  energy: DailyEnergySummary | null;
  sleep_minutes: number | null;
  sleep_quality: number | null;
  workout_count: number;
  latest_weight_kg: number | null;
}
