import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { color, space, radius, typography } from '@axis/theme';
import {
  useGoals,
  useLastNightSleep,
  formatDuration,
  getTodayRecoveryCheckIn,
  getTodayHealthSnapshot,
  getHealthAdapterStatuses,
  requestHealthAdapterAccess,
  saveRecoveryCheckIn,
  computeRecoveryScore,
} from '@/engines/body';
import type { HealthAdapterStatus } from '@/engines/body';

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.ratingSection}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            style={[styles.ratingBtn, value === n && styles.ratingBtnActive]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.ratingBtnText, value === n && styles.ratingBtnTextActive]}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function RecoveryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const autoConnectAttempted = useRef(false);
  const { data: goals } = useGoals();
  const { log: sleepLog } = useLastNightSleep();
  const [stepsStr, setStepsStr] = useState('');
  const [allowStepOverride, setAllowStepOverride] = useState(false);
  const [energy, setEnergy] = useState<number | null>(null);
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [soreness, setSoreness] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [healthSource, setHealthSource] = useState<string>('Manual entry');
  const [adapterStatuses, setAdapterStatuses] = useState<HealthAdapterStatus[]>([]);

  const refreshHealthData = useCallback(() => {
    let active = true;

    (async () => {
      try {
        const [entry, snapshot, statuses] = await Promise.all([
          getTodayRecoveryCheckIn(),
          getTodayHealthSnapshot(),
          getHealthAdapterStatuses(),
        ]);

        if (!active) return;

        if (entry?.steps) setStepsStr(String(entry.steps));
        setEnergy(entry?.energy ?? null);
        setFatigue(entry?.fatigue ?? null);
        setSoreness(entry?.soreness ?? null);

        if (snapshot?.steps) setStepsStr((current) => current || String(snapshot.steps));
        if (snapshot?.source) {
          const sourceStatus = statuses.find((item) => item.id === snapshot.source);
          setHealthSource(sourceStatus?.label ?? snapshot.source);
        }
        setAdapterStatuses(statuses);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => refreshHealthData(), [refreshHealthData]);

  useFocusEffect(useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['body', 'sleep'] });
    queryClient.invalidateQueries({ queryKey: ['body', 'recovery'] });
    return refreshHealthData();
  }, [queryClient, refreshHealthData]));

  const recoveryScore = useMemo(
    () => computeRecoveryScore({
      sleepMinutes: sleepLog?.duration_minutes ?? null,
      energy,
      fatigue,
      soreness,
      sleepTargetMinutes: goals?.sleep_target_minutes ?? 480,
    }),
    [sleepLog?.duration_minutes, energy, fatigue, soreness, goals?.sleep_target_minutes],
  );

  async function handleSave() {
    setSaving(true);
    await saveRecoveryCheckIn({
      steps: stepsStr ? parseInt(stepsStr, 10) : null,
      energy,
      fatigue,
      soreness,
    });
    queryClient.invalidateQueries({ queryKey: ['body', 'recovery'] });
    queryClient.invalidateQueries({ queryKey: ['body', 'workouts'] });
    setSaving(false);
    setFeedback('Recovery check-in saved.');
  }

  const handleConnectHealth = useCallback(async () => {
    setConnecting(true);
    try {
      await requestHealthAdapterAccess('healthkit');
      const [snapshot, statuses] = await Promise.all([
        getTodayHealthSnapshot(),
        getHealthAdapterStatuses(),
      ]);
      setAdapterStatuses(statuses);
      if (snapshot?.steps) {
        setStepsStr(String(snapshot.steps));
        setHealthSource('Apple Health');
        setAllowStepOverride(false);
      }
      queryClient.invalidateQueries({ queryKey: ['body', 'recovery'] });
      queryClient.invalidateQueries({ queryKey: ['body', 'sleep'] });
      setFeedback(snapshot?.steps
        ? 'Apple Health connected. Steps are now filling automatically.'
        : 'Apple Health connected. Steps will appear after Health data is available on this iPhone.');
    } finally {
      setConnecting(false);
    }
  }, [queryClient]);

  const healthKitStatus = adapterStatuses.find((adapter) => adapter.id === 'healthkit');
  const isAutomaticUnavailable = healthKitStatus?.available === false;

  useEffect(() => {
    if (!healthKitStatus?.available || healthKitStatus.connected || healthKitStatus.status !== 'Ready to connect') return;
    if (autoConnectAttempted.current) return;

    autoConnectAttempted.current = true;
    handleConnectHealth();
  }, [healthKitStatus?.available, healthKitStatus?.connected, healthKitStatus?.status, handleConnectHealth]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Recovery</Text>
          <Text style={styles.subtitle}>Capture how your body feels today in under a minute.</Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Recovery score</Text>
          <Text style={styles.heroValue}>{recoveryScore ?? '—'}</Text>
          <Text style={styles.heroHint}>
            Sleep {sleepLog?.duration_minutes ? formatDuration(sleepLog.duration_minutes) : 'not logged'} ·
            Energy {energy ?? '—'} · Fatigue {fatigue ?? '—'} · Soreness {soreness ?? '—'}
          </Text>
        </View>

        <View style={styles.sourceCard}>
          <Text style={styles.sourceTitle}>Health sources</Text>
          <Text style={styles.sourceHint}>
            {isAutomaticUnavailable
              ? 'Automatic iPhone step tracking is unavailable in the simulator. Use a real iPhone to test automatic steps.'
              : `iPhone steps are the default automatic source when Apple Health is connected. Wearables can override later. Current source: ${healthSource.toLowerCase()}.`}
          </Text>
          {healthKitStatus?.available && !healthKitStatus.connected ? (
            <Pressable
              style={[styles.connectBtn, connecting && styles.disabled]}
              onPress={handleConnectHealth}
              disabled={connecting}
            >
              <Text style={styles.connectBtnText}>{connecting ? 'Connecting...' : 'Connect Apple Health'}</Text>
            </Pressable>
          ) : null}
          <View style={styles.sourceList}>
            {adapterStatuses.map((adapter) => (
              <View key={adapter.id} style={styles.sourceRow}>
                <Text style={styles.sourceLabel}>{adapter.label}</Text>
                <Text style={[styles.sourceStatus, adapter.available && styles.sourceStatusActive]}>
                  {adapter.status}
                </Text>
              </View>
            ))}
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

        {loading ? (
          <ActivityIndicator color={color.success} />
        ) : (
          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>
                Steps <Text style={styles.optional}>{healthKitStatus?.connected ? '(auto-filled from Apple Health)' : isAutomaticUnavailable ? '(automatic on real iPhone)' : '(optional)'}</Text>
              </Text>
              {isAutomaticUnavailable ? (
                <Text style={styles.simulatorHint}>
                  Simulator only: automatic iPhone step data cannot appear here.
                </Text>
              ) : null}
              {healthKitStatus?.connected && !allowStepOverride ? (
                <View style={styles.autoStepsRow}>
                  <View style={styles.autoStepsCard}>
                    <Text style={styles.autoStepsValue}>{stepsStr || 'Waiting…'}</Text>
                    <Text style={styles.autoStepsHint}>Auto-filled. Use override only if Health data looks wrong.</Text>
                  </View>
                  <Pressable style={styles.overrideBtn} onPress={() => setAllowStepOverride(true)}>
                    <Text style={styles.overrideBtnText}>Override</Text>
                  </Pressable>
                </View>
              ) : null}
              {(!healthKitStatus?.connected || allowStepOverride) ? (
                <TextInput
                  style={styles.input}
                  value={stepsStr}
                  onChangeText={setStepsStr}
                  keyboardType="number-pad"
                  placeholder="e.g. 8200"
                  placeholderTextColor={color.text.muted}
                />
              ) : null}
              {healthKitStatus?.connected && allowStepOverride ? (
                <Pressable onPress={() => setAllowStepOverride(false)}>
                  <Text style={styles.cancelOverride}>Return to Apple Health steps</Text>
                </Pressable>
              ) : null}
            </View>

            <RatingRow label="Energy" value={energy} onChange={setEnergy} />
            <RatingRow label="Fatigue" value={fatigue} onChange={setFatigue} />
            <RatingRow label="Soreness" value={soreness} onChange={setSoreness} />

            <Pressable
              style={[styles.saveBtn, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={color.text.inverse} size="small" />
                : <Text style={styles.saveBtnText}>Save check-in</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  header: { paddingTop: space.lg, marginBottom: space.lg },
  back: { marginBottom: space.sm },
  backText: { fontSize: typography.sm, color: color.text.muted },
  title: { fontSize: typography['3xl'], fontWeight: '700', color: color.text.primary, marginBottom: space.xs },
  subtitle: { fontSize: typography.base, color: color.text.muted, lineHeight: 22 },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    marginBottom: space.lg,
    gap: 4,
  },
  heroLabel: { fontSize: typography.sm, color: color.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroValue: { fontSize: typography['4xl'], fontWeight: '800', color: color.text.primary, letterSpacing: -1 },
  heroHint: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
  sourceCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    marginBottom: space.lg,
    gap: space.sm,
  },
  sourceTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  sourceHint: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  sourceList: {
    gap: space.sm,
  },
  sourceRow: {
    gap: 2,
  },
  sourceLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  sourceStatus: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
  sourceStatusActive: {
    color: color.success,
  },
  connectBtn: {
    alignSelf: 'flex-start',
    backgroundColor: color.success + '22',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  connectBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.success,
  },
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
  formCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.lg,
  },
  field: { gap: space.xs },
  fieldLabel: { fontSize: typography.sm, fontWeight: '600', color: color.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional: { fontWeight: '400', textTransform: 'none' },
  simulatorHint: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
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
  autoStepsRow: { gap: space.sm },
  autoStepsCard: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: 4,
  },
  autoStepsValue: { fontSize: typography.xl, fontWeight: '800', color: color.text.primary },
  autoStepsHint: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
  overrideBtn: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  overrideBtnText: { fontSize: typography.sm, fontWeight: '700', color: color.text.primary },
  cancelOverride: { fontSize: typography.sm, fontWeight: '600', color: color.success },
  ratingSection: { gap: space.xs },
  ratingRow: { flexDirection: 'row', gap: space.sm },
  ratingBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBtnActive: { backgroundColor: color.success, borderColor: color.success },
  ratingBtnText: { fontSize: typography.base, fontWeight: '600', color: color.text.muted },
  ratingBtnTextActive: { color: color.text.inverse },
  saveBtn: {
    backgroundColor: color.success,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: typography.base, fontWeight: '700', color: color.text.inverse },
  disabled: { opacity: 0.6 },
});
