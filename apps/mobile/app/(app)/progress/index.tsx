import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { format, isThisWeek } from 'date-fns';
import {
  useGoals,
  useDailyEnergySummary,
  useWeeklyNutrition,
  useWeeklyHydration,
  useWeeklySleep,
  useWeightHistory,
  useLatestWeight,
  useRecentWorkouts,
  formatDuration,
  formatHydration,
  toDisplayWeight,
  weightLabel,
  daysAgoStr,
} from '@/engines/body';
import { useAuth } from '@/providers/AuthProvider';

function buildWeekDays(): string[] {
  return Array.from({ length: 7 }, (_, i) => daysAgoStr(6 - i));
}

function buildPriorWeekDays(): string[] {
  return Array.from({ length: 7 }, (_, i) => daysAgoStr(13 - i));
}

// Color a bar based on pct of target
function barColor(pct: number): string {
  if (pct >= 100) return color.success;
  if (pct >= 70) return '#F9B24E';
  return '#FF6B6B';
}

// Stat card in overview grid (2-column)
function StatCard({
  icon,
  iconColor,
  title,
  value,
  hint,
  trend,
}: {
  icon: string;
  iconColor: string;
  title: string;
  value: string;
  hint: string;
  trend?: { pct: number; up: boolean } | null;
}) {
  return (
    <View style={[sc.card, { borderColor: iconColor + '22' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: 4 }}>
        <View style={[sc.icon, { backgroundColor: iconColor + '22' }]}>
          <MaterialCommunityIcons name={icon as any} size={14} color={iconColor} />
        </View>
        <Text style={sc.title}>{title}</Text>
        {trend && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' as any, gap: 2 }}>
            <MaterialCommunityIcons
              name={trend.up ? 'trending-up' : 'trending-down'}
              size={12}
              color={trend.up ? color.success : '#FF6B6B'}
            />
            <Text style={[sc.trendText, { color: trend.up ? color.success : '#FF6B6B' }]}>
              {Math.abs(trend.pct)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={sc.value}>{value}</Text>
      <Text style={sc.hint}>{hint}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    gap: 2,
  },
  icon: { width: 22, height: 22, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.xs, color: color.text.muted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600', flex: 1 },
  value: { fontSize: typography.xl, fontWeight: '700', color: color.text.primary, marginTop: 2 },
  hint: { fontSize: typography.xs, color: color.text.muted },
  trendText: { fontSize: typography.xs, fontWeight: '700' },
});

// Bar chart with color coding
function BarChart({
  days,
  valueByDay,
  target,
  labelFormat,
}: {
  days: string[];
  valueByDay: Record<string, number>;
  target: number;
  labelFormat: (v: number) => string;
}) {
  const today = daysAgoStr(0);
  return (
    <View style={bc.chart}>
      {days.map((day) => {
        const val = valueByDay[day] ?? 0;
        const pct = target > 0 ? Math.round((val / target) * 100) : 0;
        const clampedPct = Math.min(100, pct);
        const isToday = day === today;
        const bColor = val === 0 ? color.outline : barColor(pct);
        return (
          <View key={day} style={bc.col}>
            {val > 0 && (
              <Text style={[bc.pctLabel, { color: bColor }]}>
                {pct >= 100 ? '✓' : `${pct}%`}
              </Text>
            )}
            <View style={bc.track}>
              <View style={[bc.fill, { height: `${clampedPct}%`, backgroundColor: bColor }]} />
            </View>
            <Text style={[bc.dayLabel, isToday && { color: color.text.primary, fontWeight: '700' }]}>
              {format(new Date(`${day}T12:00:00`), 'E')[0]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const bc = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 4, paddingTop: 18 },
  col: { flex: 1, alignItems: 'center', height: '100%', gap: 4 },
  track: {
    flex: 1,
    width: '100%',
    backgroundColor: color.outline,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: { width: '100%', borderRadius: 4 },
  dayLabel: { fontSize: 10, color: color.text.muted },
  pctLabel: { fontSize: 9, fontWeight: '700', position: 'absolute', top: 0 },
});

// Section header with icon + trend
function SectionHeader({
  icon,
  iconColor,
  label,
  streak,
  trend,
}: {
  icon: string;
  iconColor: string;
  label: string;
  streak: number;
  trend?: { pct: number; up: boolean } | null;
}) {
  return (
    <View style={sh.row}>
      <View style={[sh.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={14} color={iconColor} />
      </View>
      <Text style={sh.label}>{label}</Text>
      {streak > 0 && (
        <View style={sh.streakBadge}>
          <Text style={sh.streakText}>{streak}d streak</Text>
        </View>
      )}
      {trend && (
        <View style={[sh.trendBadge, { backgroundColor: trend.up ? '#43D9A322' : '#FF6B6B22' }]}>
          <MaterialCommunityIcons
            name={trend.up ? 'arrow-up' : 'arrow-down'}
            size={10}
            color={trend.up ? color.success : '#FF6B6B'}
          />
          <Text style={[sh.trendText, { color: trend.up ? color.success : '#FF6B6B' }]}>
            {Math.abs(trend.pct)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  iconWrap: { width: 24, height: 24, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: typography.sm, fontWeight: '700', color: color.text.primary, flex: 1 },
  streakBadge: { backgroundColor: '#43D9A322', borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  streakText: { fontSize: typography.xs, fontWeight: '700', color: color.success },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },
  trendText: { fontSize: typography.xs, fontWeight: '700' },
});

// Calculate streak: consecutive days (ending today) where value >= threshold * target
function calcStreak(days: string[], valueByDay: Record<string, number>, target: number, threshold = 0.8): number {
  let streak = 0;
  // Iterate from today backwards
  for (let i = days.length - 1; i >= 0; i--) {
    const val = valueByDay[days[i]] ?? 0;
    if (val >= target * threshold) streak++;
    else break;
  }
  return streak;
}

// Calculate trend % vs prior week
function calcTrend(
  days: string[],
  valueByDay: Record<string, number>,
  priorDays: string[],
  priorByDay: Record<string, number>,
): { pct: number; up: boolean } | null {
  const thisAvg = days.filter((d) => (valueByDay[d] ?? 0) > 0).reduce((s, d) => s + (valueByDay[d] ?? 0), 0) / (days.filter((d) => (valueByDay[d] ?? 0) > 0).length || 1);
  const priorAvg = priorDays.filter((d) => (priorByDay[d] ?? 0) > 0).reduce((s, d) => s + (priorByDay[d] ?? 0), 0) / (priorDays.filter((d) => (priorByDay[d] ?? 0) > 0).length || 1);
  if (priorAvg === 0) return null;
  const changePct = Math.round(((thisAvg - priorAvg) / priorAvg) * 100);
  return { pct: changePct, up: changePct >= 0 };
}

export default function ProgressScreen() {
  const { profile } = useAuth();
  const units = profile?.units ?? 'metric';
  const unit = weightLabel(units);

  const { data: goals } = useGoals();
  const { summary: energy } = useDailyEnergySummary();
  const { data: nutLogs = [], isLoading: nutLoading } = useWeeklyNutrition();
  const { data: hydLogs = [], isLoading: hydLoading } = useWeeklyHydration();
  const { data: sleepLogs = [], isLoading: sleepLoading } = useWeeklySleep();
  const { data: weightHistory = [], isLoading: weightLoading } = useWeightHistory(30);
  const { data: latestWeight } = useLatestWeight();
  const { data: recentWorkouts = [] } = useRecentWorkouts(14);

  const days = buildWeekDays();
  const priorDays = buildPriorWeekDays();

  // ── Nutrition ─────────────────────────────────────────────────────
  const calByDay: Record<string, number> = {};
  for (const day of [...days, ...priorDays]) calByDay[day] = 0;
  for (const log of nutLogs) {
    const day = format(new Date(log.logged_at), 'yyyy-MM-dd');
    if (calByDay[day] !== undefined) calByDay[day] += log.total_calories ?? 0;
  }
  const calPriorByDay: Record<string, number> = {};
  for (const d of priorDays) calPriorByDay[d] = calByDay[d] ?? 0;
  const daysWithCals = days.filter((day) => calByDay[day] > 0);
  const avgCals = daysWithCals.length > 0
    ? Math.round(daysWithCals.reduce((sum, day) => sum + calByDay[day], 0) / daysWithCals.length)
    : null;
  const calStreak = calcStreak(days, calByDay, goals?.daily_calorie_target ?? 2000);
  const calTrend = calcTrend(days, calByDay, priorDays, calPriorByDay);

  // ── Hydration ──────────────────────────────────────────────────────
  const hydByDay: Record<string, number> = {};
  for (const day of [...days, ...priorDays]) hydByDay[day] = 0;
  for (const log of hydLogs) {
    const day = format(new Date(log.logged_at), 'yyyy-MM-dd');
    if (hydByDay[day] !== undefined) hydByDay[day] += log.amount_ml;
  }
  const hydPriorByDay: Record<string, number> = {};
  for (const d of priorDays) hydPriorByDay[d] = hydByDay[d] ?? 0;
  const daysWithHyd = days.filter((day) => hydByDay[day] > 0);
  const avgHyd = daysWithHyd.length > 0
    ? Math.round(daysWithHyd.reduce((sum, day) => sum + hydByDay[day], 0) / daysWithHyd.length)
    : null;
  const hydStreak = calcStreak(days, hydByDay, goals?.daily_water_target_ml ?? 2500);
  const hydTrend = calcTrend(days, hydByDay, priorDays, hydPriorByDay);

  // ── Sleep ──────────────────────────────────────────────────────────
  const sleepByDay: Record<string, number> = {};
  for (const day of [...days, ...priorDays]) sleepByDay[day] = 0;
  for (const log of sleepLogs) {
    const day = format(new Date(log.sleep_end), 'yyyy-MM-dd');
    if (sleepByDay[day] !== undefined) sleepByDay[day] += log.duration_minutes ?? 0;
  }
  const sleepPriorByDay: Record<string, number> = {};
  for (const d of priorDays) sleepPriorByDay[d] = sleepByDay[d] ?? 0;
  const daysWithSleep = days.filter((day) => sleepByDay[day] > 0);
  const avgSleep = daysWithSleep.length > 0
    ? Math.round(daysWithSleep.reduce((sum, day) => sum + sleepByDay[day], 0) / daysWithSleep.length)
    : null;
  const sleepStreak = calcStreak(days, sleepByDay, goals?.sleep_target_minutes ?? 480);
  const sleepTrend = calcTrend(days, sleepByDay, priorDays, sleepPriorByDay);

  // ── Weight ──────────────────────────────────────────────────────────
  const latestKg = latestWeight?.value ?? null;
  const latestDisplay = latestKg !== null ? toDisplayWeight(latestKg, units) : null;
  const sevenDaysAgoEntry = weightHistory.find((entry) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return new Date(entry.recorded_at) <= cutoff;
  });
  const weightDelta = latestKg !== null && sevenDaysAgoEntry
    ? toDisplayWeight(latestKg, units) - toDisplayWeight(sevenDaysAgoEntry.value, units)
    : null;

  // ── Workouts ───────────────────────────────────────────────────────
  const workoutsThisWeek = recentWorkouts.filter((w) => isThisWeek(new Date(w.started_at)));
  const workoutTypes = [...new Set(workoutsThisWeek.map((w) => w.workout_type))];

  const isLoading = nutLoading || hydLoading || sleepLoading || weightLoading;
  const hasData = nutLogs.length > 0 || hydLogs.length > 0 || sleepLogs.length > 0 || weightHistory.length > 0 || recentWorkouts.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Patterns</Text>
          <Text style={styles.subtitle}>
            AXIS compares recent signals so you can see what is actually changing.
          </Text>
        </View>

        <View style={styles.energyCard}>
          <View style={styles.energyCardTop}>
            <View>
              <Text style={styles.energyEyebrow}>Today energy</Text>
              <Text
                style={[
                  styles.energyValue,
                  energy.estimated_balance_calories !== null && {
                    color: energy.estimated_balance_calories >= 0 ? '#F9B24E' : color.success,
                  },
                ]}
              >
                {energy.estimated_balance_calories !== null
                  ? `${energy.estimated_balance_calories > 0 ? '+' : ''}${energy.estimated_balance_calories} kcal`
                  : 'Estimating...'}
              </Text>
            </View>
            <MaterialCommunityIcons name={'flash-outline' as any} size={20} color={color.text.muted} />
          </View>
          <Text style={styles.energyText}>
            {energy.total_expenditure_calories !== null
              ? `${energy.intake_calories} in vs ${energy.total_expenditure_calories} estimated out today.`
              : 'Add weight and basic profile data to unlock a fuller energy estimate.'}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={color.success} style={styles.loader} />
        ) : !hasData ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name={'chart-line' as any} size={32} color={color.text.muted} />
            <Text style={styles.emptyTitle}>Nothing to compare yet</Text>
            <Text style={styles.emptyText}>
              Log a few days of meals, water, sleep, or weight and AXIS will start showing patterns here.
            </Text>
          </View>
        ) : (
          <>
            {/* Overview grid — 2×2 */}
            <View style={styles.overviewGrid}>
              <View style={styles.overviewRow}>
                <StatCard
                  icon="food-apple-outline"
                  iconColor={color.success}
                  title="Nutrition"
                  value={avgCals !== null ? `${avgCals} kcal` : '—'}
                  hint={goals?.daily_calorie_target ? `Target ${goals.daily_calorie_target} kcal` : 'No calorie target'}
                  trend={calTrend}
                />
                <StatCard
                  icon="water"
                  iconColor="#6AADE4"
                  title="Hydration"
                  value={avgHyd !== null ? formatHydration(avgHyd) : '—'}
                  hint={goals?.daily_water_target_ml ? `Target ${formatHydration(goals.daily_water_target_ml)}` : 'Default target'}
                  trend={hydTrend}
                />
              </View>
              <View style={styles.overviewRow}>
                <StatCard
                  icon="moon-waning-crescent"
                  iconColor="#A855F7"
                  title="Sleep"
                  value={avgSleep !== null ? formatDuration(avgSleep) : '—'}
                  hint={goals?.sleep_target_minutes ? `Target ${formatDuration(goals.sleep_target_minutes)}` : 'Default target'}
                  trend={sleepTrend}
                />
                <StatCard
                  icon="scale-bathroom"
                  iconColor="#9AA6B2"
                  title="Weight"
                  value={latestDisplay !== null ? `${latestDisplay} ${unit}` : '—'}
                  hint={weightDelta !== null
                    ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} ${unit} vs 7d`
                    : 'No comparison yet'}
                  trend={weightDelta !== null ? { pct: Math.abs(Math.round((weightDelta / (latestDisplay ?? 1)) * 100)), up: weightDelta < 0 } : null}
                />
              </View>
            </View>

            {/* Nutrition chart */}
            {nutLogs.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="food-apple-outline"
                  iconColor={color.success}
                  label="Nutrition"
                  streak={calStreak}
                  trend={calTrend}
                />
                <View style={styles.card}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>7-day average</Text>
                    <Text style={styles.cardStatValue}>{avgCals !== null ? `${avgCals} kcal` : '—'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <BarChart
                    days={days}
                    valueByDay={calByDay}
                    target={goals?.daily_calorie_target ?? 2000}
                    labelFormat={(v) => `${Math.round(v)} kcal`}
                  />
                </View>
              </View>
            )}

            {/* Hydration chart */}
            {hydLogs.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="water"
                  iconColor="#6AADE4"
                  label="Hydration"
                  streak={hydStreak}
                  trend={hydTrend}
                />
                <View style={styles.card}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>7-day average</Text>
                    <Text style={styles.cardStatValue}>{avgHyd !== null ? formatHydration(avgHyd) : '—'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <BarChart
                    days={days}
                    valueByDay={hydByDay}
                    target={goals?.daily_water_target_ml ?? 2500}
                    labelFormat={(v) => formatHydration(v)}
                  />
                </View>
              </View>
            )}

            {/* Sleep chart */}
            {sleepLogs.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="moon-waning-crescent"
                  iconColor="#A855F7"
                  label="Sleep"
                  streak={sleepStreak}
                  trend={sleepTrend}
                />
                <View style={styles.card}>
                  <View style={styles.cardStat}>
                    <Text style={styles.cardStatLabel}>7-day average</Text>
                    <Text style={styles.cardStatValue}>{avgSleep !== null ? formatDuration(avgSleep) : '—'}</Text>
                  </View>
                  <View style={styles.divider} />
                  <BarChart
                    days={days}
                    valueByDay={sleepByDay}
                    target={goals?.sleep_target_minutes ?? 480}
                    labelFormat={(v) => formatDuration(Math.round(v))}
                  />
                </View>
              </View>
            )}

            {/* Workouts */}
            {recentWorkouts.length > 0 && (
              <View style={styles.section}>
                <SectionHeader
                  icon="dumbbell"
                  iconColor="#FF6B6B"
                  label="Workouts"
                  streak={0}
                  trend={null}
                />
                <View style={styles.card}>
                  <View style={styles.workoutRow}>
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>{workoutsThisWeek.length}</Text>
                      <Text style={styles.workoutStatLabel}>Sessions this week</Text>
                    </View>
                    <View style={styles.workoutTypes}>
                      {workoutTypes.slice(0, 4).map((type) => (
                        <View key={type} style={styles.workoutTypePill}>
                          <Text style={styles.workoutTypeText}>{type}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Weight */}
            {latestDisplay !== null && (
              <View style={styles.section}>
                <SectionHeader
                  icon="scale-bathroom"
                  iconColor="#9AA6B2"
                  label="Weight"
                  streak={0}
                  trend={null}
                />
                <View style={styles.card}>
                  <View style={styles.weightRow}>
                    <View>
                      <Text style={styles.weightValue}>{latestDisplay} {unit}</Text>
                      <Text style={styles.weightSub}>Current weight</Text>
                    </View>
                    {weightDelta !== null && (
                      <View style={[styles.weightDeltaBadge, { backgroundColor: weightDelta <= 0 ? '#43D9A322' : '#FF6B6B22' }]}>
                        <Text style={[styles.weightDeltaText, { color: weightDelta <= 0 ? color.success : '#FF6B6B' }]}>
                          {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} {unit}
                        </Text>
                        <Text style={[styles.weightDeltaSub, { color: weightDelta <= 0 ? color.success : '#FF6B6B' }]}>vs 7d ago</Text>
                      </View>
                    )}
                  </View>
                  {weightHistory.length > 1 && (
                    <>
                      <View style={styles.divider} />
                      <Text style={styles.note}>{weightHistory.length} entries in the last 30 days</Text>
                    </>
                  )}
                </View>
              </View>
            )}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  header: { paddingTop: space.lg, marginBottom: space.lg, gap: space.xs },
  title: { fontSize: typography['3xl'], fontWeight: '700', color: color.text.primary },
  subtitle: { fontSize: typography.base, color: color.text.muted },
  energyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: space.xs,
    marginBottom: space.lg,
  },
  energyCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  energyEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  energyValue: { fontSize: typography.xl, fontWeight: '700', color: color.text.primary },
  energyText: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
  loader: { marginTop: space.xl },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.sm,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: typography.lg, fontWeight: '700', color: color.text.primary },
  emptyText: { fontSize: typography.base, color: color.text.muted, lineHeight: 22, textAlign: 'center' },
  overviewGrid: { gap: space.sm, marginBottom: space.xl },
  overviewRow: { flexDirection: 'row', gap: space.sm },
  section: { marginBottom: space.lg },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
  },
  cardStat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  cardStatLabel: { fontSize: typography.base, color: color.text.muted },
  cardStatValue: { fontSize: typography.lg, fontWeight: '700', color: color.text.primary },
  divider: { height: 1, backgroundColor: color.outline, marginVertical: space.md },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  workoutStat: { alignItems: 'center' },
  workoutStatValue: { fontSize: typography['3xl'], fontWeight: '800', color: color.text.primary },
  workoutStatLabel: { fontSize: typography.xs, color: color.text.muted, textAlign: 'center' },
  workoutTypes: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  workoutTypePill: { backgroundColor: '#FF6B6B22', borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  workoutTypeText: { fontSize: typography.xs, color: '#FF6B6B', fontWeight: '600' },
  weightRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightValue: { fontSize: typography['2xl'], fontWeight: '800', color: color.text.primary },
  weightSub: { fontSize: typography.xs, color: color.text.muted, marginTop: 2 },
  weightDeltaBadge: { borderRadius: radius.md, padding: space.sm, alignItems: 'center' },
  weightDeltaText: { fontSize: typography.lg, fontWeight: '700' },
  weightDeltaSub: { fontSize: typography.xs, fontWeight: '600' },
  note: { fontSize: typography.sm, color: color.text.muted, textAlign: 'center' },
});
