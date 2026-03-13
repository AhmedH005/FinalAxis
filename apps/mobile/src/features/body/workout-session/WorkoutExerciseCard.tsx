import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { PATTERN_COLORS } from '@/engines/body';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { isBodyweightExercise, type SessionExercise, type SessionSet } from './model';

function SetRow({
  setNumber,
  set,
  isBodyweight,
  onChange,
}: {
  setNumber: number;
  set: SessionSet;
  isBodyweight: boolean;
  onChange: (updates: Partial<SessionSet>) => void;
}) {
  return (
    <View style={styles.setRow}>
      <View style={[styles.setNumber, set.done && styles.setNumberDone]}>
        <Text style={[styles.setNumberText, set.done && styles.setNumberTextDone]}>
          {setNumber}
        </Text>
      </View>
      <TextInput
        style={[styles.setInput, styles.repsInput, set.done && styles.setInputDone]}
        value={set.reps}
        onChangeText={(value) => onChange({ reps: value })}
        placeholder="—"
        placeholderTextColor={color.text.muted}
        keyboardType="number-pad"
        selectTextOnFocus
      />
      <Text style={styles.setOperator}>reps</Text>
      {!isBodyweight ? (
        <>
          <Text style={styles.setOperator}>×</Text>
          <TextInput
            style={[styles.setInput, styles.weightInput, set.done && styles.setInputDone]}
            value={set.weight}
            onChangeText={(value) => onChange({ weight: value })}
            placeholder="kg"
            placeholderTextColor={color.text.muted}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </>
      ) : null}
      <Pressable
        style={styles.doneButton}
        onPress={() => onChange({ done: !set.done })}
      >
        <MaterialCommunityIcons
          name={set.done ? 'check-circle' : 'circle-outline'}
          size={22}
          color={set.done ? '#43D9A3' : color.text.muted}
        />
      </Pressable>
    </View>
  );
}

export function WorkoutExerciseCard({
  entry,
  index,
  estimatedCalories,
  onUpdateSet,
  onAddSet,
  onRemove,
}: {
  entry: SessionExercise;
  index: number;
  estimatedCalories: number;
  onUpdateSet: (exerciseIndex: number, setIndex: number, updates: Partial<SessionSet>) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemove: (exerciseIndex: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const patternColor = PATTERN_COLORS[entry.exercise.movement_pattern];
  const bodyweight = isBodyweightExercise(entry.exercise);
  const completedCount = entry.sets.filter((set) => set.done).length;

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setExpanded((value) => !value)}>
        <ExerciseThumbnail exercise={entry.exercise} size={52} />
        <View style={styles.headerCopy}>
          <Text style={styles.name}>{entry.exercise.name}</Text>
          <Text style={styles.muscles}>
            {entry.exercise.primary_muscles.join(' · ')}
            {entry.exercise.secondary_muscles?.length
              ? ` + ${entry.exercise.secondary_muscles[0]}`
              : ''}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: patternColor + '22' }]}>
              <Text style={[styles.badgeText, { color: patternColor }]}>
                {entry.exercise.movement_pattern}
              </Text>
            </View>
            {bodyweight ? (
              <View style={[styles.badge, styles.neutralBadge]}>
                <Text style={styles.badgeText}>bodyweight</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.headerMeta}>
          <Pressable hitSlop={12} onPress={() => onRemove(index)}>
            <MaterialCommunityIcons name="close" size={18} color={color.text.muted} />
          </Pressable>
          {estimatedCalories > 0 ? (
            <Text style={styles.calories}>{estimatedCalories} kcal</Text>
          ) : null}
          <Text
            style={[
              styles.progress,
              completedCount === entry.sets.length && completedCount > 0
                ? styles.progressComplete
                : null,
            ]}
          >
            {completedCount}/{entry.sets.length} sets
          </Text>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={color.text.muted}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.setsContainer}>
          <View style={styles.setsHeader}>
            <Text style={styles.setsHeaderText}>Set</Text>
            <Text style={[styles.setsHeaderText, styles.setsHeaderMain]}>
              Reps{!bodyweight ? ' × Weight' : ''}
            </Text>
            <Text style={styles.setsHeaderText}>Done</Text>
          </View>
          {entry.sets.map((set, setIndex) => (
            <SetRow
              key={setIndex}
              setNumber={setIndex + 1}
              set={set}
              isBodyweight={bodyweight}
              onChange={(updates) => onUpdateSet(index, setIndex, updates)}
            />
          ))}
          <Pressable style={styles.addSetButton} onPress={() => onAddSet(index)}>
            <MaterialCommunityIcons name="plus" size={16} color={color.text.muted} />
            <Text style={styles.addSetText}>Add set</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: space.lg,
    gap: space.md,
  },
  headerCopy: {
    flex: 1,
  },
  headerMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  name: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  muscles: {
    fontSize: typography.sm,
    color: color.text.muted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  neutralBadge: {
    backgroundColor: '#ffffff11',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'capitalize',
  },
  calories: {
    fontSize: typography.xs,
    color: color.success,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progress: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
  },
  progressComplete: {
    color: '#43D9A3',
  },
  setsContainer: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: '#ffffff08',
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: space.md,
    paddingBottom: space.xs,
    gap: space.sm,
  },
  setsHeaderText: {
    fontSize: 11,
    color: color.text.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setsHeaderMain: {
    flex: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: '#ffffff11',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberDone: {
    backgroundColor: '#43D9A322',
  },
  setNumberText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.muted,
  },
  setNumberTextDone: {
    color: '#43D9A3',
  },
  setInput: {
    backgroundColor: '#ffffff0D',
    borderRadius: radius.sm,
    padding: space.sm,
    color: color.text.primary,
    fontSize: typography.base,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  setInputDone: {
    borderColor: '#43D9A333',
    backgroundColor: '#43D9A311',
  },
  repsInput: {
    width: 52,
  },
  weightInput: {
    width: 68,
  },
  setOperator: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  doneButton: {
    marginLeft: 'auto',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    justifyContent: 'center',
  },
  addSetText: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
});
