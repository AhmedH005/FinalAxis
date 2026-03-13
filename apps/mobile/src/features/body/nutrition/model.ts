import type { MealType } from '@/engines/body';
import type { NutritionLog } from '@/lib/supabase/database.types';

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_META: Record<MealType, { color: string; icon: string }> = {
  breakfast: { color: '#F9B24E', icon: 'weather-sunny' },
  lunch: { color: '#43D9A3', icon: 'weather-partly-cloudy' },
  dinner: { color: '#A855F7', icon: 'moon-waning-crescent' },
  snack: { color: '#FF6B6B', icon: 'food-apple-outline' },
};

export const MACRO_COLORS = {
  protein: '#6C9EFF',
  carbs: '#F9B24E',
  fat: '#FF6B6B',
};

export function calColor(pct: number): string {
  if (pct < 50) return '#FF6B6B';
  if (pct < 80) return '#F9B24E';
  return '#43D9A3';
}

export function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export function buildRecentTemplates(logs: NutritionLog[]) {
  const seen = new Set<string>();
  return (logs ?? []).filter((log) => {
    const key = `${log.meal_type}:${log.notes}:${Math.round(log.total_calories ?? 0)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}
