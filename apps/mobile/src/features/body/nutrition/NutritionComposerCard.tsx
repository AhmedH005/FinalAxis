import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import type { MealType } from '@/engines/body';
import type { FoodSearchResult } from '@/engines/body/food-search';
import { FoodSearchPanel } from './FoodSearchPanel';
import { MEAL_META, MEAL_TYPES } from './model';

export function NutritionComposerCard(props: {
  mealType: MealType;
  setMealType: (value: MealType) => void;
  useSearch: boolean;
  setUseSearch: (value: boolean) => void;
  showMacros: boolean;
  setShowMacros: (value: boolean) => void;
  description: string;
  setDescription: (value: string) => void;
  caloriesStr: string;
  setCaloriesStr: (value: string) => void;
  proteinStr: string;
  setProteinStr: (value: string) => void;
  carbsStr: string;
  setCarbsStr: (value: string) => void;
  fatStr: string;
  setFatStr: (value: string) => void;
  savingCustomFood: boolean;
  isSavingMeal: boolean;
  onFoodSelect: (food: FoodSearchResult, serving_g: number) => void;
  onReset: () => void;
  onSaveCustomFood: () => void;
  onSubmit: () => void;
}) {
  const {
    mealType,
    setMealType,
    useSearch,
    setUseSearch,
    showMacros,
    setShowMacros,
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
    isSavingMeal,
    onFoodSelect,
    onReset,
    onSaveCustomFood,
    onSubmit,
  } = props;

  return (
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
          onPress={() => setUseSearch(!useSearch)}
        >
          <Text style={[styles.composerToggleText, useSearch && styles.composerToggleTextActive]}>
            {useSearch ? 'Hide food search' : 'Use food search'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.composerToggle, showMacros && styles.composerToggleActive]}
          onPress={() => setShowMacros(!showMacros)}
        >
          <Text style={[styles.composerToggleText, showMacros && styles.composerToggleTextActive]}>
            {showMacros ? 'Hide macros' : 'Add macros'}
          </Text>
        </Pressable>
      </View>

      {useSearch ? <FoodSearchPanel onSelect={onFoodSelect} /> : null}

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
        <Pressable style={styles.clearBtn} onPress={onReset}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryBtn, savingCustomFood && styles.disabled]}
          onPress={onSaveCustomFood}
          disabled={savingCustomFood}
        >
          {savingCustomFood
            ? <ActivityIndicator color={color.text.primary} size="small" />
            : <Text style={styles.secondaryBtnText}>Save food</Text>}
        </Pressable>
        <Pressable
          style={[styles.submitBtn, isSavingMeal && styles.disabled]}
          onPress={onSubmit}
          disabled={isSavingMeal}
        >
          {isSavingMeal
            ? <ActivityIndicator color={color.text.inverse} size="small" />
            : <Text style={styles.submitBtnText}>Save meal</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  mealTypePillText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
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
  disabled: {
    opacity: 0.6,
  },
});
