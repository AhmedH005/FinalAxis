import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  useGoals,
  useTodayNutritionLogs,
  useRecentNutritionLogs,
  useAddNutritionLog,
  useDeleteNutritionLog,
  progressPct,
  type MealType,
} from '@/engines/body';
import { calcNutrition, saveCustomFood, type FoodSearchResult } from '@/engines/body/food-search';
import type { FoodItem, NutritionLog } from '@/lib/supabase/database.types';
import { MEAL_ORDER, buildRecentTemplates, getDefaultMealType } from './model';

export function useNutritionScreen() {
  const [showForm, setShowForm] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [mealType, setMealType] = useState<MealType>(getDefaultMealType());
  const [description, setDescription] = useState('');
  const [caloriesStr, setCaloriesStr] = useState('');
  const [proteinStr, setProteinStr] = useState('');
  const [carbsStr, setCarbsStr] = useState('');
  const [fatStr, setFatStr] = useState('');
  const [selectedFoodItems, setSelectedFoodItems] = useState<FoodItem[]>([]);
  const [savingCustomFood, setSavingCustomFood] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: goals } = useGoals();
  const { data: logs = [], isLoading } = useTodayNutritionLogs();
  const { data: recentLogs = [] } = useRecentNutritionLogs(12);
  const addLog = useAddNutritionLog();
  const deleteLog = useDeleteNutritionLog();

  const totalCalories = useMemo(
    () => logs.reduce((sum, log) => sum + (log.total_calories ?? 0), 0),
    [logs],
  );
  const totalProtein = useMemo(
    () => logs.reduce((sum, log) => sum + (log.total_protein_g ?? 0), 0),
    [logs],
  );
  const totalCarbs = useMemo(
    () => logs.reduce((sum, log) => sum + (log.total_carbs_g ?? 0), 0),
    [logs],
  );
  const totalFat = useMemo(
    () => logs.reduce((sum, log) => sum + (log.total_fat_g ?? 0), 0),
    [logs],
  );
  const calTarget = goals?.daily_calorie_target ?? null;
  const calPct = calTarget ? progressPct(Math.round(totalCalories), calTarget) : null;

  const grouped = useMemo(
    () => MEAL_ORDER.reduce<Record<MealType, NutritionLog[]>>((acc, type) => {
      acc[type] = logs.filter((log) => log.meal_type === type);
      return acc;
    }, { breakfast: [], lunch: [], dinner: [], snack: [] }),
    [logs],
  );

  const templates = useMemo(() => buildRecentTemplates(recentLogs), [recentLogs]);

  const resetForm = useCallback((nextMealType = getDefaultMealType()) => {
    setMealType(nextMealType);
    setDescription('');
    setCaloriesStr('');
    setProteinStr('');
    setCarbsStr('');
    setFatStr('');
    setSelectedFoodItems([]);
    setUseSearch(false);
    setShowMacros(false);
  }, []);

  const openComposer = useCallback((nextMealType = getDefaultMealType()) => {
    setShowForm(true);
    setUseSearch(false);
    setFeedback(null);
    if (!description && !caloriesStr) {
      setMealType(nextMealType);
    }
  }, [caloriesStr, description]);

  const handleFoodSelect = useCallback((food: FoodSearchResult, serving_g: number) => {
    const nutrition = calcNutrition(food, serving_g);
    setDescription(`${food.name}${food.brand ? ` (${food.brand})` : ''}, ${serving_g}g`);
    setCaloriesStr(String(nutrition.calories));
    setProteinStr(nutrition.protein_g !== null ? String(nutrition.protein_g) : '');
    setCarbsStr(nutrition.carbs_g !== null ? String(nutrition.carbs_g) : '');
    setFatStr(nutrition.fat_g !== null ? String(nutrition.fat_g) : '');
    setSelectedFoodItems([
      {
        food_id: `${food.provider}:${food.id}`,
        name: food.name,
        serving_g,
        calories: nutrition.calories,
        protein_g: nutrition.protein_g ?? 0,
        carbs_g: nutrition.carbs_g ?? 0,
        fat_g: nutrition.fat_g ?? 0,
        nutrition_details: food.nutrition_details ?? null,
      },
    ]);
    setShowMacros(true);
    setUseSearch(false);
  }, []);

  const logTemplate = useCallback((template: NutritionLog) => {
    addLog.mutate(
      {
        meal_type: template.meal_type as MealType,
        notes: template.notes ?? 'Meal',
        total_calories: template.total_calories ?? 0,
        total_protein_g: template.total_protein_g ?? undefined,
        total_carbs_g: template.total_carbs_g ?? undefined,
        total_fat_g: template.total_fat_g ?? undefined,
        food_items: template.food_items ?? [],
      },
      {
        onSuccess: () => {
          setFeedback(`Logged ${template.notes ?? 'meal'} again.`);
          setShowForm(false);
        },
        onError: (error) => Alert.alert('Could not log meal', error.message),
      },
    );
  }, [addLog]);

  const loadTemplate = useCallback((template: NutritionLog) => {
    setMealType(template.meal_type as MealType);
    setDescription(template.notes ?? '');
    setCaloriesStr(String(Math.round(template.total_calories ?? 0)));
    setProteinStr(template.total_protein_g ? String(Math.round(template.total_protein_g)) : '');
    setCarbsStr(template.total_carbs_g ? String(Math.round(template.total_carbs_g)) : '');
    setFatStr(template.total_fat_g ? String(Math.round(template.total_fat_g)) : '');
    setSelectedFoodItems(template.food_items ?? []);
    setShowMacros(Boolean(template.total_protein_g || template.total_carbs_g || template.total_fat_g));
    setUseSearch(false);
    setShowForm(true);
    setFeedback(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!description.trim()) {
      Alert.alert('Missing description', 'Add a short description so the meal is easy to recognise later.');
      return;
    }
    const calories = parseFloat(caloriesStr);
    if (isNaN(calories) || calories < 0) {
      Alert.alert('Invalid calories', 'Enter a valid calorie amount.');
      return;
    }
    addLog.mutate(
      {
        meal_type: mealType,
        notes: description.trim(),
        total_calories: calories,
        total_protein_g: proteinStr ? parseFloat(proteinStr) : undefined,
        total_carbs_g: carbsStr ? parseFloat(carbsStr) : undefined,
        total_fat_g: fatStr ? parseFloat(fatStr) : undefined,
        food_items: selectedFoodItems,
      },
      {
        onSuccess: () => {
          setFeedback(`Saved ${description.trim()}.`);
          resetForm(mealType);
          setShowForm(false);
        },
        onError: (error) => Alert.alert('Could not log meal', error.message),
      },
    );
  }, [
    addLog,
    caloriesStr,
    carbsStr,
    description,
    fatStr,
    mealType,
    proteinStr,
    resetForm,
    selectedFoodItems,
  ]);

  const handleSaveCustomFood = useCallback(async () => {
    const calories = parseFloat(caloriesStr);
    if (!description.trim()) {
      Alert.alert('Missing description', 'Add a food name before saving it.');
      return;
    }
    if (isNaN(calories) || calories < 0) {
      Alert.alert('Invalid calories', 'Enter a valid calorie amount before saving.');
      return;
    }

    setSavingCustomFood(true);
    try {
      await saveCustomFood({
        name: description.trim(),
        brand: null,
        barcode: null,
        calories_per_100g: calories,
        protein_per_100g: proteinStr ? parseFloat(proteinStr) : null,
        carbs_per_100g: carbsStr ? parseFloat(carbsStr) : null,
        fat_per_100g: fatStr ? parseFloat(fatStr) : null,
      });
      setFeedback(`Saved ${description.trim()} to your foods.`);
    } catch (error) {
      Alert.alert('Could not save food', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSavingCustomFood(false);
    }
  }, [caloriesStr, carbsStr, description, fatStr, proteinStr]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete meal', 'Remove this meal log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteLog.mutate(id, {
          onSuccess: () => setFeedback('Meal removed.'),
          onError: (error) => Alert.alert('Could not delete meal', error.message),
        }),
      },
    ]);
  }, [deleteLog]);

  return {
    logs,
    grouped,
    isLoading,
    templates,
    feedback,
    setFeedback,
    showForm,
    setShowForm,
    useSearch,
    setUseSearch,
    showMacros,
    setShowMacros,
    mealType,
    setMealType,
    description,
    setDescription,
    caloriesStr,
    setCaloriesStr,
    proteinStr,
    setProteinStr,
    carbsStr,
    setCarbsStr,
    fatStr,
    setFatStr,
    savingCustomFood,
    isSavingMeal: addLog.isPending,
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    calTarget,
    calPct,
    openComposer,
    resetForm,
    handleFoodSelect,
    logTemplate,
    loadTemplate,
    handleSubmit,
    handleSaveCustomFood,
    handleDelete,
  };
}
