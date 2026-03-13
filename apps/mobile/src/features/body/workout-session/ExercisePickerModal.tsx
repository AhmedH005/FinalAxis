import { useState } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import {
  getExerciseCatalog,
  PATTERN_COLORS,
  type MovementPattern,
} from '@/engines/body';
import type { ExerciseDefinition } from '@/engines/body';
import { ExerciseThumbnail } from './ExerciseThumbnail';

export function ExercisePickerModal({
  visible,
  existingIds,
  onAdd,
  onClose,
}: {
  visible: boolean;
  existingIds: string[];
  onAdd: (exercise: ExerciseDefinition) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<'all' | MovementPattern>('all');

  const patterns: Array<'all' | MovementPattern> = [
    'all',
    'push',
    'pull',
    'squat',
    'hinge',
    'core',
    'conditioning',
  ];

  const filteredExercises = getExerciseCatalog().filter((exercise) => {
    if (filter === 'all') return true;
    return exercise.movement_pattern === filter;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Exercise</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={22} color={color.text.muted} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {patterns.map((pattern) => {
            const isActive = filter === pattern;
            const patternColor = pattern === 'all'
              ? color.text.muted
              : PATTERN_COLORS[pattern];

            return (
              <Pressable
                key={pattern}
                style={[
                  styles.filterChip,
                  isActive && {
                    backgroundColor: patternColor + '22',
                    borderColor: patternColor,
                  },
                ]}
                onPress={() => setFilter(pattern)}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    { color: isActive ? patternColor : color.text.muted },
                  ]}
                >
                  {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <FlatList
          data={filteredExercises}
          keyExtractor={(exercise) => exercise.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const alreadyAdded = existingIds.includes(item.id);
            const patternColor = PATTERN_COLORS[item.movement_pattern];

            return (
              <Pressable
                style={[styles.exerciseRow, alreadyAdded && styles.exerciseRowDisabled]}
                onPress={() => {
                  if (alreadyAdded) return;
                  onAdd(item);
                  onClose();
                }}
                disabled={alreadyAdded}
              >
                <ExerciseThumbnail exercise={item} size={52} />
                <View style={styles.exerciseCopy}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <Text style={styles.exerciseMuscles}>
                    {item.primary_muscles.join(', ')}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: patternColor + '22' }]}>
                      <Text style={[styles.badgeText, { color: patternColor }]}>
                        {item.movement_pattern}
                      </Text>
                    </View>
                    <View style={[styles.badge, styles.neutralBadge]}>
                      <Text style={styles.badgeText}>{item.difficulty}</Text>
                    </View>
                    {item.equipment?.[0] ? (
                      <View style={[styles.badge, styles.neutralBadge]}>
                        <Text style={styles.badgeText}>{item.equipment[0]}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                {alreadyAdded ? (
                  <MaterialCommunityIcons name="check" size={20} color={color.text.muted} />
                ) : (
                  <MaterialCommunityIcons
                    name="plus-circle-outline"
                    size={22}
                    color={patternColor}
                  />
                )}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    paddingTop: space.xl,
    borderBottomWidth: 1,
    borderBottomColor: color.surface,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
  },
  filterRow: {
    padding: space.lg,
    gap: space.sm,
  },
  filterChip: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  filterLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  list: {
    padding: space.lg,
    gap: space.sm,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.md,
  },
  exerciseRowDisabled: {
    opacity: 0.5,
  },
  exerciseCopy: {
    flex: 1,
  },
  exerciseName: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  exerciseMuscles: {
    fontSize: typography.sm,
    color: color.text.muted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
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
});
