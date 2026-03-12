import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import {
  useGoals,
  useRecentSleepLogs,
  useAddSleepLog,
  useDeleteSleepLog,
  formatDuration,
  formatSleepEnd,
  progressPct,
} from '@/engines/body';

const HOUR_PRESETS = [6, 7, 8, 9];
const QUALITY_EMOJI = ['', '😴', '😐', '🙂', '😊', '🌟'];

function sleepPctColor(pct: number): string {
  if (pct >= 100) return '#43D9A3';
  if (pct >= 80) return '#F9B24E';
  return '#FF6B6B';
}

function QualityDots({ value }: { value: number | null }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <View
          key={n}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: value !== null && n <= value ? '#A855F7' : color.outline,
          }}
        />
      ))}
    </View>
  );
}

function QualityPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View style={styles.qualityRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          style={[styles.qualityBtn, value === n && styles.qualityBtnActive]}
          onPress={() => onChange(value === n ? 0 : n)}
        >
          <Text style={styles.qualityEmoji}>{QUALITY_EMOJI[n]}</Text>
          <Text style={[styles.qualityBtnText, value === n && styles.qualityBtnTextActive]}>{n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SleepScreen() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [hoursStr, setHoursStr] = useState('');
  const [quality, setQuality] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: goals } = useGoals();
  const { data: logs = [], isLoading } = useRecentSleepLogs(14);
  const addLog = useAddSleepLog();
  const deleteLog = useDeleteSleepLog();

  const sleepTarget = goals?.sleep_target_minutes ?? 480;
  const latestLog = logs[0] ?? null;
  const recent7 = logs.slice(0, 7);
  const avgMins = recent7.length > 0
    ? Math.round(recent7.reduce((sum, log) => sum + (log.duration_minutes ?? 0), 0) / recent7.length)
    : null;
  const avgQuality = recent7.filter((log) => log.quality_rating).length > 0
    ? (recent7.reduce((sum, log) => sum + (log.quality_rating ?? 0), 0) / recent7.filter((log) => log.quality_rating).length).toFixed(1)
    : null;

  const quickPresets = useMemo(() => {
    const latestHours = latestLog?.duration_minutes ? Number((latestLog.duration_minutes / 60).toFixed(1)) : null;
    return [latestHours, ...HOUR_PRESETS]
      .filter((value): value is number => Boolean(value))
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 4);
  }, [latestLog]);

  function saveSleep(hours: number, qualityRating: number | null) {
    addLog.mutate(
      { hours, quality_rating: qualityRating },
      {
        onSuccess: () => {
          const minutes = Math.round(hours * 60);
          const pct = progressPct(minutes, sleepTarget);
          setFeedback(
            pct >= 100
              ? `Saved ${formatDuration(minutes)}. You hit your target.`
              : `Saved ${formatDuration(minutes)}. ${Math.max(sleepTarget - minutes, 0)} minutes below target.`,
          );
          setShowForm(false);
          setHoursStr('');
          setQuality(null);
        },
        onError: (error) => Alert.alert('Could not log sleep', error.message),
      },
    );
  }

  function handleSubmit() {
    const hours = parseFloat(hoursStr);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      Alert.alert('Invalid hours', 'Enter a number between 0 and 24.');
      return;
    }
    saveSleep(hours, quality || null);
  }

  function loadLastNight() {
    if (!latestLog?.duration_minutes) return;
    setHoursStr((latestLog.duration_minutes / 60).toFixed(1).replace(/\.0$/, ''));
    setQuality(latestLog.quality_rating ?? null);
    setShowForm(true);
    setFeedback(null);
  }

  function repeatLog(durationMinutes: number, qualityRating: number | null) {
    saveSleep(Number((durationMinutes / 60).toFixed(1)), qualityRating);
  }

  function handleDelete(id: string) {
    Alert.alert('Delete entry', 'Remove this sleep log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteLog.mutate(id, {
          onSuccess: () => setFeedback('Sleep entry removed.'),
          onError: (error) => Alert.alert('Could not delete entry', error.message),
        }),
      },
    ]);
  }

  const latestPct = latestLog?.duration_minutes ? progressPct(latestLog.duration_minutes, sleepTarget) : 0;
  const pillColor = latestLog ? sleepPctColor(latestPct) : color.text.muted;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
            <MaterialCommunityIcons name={'arrow-left' as any} size={22} color={color.text.muted} />
          </Pressable>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <MaterialCommunityIcons name={'moon-waning-crescent' as any} size={22} color="#A855F7" />
                <Text style={styles.title}>Sleep</Text>
              </View>
              <Text style={styles.subtitle}>Quick presets first. Full edit only when you need it.</Text>
            </View>
            <Pressable
              style={[styles.logBtn, showForm && styles.logBtnActive]}
              onPress={() => setShowForm((value) => !value)}
            >
              <Text style={[styles.logBtnText, showForm && styles.logBtnTextActive]}>
                {showForm ? 'Close' : 'Custom'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.heroCard, { borderColor: pillColor + '44' }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroValue}>
                {latestLog?.duration_minutes ? formatDuration(latestLog.duration_minutes) : 'No entry'}
              </Text>
              <Text style={styles.heroTarget}>last night · target {formatDuration(sleepTarget)}</Text>
            </View>
            <View style={[styles.heroPill, { borderColor: pillColor, backgroundColor: pillColor + '22' }]}>
              <Text style={[styles.heroPillText, { color: pillColor }]}>
                {latestLog?.duration_minutes ? `${latestPct}%` : 'New'}
              </Text>
            </View>
          </View>
          {latestLog?.duration_minutes ? (
            <View style={styles.heroTrack}>
              <View style={[styles.heroFill, { width: `${Math.min(100, latestPct)}%` as any, backgroundColor: pillColor }]} />
            </View>
          ) : null}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>7-day average</Text>
              <Text style={styles.heroStatValue}>{avgMins ? formatDuration(avgMins) : '—'}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Average quality</Text>
              <Text style={styles.heroStatValue}>
                {avgQuality ? `${QUALITY_EMOJI[Math.round(Number(avgQuality))]} ${avgQuality}/5` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {feedback ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{feedback}</Text>
            <Pressable onPress={() => setFeedback(null)}>
              <Text style={styles.feedbackDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Quick log</Text>
            {latestLog ? (
              <Pressable onPress={loadLastNight}>
                <Text style={styles.sectionAction}>Use last entry</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.quickGrid}>
            {quickPresets.map((hours) => {
              const mins = Math.round(hours * 60);
              const pct = progressPct(mins, sleepTarget);
              const c = sleepPctColor(pct);
              return (
                <Pressable
                  key={hours}
                  style={[styles.quickCard, addLog.isPending && styles.disabled, { borderColor: c + '44' }]}
                  onPress={() => repeatLog(mins, latestLog?.quality_rating ?? null)}
                  disabled={addLog.isPending}
                >
                  <Text style={[styles.quickValue, { color: c }]}>{hours}h</Text>
                  <Text style={styles.quickMeta}>
                    {latestLog?.duration_minutes && Math.abs(hours * 60 - latestLog.duration_minutes) < 1
                      ? 'Repeat last'
                      : `${pct}% of target`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Custom sleep entry</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Hours slept</Text>
              <TextInput
                style={styles.input}
                value={hoursStr}
                onChangeText={setHoursStr}
                keyboardType="decimal-pad"
                placeholder="7.5"
                placeholderTextColor={color.text.muted}
                autoFocus
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Quality <Text style={styles.optional}>(optional)</Text></Text>
              <QualityPicker value={quality} onChange={(value) => setQuality(value || null)} />
            </View>
            <Pressable
              style={[styles.submitBtn, addLog.isPending && styles.disabled]}
              onPress={handleSubmit}
              disabled={addLog.isPending}
            >
              {addLog.isPending
                ? <ActivityIndicator color={color.text.inverse} size="small" />
                : <Text style={styles.submitBtnText}>Save sleep</Text>}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recent nights</Text>
          {isLoading ? (
            <ActivityIndicator color={color.success} />
          ) : logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No sleep logged yet</Text>
              <Text style={styles.emptyText}>Start with last night. Once you have one entry, repeating becomes much faster.</Text>
            </View>
          ) : (
            <View style={styles.logList}>
              {logs.map((log, index) => {
                const duration = log.duration_minutes ?? 0;
                const pct = progressPct(duration, sleepTarget);
                const rowColor = sleepPctColor(pct);
                return (
                  <View key={log.id} style={[styles.logRow, index === logs.length - 1 && styles.logRowLast]}>
                    <View style={[styles.logColorBar, { backgroundColor: rowColor }]} />
                    <View style={styles.logLeft}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.logDate}>{formatSleepEnd(log.sleep_end)}</Text>
                        {log.quality_rating ? <QualityDots value={log.quality_rating} /> : null}
                      </View>
                      <Text style={styles.logDuration}>{formatDuration(duration)}</Text>
                      <View style={styles.logProgress}>
                        <View style={[styles.logProgressFill, { width: `${Math.min(100, pct)}%` as any, backgroundColor: rowColor }]} />
                      </View>
                      <Text style={[styles.logMeta, { color: rowColor }]}>{pct}% of target</Text>
                    </View>
                    <View style={styles.logActions}>
                      <Pressable
                        style={styles.inlineAction}
                        onPress={() => repeatLog(duration, log.quality_rating ?? null)}
                      >
                        <Text style={styles.inlineActionText}>Repeat</Text>
                      </Pressable>
                      <Pressable onPress={() => handleDelete(log.id)} style={styles.deleteBtn}>
                        <MaterialCommunityIcons name={'close' as any} size={16} color={color.text.muted} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  header: { paddingTop: space.lg, marginBottom: space.lg },
  back: { marginBottom: space.sm },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md },
  headerCopy: { flex: 1, gap: space.xs },
  title: { fontSize: typography['3xl'], fontWeight: '700', color: color.text.primary },
  subtitle: { fontSize: typography.base, color: color.text.muted, lineHeight: 22 },
  logBtn: {
    borderWidth: 1,
    borderColor: color.outline,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surface,
  },
  logBtnActive: { borderColor: '#A855F7', backgroundColor: '#A855F722' },
  logBtnText: { fontSize: typography.sm, fontWeight: '700', color: color.text.primary },
  logBtnTextActive: { color: '#A855F7' },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.lg,
    gap: space.md,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroValue: { fontSize: typography['4xl'], fontWeight: '800', color: color.text.primary, letterSpacing: -1 },
  heroTarget: { fontSize: typography.base, color: color.text.muted },
  heroPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  heroPillText: { fontSize: typography.sm, fontWeight: '700' },
  heroTrack: { height: 6, backgroundColor: color.outline, borderRadius: radius.pill, overflow: 'hidden' },
  heroFill: { height: '100%', borderRadius: radius.pill },
  heroStats: { flexDirection: 'row', gap: space.md },
  heroStat: { flex: 1, gap: 4 },
  heroStatLabel: { fontSize: typography.xs, color: color.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  heroStatValue: { fontSize: typography.base, color: color.text.primary, fontWeight: '600' },
  feedbackCard: {
    marginBottom: space.lg,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.success,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
  },
  feedbackText: { flex: 1, fontSize: typography.sm, color: color.text.primary },
  feedbackDismiss: { fontSize: typography.sm, fontWeight: '600', color: color.success },
  section: { marginBottom: space.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  sectionLabel: { fontSize: typography.sm, fontWeight: '600', color: color.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionAction: { fontSize: typography.sm, fontWeight: '600', color: color.success },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  quickCard: {
    width: '48%',
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: 4,
  },
  quickValue: { fontSize: typography.xl, fontWeight: '700' },
  quickMeta: { fontSize: typography.sm, color: color.text.muted },
  formCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.xl,
    gap: space.lg,
  },
  formTitle: { fontSize: typography.lg, fontWeight: '700', color: color.text.primary },
  field: { gap: space.xs },
  fieldLabel: { fontSize: typography.sm, fontWeight: '600', color: color.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional: { fontWeight: '400', textTransform: 'none' },
  input: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typography.base,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.outline,
  },
  qualityRow: { flexDirection: 'row', gap: space.sm },
  qualityBtn: {
    flex: 1,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'center',
    gap: 2,
  },
  qualityBtnActive: { backgroundColor: '#A855F722', borderColor: '#A855F7' },
  qualityEmoji: { fontSize: 16 },
  qualityBtnText: { fontSize: typography.xs, fontWeight: '600', color: color.text.muted },
  qualityBtnTextActive: { color: '#A855F7' },
  submitBtn: { backgroundColor: color.success, borderRadius: radius.lg, paddingVertical: space.md, alignItems: 'center' },
  submitBtnText: { fontSize: typography.base, fontWeight: '700', color: color.text.inverse },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.xs,
  },
  emptyTitle: { fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  emptyText: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
  logList: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingRight: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.outline,
    gap: space.sm,
  },
  logRowLast: { borderBottomWidth: 0 },
  logColorBar: { width: 3, alignSelf: 'stretch', borderRadius: 2, marginLeft: space.sm },
  logLeft: { flex: 1, gap: 4 },
  logDate: { fontSize: typography.sm, color: color.text.muted },
  logDuration: { fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  logProgress: { height: 3, backgroundColor: color.outline, borderRadius: 2, overflow: 'hidden' },
  logProgressFill: { height: '100%', borderRadius: 2 },
  logMeta: { fontSize: typography.xs, fontWeight: '600' },
  logActions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  inlineAction: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  inlineActionText: { fontSize: typography.sm, fontWeight: '600', color: color.text.primary },
  deleteBtn: { padding: space.xs },
  disabled: { opacity: 0.6 },
});
