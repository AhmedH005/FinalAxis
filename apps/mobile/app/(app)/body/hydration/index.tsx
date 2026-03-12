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
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import {
  useGoals,
  useTodayHydrationTotal,
  useAddHydrationLog,
  formatHydration,
  progressPct,
} from '@/engines/body';

const HYDRATION_BLUE = '#6AADE4';

function hydColor(pct: number): string {
  if (pct >= 80) return '#43D9A3';
  if (pct >= 50) return '#F9B24E';
  return HYDRATION_BLUE;
}

function uniqueAmounts(values: number[]) {
  return values.filter((value, index) => value > 0 && values.indexOf(value) === index);
}

export default function HydrationScreen() {
  const router = useRouter();
  const [customAmount, setCustomAmount] = useState('250');
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: goals } = useGoals();
  const { total_ml, logs = [], isLoading } = useTodayHydrationTotal();
  const addLog = useAddHydrationLog();

  const waterTarget = goals?.daily_water_target_ml ?? 2500;
  const pct = progressPct(total_ml, waterTarget);
  const remaining = Math.max(waterTarget - total_ml, 0);
  const lastAmount = logs[0]?.amount_ml ?? null;
  const activeColor = hydColor(pct);

  const quickAmounts = useMemo(
    () => uniqueAmounts([
      150,
      250,
      350,
      500,
      remaining > 0 && remaining <= 300 ? remaining : 0,
      lastAmount ?? 0,
      750,
    ]),
    [lastAmount, remaining],
  );

  function applyHydrationChange(amountMl: number) {
    addLog.mutate(amountMl, {
      onSuccess: () => {
        if (amountMl >= 0) {
          setFeedback(
            remaining - amountMl > 0
              ? `Added ${formatHydration(amountMl)}. ${formatHydration(Math.max(remaining - amountMl, 0))} left today.`
              : `Added ${formatHydration(amountMl)}. Goal reached.`,
          );
          return;
        }

        setFeedback(`Lowered ${formatHydration(Math.abs(amountMl))}. ${formatHydration(Math.max(waterTarget - (total_ml + amountMl), 0))} left today.`);
      },
      onError: (error) => Alert.alert('Could not log water', error.message),
    });
  }

  function handleCustomAdd() {
    const ml = parseFloat(customAmount);
    if (isNaN(ml) || ml <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive amount in millilitres.');
      return;
    }
    applyHydrationChange(ml);
    setCustomAmount(String(Math.round(ml)));
  }

  function adjustCustomAmount(delta: number) {
    const next = Math.max(10, Math.round((parseFloat(customAmount) || 0) + delta));
    setCustomAmount(String(next));
  }

  function handleCustomLower() {
    const ml = parseFloat(customAmount);
    if (isNaN(ml) || ml <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive amount in millilitres.');
      return;
    }
    if (total_ml <= 0) {
      Alert.alert('Nothing to lower', 'There is no logged water to lower yet.');
      return;
    }

    applyHydrationChange(-Math.min(ml, total_ml));
  }

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs }}>
            <MaterialCommunityIcons name={'water' as any} size={24} color={HYDRATION_BLUE} />
            <Text style={styles.title}>Hydration</Text>
          </View>
          <Text style={styles.subtitle}>Designed for one-tap check-ins throughout the day.</Text>
        </View>

        <View style={[styles.heroCard, { borderColor: activeColor + '44' }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroValue}>{formatHydration(total_ml)}</Text>
              <Text style={styles.heroTarget}>of {formatHydration(waterTarget)} today</Text>
            </View>
            <View style={[styles.heroPill, { borderColor: activeColor, backgroundColor: activeColor + '22' }]}>
              <Text style={[styles.heroPillText, { color: activeColor }]}>{pct}%</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%` as any, backgroundColor: activeColor }]} />
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Remaining</Text>
              <Text style={styles.heroStatValue}>
                {remaining > 0 ? formatHydration(remaining) : 'Done'}
              </Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Last drink</Text>
              <Text style={styles.heroStatValue}>
                {logs[0] ? `${formatHydration(logs[0].amount_ml)} at ${format(new Date(logs[0].logged_at), 'h:mm a')}` : 'Nothing yet'}
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
            <Text style={styles.sectionLabel}>Add water</Text>
            <Text style={styles.sectionAction}>Add or lower by the amount you choose</Text>
          </View>
          <View style={styles.quickGrid}>
            {quickAmounts.map((amount) => (
              <Pressable
                key={amount}
                style={[styles.quickCard, customAmount === String(amount) && styles.quickCardActive]}
                onPress={() => setCustomAmount(String(amount))}
              >
                <MaterialCommunityIcons name={'water' as any} size={18} color={HYDRATION_BLUE} />
                <Text style={styles.quickAmount}>{amount >= 1000 ? `${(amount / 1000).toFixed(1)}` : `${amount}`}</Text>
                <Text style={styles.quickAmountUnit}>{amount >= 1000 ? 'L' : 'ml'}</Text>
                <Text style={styles.quickMeta}>
                  {lastAmount === amount ? 'Repeat last' : remaining === amount ? 'Finish goal' : 'Select amount'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.customCard}>
            <Text style={styles.customLabel}>Selected amount</Text>
            <View style={styles.controlRow}>
              <Pressable style={styles.adjustBtn} onPress={() => adjustCustomAmount(-50)}>
                <Text style={styles.adjustBtnText}>-50</Text>
              </Pressable>
              <View style={styles.customInputWrap}>
                <TextInput
                  style={styles.customInput}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="decimal-pad"
                  placeholder="Amount in ml"
                  placeholderTextColor={color.text.muted}
                />
                <Text style={styles.customInputUnit}>ml</Text>
              </View>
              <Pressable style={styles.adjustBtn} onPress={() => adjustCustomAmount(50)}>
                <Text style={styles.adjustBtnText}>+50</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.customAddBtn, addLog.isPending && styles.disabled]}
              onPress={handleCustomAdd}
              disabled={addLog.isPending}
            >
              {addLog.isPending
                ? <ActivityIndicator color={color.text.inverse} size="small" />
                : <Text style={styles.customAddBtnText}>Log {customAmount || '0'}ml</Text>}
            </Pressable>
            <Pressable
              style={[styles.customLowerBtn, (addLog.isPending || total_ml <= 0) && styles.disabled]}
              onPress={handleCustomLower}
              disabled={addLog.isPending || total_ml <= 0}
            >
              <Text style={styles.customLowerBtnText}>Lower by {customAmount || '0'}ml</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Recent drinks</Text>
          {isLoading ? (
            <ActivityIndicator color={color.success} />
          ) : logs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No water logged yet</Text>
              <Text style={styles.emptyText}>Start with one glass. The rest of the day gets easier once the first entry is there.</Text>
            </View>
          ) : (
            <View style={styles.logList}>
              {logs.map((log, index) => (
                <View key={log.id} style={[styles.logRow, index === logs.length - 1 && styles.logRowLast]}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logAmount}>
                      {log.amount_ml < 0 ? `Lowered ${formatHydration(Math.abs(log.amount_ml))}` : formatHydration(log.amount_ml)}
                    </Text>
                    <Text style={styles.logTime}>{format(new Date(log.logged_at), 'h:mm a')}</Text>
                  </View>
                  <View style={styles.logActions}>
                    {log.amount_ml > 0 ? (
                      <Pressable
                        style={styles.repeatBtn}
                        onPress={() => applyHydrationChange(log.amount_ml)}
                        disabled={addLog.isPending}
                      >
                        <Text style={styles.repeatBtnText}>Repeat</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  header: {
    paddingTop: space.lg,
    marginBottom: space.lg,
  },
  back: { marginBottom: space.sm },
  title: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 22,
    maxWidth: 320,
  },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.lg,
    gap: space.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroValue: {
    fontSize: typography['4xl'],
    fontWeight: '800',
    color: color.text.primary,
    letterSpacing: -1,
  },
  heroTarget: {
    fontSize: typography.base,
    color: color.text.muted,
  },
  heroPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  heroPillText: {
    fontSize: typography.sm,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: color.outline,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  heroStats: {
    flexDirection: 'row',
    gap: space.md,
  },
  heroStat: {
    flex: 1,
    gap: 4,
  },
  heroStatLabel: {
    fontSize: typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: color.text.muted,
    fontWeight: '600',
  },
  heroStatValue: {
    fontSize: typography.sm,
    color: color.text.primary,
    lineHeight: 20,
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
  feedbackText: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.primary,
  },
  feedbackDismiss: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.success,
  },
  section: {
    marginBottom: space.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  sectionLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionAction: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.success,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  quickCard: {
    width: '48%',
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: 2,
    alignItems: 'flex-start',
    minHeight: 124,
    justifyContent: 'space-between',
  },
  quickCardActive: {
    borderColor: HYDRATION_BLUE,
    backgroundColor: HYDRATION_BLUE + '12',
  },
  quickAmount: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: HYDRATION_BLUE,
    letterSpacing: -0.5,
  },
  quickAmountUnit: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    marginTop: -2,
  },
  quickMeta: {
    fontSize: typography.sm,
    color: color.text.muted,
    marginTop: 2,
  },
  customCard: {
    marginTop: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.sm,
  },
  customLabel: {
    fontSize: typography.sm,
    color: color.text.primary,
    fontWeight: '600',
  },
  customRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  controlRow: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
  },
  adjustBtn: {
    minWidth: 60,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
    alignItems: 'center',
  },
  adjustBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  customInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingRight: space.md,
  },
  customInput: {
    flex: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typography.base,
    color: color.text.primary,
  },
  customInputUnit: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
  },
  customAddBtn: {
    backgroundColor: color.success,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAddBtnText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.inverse,
  },
  customLowerBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  customLowerBtnText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.xs,
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
  },
  logList: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.outline,
    gap: space.sm,
  },
  logRowLast: {
    borderBottomWidth: 0,
  },
  logLeft: {
    gap: 2,
    flex: 1,
  },
  logAmount: {
    fontSize: typography.base,
    fontWeight: '700',
    color: HYDRATION_BLUE,
  },
  logTime: {
    fontSize: typography.base,
    color: color.text.muted,
    fontWeight: '500',
  },
  logActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  repeatBtn: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  repeatBtnText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  deleteBtn: { padding: space.xs },
  disabled: {
    opacity: 0.6,
  },
});
