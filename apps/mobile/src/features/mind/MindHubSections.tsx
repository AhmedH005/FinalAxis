import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { MIND_COLOR, MOOD_BUCKETS, moodColor, moodEmoji, moodLabel } from '@/engines/mind';
import { appRoutes } from '@/types/navigation';

const PURPLE_SOFT = '#C084FC';

const PILLARS = [
  { icon: 'notebook-outline', label: 'Journal', sub: 'Capture what happened', accent: MIND_COLOR, route: appRoutes.mindJournal },
  { icon: 'check-circle-outline', label: 'Habits', sub: 'Reinforce consistency', accent: color.success, route: appRoutes.mindHabits },
  { icon: 'emoticon-outline', label: 'Mood', sub: 'Track emotional state', accent: color.warn, route: appRoutes.mindMood },
  { icon: 'chart-bell-curve', label: 'Patterns', sub: 'See cross-signal trends', accent: '#60A5FA', route: appRoutes.mindPatterns },
] as const;

export function PromptHero({
  prompt,
  wordCount,
  isLoading,
  isPending,
  hasEntry,
  onPress,
}: {
  prompt: string;
  wordCount: number;
  isLoading: boolean;
  isPending: boolean;
  hasEntry: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.promptCard}>
      <View style={styles.promptEyebrow}>
        <MaterialCommunityIcons name="feather" size={12} color={PURPLE_SOFT} />
        <Text style={styles.promptEyebrowText}>REFLECTION SIGNAL</Text>
      </View>

      <Text style={styles.promptText}>{prompt}</Text>

      {wordCount > 0 ? (
        <Text style={styles.wordCountHint}>{wordCount} words today</Text>
      ) : null}

      <Pressable
        style={[styles.writeButton, (isPending || isLoading) && styles.disabledButton]}
        onPress={onPress}
        disabled={isPending || isLoading}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.writeButtonText}>{hasEntry ? 'Continue writing' : 'Begin writing'}</Text>
        )}
      </Pressable>
    </View>
  );
}

export function MoodSection({
  moodScore,
  isSaving,
  onQuickMood,
  onEdit,
}: {
  moodScore: number | null;
  isSaving: boolean;
  onQuickMood: (score: number) => void;
  onEdit: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{moodScore !== null ? 'Your mood signal' : 'How are you feeling?'}</Text>
        {moodScore !== null ? (
          <Pressable onPress={onEdit}>
            <Text style={styles.sectionAction}>Edit</Text>
          </Pressable>
        ) : null}
      </View>

      {moodScore !== null ? (
        <View style={styles.moodLogged}>
          <Text style={styles.moodLoggedEmoji}>{moodEmoji(moodScore)}</Text>
          <View style={styles.moodLoggedInfo}>
            <Text style={[styles.moodLoggedLabel, { color: moodColor(moodScore) }]}>
              {moodLabel(moodScore)}
            </Text>
            <Text style={styles.moodLoggedScore}>{moodScore} / 10</Text>
          </View>
        </View>
      ) : (
        <View style={styles.moodBuckets}>
          {MOOD_BUCKETS.map((bucket) => (
            <Pressable
              key={bucket.score}
              style={styles.moodBucket}
              onPress={() => onQuickMood(bucket.score)}
              disabled={isSaving}
            >
              <Text style={styles.moodBucketEmoji}>{bucket.emoji}</Text>
              <Text style={styles.moodBucketLabel}>{bucket.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function HabitsSection({
  isLoading,
  habits,
  completedCount,
  onToggle,
  onOpen,
}: {
  isLoading: boolean;
  habits: Array<{ id: string; name: string; todayCompleted: boolean }>;
  completedCount: number;
  onToggle: (habitId: string, completed: boolean) => void;
  onOpen: () => void;
}) {
  if (!isLoading && habits.length === 0) {
    return (
      <Pressable style={styles.emptyHabitsRow} onPress={onOpen}>
        <MaterialCommunityIcons name="plus-circle-outline" size={16} color={MIND_COLOR} />
        <Text style={styles.emptyHabitsText}>Add daily habits</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.habitsHeader}>
        <View style={styles.habitsHeaderLeft}>
          <Text style={styles.sectionLabel}>Habits</Text>
          {habits.length > 0 ? (
            <View style={styles.habitsPill}>
              <Text style={styles.habitsPillText}>{completedCount} / {habits.length}</Text>
            </View>
          ) : null}
        </View>
        <Pressable onPress={onOpen}>
          <Text style={styles.sectionAction}>Open</Text>
        </Pressable>
      </View>

      {habits.length > 0 ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(completedCount / habits.length) * 100}%` },
            ]}
          />
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator size="small" color={MIND_COLOR} style={styles.habitLoader} />
      ) : (
        habits.map((habit) => (
          <Pressable
            key={habit.id}
            style={styles.habitRow}
            onPress={() => onToggle(habit.id, !habit.todayCompleted)}
            hitSlop={{ top: 4, bottom: 4 }}
          >
            <View style={[styles.habitCheck, habit.todayCompleted && styles.habitCheckDone]}>
              {habit.todayCompleted ? (
                <MaterialCommunityIcons name="check" size={11} color={color.bg} />
              ) : null}
            </View>
            <Text style={[styles.habitName, habit.todayCompleted && styles.habitNameDone]} numberOfLines={1}>
              {habit.name}
            </Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

export function PillarLinks({
  onOpen,
}: {
  onOpen: (route: (typeof PILLARS)[number]['route']) => void;
}) {
  return (
    <View style={styles.pillarGrid}>
      {PILLARS.map((pillar) => (
        <Pressable key={pillar.label} style={styles.pillarCard} onPress={() => onOpen(pillar.route)}>
          <View style={[styles.pillarIcon, { backgroundColor: pillar.accent + '1A' }]}>
            <MaterialCommunityIcons name={pillar.icon as any} size={20} color={pillar.accent} />
          </View>
          <View style={styles.pillarText}>
            <Text style={styles.pillarLabel}>{pillar.label}</Text>
            <Text style={styles.pillarSub}>{pillar.sub}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={16} color={color.outline} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
  writeButton: {
    backgroundColor: MIND_COLOR,
    borderRadius: radius.md,
    paddingVertical: space.sm + 2,
    alignItems: 'center',
  },
  writeButtonText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  section: {
    gap: space.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
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
  moodLoggedEmoji: {
    fontSize: 34,
  },
  moodLoggedInfo: {
    gap: 2,
  },
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
  habitLoader: {
    marginTop: space.sm,
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
