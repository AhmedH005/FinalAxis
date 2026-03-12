import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format, subDays } from 'date-fns';
import { color, space, radius, typography } from '@axis/theme';
import { MIND_COLOR, moodColor, moodLabel } from '@/engines/mind/utils';
import {
  useWeeklyMood,
  useWeeklyHabitLogs,
  useHabits,
  useJournalStreak,
  useJournalEntries,
} from '@/engines/mind/queries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
  );
}

function dayLabel(dateStr: string): string {
  return format(new Date(`${dateStr}T12:00:00`), 'EEE').slice(0, 1);
}

// ─── Mood bar chart (7 days) ──────────────────────────────────────────────────

function MoodChart({ logs }: { logs: Array<{ logged_at: string; mood_score: number }> }) {
  const days = last7Days();

  // For each day, find the avg mood
  const dayData = days.map(d => {
    const dayLogs = logs.filter(l => l.logged_at.startsWith(d));
    if (!dayLogs.length) return { date: d, score: null };
    const avg = dayLogs.reduce((s, l) => s + l.mood_score, 0) / dayLogs.length;
    return { date: d, score: Math.round(avg) };
  });

  const maxScore = 10;

  return (
    <View style={chartStyles.wrap}>
      {dayData.map(({ date, score }) => (
        <View key={date} style={chartStyles.col}>
          <View style={chartStyles.barWrap}>
            {score !== null ? (
              <View
                style={[
                  chartStyles.bar,
                  {
                    height: `${(score / maxScore) * 100}%`,
                    backgroundColor: moodColor(score),
                  },
                ]}
              />
            ) : (
              <View style={[chartStyles.bar, { height: '8%', backgroundColor: color.outline }]} />
            )}
          </View>
          <Text style={chartStyles.dayLabel}>{dayLabel(date)}</Text>
          {score !== null && (
            <Text style={[chartStyles.scoreLabel, { color: moodColor(score) }]}>{score}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.xs,
    height: 100,
    paddingTop: space.xs,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  barWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: color.text.muted,
    letterSpacing: 0.2,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
});

// ─── Habit bar ────────────────────────────────────────────────────────────────

function HabitBar({
  name,
  completedDays,
  totalDays,
}: {
  name: string;
  completedDays: number;
  totalDays: number;
}) {
  const pct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  return (
    <View style={habitBarStyles.row}>
      <Text style={habitBarStyles.name} numberOfLines={1}>{name}</Text>
      <View style={habitBarStyles.track}>
        <View
          style={[
            habitBarStyles.fill,
            { width: `${pct}%`, backgroundColor: pct >= 70 ? MIND_COLOR : pct >= 40 ? color.warn : color.danger },
          ]}
        />
      </View>
      <Text style={habitBarStyles.pct}>{pct}%</Text>
    </View>
  );
}

const habitBarStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  name: {
    width: 100,
    fontSize: typography.xs,
    fontWeight: '500',
    color: color.text.primary,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.outline,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
  pct: {
    width: 32,
    fontSize: typography.xs,
    fontWeight: '600',
    color: color.text.muted,
    textAlign: 'right',
  },
});

// ─── Insight card ─────────────────────────────────────────────────────────────

function InsightCard({ icon, label, value, color: c }: {
  icon: string; label: string; value: string; color: string;
}) {
  return (
    <View style={insightStyles.card}>
      <View style={[insightStyles.iconWrap, { backgroundColor: c + '18' }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={c} />
      </View>
      <Text style={insightStyles.value}>{value}</Text>
      <Text style={insightStyles.label}>{label}</Text>
    </View>
  );
}

const insightStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: 4,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 32, height: 32,
    borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: color.text.primary,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PatternsScreen() {
  const { data: weekMood  = [] } = useWeeklyMood();
  const { data: weekLogs  = [] } = useWeeklyHabitLogs();
  const { data: habits    = [] } = useHabits();
  const { data: streak    = 0 } = useJournalStreak();
  const { data: entries   = [] } = useJournalEntries(30);

  const days = last7Days();

  // Compute avg mood this week
  const weekAvg = weekMood.length
    ? Math.round(weekMood.reduce((s, l) => s + l.mood_score, 0) / weekMood.length * 10) / 10
    : null;

  // Total words written in last 30 days
  const totalWords = entries.reduce((s, e) => s + (e.word_count ?? 0), 0);

  // Habit completion per habit (last 7 days)
  const habitCompletions = habits.map(habit => {
    const scheduledDays = days.filter(d => {
      const dow = new Date(`${d}T12:00:00`).getDay();
      return habit.target_days.includes(dow);
    });
    const completedDays = scheduledDays.filter(d =>
      weekLogs.some(l => l.habit_id === habit.id && l.log_date === d && l.completed)
    );
    return { habit, completed: completedDays.length, total: scheduledDays.length };
  }).filter(h => h.total > 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={color.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Patterns</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Insights row */}
        <View style={styles.insightRow}>
          <InsightCard
            icon="notebook-outline"
            label="Journal streak"
            value={streak === 0 ? '—' : `${streak}d`}
            color={MIND_COLOR}
          />
          <InsightCard
            icon="pencil-outline"
            label="Words written"
            value={totalWords > 999 ? `${(totalWords / 1000).toFixed(1)}k` : `${totalWords}`}
            color={color.success}
          />
          <InsightCard
            icon="emoticon-outline"
            label="Avg mood (7d)"
            value={weekAvg !== null ? `${weekAvg}` : '—'}
            color={weekAvg !== null ? moodColor(weekAvg) : color.text.muted}
          />
        </View>

        {/* Mood chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mood · Last 7 days</Text>
          {weekMood.length === 0 ? (
            <Text style={styles.emptyText}>No mood data yet. Log a mood to see trends.</Text>
          ) : (
            <>
              <MoodChart logs={weekMood as any} />
              {weekAvg !== null && (
                <Text style={styles.cardMeta}>
                  Average: <Text style={{ color: moodColor(weekAvg), fontWeight: '700' }}>
                    {weekAvg}/10 · {moodLabel(weekAvg)}
                  </Text>
                </Text>
              )}
            </>
          )}
        </View>

        {/* Habit consistency */}
        {habitCompletions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Habit consistency · Last 7 days</Text>
            <View style={styles.habitBars}>
              {habitCompletions.map(({ habit, completed, total }) => (
                <HabitBar
                  key={habit.id}
                  name={habit.name}
                  completedDays={completed}
                  totalDays={total}
                />
              ))}
            </View>
          </View>
        )}

        {/* Journal activity */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Journal activity · Last 7 days</Text>
          <View style={styles.journalDots}>
            {days.map(d => {
              const wrote = entries.some(e => e.entry_date === d);
              return (
                <View key={d} style={styles.journalDotCol}>
                  <View style={[
                    styles.journalDot,
                    { backgroundColor: wrote ? MIND_COLOR : color.outline },
                  ]} />
                  <Text style={styles.journalDotLabel}>{dayLabel(d)}</Text>
                </View>
              );
            })}
          </View>
          {streak > 0 && (
            <Text style={styles.cardMeta}>
              Current streak: <Text style={{ color: MIND_COLOR, fontWeight: '700' }}>{streak} {streak === 1 ? 'day' : 'days'}</Text>
            </Text>
          )}
        </View>

        {/* Reflection prompt */}
        <View style={styles.reflectCard}>
          <MaterialCommunityIcons name="lightbulb-outline" size={18} color={color.warn} />
          <Text style={styles.reflectText}>
            {weekMood.length >= 3 && weekAvg !== null
              ? `Your average mood this week is ${weekAvg}/10. ${weekAvg >= 7 ? 'You seem to be in a good place — keep it up.' : 'Consider what might be weighing on you this week.'}`
              : 'Log your mood and journal daily to unlock personal pattern insights.'
            }
          </Text>
        </View>
      </ScrollView>
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
    gap: space.lg,
  },

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

  insightRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.xs,
  },

  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.md,
  },
  cardTitle: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  cardMeta: {
    fontSize: typography.xs,
    color: color.text.muted,
    marginTop: -space.xs,
  },
  emptyText: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  habitBars: {
    gap: space.sm,
  },

  // Journal dots
  journalDots: {
    flexDirection: 'row',
    gap: space.xs,
  },
  journalDotCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  journalDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  journalDotLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: color.text.muted,
  },

  // Reflect card
  reflectCard: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
    backgroundColor: color.warn + '10',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.warn + '30',
    padding: space.md,
  },
  reflectText: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.primary,
    lineHeight: 20,
  },
});
