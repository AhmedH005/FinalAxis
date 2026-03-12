import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { color, space, radius, typography } from '@axis/theme';
import { format } from 'date-fns';
import {
  useWeightHistory,
  useAddBodyMetric,
  useDeleteBodyMetric,
  toStorageWeight,
  toDisplayWeight,
  weightLabel,
} from '@/engines/body';
import type { BodyMetric, UnitSystem } from '@/lib/supabase/database.types';
import { useAuth } from '@/providers/AuthProvider';

// ─── Weight sparkline ─────────────────────────────────────────────────────────

function WeightChart({ data, units }: { data: BodyMetric[]; units: UnitSystem }) {
  const entries = [...data].reverse().slice(-20); // oldest → newest, last 20
  if (entries.length < 2) return null;

  const values = entries.map(e => toDisplayWeight(e.value, units));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return (
    <View style={chartStyles.wrapper}>
      <View style={chartStyles.yLabels}>
        <Text style={chartStyles.yLabel}>{max.toFixed(1)}</Text>
        <Text style={chartStyles.yLabel}>{min.toFixed(1)}</Text>
      </View>
      <View style={chartStyles.bars}>
        {entries.map((entry, i) => {
          const val = toDisplayWeight(entry.value, units);
          const heightPct = range > 0 ? (val - min) / range : 0.5;
          const prev = i > 0 ? toDisplayWeight(entries[i - 1].value, units) : null;
          const isLatest = i === entries.length - 1;
          const barColor = isLatest
            ? color.success
            : prev !== null && val < prev ? color.success
            : prev !== null && val > prev ? color.danger
            : color.text.muted;
          return (
            <View key={entry.id} style={chartStyles.col}>
              <View style={chartStyles.track}>
                <View style={[
                  chartStyles.bar,
                  {
                    height: `${Math.max(8, heightPct * 100)}%`,
                    backgroundColor: barColor,
                    opacity: isLatest ? 1 : 0.55,
                  },
                ]} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrapper: { flexDirection: 'row', height: 72, gap: space.sm, marginTop: space.sm },
  yLabels: { justifyContent: 'space-between', paddingVertical: 2, width: 36 },
  yLabel: { fontSize: 10, color: color.text.muted, textAlign: 'right' },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  track: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 2 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MetricsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const units = profile?.units ?? 'metric';

  const [showForm, setShowForm] = useState(false);
  const [weightStr, setWeightStr] = useState('');

  const { data: history = [], isLoading } = useWeightHistory(90);
  const addMetric = useAddBodyMetric();
  const deleteMetric = useDeleteBodyMetric();

  const latestKg = history[0]?.value ?? null;
  const latestDisplay = latestKg !== null ? toDisplayWeight(latestKg, units) : null;
  const unit = weightLabel(units);

  const sevenDaysAgo = history.find(e => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return new Date(e.recorded_at) <= cutoff;
  });
  const delta = latestDisplay !== null && sevenDaysAgo
    ? latestDisplay - toDisplayWeight(sevenDaysAgo.value, units)
    : null;

  function handleSubmit() {
    const val = parseFloat(weightStr);
    if (isNaN(val) || val <= 0) {
      Alert.alert('Invalid weight', 'Enter a valid positive number.');
      return;
    }
    addMetric.mutate(
      { metric_type: 'weight_kg', value: toStorageWeight(val, units) },
      {
        onSuccess: () => { setWeightStr(''); setShowForm(false); },
        onError: (e) => Alert.alert('Error', e.message),
      },
    );
  }

  function handleDelete(id: string) {
    Alert.alert('Delete entry', 'Remove this weight log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => deleteMetric.mutate(id, { onError: (e) => Alert.alert('Error', e.message) }),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Body Metrics</Text>
            <Pressable
              style={[styles.logBtn, showForm && styles.logBtnActive]}
              onPress={() => setShowForm(v => !v)}
            >
              <Text style={[styles.logBtnText, showForm && styles.logBtnTextActive]}>
                {showForm ? 'Cancel' : '+ Log weight'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Current weight hero */}
        {latestDisplay !== null ? (
          <View style={styles.hero}>
            <View>
              <Text style={styles.heroLabel}>Current weight</Text>
              <Text style={styles.heroValue}>
                {latestDisplay} <Text style={styles.heroUnit}>{unit}</Text>
              </Text>
              <Text style={styles.heroDate}>
                as of {format(new Date(history[0].recorded_at), 'MMM d')}
              </Text>
            </View>
            {delta !== null ? (
              <View style={styles.heroDeltaBox}>
                <Text style={[
                  styles.heroDeltaNum,
                  delta < 0 ? styles.deltaDown : delta > 0 ? styles.deltaUp : styles.deltaNeutral,
                ]}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                </Text>
                <Text style={styles.heroDeltaLabel}>{unit} vs 7d</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Sparkline chart */}
        {!isLoading && history.length >= 2 ? (
          <View style={styles.chartCard}>
            <Text style={styles.sectionLabel}>
              Trend · last {Math.min(20, history.length)} entries
            </Text>
            <WeightChart data={history} units={units} />
            <Text style={styles.chartLegend}>
              Green = down  ·  Red = up  ·  Bright = latest
            </Text>
          </View>
        ) : null}

        {/* Log form */}
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Log weight</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Weight ({unit})</Text>
              <TextInput
                style={styles.input}
                value={weightStr}
                onChangeText={setWeightStr}
                keyboardType="decimal-pad"
                placeholder={units === 'metric' ? 'e.g. 74.5' : 'e.g. 164'}
                placeholderTextColor={color.text.muted}
                autoFocus
              />
            </View>
            <Pressable
              style={[styles.submitBtn, addMetric.isPending && styles.disabled]}
              onPress={handleSubmit}
              disabled={addMetric.isPending}
            >
              {addMetric.isPending
                ? <ActivityIndicator color={color.text.inverse} size="small" />
                : <Text style={styles.submitBtnText}>Save</Text>}
            </Pressable>
          </View>
        ) : null}

        {/* History list */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>History</Text>
          {isLoading ? (
            <ActivityIndicator color={color.success} />
          ) : history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No weight logged yet.</Text>
            </View>
          ) : (
            <View style={styles.logList}>
              {history.map((entry, i) => {
                const display = toDisplayWeight(entry.value, units);
                const prev = history[i + 1];
                const prevDisplay = prev ? toDisplayWeight(prev.value, units) : null;
                const d = prevDisplay !== null ? display - prevDisplay : null;
                return (
                  <View key={entry.id} style={styles.logRow}>
                    <View style={styles.logLeft}>
                      <Text style={styles.logDate}>{format(new Date(entry.recorded_at), 'EEE, MMM d')}</Text>
                      <Text style={styles.logValue}>{display} {unit}</Text>
                    </View>
                    {d !== null ? (
                      <Text style={[styles.delta, d > 0 ? styles.deltaUp : d < 0 ? styles.deltaDown : styles.deltaNeutral]}>
                        {d > 0 ? '+' : ''}{d.toFixed(1)}
                      </Text>
                    ) : null}
                    <Pressable onPress={() => handleDelete(entry.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>×</Text>
                    </Pressable>
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
  header: { paddingTop: space.lg, marginBottom: space.xl },
  back: { marginBottom: space.sm },
  backText: { fontSize: typography.sm, color: color.text.muted },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typography['3xl'], fontWeight: '700', color: color.text.primary },
  logBtn: {
    borderWidth: 1, borderColor: color.outline,
    borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs,
  },
  logBtnActive: { borderColor: color.danger },
  logBtnText: { fontSize: typography.sm, fontWeight: '600', color: color.success },
  logBtnTextActive: { color: color.danger },
  hero: {
    backgroundColor: color.surface, borderRadius: radius.lg,
    padding: space.xl, borderWidth: 1, borderColor: color.outline,
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginBottom: space.xl,
  },
  heroLabel: {
    fontSize: typography.xs, fontWeight: '600', color: color.text.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  heroValue: {
    fontSize: typography['4xl'], fontWeight: '800',
    color: color.text.primary, letterSpacing: -1,
  },
  heroUnit: { fontSize: typography['2xl'], fontWeight: '400', color: color.text.muted },
  heroDate: { fontSize: typography.sm, color: color.text.muted, marginTop: 2 },
  heroDeltaBox: { alignItems: 'flex-end', paddingBottom: 4 },
  heroDeltaNum: { fontSize: typography['2xl'], fontWeight: '700' },
  heroDeltaLabel: { fontSize: typography.xs, color: color.text.muted, marginTop: 2 },
  chartCard: {
    backgroundColor: color.surface, borderRadius: radius.lg,
    padding: space.lg, borderWidth: 1, borderColor: color.outline, marginBottom: space.xl,
  },
  chartLegend: {
    fontSize: 10, color: color.text.muted, marginTop: space.sm, textAlign: 'center',
  },
  formCard: {
    backgroundColor: color.surface, borderRadius: radius.lg,
    padding: space.lg, borderWidth: 1, borderColor: color.outline,
    marginBottom: space.xl, gap: space.lg,
  },
  formTitle: { fontSize: typography.lg, fontWeight: '700', color: color.text.primary },
  field: { gap: space.xs },
  fieldLabel: {
    fontSize: typography.sm, fontWeight: '600', color: color.text.muted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: color.surfaceAlt, borderRadius: radius.md,
    paddingHorizontal: space.md, paddingVertical: space.sm,
    fontSize: typography.base, color: color.text.primary,
    borderWidth: 1, borderColor: color.outline,
  },
  submitBtn: {
    backgroundColor: color.success, borderRadius: radius.lg,
    paddingVertical: space.md, alignItems: 'center',
  },
  submitBtnText: { fontSize: typography.base, fontWeight: '700', color: color.text.inverse },
  disabled: { opacity: 0.6 },
  section: { marginBottom: space.xl },
  sectionLabel: {
    fontSize: typography.sm, fontWeight: '600', color: color.text.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: space.sm,
  },
  emptyCard: {
    backgroundColor: color.surface, borderRadius: radius.lg,
    padding: space.lg, borderWidth: 1, borderColor: color.outline, alignItems: 'center',
  },
  emptyText: { fontSize: typography.base, color: color.text.muted },
  logList: {
    backgroundColor: color.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: color.outline, overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderBottomWidth: 1, borderBottomColor: color.outline, gap: space.sm,
  },
  logLeft: { flex: 1 },
  logDate: { fontSize: typography.sm, color: color.text.muted },
  logValue: { fontSize: typography.base, fontWeight: '600', color: color.text.primary },
  delta: { fontSize: typography.sm, fontWeight: '600', minWidth: 36, textAlign: 'right' },
  deltaUp: { color: color.danger },
  deltaDown: { color: color.success },
  deltaNeutral: { color: color.text.muted },
  deleteBtn: { padding: space.xs },
  deleteBtnText: { fontSize: typography.xl, color: color.text.muted, lineHeight: 22 },
});
