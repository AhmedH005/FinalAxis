import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import {
  useWorkoutLog,
  useWorkoutMeasuredEnergy,
  useLatestWeight,
  formatDuration,
  buildWorkoutExpenditureBreakdown,
  getWorkoutDisplayName,
} from '@/engines/body';
import type { WorkoutExercise } from '@/lib/supabase/database.types';

function formatExerciseMeta(sets: number, reps: number | null, weightKg: number | null) {
  const parts = [`${sets} sets`];
  if (reps) parts.push(`${reps} reps`);
  if (weightKg) parts.push(`${weightKg} kg`);
  return parts.join(' · ');
}

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ workoutId?: string }>();
  const workoutId = typeof params.workoutId === 'string' ? params.workoutId : null;
  const { data: workout, isLoading } = useWorkoutLog(workoutId);
  const { data: latestWeight } = useLatestWeight();
  const { data: measuredEnergy } = useWorkoutMeasuredEnergy(workout ?? null);

  const breakdown = useMemo(() => buildWorkoutExpenditureBreakdown({
    workoutType: workout?.workout_type ?? 'Workout',
    durationMinutes: workout?.duration_minutes ?? null,
    intensity: workout?.intensity ?? null,
    bodyWeightKg: latestWeight?.value ?? null,
    exercises: workout?.exercises ?? [],
  }), [latestWeight?.value, workout]);

  const modeledCalories = latestWeight?.value
    ? (breakdown.total_estimated_calories || breakdown.generic_estimated_calories)
    : null;
  const totalCalories = measuredEnergy?.calories ?? modeledCalories;
  const burnLabel = measuredEnergy
    ? (measuredEnergy.source === 'healthkit_workout' ? 'Measured burn' : 'Health burn')
    : 'Modeled burn';
  const durationValue = workout?.duration_minutes
    ? formatDuration(workout.duration_minutes)
    : breakdown.total_estimated_minutes > 0
      ? formatDuration(breakdown.total_estimated_minutes)
      : '—';
  const totalSets = (workout?.exercises ?? []).reduce(
    (sum: number, exercise: WorkoutExercise) => sum + (exercise.sets ?? 0),
    0,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={color.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Workout Summary</Text>
          <View style={{ width: 22 }} />
        </View>

        {isLoading ? (
          <ActivityIndicator color={color.success} style={{ marginTop: space.xl }} />
        ) : !workout ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Workout not found</Text>
            <Text style={styles.emptyText}>This workout may have been deleted or never finished saving.</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Saved session</Text>
              <Text style={styles.heroTitle}>{getWorkoutDisplayName(workout)}</Text>
              <Text style={styles.heroDate}>
                {format(new Date(workout.started_at), 'EEEE, MMM d, yyyy · h:mm a')}
              </Text>

              <View style={styles.heroMetaRow}>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillLabel}>Duration</Text>
                  <Text style={styles.heroPillValue}>{durationValue}</Text>
                </View>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillLabel}>Intensity</Text>
                  <Text style={styles.heroPillValue}>{workout.intensity ?? '—'}</Text>
                </View>
                <View style={styles.heroPill}>
                  <Text style={styles.heroPillLabel}>{burnLabel}</Text>
                  <Text style={styles.heroPillValue}>{totalCalories !== null ? `${totalCalories} kcal` : 'Add weight'}</Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{(workout.exercises ?? []).length}</Text>
                  <Text style={styles.summaryLabel}>Exercises</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{totalSets}</Text>
                  <Text style={styles.summaryLabel}>Completed sets</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{workout.workout_type}</Text>
                  <Text style={styles.summaryLabel}>Type</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
              {breakdown.exercises.length > 0 ? (
                breakdown.exercises.map((exercise, index) => (
                  <View key={`${exercise.exercise_id ?? exercise.name}-${index}`} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.exerciseCalories}>{exercise.estimated_calories} kcal</Text>
                    </View>
                    <Text style={styles.exerciseMeta}>
                      {formatExerciseMeta(exercise.sets, exercise.reps, exercise.weight_kg)}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      Estimated active work: {exercise.duration_minutes.toFixed(1)} min
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No exercise breakdown</Text>
                  <Text style={styles.emptyText}>
                    This session does not have exercise details yet, so only the overall duration can be used for estimates.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>Estimate note</Text>
              <Text style={styles.noteText}>
                {measuredEnergy
                  ? 'This session is using Apple Health workout energy when available, with AXIS estimates only as fallback.'
                  : 'Calorie estimates use exercise type, set volume, reps, weight, rest timing, and standard activity-MET references. They are directional, not exact.'}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: { padding: space.lg, gap: space.lg, paddingBottom: space.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: typography.xl, fontWeight: '700', color: color.text.primary },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.md,
  },
  heroEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  heroTitle: { fontSize: typography['2xl'], fontWeight: '800', color: color.text.primary },
  heroDate: { fontSize: typography.sm, color: color.text.muted },
  heroMetaRow: { flexDirection: 'row', gap: space.sm },
  heroPill: {
    flex: 1,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    padding: space.sm,
    gap: 4,
    minHeight: 72,
    justifyContent: 'center',
  },
  heroPillLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  heroPillValue: { fontSize: typography.sm, color: color.text.primary, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: space.sm },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    padding: space.sm,
    gap: 4,
    minHeight: 72,
  },
  summaryValue: { fontSize: typography.base, color: color.text.primary, fontWeight: '700', textAlign: 'center' },
  summaryLabel: { fontSize: typography.xs, color: color.text.muted, textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: '700', textAlign: 'center' },
  section: { gap: space.sm },
  sectionTitle: { fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  exerciseCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: 6,
  },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  exerciseName: { flex: 1, fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  exerciseCalories: { fontSize: typography.sm, fontWeight: '700', color: color.success },
  exerciseMeta: { fontSize: typography.sm, color: color.text.muted },
  noteCard: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.xs,
  },
  noteTitle: { fontSize: typography.sm, fontWeight: '700', color: color.text.primary },
  noteText: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.xs,
  },
  emptyTitle: { fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  emptyText: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
});
