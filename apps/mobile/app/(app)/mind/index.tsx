import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { color, space, radius, typography } from '@axis/theme';
import { useAuth } from '@/providers/AuthProvider';
import {
  MIND_COLOR,
  MOOD_BUCKETS,
  getDailyPrompt,
  getGreeting,
  formatFullDate,
  todayDateStr,
  isHabitScheduledToday,
  moodLabel,
  moodEmoji,
  moodColor,
} from '@/engines/mind/utils';
import {
  useTodayJournalEntry,
  useTodayMood,
  useHabitsWithStatus,
} from '@/engines/mind/queries';
import {
  useAddMoodLog,
  useToggleHabitLog,
  useCreateJournalEntry,
} from '@/engines/mind/mutations';

const PROMPT = getDailyPrompt();

const PURPLE_SOFT = '#C084FC';

// ─── Pillar cards (2×2 grid) ──────────────────────────────────────────────────

const PILLARS = [
  { icon: 'notebook-outline',    label: 'Journal',  sub: 'Capture what happened', accent: MIND_COLOR,    route: '/(app)/mind/journal'  },
  { icon: 'check-circle-outline',label: 'Habits',   sub: 'Reinforce consistency', accent: color.success, route: '/(app)/mind/habits'   },
  { icon: 'emoticon-outline',    label: 'Mood',     sub: 'Track emotional state', accent: color.warn,    route: '/(app)/mind/mood'     },
  { icon: 'chart-bell-curve',    label: 'Patterns', sub: 'See cross-signal trends', accent: '#60A5FA',   route: '/(app)/mind/patterns' },
];

