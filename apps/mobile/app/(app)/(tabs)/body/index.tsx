import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { TrackerCard } from '@/features/body/hub/TrackerCard';
import { useBodyHubScreen } from '@/features/body/hub/useBodyHubScreen';

export default function BodyHubScreen() {
  const body = useBodyHubScreen();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Body signals</Text>
          <Text style={styles.subtitle}>
            Your physical state is one layer in the pattern AXIS is learning.
          </Text>
        </View>

        <Pressable
          style={[styles.focusCard, { borderColor: body.focus.color + '44' }]}
          onPress={body.openFocus}
        >
          <View style={[styles.focusIcon, { backgroundColor: body.focus.color + '22' }]}>
            <MaterialCommunityIcons name={body.focus.icon as any} size={24} color={body.focus.color} />
          </View>
          <View style={styles.focusCopy}>
            <Text style={styles.focusEyebrow}>Strongest next signal</Text>
            <Text style={[styles.focusTitle, { color: body.focus.color }]}>{body.focus.title}</Text>
            <Text style={styles.focusSummary}>{body.focus.summary}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={body.focus.color} />
        </Pressable>

        <Text style={styles.sectionLabel}>Physical layers</Text>
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <TrackerCard
              icon="food-apple-outline"
              iconColor={color.success}
              title="Nutrition"
              value={body.calories > 0 ? `${body.calories} kcal` : '—'}
              sub={body.nutrition.meal_count > 0
                ? `${body.nutrition.meal_count} meal${body.nutrition.meal_count === 1 ? '' : 's'}`
                : 'No meals logged'}
              pct={body.nutritionPct}
              onPress={body.openNutrition}
            />
            <TrackerCard
              icon="water"
              iconColor="#6AADE4"
              title="Hydration"
              value={body.formatHydration(body.totalMl)}
              sub={body.hydrationRemaining > 0
                ? `${body.formatHydration(body.hydrationRemaining)} left`
                : 'Goal reached'}
              pct={body.hydrationPct}
              onPress={body.openHydration}
            />
          </View>
          <View style={styles.gridRow}>
            <TrackerCard
              icon="moon-waning-crescent"
              iconColor="#A855F7"
              title="Sleep"
              value={body.sleepMinutes ? body.formatDuration(body.sleepMinutes) : '—'}
              sub={body.sleepLog
                ? body.sleepLog.sleep_score?.value
                  ? `Score ${body.sleepLog.sleep_score.value} · ${body.sleepLog.source_label}`
                  : body.sleepLog.source_label
                : 'Last night'}
              pct={body.sleepPct}
              onPress={body.openSleep}
            />
            <TrackerCard
              icon="heart-pulse"
              iconColor="#F9B24E"
              title="Recovery"
              value={body.recoveryScore !== null ? `${body.recoveryScore}%` : '—'}
              sub="Energy, fatigue, soreness"
              onPress={body.openRecovery}
            />
          </View>
          <View style={styles.gridRow}>
            <TrackerCard
              icon="dumbbell"
              iconColor="#FF6B6B"
              title="Fitness"
              value={body.workouts.length > 0 ? `${body.workouts.length} today` : '—'}
              sub={body.workouts.length > 0
                ? body.workouts.map((workout) => workout.workout_type).join(', ')
                : 'Programs, sessions, cardio'}
              onPress={body.openWorkouts}
            />
            <TrackerCard
              icon="scale-bathroom"
              iconColor="#9AA6B2"
              title="Metrics"
              value={body.latestWeightValue !== null ? `${body.latestWeightValue} ${body.weightUnit}` : '—'}
              sub="Weight trends"
              onPress={body.openMetrics}
            />
          </View>
        </View>
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
  title: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
    marginBottom: space.xs,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
  },
  focusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.xl,
  },
  focusIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusCopy: {
    flex: 1,
  },
  focusEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  focusTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    marginBottom: 2,
  },
  focusSummary: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  sectionLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: space.sm,
    fontWeight: '600',
  },
  grid: {
    gap: space.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
