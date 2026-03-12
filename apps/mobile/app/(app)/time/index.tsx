import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { endOfWeek, format, isAfter, isToday, parseISO, startOfWeek } from 'date-fns';
import { color, space, radius, typography } from '@axis/theme';
import { useAuth } from '@/providers/AuthProvider';
import {
  TIME_COLOR,
  formatBlockDate,
  formatBlockTimeRange,
  formatDurationLabel,
  getBlockAccent,
  getBlockDurationMinutes,
  getCurrentAndNextBlock,
  getWeekDays,
  groupBlocksByDay,
  isBlockNow,
  useTimeCompanionWindow,
  type TimeBlock,
  type TimeViewMode,
} from '@/engines/time';

const VIEW_OPTIONS: Array<{ key: TimeViewMode; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'week', label: 'Week' },
];

function ModeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.modeChip, active && styles.modeChipActive]} onPress={onPress}>
      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function BlockCard({
  block,
  tone = 'default',
}: {
  block: TimeBlock;
  tone?: 'default' | 'current' | 'next';
}) {
  const accent = getBlockAccent(block.colour);
  const duration = formatDurationLabel(getBlockDurationMinutes(block));
  const statusLabel = tone === 'current' ? 'Now' : tone === 'next' ? 'Next' : null;

  return (
    <Pressable
      style={[
        styles.blockCard,
        tone === 'current' && { borderColor: accent + '55' },
        tone === 'next' && { borderColor: TIME_COLOR + '40' },
      ]}
      onPress={() => router.push(`/(app)/time/${block.id}` as any)}
    >
      <View style={[styles.blockAccent, { backgroundColor: accent }]} />

      <View style={styles.blockContent}>
        <View style={styles.blockTopRow}>
          <Text style={styles.blockTitle} numberOfLines={2}>{block.title}</Text>
          {statusLabel ? (
            <View style={[styles.statusBadge, { backgroundColor: accent + '18', borderColor: accent + '30' }]}>
              <Text style={[styles.statusBadgeText, { color: accent }]}>{statusLabel}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.blockTime}>{formatBlockTimeRange(block)} | {duration}</Text>

        {block.task?.notes ? (
          <Text style={styles.blockNote} numberOfLines={2}>{block.task.notes}</Text>
        ) : null}

        <View style={styles.blockMetaRow}>
          <Text style={styles.blockMeta}>{formatBlockDate(block)}</Text>
          {block.task?.priority ? (
            <Text style={styles.blockMeta}>{block.task.priority}</Text>
          ) : null}
          {block.isLocked ? (
            <Text style={styles.blockMeta}>Locked</Text>
          ) : (
            <Text style={styles.blockMeta}>Web-managed</Text>
          )}
        </View>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={16} color={color.outline} />
    </Pressable>
  );
}

function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <MaterialCommunityIcons name="calendar-blank-outline" size={24} color={color.text.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
    </View>
  );
}

function TodayPane({ blocks }: { blocks: TimeBlock[] }) {
  const { current, next } = getCurrentAndNextBlock(blocks);
  const focusBlock = current ?? next;

  return (
    <View style={styles.sectionStack}>
      <View style={styles.focusCard}>
        <Text style={styles.focusEyebrow}>
          {current ? 'Happening now' : next ? 'What\'s next' : 'No more blocks'}
        </Text>
        <Text style={styles.focusTitle}>
          {focusBlock ? focusBlock.title : 'Nothing else is scheduled for today'}
        </Text>
        <Text style={styles.focusDetail}>
          {focusBlock
            ? `${formatBlockTimeRange(focusBlock)} | ${formatDurationLabel(getBlockDurationMinutes(focusBlock))}`
            : 'The web Time Engine remains the place to build or edit your schedule.'}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's agenda</Text>
        <Text style={styles.sectionMeta}>{blocks.length} block{blocks.length === 1 ? '' : 's'}</Text>
      </View>

      {blocks.length > 0 ? (
        blocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            tone={isBlockNow(block) ? 'current' : next?.id === block.id ? 'next' : 'default'}
          />
        ))
      ) : (
        <EmptyState
          title="No schedule loaded for today"
          detail="When the web Time Engine schedules blocks for you, they will appear here automatically."
        />
      )}
    </View>
  );
}