function PillarCard({ icon, label, sub, accent, route }: typeof PILLARS[0]) {
  return (
    <Pressable style={styles.pillarCard} onPress={() => router.push(route as any)}>
      <View style={[styles.pillarIcon, { backgroundColor: accent + '1A' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={accent} />
      </View>
      <View style={styles.pillarText}>
        <Text style={styles.pillarLabel}>{label}</Text>
        <Text style={styles.pillarSub}>{sub}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={16} color={color.outline} />
    </Pressable>
  );
}

// ─── Habit row ────────────────────────────────────────────────────────────────

function HabitRow({
  habit,
  onToggle,
}: {
  habit: { id: string; name: string; todayCompleted: boolean };
  onToggle: (id: string, completed: boolean) => void;
}) {
  return (
    <Pressable
      style={styles.habitRow}
      onPress={() => onToggle(habit.id, !habit.todayCompleted)}
      hitSlop={{ top: 4, bottom: 4 }}
    >
      <View style={[styles.habitCheck, habit.todayCompleted && styles.habitCheckDone]}>
        {habit.todayCompleted && (
          <MaterialCommunityIcons name="check" size={11} color={color.bg} />
        )}
      </View>
      <Text style={[styles.habitName, habit.todayCompleted && styles.habitNameDone]} numberOfLines={1}>
        {habit.name}
      </Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MindHubScreen() {
  const { profile } = useAuth();
  const today = todayDateStr();

  const { data: todayEntry, isLoading: entryLoading } = useTodayJournalEntry();
  const { data: todayMood }                           = useTodayMood();
  const { data: habits, isLoading: habitsLoading }    = useHabitsWithStatus();

  const addMood     = useAddMoodLog();
  const toggleHabit = useToggleHabitLog();
  const createEntry = useCreateJournalEntry();

  const todayHabits    = habits.filter(h => isHabitScheduledToday(h));
  const completedCount = todayHabits.filter(h => h.todayCompleted).length;

  function handleBeginWriting() {
    if (entryLoading) return;
    if (todayEntry) {
      router.push(`/(app)/mind/journal/${todayEntry.id}` as any);
    } else {
      createEntry.mutate(
        { entry_type: 'journal', entry_date: today },
        { onSuccess: (entry) => router.push(`/(app)/mind/journal/${entry.id}` as any) }
      );
    }
  }

  function handleQuickMood(score: number) {
    if (todayMood) return;
    addMood.mutate({ mood_score: score });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ── */}
        <View style={styles.greeting}>
          <Text style={styles.greetingLine}>{getGreeting(profile?.full_name)}</Text>
          <Text style={styles.dateLine}>{formatFullDate()}</Text>
          <Text style={styles.subtitleLine}>
            Mood, habits, and reflection explain the forces behind your day.
          </Text>
        </View>

        {/* ── Prompt Hero ── */}
        <View style={styles.promptCard}>
          <View style={styles.promptEyebrow}>
            <MaterialCommunityIcons name="feather" size={12} color={PURPLE_SOFT} />
            <Text style={styles.promptEyebrowText}>REFLECTION SIGNAL</Text>
          </View>

          <Text style={styles.promptText}>{PROMPT}</Text>

          {todayEntry && todayEntry.word_count > 0 && (
            <Text style={styles.wordCountHint}>{todayEntry.word_count} words today</Text>
          )}

          <Pressable
            style={[styles.writeBtn, (createEntry.isPending || entryLoading) && { opacity: 0.5 }]}
            onPress={handleBeginWriting}
            disabled={createEntry.isPending || entryLoading}
          >
            {createEntry.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.writeBtnText}>
                {todayEntry ? 'Continue writing' : 'Begin writing'}
              </Text>
            )}
          </Pressable>
        </View>

        {/* ── Mood ── */}
        <View style={styles.moodSection}>
          <View style={styles.moodHeader}>
            <Text style={styles.sectionLabel}>
              {todayMood ? 'Your mood signal' : 'How are you feeling?'}
            </Text>
            {todayMood && (
              <Pressable onPress={() => router.push('/(app)/mind/mood' as any)}>
                <Text style={styles.sectionAction}>Edit</Text>
              </Pressable>
            )}
          </View>

          {todayMood ? (
            <View style={styles.moodLogged}>
              <Text style={styles.moodLoggedEmoji}>{moodEmoji(todayMood.mood_score)}</Text>
              <View style={styles.moodLoggedInfo}>
                <Text style={[styles.moodLoggedLabel, { color: moodColor(todayMood.mood_score) }]}>
                  {moodLabel(todayMood.mood_score)}
                </Text>
                <Text style={styles.moodLoggedScore}>{todayMood.mood_score} / 10</Text>
              </View>
            </View>
          ) : (
            <View style={styles.moodBuckets}>
              {MOOD_BUCKETS.map((bucket) => (
                <Pressable
                  key={bucket.score}
                  style={styles.moodBucket}
                  onPress={() => handleQuickMood(bucket.score)}
                  disabled={addMood.isPending}
                >
                  <Text style={styles.moodBucketEmoji}>{bucket.emoji}</Text>
                  <Text style={styles.moodBucketLabel}>{bucket.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Habits ── */}
        {(habitsLoading || todayHabits.length > 0) && (
          <View style={styles.habitsSection}>
            <View style={styles.habitsHeader}>
              <View style={styles.habitsHeaderLeft}>
                <Text style={styles.sectionLabel}>Habits</Text>
                {todayHabits.length > 0 && (
                  <View style={styles.habitsPill}>
                    <Text style={styles.habitsPillText}>{completedCount} / {todayHabits.length}</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => router.push('/(app)/mind/habits' as any)}>
                <Text style={styles.sectionAction}>Open</Text>
              </Pressable>
            </View>

            {/* Progress bar */}
            {todayHabits.length > 0 && (
              <View style={styles.progressTrack}>
                <View style={[
                  styles.progressFill,
                  { width: `${(completedCount / todayHabits.length) * 100}%` },
                ]} />
              </View>
            )}

            {habitsLoading ? (
              <ActivityIndicator size="small" color={MIND_COLOR} style={{ marginTop: space.sm }} />
            ) : (
              todayHabits.map(habit => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  onToggle={(id, completed) =>
                    toggleHabit.mutate({ habit_id: id, log_date: today, completed })
                  }
                />
              ))
            )}
          </View>
        )}

        {/* ── Empty habits CTA ── */}
        {!habitsLoading && todayHabits.length === 0 && (
          <Pressable style={styles.emptyHabitsRow} onPress={() => router.push('/(app)/mind/habits' as any)}>
            <MaterialCommunityIcons name="plus-circle-outline" size={16} color={MIND_COLOR} />
            <Text style={styles.emptyHabitsText}>Add daily habits</Text>
          </Pressable>
        )}

        {/* ── Pillar grid ── */}
        <View style={styles.pillarGrid}>
          {PILLARS.map(p => <PillarCard key={p.label} {...p} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: 40,
    gap: space.lg,
  },

  // Greeting
  greeting: {
    gap: 3,
  },
  greetingLine: {
    fontSize: typography.sm,
    color: color.text.muted,
    letterSpacing: 0.1,
  },
  dateLine: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.5,
  },
  subtitleLine: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
    maxWidth: 320,
    marginTop: 2,
  },

  // Prompt hero
  promptCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: MIND_COLOR + '30',
    padding: space.xl,
    gap: space.lg,
  },
  promptEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promptEyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: PURPLE_SOFT,
    letterSpacing: 1.6,
  },
  promptText: {
    fontSize: typography['2xl'],
    fontWeight: '500',
    color: color.text.primary,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  wordCountHint: {
    fontSize: typography.xs,
    color: color.text.muted,
    marginTop: -space.sm,
  },
  writeBtn: {
    backgroundColor: MIND_COLOR,
    borderRadius: radius.md,
    paddingVertical: space.sm + 2,
    alignItems: 'center',
  },
  writeBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },

  // Labels / actions
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionAction: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: MIND_COLOR,
  },

  // Mood
  moodSection: {
    gap: space.sm,
  },
  moodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  moodLogged: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
  },
  moodLoggedEmoji: { fontSize: 34 },
  moodLoggedInfo: { gap: 2 },
  moodLoggedLabel: {
    fontSize: typography.base,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  moodLoggedScore: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
  moodBuckets: {
    flexDirection: 'row',
    gap: space.xs,
  },
  moodBucket: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingVertical: 14,
    gap: 5,
  },
  moodBucketEmoji: {
    fontSize: 28,
  },
  moodBucketLabel: {
    fontSize: 9,
    color: color.text.muted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Habits
  habitsSection: {
    gap: space.sm,
  },
  habitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  habitsPill: {
    backgroundColor: MIND_COLOR + '18',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: MIND_COLOR + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  habitsPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: MIND_COLOR,
  },
  progressTrack: {
    height: 3,
    backgroundColor: color.outline,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: MIND_COLOR,
    borderRadius: 2,
    minWidth: 4,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 7,
  },
  habitCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitCheckDone: {
    backgroundColor: MIND_COLOR,
    borderColor: MIND_COLOR,
  },
  habitName: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.primary,
    fontWeight: '500',
  },
  habitNameDone: {
    color: color.text.muted,
  },

  // Empty habits
  emptyHabitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: -space.sm,
  },
  emptyHabitsText: {
    fontSize: typography.sm,
    color: MIND_COLOR,
    fontWeight: '500',
  },

  // Pillar grid
  pillarGrid: {
    gap: space.xs,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  pillarIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarText: {
    flex: 1,
    gap: 2,
  },
  pillarLabel: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  pillarSub: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
});
