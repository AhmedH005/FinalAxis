import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { NutritionComposerCard } from '@/features/body/nutrition/NutritionComposerCard';
import { NutritionDailyLogs } from '@/features/body/nutrition/NutritionDailyLogs';
import { NutritionSummaryCard } from '@/features/body/nutrition/NutritionSummaryCard';
import { NutritionTemplatesSection } from '@/features/body/nutrition/NutritionTemplatesSection';
import { useNutritionScreen } from '@/features/body/nutrition/useNutritionScreen';

export default function NutritionScreen() {
  const router = useRouter();
  const nutrition = useNutritionScreen();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
              <Text style={styles.subtitle}>
                Make the common meal fast. Keep detail available when you need it.
              </Text>
            </View>
            <Pressable
              style={[styles.logBtn, nutrition.showForm && styles.logBtnActive]}
              onPress={() => {
                if (nutrition.showForm) {
                  nutrition.setShowForm(false);
                  return;
                }
                nutrition.openComposer();
              }}
            >
              <Text style={[styles.logBtnText, nutrition.showForm && styles.logBtnTextActive]}>
                {nutrition.showForm ? 'Close' : 'Quick add'}
              </Text>
            </Pressable>
          </View>
        </View>

        <NutritionSummaryCard
          totalCalories={nutrition.totalCalories}
          calTarget={nutrition.calTarget}
          calPct={nutrition.calPct}
          logsCount={nutrition.logs.length}
          totalProtein={nutrition.totalProtein}
          totalCarbs={nutrition.totalCarbs}
          totalFat={nutrition.totalFat}
        />

        {nutrition.feedback ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{nutrition.feedback}</Text>
            <Pressable onPress={() => nutrition.setFeedback(null)}>
              <Text style={styles.feedbackDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        <NutritionTemplatesSection
          templates={nutrition.templates}
          onLoadTemplate={nutrition.loadTemplate}
          onLogTemplate={nutrition.logTemplate}
        />

        {nutrition.showForm ? (
          <NutritionComposerCard
            mealType={nutrition.mealType}
            setMealType={nutrition.setMealType}
            useSearch={nutrition.useSearch}
            setUseSearch={nutrition.setUseSearch}
            showMacros={nutrition.showMacros}
            setShowMacros={nutrition.setShowMacros}
            description={nutrition.description}
            setDescription={nutrition.setDescription}
            caloriesStr={nutrition.caloriesStr}
            setCaloriesStr={nutrition.setCaloriesStr}
            proteinStr={nutrition.proteinStr}
            setProteinStr={nutrition.setProteinStr}
            carbsStr={nutrition.carbsStr}
            setCarbsStr={nutrition.setCarbsStr}
            fatStr={nutrition.fatStr}
            setFatStr={nutrition.setFatStr}
            savingCustomFood={nutrition.savingCustomFood}
            isSavingMeal={nutrition.isSavingMeal}
            onFoodSelect={nutrition.handleFoodSelect}
            onReset={() => nutrition.resetForm()}
            onSaveCustomFood={nutrition.handleSaveCustomFood}
            onSubmit={nutrition.handleSubmit}
          />
        ) : null}

        <NutritionDailyLogs
          grouped={nutrition.grouped}
          isLoading={nutrition.isLoading}
          onLoadTemplate={nutrition.loadTemplate}
          onDeleteLog={nutrition.handleDelete}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  container: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  header: {
    paddingTop: space.lg,
    marginBottom: space.lg,
  },
  back: {
    marginBottom: space.sm,
  },
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
});
