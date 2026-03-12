import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { useAuth } from '@/providers/AuthProvider';
import {
  useGoals,
  useTodayHydrationTotal,
  useTodayNutritionSummary,
  useLastNightSleep,
  useTodayWorkouts,
  useLatestWeight,
  getTodayRecoveryCheckIn,
  computeRecoveryScore,
  formatHydration,
  formatDuration,
  toDisplayWeight,
  weightLabel,
  progressPct,
} from '@/engines/body';
import { useEffect, useState } from 'react';

// Tracker card for the 2-column grid
function TrackerCard({
  icon,
  iconColor,
  title,
  value,
  sub,
  pct,
  onPress,
}: {
  icon: string;
  iconColor: string;
  title: string;
  value: string;
  sub: string;
  pct?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={tc.card} onPress={onPress}>
      <View style={[tc.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={tc.title}>{title}</Text>
      <Text style={[tc.value, { color: iconColor }]}>{value}</Text>
      <Text style={tc.sub} numberOfLines={1}>{sub}</Text>
      {pct !== undefined ? (
        <View style={tc.track}>
          <View style={[tc.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: iconColor }]} />
        </View>
      ) : null}
    </Pressable>
  );
}

const tc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: 6,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: typography.sm,
    color: color.text.muted,
    fontWeight: '600',
    minHeight: 18,
  },
  value: {
    fontSize: typography.lg,
    fontWeight: '700',
    minHeight: 28,
  },
  sub: {
    fontSize: typography.xs,
    color: color.text.muted,
    lineHeight: 16,
    minHeight: 32,
  },
  track: {
    height: 3,
    backgroundColor: color.outline,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default function BodyHubScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const units = profile?.units ?? 'metric';
  const [recoveryScore, setRecoveryScore] = useState<number | null>(null);

  const { data: goals } = useGoals();
  const { total_ml } = useTodayHydrationTotal();
  const { summary: nutrition } = useTodayNutritionSummary();
  const { log: sleepLog } = useLastNightSleep();
  const { data: workouts = [] } = useTodayWorkouts();
  const { data: latestWeight } = useLatestWeight();

  const waterTarget = goals?.daily_water_target_ml ?? 2500;
  const hydrationPct = progressPct(total_ml, waterTarget);
  const hydrationRemaining = Math.max(waterTarget - total_ml, 0);

  const calorieTarget = goals?.daily_calorie_target ?? null;
  const calories = Math.round(nutrition.total_calories);
  const nutritionPct = calorieTarget ? progressPct(calories, calorieTarget) : undefined;

  const sleepTarget = goals?.sleep_target_minutes ?? 480;
  const sleepMinutes = sleepLog?.duration_minutes ?? null;
  const sleepPct = sleepMinutes ? progressPct(sleepMinutes, sleepTarget) : undefined;

  const weightUnit = weightLabel(units);
  const latestWeightValue = latestWeight ? toDisplayWeight(latestWeight.value, units) : null;

  useEffect(() => {
    getTodayRecoveryCheckIn().then((entry) => {
      setRecoveryScore(computeRecoveryScore({
        sleepMinutes,
        energy: entry?.energy ?? null,
        fatigue: entry?.fatigue ?? null,
        soreness: entry?.soreness ?? null,
        sleepTargetMinutes: sleepTarget,
      }));
    });
  }, [sleepMinutes, sleepTarget]);

  const focus = hydrationRemaining > 0
    ? { title: 'Hydration', summary: `${formatHydration(hydrationRemaining)} left`, color: '#6AADE4', icon: 'water', href: '/(app)/body/hydration' as const }
    : calories === 0
      ? { title: 'Nutrition', summary: 'First meal still missing', color: color.success, icon: 'food-apple-outline', href: '/(app)/body/nutrition' as const }
      : !sleepMinutes
        ? { title: 'Sleep', summary: 'No check-in yet', color: '#A855F7', icon: 'moon-waning-crescent', href: '/(app)/body/sleep' as const }
        : { title: 'Recovery', summary: recoveryScore !== null ? `${recoveryScore}% today` : 'Log check-in', color: '#F9B24E', icon: 'heart-pulse', href: '/(app)/body/recovery' as const };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Body signals</Text>
          <Text style={styles.subtitle}>
            Your physical state is one layer in the pattern AXIS is learning.
          </Text>
        </View>

        {/* Focus card */}
        <Pressable style={[styles.focusCard, { borderColor: focus.color + '44' }]} onPress={() => router.push(focus.href)}>
          <View style={[styles.focusIcon, { backgroundColor: focus.color + '22' }]}>
            <MaterialCommunityIcons name={focus.icon as any} size={24} color={focus.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.focusEyebrow}>Strongest next signal</Text>
            <Text style={[styles.focusTitle, { color: focus.color }]}>{focus.title}</Text>
            <Text style={styles.focusSummary}>{focus.summary}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={focus.color} />
        </Pressable>

        {/* Tracker grid */}
        <Text style={styles.sectionLabel}>Physical layers</Text>
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <TrackerCard
              icon="food-apple-outline"
              iconColor={color.success}
              title="Nutrition"
              value={calories > 0 ? `${calories} kcal` : '—'}
              sub={nutrition.meal_count > 0 ? `${nutrition.meal_count} meal${nutrition.meal_count === 1 ? '' : 's'}` : 'No meals logged'}
              pct={nutritionPct}
              onPress={() => router.push('/(app)/body/nutrition')}
            />
            <TrackerCard
              icon="water"
              iconColor="#6AADE4"
              title="Hydration"
              value={formatHydration(total_ml)}
              sub={hydrationRemaining > 0 ? `${formatHydration(hydrationRemaining)} left` : 'Goal reached'}
              pct={hydrationPct}
              onPress={() => router.push('/(app)/body/hydration')}
            />
          </View>
          <View style={styles.gridRow}>
            <TrackerCard
              icon="moon-waning-crescent"
              iconColor="#A855F7"
              title="Sleep"
              value={sleepMinutes ? formatDuration(sleepMinutes) : '—'}
              sub={sleepLog?.quality_rating ? `Quality ${sleepLog.quality_rating}/5` : 'Last night'}
              pct={sleepPct}
              onPress={() => router.push('/(app)/body/sleep')}
            />
            <TrackerCard
              icon="heart-pulse"
              iconColor="#F9B24E"
              title="Recovery"
              value={recoveryScore !== null ? `${recoveryScore}%` : '—'}
              sub="Energy, fatigue, soreness"
              onPress={() => router.push('/(app)/body/recovery')}
            />
          </View>
          <View style={styles.gridRow}>
            <TrackerCard
              icon="dumbbell"
              iconColor="#FF6B6B"
              title="Workouts"
              value={workouts.length > 0 ? `${workouts.length} today` : '—'}
              sub={workouts.length > 0 ? workouts.map((w) => w.workout_type).join(', ') : 'Nothing logged today'}
              onPress={() => router.push('/(app)/body/workouts')}
            />
            <TrackerCard
              icon="scale-bathroom"
              iconColor="#9AA6B2"
              title="Metrics"
              value={latestWeightValue !== null ? `${latestWeightValue} ${weightUnit}` : '—'}
              sub="Weight trends"
              onPress={() => router.push('/(app)/body/metrics')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  header: { paddingTop: space.lg, marginBottom: space.lg },
  title: { fontSize: typography['3xl'], fontWeight: '700', color: color.text.primary, marginBottom: space.xs },
  subtitle: { fontSize: typography.base, color: color.text.muted },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.xl,
  },
  focusIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  focusEyebrow: { fontSize: typography.xs, color: color.text.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  focusTitle: { fontSize: typography.xl, fontWeight: '700' },
  focusSummary: { fontSize: typography.sm, color: color.text.muted, marginTop: 2 },
  sectionLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: space.sm,
  },
  grid: { gap: space.sm },
  gridRow: { flexDirection: 'row', gap: space.sm, alignItems: 'stretch' },
});
