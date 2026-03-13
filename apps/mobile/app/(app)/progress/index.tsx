import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { formatDuration, formatHydration } from '@/engines/body';
import { BarChart } from '@/features/progress/BarChart';
import { SectionHeader } from '@/features/progress/SectionHeader';
import { StatCard } from '@/features/progress/StatCard';
import { useProgressScreen } from '@/features/progress/useProgressScreen';

export default function ProgressScreen() {
  const progress = useProgressScreen();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Patterns</Text>
          <Text style={styles.subtitle}>
            AXIS compares recent signals so you can see what is actually changing.
          </Text>
        </View>

        <View style={styles.energyCard}>
          <View style={styles.energyCardTop}>
            <View>
              <Text style={styles.energyEyebrow}>Today energy</Text>
              <Text
                style={[
                  styles.energyValue,
                  progress.energy.estimated_balance_calories !== null && {
                    color: progress.energy.estimated_balance_calories >= 0 ? '#F9B24E' : color.success,
                  },
                ]}
              >
                {progress.energy.estimated_balance_calories !== null
                  ? `${progress.energy.estimated_balance_calories > 0 ? '+' : ''}${progress.energy.estimated_balance_calories} kcal`
                  : 'Estimating...'}
              </Text>
            </View>
            <MaterialCommunityIcons name={'flash-outline' as any} size={20} color={color.text.muted} />
          </View>
          <Text style={styles.energyText}>
            {progress.energy.total_expenditure_calories !== null
              ? `${progress.energy.intake_calories} in vs ${progress.energy.total_expenditure_calories} estimated out today.`
              : 'Add weight and basic profile data to unlock a fuller energy estimate.'}
          </Text>
        </View>

        {progress.isLoading ? (
          <ActivityIndicator color={color.success} style={styles.loader} />
        ) : !progress.hasData ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name={'chart-line' as any} size={32} color={color.text.muted} />
            <Text style={styles.emptyTitle}>Nothing to compare yet</Text>
            <Text style={styles.emptyText}>
              Log a few days of meals, water, sleep, or weight and AXIS will start showing patterns here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewRow}>
                <StatCard
                  icon="food-apple-outline"
                  iconColor={color.success}
                  title="Nutrition"
                  value={progress.formattedNutritionAverage}
                  hint={progress.goals?.daily_calorie_target
                    ? `Target ${progress.goals.daily_calorie_target} kcal`
                    : 'No calorie target'}
                  trend={progress.nutrition.trend}
                />
                <StatCard
                  icon="water"
                  iconColor="#6AADE4"
                  title="Hydration"
                  value={progress.formattedHydrationAverage}
                  hint={progress.goals?.daily_water_target_ml
                    ? `Target ${formatHydration(progress.goals.daily_water_target_ml)}`
                    : 'Default target'}
                  trend={progress.hydration.trend}
                />
              </View>
              <View style={styles.overviewRow}>
                <StatCard
                  icon="moon-waning-crescent"
                  iconColor="#A855F7"
                  title="Sleep"
                  value={progress.formattedSleepAverage}
                  hint={progress.goals?.sleep_target_minutes
                    ? `Target ${formatDuration(progress.goals.sleep_target_minutes)}`
                    : 'Default target'}
                  trend={progress.sleep.trend}
                />
                <StatCard
                  icon="scale-bathroom"
                  iconColor="#9AA6B2"
                  title="Weight"
                  value={progress.weight.latestDisplay !== null ? `${progress.weight.latestDisplay} ${progress.unit}` : '—'}
                  hint={progress.weight.delta !== null
                    ? `${progress.weight.delta > 0 ? '+' : ''}${progress.weight.delta.toFixed(1)} ${progress.unit} vs 7d`
                    : 'No comparison yet'}
                  trend={progress.weight.trend}
                />
              </View>
            </View>

            {progress.hasNutritionData ? (
              <View style={styles.section}>
                <SectionHeader
                  icon="food-apple-outline"
                  iconColor={color.success}
                  label="Nutrition"
                  streak={progress.nutrition.streak}
                  trend={progress.nutrition.trend}
                />
                <View style={styles.card}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>7-day average</Text>
                    <Text style={styles.cardStatValue}>{progress.formattedNutritionAverage}</Text>
                  </View>
                  <View style={styles.divider} />
                  <BarChart
                    days={progress.nutritionDays}
                    valueByDay={progress.nutrition.valueByDay}
                    target={progress.goals?.daily_calorie_target ?? 2000}
                  />
                </View>
              </View>
            ) : null}

            {progress.hasHydrationData ? (
              <View style={styles.section}>
                <SectionHeader
                  icon="water"
                  iconColor="#6AADE4"
                  label="Hydration"
                  streak={progress.hydration.streak}
                  trend={progress.hydration.trend}
                />
                <View style={styles.card}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>7-day average</Text>
                    <Text style={styles.cardStatValue}>{progress.formattedHydrationAverage}</Text>
                  </View>
                  <View style={styles.divider} />
                  <BarChart
                    days={progress.nutritionDays}
                    valueByDay={progress.hydration.valueByDay}
                    target={progress.goals?.daily_water_target_ml ?? 2500}
                  />
                </View>
              </View>
            ) : null}

            {progress.hasSleepData ? (
              <View style={styles.section}>
                <SectionHeader
                  icon="moon-waning-crescent"
                  iconColor="#A855F7"
                  label="Sleep"
                  streak={progress.sleep.streak}
                  trend={progress.sleep.trend}
                />
                <View style={styles.card}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>7-day average</Text>
                    <Text style={styles.cardStatValue}>{progress.formattedSleepAverage}</Text>
                  </View>
                  <View style={styles.divider} />
                  <BarChart
                    days={progress.nutritionDays}
                    valueByDay={progress.sleep.valueByDay}
                    target={progress.goals?.sleep_target_minutes ?? 480}
                  />
                </View>
              </View>
            ) : null}

            {progress.hasWorkoutData ? (
              <View style={styles.section}>
                <SectionHeader
                  icon="dumbbell"
                  iconColor="#FF6B6B"
                  label="Workouts"
                  streak={0}
                  trend={null}
                />
                <View style={styles.card}>
                  <View style={styles.workoutRow}>
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>{progress.workouts.sessionsThisWeek}</Text>
                      <Text style={styles.workoutStatLabel}>Sessions this week</Text>
                    </View>
                    <View style={styles.workoutTypes}>
                      {progress.workouts.workoutTypes.slice(0, 4).map((type) => (
                        <View key={type} style={styles.workoutTypePill}>
                          <Text style={styles.workoutTypeText}>{type}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            ) : null}

            {progress.hasWeightData ? (
              <View style={styles.section}>
                <SectionHeader
                  icon="scale-bathroom"
                  iconColor="#9AA6B2"
                  label="Weight"
                  streak={0}
                  trend={null}
                />
                <View style={styles.card}>
                  <View style={styles.weightRow}>
                    <View>
                      <Text style={styles.weightValue}>{progress.weight.latestDisplay} {progress.unit}</Text>
                      <Text style={styles.weightSub}>Current weight</Text>
                    </View>
                    {progress.weight.delta !== null ? (
                      <View style={[
                        styles.weightDeltaBadge,
                        { backgroundColor: progress.weight.delta <= 0 ? '#43D9A322' : '#FF6B6B22' },
                      ]}>
                        <Text style={[
                          styles.weightDeltaText,
                          { color: progress.weight.delta <= 0 ? color.success : '#FF6B6B' },
                        ]}>
                          {progress.weight.delta > 0 ? '+' : ''}{progress.weight.delta.toFixed(1)} {progress.unit}
                        </Text>
                        <Text style={[
                          styles.weightDeltaSub,
                          { color: progress.weight.delta <= 0 ? color.success : '#FF6B6B' },
                        ]}>
                          vs 7d ago
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {progress.weightEntryCount > 1 ? (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.note}>{progress.weightEntryCount} entries in the last 30 days</Text>
                    </>
                  ) : null}
                </View>
              </View>
            ) : null}
          </>
        )}
        <View style={styles.bottomSpacer} />
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
    gap: space.xs,
  },
  title: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
  },
  energyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: space.xs,
    marginBottom: space.lg,
  },
  energyCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  energyEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  energyValue: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
  },
  energyText: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  loader: {
    marginTop: space.xl,
  },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.sm,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  emptyText: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 22,
    textAlign: 'center',
  },
  overviewGrid: {
    gap: space.sm,
    marginBottom: space.xl,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  section: {
    marginBottom: space.lg,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
  },
  cardStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
  },
  cardStatLabel: {
    fontSize: typography.base,
    color: color.text.muted,
  },
  cardStatValue: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: color.outline,
    marginVertical: space.md,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  workoutStat: {
    alignItems: 'center',
  },
  workoutStatValue: {
    fontSize: typography['3xl'],
    fontWeight: '800',
    color: color.text.primary,
  },
  workoutStatLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textAlign: 'center',
  },
  workoutTypes: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  workoutTypePill: {
    backgroundColor: '#FF6B6B22',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  workoutTypeText: {
    fontSize: typography.xs,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightValue: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: color.text.primary,
  },
  weightSub: {
    fontSize: typography.xs,
    color: color.text.muted,
    marginTop: 2,
  },
  weightDeltaBadge: {
    borderRadius: radius.md,
    padding: space.sm,
    alignItems: 'center',
  },
  weightDeltaText: {
    fontSize: typography.lg,
    fontWeight: '700',
  },
  weightDeltaSub: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
  note: {
    fontSize: typography.sm,
    color: color.text.muted,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
});