function UpcomingPane({ blocks }: { blocks: TimeBlock[] }) {
  const groups = groupBlocksByDay(blocks);

  if (groups.length === 0) {
    return (
      <EmptyState
        title="Nothing upcoming yet"
        detail="Future blocks from the web Time Engine will appear here in a clean agenda list."
      />
    );
  }

  return (
    <View style={styles.sectionStack}>
      {groups.map((group) => (
        <View key={group.date} style={styles.groupSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{group.label}</Text>
            <Text style={styles.sectionMeta}>{group.items.length}</Text>
          </View>
          {group.items.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </View>
      ))}
    </View>
  );
}

function WeekPane({ blocks }: { blocks: TimeBlock[] }) {
  const weekDays = getWeekDays(blocks);
  const totalMinutes = weekDays.reduce((sum, day) => sum + day.totalMinutes, 0);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  return (
    <View style={styles.sectionStack}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryEyebrow}>This week</Text>
        <Text style={styles.summaryTitle}>
          {weekDays.reduce((sum, day) => sum + day.count, 0)} scheduled blocks
        </Text>
        <Text style={styles.summaryDetail}>
          {formatDurationLabel(totalMinutes)} across {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
        </Text>
      </View>

      {weekDays.map((day) => (
        <View key={day.date.toISOString()} style={styles.weekDayCard}>
          <View style={styles.weekDayTop}>
            <View>
              <Text style={styles.weekDayLabel}>{day.label}</Text>
              <Text style={styles.weekDayDate}>{day.dateLabel}</Text>
            </View>
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>
                {day.count === 0 ? 'Free' : `${day.count} block${day.count === 1 ? '' : 's'}`}
              </Text>
            </View>
          </View>

          <Text style={styles.weekDayDetail}>
            {day.count === 0
              ? 'Nothing scheduled.'
              : `${format(parseISO(day.first!.start), 'h:mm a')} start | ${format(day.last ? parseISO(day.last.end) : day.date, 'h:mm a')} finish`}
          </Text>

          {day.count > 0 ? (
            <Text style={styles.weekDayMeta}>{formatDurationLabel(day.totalMinutes)} planned</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function TimeCompanionScreen() {
  const { session } = useAuth();
  const [mode, setMode] = useState<TimeViewMode>('today');

  const userId = session?.user.id ?? null;
  const { data: blocks = [], isLoading, isRefetching, refetch, error } = useTimeCompanionWindow(userId);

  const now = new Date();
  const todayBlocks = useMemo(
    () => blocks.filter((block) => isToday(parseISO(block.start))),
    [blocks],
  );
  const upcomingBlocks = useMemo(
    () => blocks.filter((block) => isAfter(parseISO(block.start), now) && !isToday(parseISO(block.start))),
    [blocks, now],
  );
  const weekBlocks = useMemo(
    () => blocks.filter((block) => {
      const start = parseISO(block.start);
      return start >= startOfWeek(now, { weekStartsOn: 1 }) && start <= endOfWeek(now, { weekStartsOn: 1 });
    }),
    [blocks, now],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={TIME_COLOR} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Time</Text>
          <Text style={styles.subtitle}>
            Read-only companion to the web Time Engine. View your real schedule here, but keep planning and editing on web.
          </Text>
        </View>

        <View style={styles.banner}>
          <MaterialCommunityIcons name="monitor-dashboard" size={18} color={TIME_COLOR} />
          <Text style={styles.bannerText}>Web remains the control center for Time Engine.</Text>
        </View>

        <View style={styles.modeRow}>
          {VIEW_OPTIONS.map((option) => (
            <ModeChip
              key={option.key}
              label={option.label}
              active={mode === option.key}
              onPress={() => setMode(option.key)}
            />
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={TIME_COLOR} />
            <Text style={styles.loaderText}>Loading your schedule...</Text>
          </View>
        ) : error ? (
          <EmptyState
            title="Could not reach Time Engine"
            detail="Check EXPO_PUBLIC_TIME_API_URL and make sure the Time API is running."
          />
        ) : mode === 'today' ? (
          <TodayPane blocks={todayBlocks} />
        ) : mode === 'upcoming' ? (
          <UpcomingPane blocks={upcomingBlocks} />
        ) : (
          <WeekPane blocks={weekBlocks} />
        )}
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
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  header: {
    gap: space.xs,
  },
  title: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 22,
    maxWidth: 340,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: TIME_COLOR + '30',
    padding: space.md,
  },
  bannerText: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.primary,
    lineHeight: 20,
  },
  modeRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  modeChip: {
    flex: 1,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surface,
    alignItems: 'center',
  },
  modeChipActive: {
    borderColor: TIME_COLOR,
    backgroundColor: TIME_COLOR + '14',
  },
  modeChipText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
  },
  modeChipTextActive: {
    color: TIME_COLOR,
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: space.sm,
  },
  loaderText: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  sectionStack: {
    gap: space.md,
  },
  focusCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: TIME_COLOR + '30',
    padding: space.lg,
    gap: space.xs,
  },
  focusEyebrow: {
    fontSize: typography.xs,
    color: TIME_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  focusTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
  },
  focusDetail: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionMeta: {
    fontSize: typography.xs,
    color: color.text.muted,
    fontWeight: '600',
  },
  blockCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
  },
  blockAccent: {
    width: 4,
    borderRadius: 999,
  },
  blockContent: {
    flex: 1,
    gap: 4,
  },
  blockTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  blockTitle: {
    flex: 1,
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  blockTime: {
    fontSize: typography.sm,
    color: color.text.primary,
    fontWeight: '600',
  },
  blockNote: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 18,
  },
  blockMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: 2,
  },
  blockMeta: {
    fontSize: typography.xs,
    color: color.text.muted,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.xl,
    gap: space.sm,
  },
  emptyTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  emptyDetail: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  groupSection: {
    gap: space.sm,
  },
  summaryCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: TIME_COLOR + '24',
    padding: space.lg,
    gap: space.xs,
  },
  summaryEyebrow: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: TIME_COLOR,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  summaryTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
  },
  summaryDetail: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  weekDayCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: 6,
  },
  weekDayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekDayLabel: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  weekDayDate: {
    fontSize: typography.xs,
    color: color.text.muted,
    marginTop: 2,
  },
  weekBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.outline,
  },
  weekBadgeText: {
    fontSize: typography.xs,
    color: color.text.primary,
    fontWeight: '700',
  },
  weekDayDetail: {
    fontSize: typography.sm,
    color: color.text.primary,
    fontWeight: '600',
  },
  weekDayMeta: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
});
