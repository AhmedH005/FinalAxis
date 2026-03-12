import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import {
  useGoals,
  useTodayNutritionLogs,
  useRecentNutritionLogs,
  useAddNutritionLog,
  useDeleteNutritionLog,
  progressPct,
} from '@/engines/body';
import type { MealType } from '@/engines/body';
import {
  getFoodSearchPreview,
  searchFoodsRemote,
  calcNutrition,
  type FoodSearchResult,
  type FoodNutritionDetails,
  getCustomFoods,
  getRecentFoods,
  getFavoriteFoods,
  lookupFoodByBarcode,
  rememberRecentFood,
  saveCustomFood,
  toggleFavoriteFood,
  getFoodDetails,
  enrichFoodMacros,
} from '@/engines/body/food-search';
import type { NutritionLog, FoodItem } from '@/lib/supabase/database.types';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_META: Record<MealType, { color: string; icon: string }> = {
  breakfast: { color: '#F9B24E', icon: 'weather-sunny' },
  lunch:     { color: '#43D9A3', icon: 'weather-partly-cloudy' },
  dinner:    { color: '#A855F7', icon: 'moon-waning-crescent' },
  snack:     { color: '#FF6B6B', icon: 'food-apple-outline' },
};

const MACRO_COLORS = {
  protein: '#6C9EFF',
  carbs:   '#F9B24E',
  fat:     '#FF6B6B',
};

function calColor(pct: number): string {
  if (pct < 50) return '#FF6B6B';
  if (pct < 80) return '#F9B24E';
  return '#43D9A3';
}

function getDefaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

