import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
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
  toggleFavoriteFood,
  getFoodDetails,
  enrichFoodMacros,
} from '@/engines/body/food-search';
import { MACRO_COLORS } from './model';

export function FoodSearchPanel({
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
    onSelect(
      {
        ...selected,
        nutrition_details: selectedDetails ?? selected.nutrition_details ?? null,
      },
      serving,
    );
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
      <View key={key} style={[styles.result, index === total - 1 && styles.resultLast]}>
        <Pressable style={styles.resultPressable} onPress={() => handleSelect(food)}>
          <View style={styles.resultCopy}>
            <Text style={styles.resultName} numberOfLines={1}>{food.name}</Text>
            <Text style={styles.resultBrand} numberOfLines={1}>
              {food.brand ?? (food.barcode ? `Barcode ${food.barcode}` : 'Saved food')}
            </Text>
          </View>
          <Text style={styles.resultCal}>
            {food.calories_per_100g !== null ? `${food.calories_per_100g} kcal` : '—'}
          </Text>
        </Pressable>
        <Pressable style={styles.favoriteBtn} onPress={() => handleToggleFavorite(food)}>
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
    <View style={styles.container}>
      <Text style={styles.label}>Search by food name</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleSearch}
          placeholder="Try oatmeal, chicken breast, greek yogurt..."
          placeholderTextColor={color.text.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching ? <ActivityIndicator color={color.success} style={styles.spinner} size="small" /> : null}
      </View>

      <View style={styles.barcodeRow}>
        <TextInput
          style={styles.barcodeInput}
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Enter barcode"
          placeholderTextColor={color.text.muted}
          keyboardType="number-pad"
        />
        <Pressable style={styles.barcodeBtn} onPress={handleBarcodeLookup}>
          <MaterialCommunityIcons name={'magnify' as any} size={20} color={color.text.primary} />
          <Text style={styles.barcodeBtnText}>Lookup</Text>
        </Pressable>
        <Pressable style={styles.barcodeBtn} onPress={handleOpenScanner}>
          <MaterialCommunityIcons name={'barcode-scan' as any} size={20} color={color.text.primary} />
          <Text style={styles.barcodeBtnText}>Scan</Text>
        </Pressable>
      </View>

      {showScanner ? (
        <View style={styles.scannerCard}>
          <View style={styles.scannerHeader}>
            <View style={styles.scannerCopy}>
              <Text style={styles.scannerTitle}>Scan barcode</Text>
              <Text style={styles.scannerHint}>Line the barcode up inside the frame. AXIS will look it up automatically.</Text>
            </View>
            <Pressable onPress={() => setShowScanner(false)}>
              <Text style={styles.scannerClose}>Close</Text>
            </Pressable>
          </View>
          <CameraView
            style={styles.scannerView}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={({ data }) => {
              if (data) {
                void handleBarcodeScanned(data);
              }
            }}
          />
          <View style={styles.scannerFrame} pointerEvents="none" />
        </View>
      ) : null}

      {scanFeedback ? (
        <View style={styles.scanFeedbackCard}>
          <Text style={styles.scanFeedbackText}>{scanFeedback}</Text>
          <Pressable onPress={() => setScanFeedback(null)}>
            <Text style={styles.scanFeedbackDismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {query.trim() && !selected && searchError ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>{searchError}</Text>
        </View>
      ) : null}

      {results.length > 0 ? (
        <View style={styles.results}>
          {results.map((food, index) => renderFoodRow(food, index, results.length))}
        </View>
      ) : null}

      {query.trim() && !selected && searching && results.length === 0 ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>Searching foods...</Text>
        </View>
      ) : null}

      {query.trim() && !selected && !searching && !searchError && results.length === 0 ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>No foods found yet. Try a simpler name, brand, or barcode.</Text>
        </View>
      ) : null}

      {!query.trim() && !selected && customFoods.length > 0 ? (
        <View style={styles.recents}>
          <Text style={styles.recentsLabel}>Saved foods</Text>
          <View style={styles.results}>
            {customFoods.map((food, index) => renderFoodRow(food, index, customFoods.length))}
          </View>
        </View>
      ) : null}

      {!query.trim() && !selected && favoriteFoods.length > 0 ? (
        <View style={styles.recents}>
          <Text style={styles.recentsLabel}>Favorites</Text>
          <View style={styles.results}>
            {favoriteFoods.map((food, index) => renderFoodRow(food, index, favoriteFoods.length))}
          </View>
        </View>
      ) : null}

      {!query.trim() && !selected && recentFoods.length > 0 ? (
        <View style={styles.recents}>
          <Text style={styles.recentsLabel}>Recent foods</Text>
          <View style={styles.results}>
            {recentFoods.map((food, index) => renderFoodRow(food, index, recentFoods.length))}
          </View>
        </View>
      ) : null}

      {selected ? (
        <View style={styles.servingCard}>
          <View style={styles.servingRow}>
            <View style={styles.servingCopy}>
              <Text style={styles.servingName} numberOfLines={1}>{selected.name}</Text>
              <Text style={styles.servingHint}>Adjust serving size before using it.</Text>
            </View>
            <View style={styles.servingInputWrap}>
              <TextInput
                style={styles.servingInput}
                value={servingStr}
                onChangeText={setServingStr}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.servingUnit}>g</Text>
            </View>
          </View>
          {nutrition ? (
            <View style={styles.macroRow}>
              <Text style={[styles.macro, { color: color.success }]}>{nutrition.calories} kcal</Text>
              {nutrition.protein_g !== null ? (
                <Text style={[styles.macro, { color: MACRO_COLORS.protein }]}>{nutrition.protein_g}g P</Text>
              ) : null}
              {nutrition.carbs_g !== null ? (
                <Text style={[styles.macro, { color: MACRO_COLORS.carbs }]}>{nutrition.carbs_g}g C</Text>
              ) : null}
              {nutrition.fat_g !== null ? (
                <Text style={[styles.macro, { color: MACRO_COLORS.fat }]}>{nutrition.fat_g}g F</Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.detailActions}>
            <Pressable
              style={[styles.detailBtn, detailsLoading && styles.detailBtnDisabled]}
              onPress={handleLoadDetails}
              disabled={detailsLoading}
            >
              {detailsLoading
                ? <ActivityIndicator color={color.text.primary} size="small" />
                : <Text style={styles.detailBtnText}>{selectedDetails?.nutrients?.length ? 'Refresh detail' : 'More detail'}</Text>}
            </Pressable>
            <Pressable style={styles.useBtn} onPress={handleConfirm}>
              <Text style={styles.useBtnText}>Use this meal</Text>
              <MaterialCommunityIcons name={'arrow-right' as any} size={16} color={color.text.inverse} />
            </Pressable>
          </View>
          {selectedDetails?.nutrients?.length ? (
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Extra nutrition per 100g</Text>
              <View style={styles.detailNutrientRow}>
                {selectedDetails.nutrients.map((nutrient) => (
                  <View key={nutrient.key} style={styles.detailChip}>
                    <Text style={styles.detailChipValue}>
                      {Math.round((nutrient.amount_per_100g * ((parseFloat(servingStr) || 100) / 100)) * 10) / 10}
                      {nutrient.unit}
                    </Text>
                    <Text style={styles.detailChipLabel}>{nutrient.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.detailHint}>
                Advanced detail stays optional so meal logging stays fast.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
