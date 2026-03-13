import { format } from 'date-fns';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import {
  MIND_COLOR,
  moodColor,
  moodLabel,
  type MindHabitPattern,
  type MindJournalSummary,
  type MindMoodSummary,
} from '@/engines/mind';

export interface MindInsightItem {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function MoodChart({ mood }: { mood: MindMoodSummary }) {
  return (
    <View style={styles.chartWrap}>
      {mood.points.map((point) => (
        <View key={point.date} style={styles.chartColumn}>
          <View style={styles.chartBarWrap}>
            {point.score !== null ? (
              <View
                style={[
                  styles.chartBar,
                  {
                    height: `${(point.score / 10) * 100}%`,
                    backgroundColor: point.color ?? color.outline,
                  },
                ]}
              />
            ) : (
              <View style={[styles.chartBar, styles.chartBarEmpty]} />
            )}
          </View>
          <Text style={styles.chartDayLabel}>{point.label}</Text>
          {point.score !== null ? (
            <Text style={[styles.chartScoreLabel, { color: point.color ?? color.text.muted }]}>
              {point.score}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function HabitBar({ item }: { item: MindHabitPattern }) {
  return (
    <View style={styles.habitRow}>
      <Text style={styles.habitName} numberOfLines={1}>
        {item.habit.name}
      </Text>
      <View style={styles.habitTrack}>
        <View
          style={[
            styles.habitFill,
            {
              width: `${item.adherencePct}%`,
              backgroundColor: item.adherencePct >= 70
                ? MIND_COLOR
                : item.adherencePct >= 40
                  ? color.warn
                  : color.danger,
            },
          ]}
        />
      </View>
      <Text style={styles.habitPct}>{item.adherencePct}%</Text>
    </View>
  );
}

function InsightCard({ item }: { item: MindInsightItem }) {
  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightIconWrap, { backgroundColor: item.color + '18' }]}>
        <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
      </View>
      <Text style={styles.insightValue}>{item.value}</Text>
      <Text style={styles.insightLabel}>{item.label}</Text>
    </View>
  );
}

export function MindInsightRow({ insights }: { insights: MindInsightItem[] }) {
  return (
    <View style={styles.insightRow}>
      {insights.map((item) => (
        <InsightCard key={item.label} item={item} />
      ))}
    </View>
  );
}

export function MoodPatternCard({ mood }: { mood: MindMoodSummary }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mood · Last 7 days</Text>
      {mood.logCount === 0 ? (
        <Text style={styles.emptyText}>No mood data yet. Log a mood to see trends.</Text>
      ) : (
        <>
          <MoodChart mood={mood} />
          {mood.average !== null ? (
            <Text style={styles.cardMeta}>
              Average:{' '}
              <Text style={{ color: moodColor(mood.average), fontWeight: '700' }}>
                {mood.average}/10 · {moodLabel(mood.average)}
              </Text>
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

export function HabitConsistencyCard({ items }: { items: MindHabitPattern[] }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Habit consistency · Last 7 days</Text>
      <View style={styles.habitBars}>
        {items.map((item) => (
          <HabitBar key={item.habit.id} item={item} />
        ))}
      </View>
    </View>
  );
}

export function JournalActivityCard({
  days,
  journal,
  streak,
}: {
  days: string[];
  journal: MindJournalSummary;
  streak: number;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Journal activity · Last 7 days</Text>
      <View style={styles.journalDots}>
        {days.map((day) => {
          const wrote = journal.wroteByDay[day];
          return (
            <View key={day} style={styles.journalDotCol}>
              <View
                style={[
                  styles.journalDot,
                  { backgroundColor: wrote ? MIND_COLOR : color.outline },
                ]}
              />
              <Text style={styles.journalDotLabel}>
                {format(new Date(`${day}T12:00:00`), 'EEEEE')}
              </Text>
            </View>
          );
        })}
      </View>
      {streak > 0 ? (
        <Text style={styles.cardMeta}>
          Current streak:{' '}
          <Text style={{ color: MIND_COLOR, fontWeight: '700' }}>
            {streak} {streak === 1 ? 'day' : 'days'}
          </Text>
        </Text>
      ) : null}
    </View>
  );
}

export function ReflectionCard({ text }: { text: string }) {
  return (
    <View style={styles.reflectCard}>
      <MaterialCommunityIcons name="lightbulb-outline" size={18} color={color.warn} />
      <Text style={styles.reflectText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  insightRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.xs,
  },
  insightCard: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: 4,
    alignItems: 'flex-start',
  },
  insightIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  insightValue: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: color.text.primary,
    letterSpacing: -0.5,
  },
  insightLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
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
  chartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.xs,
    height: 100,
    paddingTop: space.xs,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  chartBarWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 4,
  },
  chartBarEmpty: {
    height: '8%',
    backgroundColor: color.outline,
  },
  chartDayLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: color.text.muted,
    letterSpacing: 0.2,
  },
  chartScoreLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  habitBars: {
    gap: space.sm,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  habitName: {
    width: 100,
    fontSize: typography.xs,
    fontWeight: '500',
    color: color.text.primary,
  },
  habitTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.outline,
  },
  habitFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
  habitPct: {
    width: 32,
    fontSize: typography.xs,
    fontWeight: '600',
    color: color.text.muted,
    textAlign: 'right',
  },
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