function buildRecentTemplates(logs: NutritionLog[]) {
  const seen = new Set<string>();
  return (logs ?? []).filter((log) => {
    const key = `${log.meal_type}:${log.notes}:${Math.round(log.total_calories ?? 0)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

function FoodSearchPanel({
  onSelect,
}: {
  onSelect: (food: FoodSearchResult, serving_g: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [customFoods, setCustomFoods] = useState<FoodSearchResult[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodSearchResult[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [servingStr, setServingStr] = useState('100');
  const [barcode, setBarcode] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<FoodNutritionDetails | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestId = useRef(0);

  const nutrition = selected ? calcNutrition(selected, parseFloat(servingStr) || 100) : null;

  useEffect(() => {
    refreshFoodMemory().catch(() => {
      setCustomFoods([]);
      setRecentFoods([]);
      setFavoriteFoods([]);
      setFavoriteIds([]);
    });
  }, []);

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchRequestId.current += 1;
  }, []);

  async function refreshFoodMemory() {
    const [custom, recent, favorites] = await Promise.all([
      getCustomFoods(6),
      getRecentFoods(6),
      getFavoriteFoods(6),
    ]);
    setCustomFoods(custom);
    setRecentFoods(recent);
    setFavoriteFoods(favorites);
    setFavoriteIds(favorites.map((food) => `${food.provider}:${food.id}`));
  }

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    setSelected(null);
    setSelectedDetails(null);
    setSearchError(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const trimmed = text.trim();
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;

    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }

    // Mark as searching immediately so empty-state doesn't flash before local results arrive
    setSearching(true);

    void (async () => {
      try {
        const preview = await getFoodSearchPreview(text, 8);
        if (searchRequestId.current !== requestId) return;

        setResults(preview.results);
        setSearching(preview.should_fetch_remote);

        if (!preview.should_fetch_remote) return;

        searchTimer.current = setTimeout(async () => {
          try {
            const items = await searchFoodsRemote(text, 8);
            if (searchRequestId.current !== requestId) return;
            setResults(items);
          } catch {
            if (searchRequestId.current !== requestId) return;
            setSearchError('Search is having trouble reaching the food database right now.');
          } finally {
            if (searchRequestId.current === requestId) {
              setSearching(false);
            }
          }
        }, 350);
      } catch {
        if (searchRequestId.current !== requestId) return;
        setResults([]);
        setSearchError('Could not search foods right now.');
        setSearching(false);
      }
    })();
  }, []);

  function handleSelect(food: FoodSearchResult) {
    setSelected(food);
    setSelectedDetails(food.nutrition_details ?? null);
    setScanFeedback(null);
    setServingStr('100');
    setResults([]);
    setQuery(food.name);

    if (food.calories_per_100g === null) {
      setDetailsLoading(true);
      void enrichFoodMacros(food)
        .then((enriched) => {
          setSelected((prev) => (prev && `${prev.provider}:${prev.id}` === `${enriched.provider}:${enriched.id}` ? enriched : prev));
        })
        .finally(() => setDetailsLoading(false));
    }
  }

  async function handleConfirm() {
    if (!selected) return;
    const serving = parseFloat(servingStr);
    if (isNaN(serving) || serving <= 0) {
      Alert.alert('Invalid serving', 'Enter a serving size in grams.');
      return;
    }
    await rememberRecentFood({
      ...selected,
      nutrition_details: selectedDetails ?? selected.nutrition_details ?? null,
    });
    await refreshFoodMemory();
    onSelect({
      ...selected,
      nutrition_details: selectedDetails ?? selected.nutrition_details ?? null,
    }, serving);
    setQuery('');
    setSelected(null);
    setResults([]);
    setServingStr('100');
  }

  async function handleToggleFavorite(food: FoodSearchResult) {
    await toggleFavoriteFood(food);
    await refreshFoodMemory();
  }

  async function handleBarcodeLookup() {
    if (!barcode.trim()) return;
    setSearching(true);
    try {
      const result = await lookupFoodByBarcode(barcode.trim());
      if (!result) {
        Alert.alert('Not found', 'No matching food was found for that barcode.');
        return;
      }
      await refreshFoodMemory();
      setScanFeedback(`Loaded ${result.name} from barcode ${barcode.trim()}.`);
      handleSelect(result);
    } catch (error) {
      Alert.alert('Lookup failed', error instanceof Error ? error.message : 'Could not look up barcode.');
    } finally {
      setSearching(false);
    }
  }

  async function handleOpenScanner() {
    if (!cameraPermission?.granted) {
      const nextPermission = await requestCameraPermission();
      if (!nextPermission.granted) {
        Alert.alert('Camera access needed', 'Allow camera access to scan barcodes directly.');
        return;
      }
    }

    setScanLocked(false);
    setShowScanner(true);
  }

  async function handleBarcodeScanned(scannedCode: string) {
    if (scanLocked) return;
    setScanLocked(true);
    setShowScanner(false);
    setBarcode(scannedCode);
    setSearching(true);
    try {
      const result = await lookupFoodByBarcode(scannedCode);
      if (!result) {
        Alert.alert('Not found', 'No matching food was found for that barcode.');
        return;
      }
      await refreshFoodMemory();
      setScanFeedback(`Scanned ${result.name} successfully.`);
      handleSelect(result);
    } catch (error) {
      Alert.alert('Lookup failed', error instanceof Error ? error.message : 'Could not look up barcode.');
    } finally {
      setSearching(false);
      setScanLocked(false);
    }
  }

  async function handleLoadDetails() {
    if (!selected) return;
    setDetailsLoading(true);
    try {
      const details = await getFoodDetails(selected);
      setSelectedDetails(details);
      if (!details?.nutrients?.length) {
        Alert.alert('No extra detail yet', 'This food only has macro-level data right now.');
      }
    } catch (error) {
      Alert.alert('Could not load detail', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setDetailsLoading(false);
    }
  }

  function renderFoodRow(food: FoodSearchResult, index: number, total: number) {
    const key = `${food.provider}:${food.id}`;
    const favorited = favoriteIds.includes(key);

    return (
      <View key={key} style={[search.result, index === total - 1 && search.resultLast]}>
        <Pressable style={search.resultPressable} onPress={() => handleSelect(food)}>
          <View style={search.resultCopy}>
            <Text style={search.resultName} numberOfLines={1}>{food.name}</Text>
            <Text style={search.resultBrand} numberOfLines={1}>
              {food.brand ?? (food.barcode ? `Barcode ${food.barcode}` : 'Saved food')}
            </Text>
          </View>
          <Text style={search.resultCal}>
            {food.calories_per_100g !== null ? `${food.calories_per_100g} kcal` : '—'}
          </Text>
        </Pressable>
        <Pressable style={search.favoriteBtn} onPress={() => handleToggleFavorite(food)}>
          <MaterialCommunityIcons
            name={(favorited ? 'star' : 'star-outline') as any}
            size={18}
            color={favorited ? '#F9B24E' : color.text.muted}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={search.container}>
      <Text style={search.label}>Search by food name</Text>
      <View style={search.inputRow}>
        <TextInput
          style={search.input}
          value={query}
          onChangeText={handleSearch}
          placeholder="Try oatmeal, chicken breast, greek yogurt..."
          placeholderTextColor={color.text.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching ? <ActivityIndicator color={color.success} style={search.spinner} size="small" /> : null}
      </View>

      <View style={search.barcodeRow}>
        <TextInput
          style={search.barcodeInput}
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Enter barcode"
          placeholderTextColor={color.text.muted}
          keyboardType="number-pad"
        />
        <Pressable style={search.barcodeBtn} onPress={handleBarcodeLookup}>
          <MaterialCommunityIcons name={'magnify' as any} size={20} color={color.text.primary} />
          <Text style={search.barcodeBtnText}>Lookup</Text>
        </Pressable>
        <Pressable style={search.barcodeBtn} onPress={handleOpenScanner}>
          <MaterialCommunityIcons name={'barcode-scan' as any} size={20} color={color.text.primary} />
          <Text style={search.barcodeBtnText}>Scan</Text>
        </Pressable>
      </View>

      {showScanner ? (
        <View style={search.scannerCard}>
          <View style={search.scannerHeader}>
            <View style={search.scannerCopy}>
              <Text style={search.scannerTitle}>Scan barcode</Text>
              <Text style={search.scannerHint}>Line the barcode up inside the frame. AXIS will look it up automatically.</Text>
            </View>
            <Pressable onPress={() => setShowScanner(false)}>
              <Text style={search.scannerClose}>Close</Text>
            </Pressable>
          </View>
          <CameraView
            style={search.scannerView}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => {
              if (data) {
                void handleBarcodeScanned(data);
              }
            }}
          />
          <View style={search.scannerFrame} pointerEvents="none" />
        </View>
      ) : null}

      {scanFeedback ? (
        <View style={search.scanFeedbackCard}>
          <Text style={search.scanFeedbackText}>{scanFeedback}</Text>
          <Pressable onPress={() => setScanFeedback(null)}>
            <Text style={search.scanFeedbackDismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {query.trim() && !selected && searchError ? (
        <View style={search.statusCard}>
          <Text style={search.statusText}>{searchError}</Text>
        </View>
      ) : null}

      {results.length > 0 ? (
        <View style={search.results}>
          {results.map((food, index) => renderFoodRow(food, index, results.length))}
        </View>
      ) : null}

      {query.trim() && !selected && searching && results.length === 0 ? (
        <View style={search.statusCard}>
          <Text style={search.statusText}>Searching foods...</Text>
        </View>
      ) : null}

      {query.trim() && !selected && !searching && !searchError && results.length === 0 ? (
        <View style={search.statusCard}>
          <Text style={search.statusText}>No foods found yet. Try a simpler name, brand, or barcode.</Text>
        </View>
      ) : null}

      {!query.trim() && !selected && customFoods.length > 0 ? (
        <View style={search.recents}>
          <Text style={search.recentsLabel}>Saved foods</Text>
          <View style={search.results}>
            {customFoods.map((food, index) => renderFoodRow(food, index, customFoods.length))}
          </View>
        </View>
      ) : null}

      {!query.trim() && !selected && favoriteFoods.length > 0 ? (
        <View style={search.recents}>
          <Text style={search.recentsLabel}>Favorites</Text>
          <View style={search.results}>
            {favoriteFoods.map((food, index) => renderFoodRow(food, index, favoriteFoods.length))}
          </View>
        </View>
      ) : null}

      {!query.trim() && !selected && recentFoods.length > 0 ? (
        <View style={search.recents}>
          <Text style={search.recentsLabel}>Recent foods</Text>
          <View style={search.results}>
            {recentFoods.map((food, index) => renderFoodRow(food, index, recentFoods.length))}
          </View>
        </View>
      ) : null}

      {selected ? (
        <View style={search.servingCard}>
          <View style={search.servingRow}>
            <View style={search.servingCopy}>
              <Text style={search.servingName} numberOfLines={1}>{selected.name}</Text>
              <Text style={search.servingHint}>Adjust serving size before using it.</Text>
            </View>
            <View style={search.servingInputWrap}>
              <TextInput
                style={search.servingInput}
                value={servingStr}
                onChangeText={setServingStr}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={search.servingUnit}>g</Text>
            </View>
          </View>
          {nutrition ? (
            <View style={search.macroRow}>
              <Text style={[search.macro, { color: color.success }]}>{nutrition.calories} kcal</Text>
              {nutrition.protein_g !== null ? (
                <Text style={[search.macro, { color: MACRO_COLORS.protein }]}>{nutrition.protein_g}g P</Text>
              ) : null}
              {nutrition.carbs_g !== null ? (
                <Text style={[search.macro, { color: MACRO_COLORS.carbs }]}>{nutrition.carbs_g}g C</Text>
              ) : null}
              {nutrition.fat_g !== null ? (
                <Text style={[search.macro, { color: MACRO_COLORS.fat }]}>{nutrition.fat_g}g F</Text>
              ) : null}
            </View>
          ) : null}
          <View style={search.detailActions}>
            <Pressable
              style={[search.detailBtn, detailsLoading && search.detailBtnDisabled]}
              onPress={handleLoadDetails}
              disabled={detailsLoading}
            >
              {detailsLoading
                ? <ActivityIndicator color={color.text.primary} size="small" />
                : <Text style={search.detailBtnText}>{selectedDetails?.nutrients?.length ? 'Refresh detail' : 'More detail'}</Text>}
            </Pressable>
            <Pressable style={search.useBtn} onPress={handleConfirm}>
              <Text style={search.useBtnText}>Use this meal</Text>
              <MaterialCommunityIcons name={'arrow-right' as any} size={16} color={color.text.inverse} />
            </Pressable>
          </View>
          {selectedDetails?.nutrients?.length ? (
            <View style={search.detailCard}>
              <Text style={search.detailLabel}>Extra nutrition per 100g</Text>
              <View style={search.detailNutrientRow}>
                {selectedDetails.nutrients.map((nutrient) => (
                  <View key={nutrient.key} style={search.detailChip}>
                    <Text style={search.detailChipValue}>
                      {Math.round((nutrient.amount_per_100g * ((parseFloat(servingStr) || 100) / 100)) * 10) / 10}
                      {nutrient.unit}
                    </Text>
                    <Text style={search.detailChipLabel}>{nutrient.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={search.detailHint}>
                Advanced detail stays optional so meal logging stays fast.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function NutritionScreen() {
  const router = useRouter();
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

  const totalCalories = logs.reduce((sum, log) => sum + (log.total_calories ?? 0), 0);
  const totalProtein = logs.reduce((sum, log) => sum + (log.total_protein_g ?? 0), 0);
  const totalCarbs = logs.reduce((sum, log) => sum + (log.total_carbs_g ?? 0), 0);
  const totalFat = logs.reduce((sum, log) => sum + (log.total_fat_g ?? 0), 0);
  const calTarget = goals?.daily_calorie_target ?? null;
  const calPct = calTarget ? progressPct(Math.round(totalCalories), calTarget) : null;

  const grouped = MEAL_ORDER.reduce<Record<MealType, typeof logs>>((acc, type) => {
    acc[type] = logs.filter((log) => log.meal_type === type);
    return acc;
  }, { breakfast: [], lunch: [], dinner: [], snack: [] });

  const templates = useMemo(() => buildRecentTemplates(recentLogs), [recentLogs]);

  function resetForm(nextMealType = getDefaultMealType()) {
    setMealType(nextMealType);
    setDescription('');
    setCaloriesStr('');
    setProteinStr('');
    setCarbsStr('');
    setFatStr('');
    setSelectedFoodItems([]);
    setUseSearch(false);
    setShowMacros(false);
  }

  function openComposer(nextMealType = getDefaultMealType()) {
    setShowForm(true);
    setUseSearch(false);
    setFeedback(null);
    if (!description && !caloriesStr) {
      setMealType(nextMealType);
    }
  }

  function handleFoodSelect(food: FoodSearchResult, serving_g: number) {
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
  }

  function logTemplate(template: typeof recentLogs[number]) {
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
  }

  function loadTemplate(template: typeof recentLogs[number]) {
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
  }

  function handleSubmit() {
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
  }

  async function handleSaveCustomFood() {
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
  }

  function handleDelete(id: string) {
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
  }

  // Macro stacked bar calculations
  const proteinCals = totalProtein * 4;
  const carbsCals = totalCarbs * 4;
  const fatCals = totalFat * 9;
  const totalMacroCals = proteinCals + carbsCals + fatCals;
  const showMacroBar = totalMacroCals > 0;
  const proteinPct = showMacroBar ? (proteinCals / totalMacroCals) * 100 : 0;
  const carbsPct = showMacroBar ? (carbsCals / totalMacroCals) * 100 : 0;
  const fatPct = showMacroBar ? (fatCals / totalMacroCals) * 100 : 0;

  const heroColor = calPct !== null ? calColor(calPct) : color.success;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <MaterialCommunityIcons name={'arrow-left' as any} size={22} color={color.text.muted} />
          </Pressable>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Nutrition</Text>
                <MaterialCommunityIcons name={'food-fork-knife' as any} size={22} color={color.success} />
              </View>
              <Text style={styles.subtitle}>Make the common meal fast. Keep detail available when you need it.</Text>
            </View>
            <Pressable
              style={[styles.logBtn, showForm && styles.logBtnActive]}
              onPress={() => {
                if (showForm) {
                  setShowForm(false);
                } else {
                  openComposer();
                }
              }}
            >
              <Text style={[styles.logBtnText, showForm && styles.logBtnTextActive]}>
                {showForm ? 'Close' : 'Quick add'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Hero Summary Card */}
        <View style={[styles.summaryCard, { borderColor: heroColor + '33' }]}>
          {calPct !== null ? (
            <View style={[styles.calPctBadge, { borderColor: heroColor, backgroundColor: heroColor + '22' }]}>
              <Text style={[styles.calPctBadgeText, { color: heroColor }]}>{calPct}%</Text>
            </View>
          ) : null}
          <View style={styles.summaryMain}>
            <View style={styles.summaryPrimary}>
              <Text style={[styles.summaryValue, { color: heroColor }]}>{Math.round(totalCalories)}</Text>
              <Text style={styles.summaryLabel}>kcal today{calTarget ? ` / ${calTarget}` : ''}</Text>
            </View>
            <View style={styles.summaryMeta}>
              <Text style={styles.summaryMetaValue}>{logs.length}</Text>
              <Text style={styles.summaryMetaLabel}>meal{logs.length === 1 ? '' : 's'}</Text>
            </View>
          </View>
          {calPct !== null ? (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${calPct}%` as any, backgroundColor: heroColor }]} />
              </View>
              <Text style={styles.progressCaption}>{calPct}% of calorie target</Text>
            </>
          ) : null}
          {showMacroBar ? (
            <View style={styles.macroSection}>
              <View style={styles.macroStackBar}>
                <View style={[styles.macroStackSegment, { width: `${proteinPct}%` as any, backgroundColor: MACRO_COLORS.protein }]} />
                <View style={[styles.macroStackSegment, { width: `${carbsPct}%` as any, backgroundColor: MACRO_COLORS.carbs }]} />
                <View style={[styles.macroStackSegment, { width: `${fatPct}%` as any, backgroundColor: MACRO_COLORS.fat, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }]} />
              </View>
              <View style={styles.macroChipRow}>
                <View style={[styles.macroChip, { backgroundColor: MACRO_COLORS.protein + '22', borderColor: MACRO_COLORS.protein + '44' }]}>
                  <Text style={[styles.macroChipText, { color: MACRO_COLORS.protein }]}>P {Math.round(totalProtein)}g</Text>
                </View>
                <View style={[styles.macroChip, { backgroundColor: MACRO_COLORS.carbs + '22', borderColor: MACRO_COLORS.carbs + '44' }]}>
                  <Text style={[styles.macroChipText, { color: MACRO_COLORS.carbs }]}>C {Math.round(totalCarbs)}g</Text>
                </View>
                <View style={[styles.macroChip, { backgroundColor: MACRO_COLORS.fat + '22', borderColor: MACRO_COLORS.fat + '44' }]}>
                  <Text style={[styles.macroChipText, { color: MACRO_COLORS.fat }]}>F {Math.round(totalFat)}g</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* Feedback */}
        {feedback ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{feedback}</Text>
            <Pressable onPress={() => setFeedback(null)}>
              <Text style={styles.feedbackDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Quick Reuse Templates */}
        {templates.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionLabelRow}>
              <MaterialCommunityIcons name={'history' as any} size={14} color={color.text.muted} />
              <Text style={styles.sectionLabel}>Quick reuse</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templateCarousel}
            >
              {templates.map((template) => (
                <View key={template.id} style={styles.templateCard}>
                  <Pressable style={styles.templateCopy} onPress={() => loadTemplate(template)}>
                    <Text style={styles.templateTitle} numberOfLines={1}>
                      {template.notes ?? 'Meal'}
                    </Text>
                    <Text style={styles.templateMeta}>
                      {MEAL_TYPES.find((item) => item.value === template.meal_type)?.label ?? 'Meal'} · {Math.round(template.total_calories ?? 0)} kcal
                    </Text>
                  </Pressable>
                  <Pressable style={styles.templateAction} onPress={() => logTemplate(template)}>
                    <Text style={styles.templateActionText}>Log again</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Form Card */}
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Quick meal</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Meal type</Text>
              <View style={styles.mealTypeRow}>
                {MEAL_TYPES.map(({ value, label }) => {
                  const meta = MEAL_META[value];
                  const isActive = mealType === value;
                  return (
                    <Pressable
                      key={value}
                      style={[
                        styles.mealTypePill,
                        isActive && { borderColor: meta.color, backgroundColor: meta.color + '22' },
                      ]}
                      onPress={() => setMealType(value)}
                    >
                      <MaterialCommunityIcons
                        name={meta.icon as any}
                        size={14}
                        color={isActive ? meta.color : color.text.muted}
                      />
                      <Text style={[styles.mealTypePillText, isActive && { color: meta.color }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.composerActions}>
              <Pressable
                style={[styles.composerToggle, useSearch && styles.composerToggleActive]}
                onPress={() => setUseSearch((value) => !value)}
              >
                <Text style={[styles.composerToggleText, useSearch && styles.composerToggleTextActive]}>
                  {useSearch ? 'Hide food search' : 'Use food search'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.composerToggle, showMacros && styles.composerToggleActive]}
                onPress={() => setShowMacros((value) => !value)}
              >
                <Text style={[styles.composerToggleText, showMacros && styles.composerToggleTextActive]}>
                  {showMacros ? 'Hide macros' : 'Add macros'}
                </Text>
              </Pressable>
            </View>

            {useSearch ? <FoodSearchPanel onSelect={handleFoodSelect} /> : null}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Oatmeal with berries"
                placeholderTextColor={color.text.muted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Calories</Text>
              <TextInput
                style={styles.input}
                value={caloriesStr}
                onChangeText={setCaloriesStr}
                keyboardType="decimal-pad"
                placeholder="350"
                placeholderTextColor={color.text.muted}
              />
            </View>

            {showMacros ? (
              <View style={styles.macrosRow}>
                <View style={[styles.field, styles.macroField]}>
                  <Text style={styles.fieldLabel}>Protein</Text>
                  <TextInput
                    style={styles.input}
                    value={proteinStr}
                    onChangeText={setProteinStr}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={color.text.muted}
                  />
                </View>
                <View style={[styles.field, styles.macroField]}>
                  <Text style={styles.fieldLabel}>Carbs</Text>
                  <TextInput
                    style={styles.input}
                    value={carbsStr}
                    onChangeText={setCarbsStr}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={color.text.muted}
                  />
                </View>
                <View style={[styles.field, styles.macroField]}>
                  <Text style={styles.fieldLabel}>Fat</Text>
                  <TextInput
                    style={styles.input}
                    value={fatStr}
                    onChangeText={setFatStr}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={color.text.muted}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.formFooter}>
              <Pressable
                style={styles.clearBtn}
                onPress={() => resetForm(getDefaultMealType())}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryBtn, savingCustomFood && styles.disabled]}
                onPress={handleSaveCustomFood}
                disabled={savingCustomFood}
              >
                {savingCustomFood
                  ? <ActivityIndicator color={color.text.primary} size="small" />
                  : <Text style={styles.secondaryBtnText}>Save food</Text>}
              </Pressable>
              <Pressable
                style={[styles.submitBtn, addLog.isPending && styles.disabled]}
                onPress={handleSubmit}
                disabled={addLog.isPending}
              >
                {addLog.isPending
                  ? <ActivityIndicator color={color.text.inverse} size="small" />
                  : <Text style={styles.submitBtnText}>Save meal</Text>}
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Today Section */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <MaterialCommunityIcons name={'calendar-today' as any} size={14} color={color.text.muted} />
            <Text style={styles.sectionLabel}>Today</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color={color.success} />
          ) : logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No meals logged yet</Text>
              <Text style={styles.emptyText}>Start with the first meal or reuse something you eat often.</Text>
            </View>
          ) : (
            MEAL_ORDER.map((type) => {
              const group = grouped[type];
              if (group.length === 0) return null;
              const groupCalories = group.reduce((sum, log) => sum + (log.total_calories ?? 0), 0);
              const meta = MEAL_META[type];
              return (
                <View key={type} style={styles.mealGroup}>
                  <View style={styles.mealGroupHeader}>
                    <View style={styles.mealGroupTitleRow}>
                      <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
                      <Text style={styles.mealGroupTitle}>
                        {MEAL_TYPES.find((item) => item.value === type)?.label}
                      </Text>
                    </View>
                    <View style={[styles.mealGroupCalsBadge, { backgroundColor: meta.color + '22' }]}>
                      <Text style={[styles.mealGroupCals, { color: meta.color }]}>{Math.round(groupCalories)} kcal</Text>
                    </View>
                  </View>
                  <View style={[styles.logList, { borderLeftColor: meta.color }]}>
                    {group.map((log, index) => (
                      <View key={log.id} style={[styles.logRow, index === group.length - 1 && styles.logRowLast]}>
                        <View style={styles.logLeft}>
                          <Text style={styles.logName}>{log.notes ?? 'Meal'}</Text>
                          <View style={styles.logMetaRow}>
                            <Text style={[styles.logMetaCal, { color: color.success }]}>
                              {Math.round(log.total_calories ?? 0)} kcal
                            </Text>
                            {log.total_protein_g ? (
                              <Text style={[styles.logMetaMacro, { color: MACRO_COLORS.protein }]}>
                                {Math.round(log.total_protein_g)}g P
                              </Text>
                            ) : null}
                            {log.total_carbs_g ? (
                              <Text style={[styles.logMetaMacro, { color: MACRO_COLORS.carbs }]}>
                                {Math.round(log.total_carbs_g)}g C
                              </Text>
                            ) : null}
                            {log.total_fat_g ? (
                              <Text style={[styles.logMetaMacro, { color: MACRO_COLORS.fat }]}>
                                {Math.round(log.total_fat_g)}g F
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.logTime}>{format(new Date(log.logged_at), 'h:mm a')}</Text>
                        </View>
                        <View style={styles.logRight}>
                          <Pressable style={styles.inlineAction} onPress={() => loadTemplate(log)}>
                            <Text style={styles.inlineActionText}>Reuse</Text>
                          </Pressable>
                          <Pressable onPress={() => handleDelete(log.id)} style={styles.deleteBtn}>
                            <MaterialCommunityIcons name={'close' as any} size={16} color={color.text.muted} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  header: {
    paddingTop: space.lg,
    marginBottom: space.lg,
  },
  back: { marginBottom: space.sm },
  backText: { fontSize: typography.sm, color: color.text.muted },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  headerCopy: {
    flex: 1,
    gap: space.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  title: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 22,
  },
  logBtn: {
    borderWidth: 1,
    borderColor: color.outline,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surface,
  },
  logBtnActive: {
    borderColor: color.success,
    backgroundColor: color.surfaceAlt,
  },
  logBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  logBtnTextActive: {
    color: color.success,
  },
  summaryCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.md,
    marginBottom: space.lg,
  },
  calPctBadge: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 3,
    marginBottom: -space.xs,
  },
  calPctBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
  },
  summaryPrimary: {
    flex: 1,
    gap: 2,
  },
  summaryValue: {
    fontSize: typography['4xl'],
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 48,
  },
  summaryLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  summaryMeta: {
    alignItems: 'flex-end',
    gap: 2,
    paddingBottom: 4,
  },
  summaryMetaValue: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
  },
  summaryMetaLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  progressTrack: {
    height: 8,
    backgroundColor: color.outline,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: color.success,
    borderRadius: radius.pill,
  },
  progressCaption: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  macroSection: {
    gap: space.sm,
  },
  macroStackBar: {
    height: 6,
    borderRadius: radius.pill,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: color.outline,
  },
  macroStackSegment: {
    height: '100%',
  },
  macroChipRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  macroChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  macroChipText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  // kept for reference (not used in new JSX but may still be referenced)
  macroSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  macroSummary: {
    fontSize: typography.sm,
    color: color.text.primary,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  feedbackCard: {
    marginBottom: space.lg,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.success,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
  },
  feedbackText: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.primary,
  },
  feedbackDismiss: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.success,
  },
  section: {
    marginBottom: space.xl,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.sm,
  },
  sectionLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templateCarousel: {
    gap: space.sm,
    paddingBottom: space.xs,
  },
  templateList: {
    gap: space.sm,
  },
  templateCard: {
    width: 200,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: space.md,
  },
  templateCopy: {
    gap: 4,
  },
  templateTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  templateMeta: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  templateHint: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  templateAction: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: color.success,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  templateActionText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.inverse,
  },
  formCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.xl,
    gap: space.lg,
  },
  formTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  field: {
    gap: space.xs,
  },
  fieldLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  mealTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderColor: color.outline,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surfaceAlt,
  },
  mealTypePillActive: {
    borderColor: color.success,
    backgroundColor: color.success,
  },
  mealTypePillText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  mealTypePillTextActive: {
    color: color.text.inverse,
  },
  composerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  composerToggle: {
    borderWidth: 1,
    borderColor: color.outline,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  composerToggleActive: {
    borderColor: color.success,
    backgroundColor: color.surfaceAlt,
  },
  composerToggleText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  composerToggleTextActive: {
    color: color.success,
  },
  input: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typography.base,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.outline,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  macroField: {
    flex: 1,
  },
  formFooter: {
    flexDirection: 'row',
    gap: space.sm,
  },
  clearBtn: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
  },
  secondaryBtn: {
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceAlt,
  },
  secondaryBtnText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: color.success,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.inverse,
  },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.xs,
  },
  emptyTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  emptyText: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  mealGroup: {
    marginBottom: space.lg,
    gap: space.sm,
  },
  mealGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  mealGroupTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  mealGroupCalsBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  mealGroupCals: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
  },
  logList: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.outline,
  },
  logRowLast: {
    borderBottomWidth: 0,
  },
  logLeft: {
    flex: 1,
    gap: 2,
  },
  logName: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
  },
  logMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    alignItems: 'center',
  },
  logMetaCal: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  logMetaMacro: {
    fontSize: typography.sm,
  },
  logMeta: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  logTime: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  inlineAction: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  inlineActionText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  deleteBtn: { padding: space.xs },
  deleteBtnText: {
    fontSize: typography.xl,
    color: color.text.muted,
    lineHeight: 22,
  },
  disabled: { opacity: 0.6 },
});

