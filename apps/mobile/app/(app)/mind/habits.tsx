import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { color, space, radius, typography } from '@axis/theme';
import {
  MIND_COLOR,
  todayDateStr,
  isHabitScheduledToday,
  streakLabel,
  habitFrequencyLabel,
  computeStreak,
} from '@/engines/mind/utils';
import {
  useHabitsWithStatus,
  useHabitLogsRecent,
} from '@/engines/mind/queries';
import {
  useToggleHabitLog,
  useCreateHabit,
  useArchiveHabit,
} from '@/engines/mind/mutations';
import type { HabitWithStatus } from '@/engines/mind/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const FREQ_PRESETS = [
  { label: 'Every day',  days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Weekdays',   days: [1, 2, 3, 4, 5] },
  { label: 'Weekends',   days: [0, 6] },
];

// ─── Habit row with inline streak ─────────────────────────────────────────────

function HabitRow({
  habit,
  onToggle,
  onArchive,
}: {
  habit: HabitWithStatus;
  onToggle: (id: string, completed: boolean) => void;
  onArchive: (id: string) => void;
}) {
  const { data: recentLogs = [] } = useHabitLogsRecent(habit.id, 30);
  const streak = computeStreak(recentLogs);
  const isToday = isHabitScheduledToday(habit);

  return (
    <View style={styles.habitCard}>
      {/* Main row: check + info + streak + archive */}
      <View style={styles.habitCardMain}>
        <Pressable
          style={styles.habitTapArea}
          onPress={() => isToday && onToggle(habit.id, !habit.todayCompleted)}
          disabled={!isToday}
        >
          <View style={[
            styles.check,
            habit.todayCompleted && styles.checkDone,
            !isToday && styles.checkSkip,
          ]}>
            {habit.todayCompleted
              ? <MaterialCommunityIcons name="check" size={14} color={color.bg} />
              : !isToday
                ? <MaterialCommunityIcons name="minus" size={10} color={color.text.muted} />
                : null
            }
          </View>

          <View style={styles.habitInfo}>
            <Text style={[styles.habitName, habit.todayCompleted && styles.habitNameDone]}>
              {habit.name}
            </Text>
            <Text style={styles.habitMeta}>
              {habitFrequencyLabel(habit.target_days)}
              {streak > 0 ? `  ·  ${streakLabel(streak)}` : ''}
            </Text>
          </View>

          {streak > 1 && (
            <View style={styles.streakBadge}>
              <MaterialCommunityIcons name="fire" size={12} color={MIND_COLOR} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}
        </Pressable>

        <Pressable style={styles.archiveBtn} onPress={() => onArchive(habit.id)} hitSlop={8}>
          <MaterialCommunityIcons name="dots-horizontal" size={18} color={color.text.muted} />
        </Pressable>
      </View>

      {/* 7-day mini bars */}
      <View style={styles.miniBars}>
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dateStr = d.toISOString().split('T')[0];
          const log = recentLogs.find(l => l.log_date === dateStr);
          return (
            <View
              key={dateStr}
              style={[
                styles.miniBar,
                { backgroundColor: log?.completed ? MIND_COLOR : color.outline },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HabitsScreen() {
  const today = todayDateStr();
  const [showAdd, setShowAdd] = useState(false);

  // Add form
  const [habitName, setHabitName] = useState('');
  const [habitDesc, setHabitDesc] = useState('');
  const [targetDays, setTargetDays] = useState([0, 1, 2, 3, 4, 5, 6]);

  const { data: habits, isLoading } = useHabitsWithStatus();
  const toggleHabit  = useToggleHabitLog();
  const createHabit  = useCreateHabit();
  const archiveHabit = useArchiveHabit();

  const todayHabits  = habits.filter(h => isHabitScheduledToday(h));
  const otherHabits  = habits.filter(h => !isHabitScheduledToday(h));
  const doneCount    = todayHabits.filter(h => h.todayCompleted).length;

  function handleToggle(habitId: string, completed: boolean) {
    toggleHabit.mutate({ habit_id: habitId, log_date: today, completed });
  }

  function handleCreate() {
    if (!habitName.trim()) return;
    createHabit.mutate(
      { name: habitName.trim(), description: habitDesc.trim() || null, target_days: targetDays },
      {
        onSuccess: () => {
          setHabitName(''); setHabitDesc('');
          setTargetDays([0, 1, 2, 3, 4, 5, 6]);
          setShowAdd(false);
        },
      }
    );
  }

  function toggleDay(day: number) {
    setTargetDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  }

  function applyPreset(days: number[]) {
    setTargetDays(days);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={color.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Habits</Text>
        <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <MaterialCommunityIcons name="plus" size={18} color={MIND_COLOR} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={MIND_COLOR} style={{ marginTop: space.xl }} />
        ) : habits.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="check-circle-outline" size={48} color={color.outline} />
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySub}>Tap + to create your first habit</Text>
            <Pressable style={styles.emptyAddBtn} onPress={() => setShowAdd(true)}>
              <Text style={styles.emptyAddText}>Create habit</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Today's habits */}
            {todayHabits.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>TODAY</Text>
                  <Text style={styles.sectionMeta}>{doneCount}/{todayHabits.length} done</Text>
                </View>
                {todayHabits.map(habit => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    onToggle={handleToggle}
                    onArchive={id => archiveHabit.mutate(id)}
                  />
                ))}
              </>
            )}

            {/* Other habits (not scheduled today) */}
            {otherHabits.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: space.md }]}>
                  <Text style={styles.sectionLabel}>NOT TODAY</Text>
                </View>
                {otherHabits.map(habit => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    onToggle={handleToggle}
                    onArchive={id => archiveHabit.mutate(id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Add habit modal */}
      <Modal
        visible={showAdd}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAdd(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowAdd(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New habit</Text>

            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={habitName}
                onChangeText={setHabitName}
                placeholder="e.g. Morning pages, Meditate, Read"
                placeholderTextColor={color.text.muted}
                autoFocus
                maxLength={60}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>DESCRIPTION (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                value={habitDesc}
                onChangeText={setHabitDesc}
                placeholder="A short note about this habit"
                placeholderTextColor={color.text.muted}
                maxLength={120}
              />
            </View>

            {/* Frequency presets */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FREQUENCY</Text>
              <View style={styles.presetRow}>
                {FREQ_PRESETS.map(preset => {
                  const active =
                    JSON.stringify([...preset.days].sort()) ===
                    JSON.stringify([...targetDays].sort());
                  return (
                    <Pressable
                      key={preset.label}
                      style={[styles.presetChip, active && styles.presetChipActive]}
                      onPress={() => applyPreset(preset.days)}
                    >
                      <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom day picker */}
              <View style={styles.dayPicker}>
                {DAY_LABELS.map((label, i) => {
                  const active = targetDays.includes(i);
                  return (
                    <Pressable
                      key={i}
                      style={[styles.dayBtn, active && styles.dayBtnActive]}
                      onPress={() => toggleDay(i)}
                    >
                      <Text style={[styles.dayBtnText, active && styles.dayBtnTextActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              style={[styles.createBtn, !habitName.trim() && { opacity: 0.4 }]}
              onPress={handleCreate}
              disabled={!habitName.trim() || createHabit.isPending}
            >
              {createHabit.isPending
                ? <ActivityIndicator size="small" color={color.bg} />
                : <Text style={styles.createBtnText}>Create habit</Text>
              }
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1, borderColor: color.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.4,
  },
  addBtn: {
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: MIND_COLOR + '18',
    borderWidth: 1, borderColor: MIND_COLOR + '40',
    alignItems: 'center', justifyContent: 'center',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionMeta: {
    fontSize: typography.xs,
    color: MIND_COLOR,
    fontWeight: '600',
  },

  // Habit card
  habitCard: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.xs,
    overflow: 'hidden',
  },
  habitCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  habitTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  check: {
    width: 24, height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: MIND_COLOR,
    borderColor: MIND_COLOR,
  },
  checkSkip: {
    opacity: 0.4,
  },
  habitInfo: { flex: 1, gap: 2 },
  habitName: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  habitNameDone: { color: color.text.muted },
  habitMeta: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: MIND_COLOR + '18',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: MIND_COLOR + '40',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  streakText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: MIND_COLOR,
  },

  // 7-day mini bars
  miniBars: {
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
  },
  miniBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
  },

  // Archive
  archiveBtn: {
    padding: 6,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: space.sm,
  },
  emptyTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
    marginTop: space.sm,
  },
  emptySub: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  emptyAddBtn: {
    marginTop: space.sm,
    backgroundColor: MIND_COLOR,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  emptyAddText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: '#fff',
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.md,
  },
  sheetHandle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: color.outline,
    alignSelf: 'center',
    marginBottom: space.xs,
  },
  sheetTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.3,
  },

  // Form fields
  fieldGroup: { gap: space.xs },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: color.text.muted,
    letterSpacing: 1,
  },
  fieldInput: {
    backgroundColor: color.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typography.sm,
    color: color.text.primary,
  },

  // Frequency
  presetRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginBottom: space.xs,
  },
  presetChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: 5,
  },
  presetChipActive: {
    borderColor: MIND_COLOR,
    backgroundColor: MIND_COLOR + '18',
  },
  presetChipText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: color.text.muted,
  },
  presetChipTextActive: { color: MIND_COLOR },

  // Day picker
  dayPicker: {
    flexDirection: 'row',
    gap: space.xs,
  },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.bg,
  },
  dayBtnActive: {
    borderColor: MIND_COLOR,
    backgroundColor: MIND_COLOR + '20',
  },
  dayBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: color.text.muted,
  },
  dayBtnTextActive: { color: MIND_COLOR },

  // Create button
  createBtn: {
    backgroundColor: MIND_COLOR,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: 'center',
    marginTop: space.xs,
  },
  createBtnText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: '#fff',
  },
});
