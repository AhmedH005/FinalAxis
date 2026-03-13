import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { color, space, radius, typography } from '@axis/theme';
import { useAuth } from '@/providers/AuthProvider';
import {
  TIME_COLOR,
  formatBlockTimeRange,
  formatDurationLabel,
  getBlockAccent,
  getBlockDurationMinutes,
  isBlockNow,
  useTimeBlockDetail,
} from '@/engines/time';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function TimeBlockDetailScreen() {
  const { session, timeSession, hasDedicatedTimeSupabase } = useAuth();
  const params = useLocalSearchParams<{ blockId?: string | string[] }>();

  const sourceUsers = {
    primaryUserId: session?.user.id ?? null,
    timeUserId: hasDedicatedTimeSupabase ? timeSession?.user.id ?? null : null,
  };
  const blockId = typeof params.blockId === 'string' ? params.blockId : null;
  const { data: block, isLoading } = useTimeBlockDetail(sourceUsers, blockId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={TIME_COLOR} />
          <Text style={styles.loaderText}>Loading block details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!block) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loaderWrap}>
          <Text style={styles.emptyTitle}>Block not found</Text>
          <Text style={styles.emptyText}>
            This block is outside the current mobile read window or no longer exists.
          </Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const accent = getBlockAccent(block.colour);
  const duration = formatDurationLabel(getBlockDurationMinutes(block));
  const start = parseISO(block.start);
  const status = isBlockNow(block)
    ? 'Live now'
    : start > new Date()
    ? `Starts ${formatDistanceToNow(start, { addSuffix: true })}`
    : 'Completed';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={color.text.primary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.headerEyebrow}>Time block</Text>
            <Text style={styles.headerTitle}>View only</Text>
          </View>
        </View>

        <View style={[styles.heroCard, { borderColor: accent + '40' }]}>
          <View style={[styles.heroIcon, { backgroundColor: accent + '18' }]}>
            <MaterialCommunityIcons
              name={block.isLocked ? 'lock-outline' : 'calendar-clock-outline'}
              size={20}
              color={accent}
            />
          </View>

          <Text style={styles.blockTitle}>{block.title}</Text>
          <Text style={styles.blockTime}>{formatBlockTimeRange(block)}</Text>
          <Text style={styles.blockStatus}>{status}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Block details</Text>
          <DetailRow label="Date" value={format(start, 'EEEE, MMMM d')} />
          <DetailRow label="Time" value={formatBlockTimeRange(block)} />
          <DetailRow label="Duration" value={duration} />
          <DetailRow label="Type" value={block.isLocked ? 'Locked block' : 'Task block'} />
          <DetailRow label="Managed from" value="Web Time Engine" />
        </View>

        {block.task ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Task context</Text>
            <DetailRow label="Task" value={block.task.title} />
            <DetailRow label="Priority" value={block.task.priority} />
            {block.task.estMinutes ? (
              <DetailRow label="Estimate" value={formatDurationLabel(block.task.estMinutes)} />
            ) : null}
            {block.task.due ? (
              <DetailRow label="Due" value={format(parseISO(block.task.due), 'EEE, MMM d')} />
            ) : null}
            {block.task.completedAt ? (
              <DetailRow label="Completed" value={format(parseISO(block.task.completedAt), 'EEE, MMM d | h:mm a')} />
            ) : null}
            {block.task.notes ? (
              <View style={styles.notesWrap}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.notesText}>{block.task.notes}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.callout}>
          <MaterialCommunityIcons name="monitor-dashboard" size={18} color={TIME_COLOR} />
          <Text style={styles.calloutText}>
            Editing, replanning, and schedule changes stay on the web Time Engine for now.
          </Text>
        </View>

        <View style={{ height: 24 }} />
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
    paddingTop: space.md,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.outline,
  },
  headerCopy: {
    gap: 2,
  },
  headerEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
  },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: space.xs,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  blockTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
  },
  blockTime: {
    fontSize: typography.base,
    color: color.text.primary,
    fontWeight: '600',
  },
  blockStatus: {
    fontSize: typography.sm,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: typography.base,
    color: color.text.primary,
    lineHeight: 20,
  },
  notesWrap: {
    gap: 6,
  },
  notesText: {
    fontSize: typography.sm,
    color: color.text.primary,
    lineHeight: 20,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    backgroundColor: TIME_COLOR + '10',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: TIME_COLOR + '24',
    padding: space.md,
  },
  calloutText: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.primary,
    lineHeight: 20,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  loaderText: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  emptyTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  emptyText: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  backButton: {
    marginTop: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.outline,
  },
  backButtonText: {
    fontSize: typography.sm,
    color: color.text.primary,
    fontWeight: '700',
  },
});