const search = StyleSheet.create({
  container: {
    gap: space.sm,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  input: {
    flex: 1,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typography.base,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.outline,
  },
  spinner: {
    marginLeft: space.sm,
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typography.base,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.outline,
  },
  barcodeBtn: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  barcodeBtnText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.primary,
  },
  scannerCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.sm,
    gap: space.sm,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  scannerCopy: {
    flex: 1,
    gap: 4,
  },
  scannerTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  scannerHint: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  scannerClose: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.success,
  },
  scannerView: {
    height: 220,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  scannerFrame: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: 86,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.success,
  },
  scanFeedbackCard: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.success,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
  },
  scanFeedbackText: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.primary,
  },
  scanFeedbackDismiss: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.success,
  },
  statusCard: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  statusText: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  recents: {
    gap: space.sm,
  },
  recentsLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
  },
  results: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    overflow: 'hidden',
  },
  result: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.outline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  resultPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  resultLast: {
    borderBottomWidth: 0,
  },
  resultCopy: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  resultBrand: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
  resultCal: {
    fontSize: typography.sm,
    color: color.success,
  },
  favoriteBtn: {
    paddingHorizontal: space.xs,
    paddingVertical: space.xs,
  },
  favoriteBtnText: {
    fontSize: typography.lg,
    color: color.text.muted,
  },
  favoriteBtnTextActive: {
    color: color.success,
  },
  servingCard: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: color.success,
    gap: space.sm,
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  servingCopy: {
    flex: 1,
    gap: 2,
  },
  servingName: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  servingHint: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  servingInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  servingInput: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
    width: 52,
    textAlign: 'right',
  },
  servingUnit: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  macro: {
    fontSize: typography.sm,
    color: color.text.primary,
  },
  useBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.success,
  },
  useBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.inverse,
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  detailBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surface,
  },
  detailBtnDisabled: {
    opacity: 0.7,
  },
  detailBtnText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  detailCard: {
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.sm,
  },
  detailLabel: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  detailNutrientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  detailChip: {
    minWidth: 88,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.md,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.outline,
    gap: 2,
  },
  detailChipValue: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  detailChipLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
  detailHint: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
});
