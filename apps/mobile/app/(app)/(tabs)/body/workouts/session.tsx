import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { ExercisePickerModal } from '@/features/body/workout-session/ExercisePickerModal';
import { INTENSITIES } from '@/features/body/workout-session/model';
import { useWorkoutSessionScreen } from '@/features/body/workout-session/useWorkoutSessionScreen';
import { WorkoutExerciseCard } from '@/features/body/workout-session/WorkoutExerciseCard';

export default function SessionScreen() {
  const session = useWorkoutSessionScreen();

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={session.goBack} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={22} color={color.text.primary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{session.dayLabel}</Text>
            <Text style={styles.timer}>{session.timerDisplay}</Text>
          </View>
          <Pressable
            style={styles.completeButton}
            onPress={session.handleComplete}
            disabled={session.isSaving}
          >
            <Text style={styles.completeButtonText}>
              {session.isSaving ? '...' : 'Done'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.intensityRow}>
          <Text style={styles.intensityLabel}>Intensity</Text>
          {INTENSITIES.map((intensityOption) => (
            <Pressable
              key={intensityOption.value}
              style={[
                styles.intensityChip,
                session.intensity === intensityOption.value && {
                  backgroundColor: intensityOption.color + '22',
                  borderColor: intensityOption.color,
                },
              ]}
              onPress={() => session.setIntensity(intensityOption.value)}
            >
              <Text
                style={[
                  styles.intensityChipText,
                  {
                    color: session.intensity === intensityOption.value
                      ? intensityOption.color
                      : color.text.muted,
                  },
                ]}
              >
                {intensityOption.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryLabel}>Completed sets</Text>
              <Text style={styles.summaryValue}>{session.completedSetCount}</Text>
            </View>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryLabel}>Modeled burn</Text>
              <Text style={styles.summaryValue}>
                {session.latestWeight?.value
                  ? `${session.workoutBreakdown.total_estimated_calories} kcal`
                  : 'Add weight'}
              </Text>
            </View>
          </View>

          {session.exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="dumbbell" size={40} color={color.text.muted} />
              <Text style={styles.emptyText}>No exercises yet</Text>
              <Text style={styles.emptySub}>Tap the button below to add exercises</Text>
            </View>
          ) : null}

          {session.exercises.map((entry, index) => (
            <WorkoutExerciseCard
              key={`${entry.exercise.id}-${index}`}
              entry={entry}
              index={index}
              estimatedCalories={session.exerciseCaloriesByIndex[index] ?? 0}
              onUpdateSet={session.handleUpdateSet}
              onAddSet={session.handleAddSet}
              onRemove={session.handleRemoveExercise}
            />
          ))}

          <Pressable
            style={styles.addExerciseButton}
            onPress={() => session.setPickerVisible(true)}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={color.success} />
            <Text style={styles.addExerciseText}>Add Exercise</Text>
          </Pressable>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <Text style={styles.bottomSummary}>
            {session.exercises.length} exercises · {session.completedSetCount} sets · {session.timerDisplay}
            {session.latestWeight?.value
              ? ` · ${session.workoutBreakdown.total_estimated_calories} kcal`
              : ''}
          </Text>
          <Pressable
            style={styles.bottomCompleteButton}
            onPress={session.handleComplete}
            disabled={session.isSaving}
          >
            <Text style={styles.bottomCompleteText}>
              {session.isSaving ? 'Saving...' : 'Complete Workout'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ExercisePickerModal
        visible={session.pickerVisible}
        existingIds={session.existingIds}
        onAdd={session.handleAddExercise}
        onClose={() => session.setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.surface,
    gap: space.md,
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  timer: {
    fontSize: typography.sm,
    color: color.text.muted,
    fontVariant: ['tabular-nums'],
  },
  completeButton: {
    backgroundColor: color.success + '22',
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  completeButtonText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.success,
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    gap: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.surface,
  },
  intensityLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
    marginRight: space.xs,
  },
  intensityChip: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  intensityChipText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  scroll: {
    padding: space.lg,
    gap: space.md,
  },
  summaryCard: {
    flexDirection: 'row',
    gap: space.md,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: 4,
  },
  summaryLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: space.xl,
    gap: space.md,
  },
  emptyText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
  },
  emptySub: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: color.success + '44',
    borderStyle: 'dashed',
    padding: space.lg,
  },
  addExerciseText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.success,
  },
  bottomSpacer: {
    height: 80,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: color.surface,
    gap: space.md,
  },
  bottomSummary: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.muted,
  },
  bottomCompleteButton: {
    backgroundColor: color.success,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  bottomCompleteText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: '#0B0E12',
  },
});
