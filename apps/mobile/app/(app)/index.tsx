import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { useAuth } from '@/providers/AuthProvider';
import {
  useGoals,
  useTodayHydrationTotal,
  useTodayNutritionSummary,
  useLastNightSleep,
  useTodayWorkouts,
  useDailyEnergySummary,
  useAddHydrationLog,
  formatHydration,
  formatDuration,
  progressPct,
} from '@/engines/body';
import {
  MIND_COLOR,
  moodEmoji,
  moodLabel,
  useTodayJournalEntry,
  useTodayMood,
  useHabitsWithStatus,
} from '@/engines/mind';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatSignedCalories(value: number | null) {
  if (value === null) return 'Estimating...';
  return `${value > 0 ? '+' : ''}${value} kcal`;
}

function buildAxisRead({
  totalMl,
  waterTarget,
  sleepMinutes,
  sleepTarget,
  calories,
  moodScore,
  journalWords,
  completedHabits,
  totalHabits,
}: {
  totalMl: number;
  waterTarget: number;
  sleepMinutes: number;
  sleepTarget: number;
  calories: number;
  moodScore: number | null;
  journalWords: number;
  completedHabits: number;
  totalHabits: number;
}) {
  const hydrationLow = totalMl < waterTarget * 0.5;
  const sleepLow = sleepMinutes === 0 || sleepMinutes < sleepTarget * 0.85;
  const moodLow = moodScore !== null && moodScore <= 4;
  const moodStrong = moodScore !== null && moodScore >= 7;
  const hasReflection = journalWords > 0;
  const habitConsistency = totalHabits > 0 ? completedHabits / totalHabits : null;

  if (moodScore === null && !hasReflection) {
    return {
      icon: 'brain',
      accent: MIND_COLOR,
      headline: 'Your internal signals are still missing.',
      detail: 'Log a mood or write a few lines so AXIS can interpret more than body data.',
      route: '/(app)/mind',
      cta: 'Open mind',
    };
  }

  if (sleepLow && moodLow) {
    return {
      icon: 'weather-night',
      accent: '#A855F7',
      headline: 'Low recovery is likely shaping today.',
      detail: 'Sleep and mood are both under pressure. Keep the day narrow and protect essentials first.',
      route: '/(app)/body/sleep',
      cta: 'Check sleep',
    };
  }

  if (hydrationLow) {
    return {
      icon: 'water',
      accent: '#6AADE4',
      headline: 'Body basics are the main constraint right now.',
      detail: sleepLow
        ? 'Hydration is behind and recovery looks light. Fix the physical baseline before judging the day.'
        : 'Hydration is still lagging. A simple physical reset may improve the rest of the day.',
      route: '/(app)/body/hydration',
      cta: 'Log water',
    };
  }

  if (moodStrong && habitConsistency !== null && habitConsistency >= 0.6) {
    return {
      icon: 'check-decagram-outline',
      accent: color.success,
      headline: 'Your routine is creating stability today.',
      detail: hasReflection
        ? 'Mood and consistency are aligned. This is a good day to capture what is working.'
        : 'Mood is strong and your habits are moving. Add a short reflection while the pattern is clear.',
      route: '/(app)/mind/patterns',
      cta: 'See patterns',
    };
  }

  if (sleepMinutes > 0 && calories > 0 && hasReflection) {
    return {
      icon: 'chart-line',
      accent: '#60A5FA',
      headline: 'You have enough signal to read the shape of the day.',
      detail: 'Body and mind are both checked in. Compare today against recent patterns while the context is fresh.',
      route: '/(app)/progress',
      cta: 'Open patterns',
    };
  }

  return {
    icon: 'tune-variant',
    accent: color.warn,
    headline: 'The picture is forming, but one more signal will sharpen it.',
    detail: sleepMinutes === 0
      ? 'Start with last night\'s sleep so your body baseline is complete.'
      : moodScore === null
      ? 'A quick mood check-in would add context to everything else you have logged.'
      : 'A short journal reflection will make this day easier to understand later.',
    route: sleepMinutes === 0 ? '/(app)/body/sleep' : '/(app)/mind',
    cta: sleepMinutes === 0 ? 'Log sleep' : 'Add context',
  };
}

function MetricChip({
  icon,
  label,
  value,
  pct,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  pct: number | null;
  accent: string;
}) {
  return (
    <View style={[metricStyles.chip, { borderColor: accent + '33' }]}>
      <View style={[metricStyles.iconWrap, { backgroundColor: accent + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={14} color={accent} />
      </View>
      <View style={metricStyles.copy}>
        <Text style={[metricStyles.label, { color: accent }]} numberOfLines={1}>{label}</Text>
        <Text style={metricStyles.value} numberOfLines={2}>{value}</Text>
        {pct !== null ? (
          <View style={metricStyles.track}>
            <View
              style={[
                metricStyles.fill,
                { width: `${Math.min(100, pct)}%`, backgroundColor: accent },
              ]}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  chip: {
    width: '48%',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.sm,
    gap: space.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 88,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
    lineHeight: 18,
    minHeight: 36,
  },
  track: {
    height: 3,
    backgroundColor: color.outline,
    borderRadius: 2,
    overflow: 'hidden',
    width: 48,
    marginTop: 2,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});

function ActionCard({
  icon,
  iconColor,
  eyebrow,
  title,
  detail,
  cta,
  tone = 'default',
  onPress,
}: {
  icon: string;
  iconColor: string;
  eyebrow: string;
  title: string;
  detail: string;
  cta: string;
  tone?: 'default' | 'highlight';
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[actionStyles.card, tone === 'highlight' && { borderColor: color.success }]}
      onPress={onPress}
    >
      <View style={[actionStyles.iconCircle, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={actionStyles.eyebrow}>{eyebrow}</Text>
      <Text style={actionStyles.title} numberOfLines={2}>{title}</Text>
      <Text style={actionStyles.detail} numberOfLines={3}>{detail}</Text>
      <View style={[actionStyles.ctaBtn, tone === 'highlight' && { backgroundColor: color.success }]}>
        <Text style={[actionStyles.ctaText, tone === 'highlight' && { color: color.text.inverse }]}>{cta}</Text>
      </View>
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: color.outline,
    gap: 6,
    minHeight: 172,
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: color.text.muted,
    fontWeight: '600',
  },
  title: {
    fontSize: typography.base,
    color: color.text.primary,
    fontWeight: '700',
    lineHeight: 20,
    minHeight: 40,
  },
  detail: {
    fontSize: typography.xs,
    color: color.text.muted,
    lineHeight: 16,
    minHeight: 46,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    marginTop: 'auto' as const,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.outline,
  },
  ctaText: {
    fontSize: typography.xs,
    color: color.text.primary,
    fontWeight: '700',
  },
});

function LayerLink({
  icon,
  label,
  detail,
  accent,
  onPress,
}: {
  icon: string;
  label: string;
  detail: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={layerStyles.card} onPress={onPress}>
      <View style={[layerStyles.iconWrap, { backgroundColor: accent + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={accent} />
      </View>
      <View style={layerStyles.copy}>
        <Text style={layerStyles.label}>{label}</Text>
        <Text style={layerStyles.detail}>{detail}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={16} color={color.outline} />
    </Pressable>
  );
}

const layerStyles = StyleSheet.create({
  card: {
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  detail: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
});

const HYDRATION_OPTIONS = [150, 250, 350, 500];

export default function TodayScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? null;
  const greeting = getGreeting();

  const { data: goals } = useGoals();
  const { total_ml } = useTodayHydrationTotal();
  const { summary: nutrition } = useTodayNutritionSummary();
  const { log: sleepLog } = useLastNightSleep();
  const { data: workouts = [] } = useTodayWorkouts();
  const { summary: energy } = useDailyEnergySummary();
  const { data: todayMood } = useTodayMood();
  const { data: todayEntry } = useTodayJournalEntry();
  const { data: habits, isLoading: habitsLoading } = useHabitsWithStatus();

  const addHydration = useAddHydrationLog();

  const [selectedHydrationAmount, setSelectedHydrationAmount] = useState(250);
  const [hydrationPickerVisible, setHydrationPickerVisible] = useState(false);

  const waterTarget = goals?.daily_water_target_ml ?? 2500;
  const hydrationRemaining = Math.max(waterTarget - total_ml, 0);
  const hydrationPct = progressPct(total_ml, waterTarget);

  const sleepTarget = goals?.sleep_target_minutes ?? 480;
  const sleepMinutes = sleepLog?.duration_minutes ?? 0;
  const sleepPct = sleepMinutes > 0 ? progressPct(sleepMinutes, sleepTarget) : 0;

  const calorieTarget = goals?.daily_calorie_target ?? null;
  const calories = Math.round(nutrition.total_calories);
  const nutritionPct = calorieTarget ? progressPct(calories, calorieTarget) : 0;

  const todayHabits = habits.filter((habit) => habit.target_days.includes(new Date().getDay()));
  const completedHabits = todayHabits.filter((habit) => habit.todayCompleted).length;
  const habitPct = todayHabits.length > 0
    ? Math.round((completedHabits / todayHabits.length) * 100)
    : null;

  const journalWords = todayEntry?.word_count ?? 0;
  const reflectionPct = journalWords > 0 ? Math.min(100, Math.round((journalWords / 120) * 100)) : null;
  const moodPct = todayMood ? todayMood.mood_score * 10 : null;

  const signalChecks = [
    total_ml > 0,
    calories > 0,
    sleepMinutes > 0,
    workouts.length > 0,
    !!todayMood,
    journalWords > 0,
  ];
  const signalCoverageCount = signalChecks.filter(Boolean).length;
  const signalCoveragePct = Math.round((signalCoverageCount / signalChecks.length) * 100);

  const coverageColor = signalCoveragePct >= 75
    ? color.success
    : signalCoveragePct >= 45
    ? color.warn
    : color.danger;

  const coverageMessage = signalCoverageCount <= 2
    ? 'Capture a few more signals. AXIS gets sharper with context.'
    : signalCoverageCount <= 4
    ? 'The day is coming into focus. One more check-in will sharpen the read.'
    : 'Body and mind are both in view. Review the pattern layer while the day is still fresh.';

  const axisRead = buildAxisRead({
    totalMl: total_ml,
    waterTarget,
    sleepMinutes,
    sleepTarget,
    calories,
    moodScore: todayMood?.mood_score ?? null,
    journalWords,
    completedHabits,
    totalHabits: todayHabits.length,
  });

  const reflectionAction = todayEntry && journalWords > 0
    ? {
        title: `${journalWords} words captured`,
        detail: 'Keep writing while the day is fresh. This is the context layer AXIS cannot infer on its own.',
        cta: 'Continue',
        onPress: () => router.push(`/(app)/mind/journal/${todayEntry.id}` as any),
      }
    : todayMood
    ? {
        title: `${moodEmoji(todayMood.mood_score)} ${moodLabel(todayMood.mood_score)} logged`,
        detail: 'Turn that feeling into context with a quick reflection or note.',
        cta: 'Reflect',
        onPress: () => router.push('/(app)/mind' as any),
      }
    : {
        title: 'No mind signal yet',
        detail: 'Add mood or reflection so AXIS can interpret more than body data.',
        cta: 'Check in',
        onPress: () => router.push('/(app)/mind' as any),
      };

  const fourthAction = sleepMinutes === 0
    ? {
        icon: 'moon-waning-crescent',
        iconColor: '#A855F7',
        eyebrow: 'Sleep',
        title: 'No sleep check-in yet',
        detail: 'Recovery changes how the rest of your data should be read.',
        cta: 'Log sleep',
        onPress: () => router.push('/(app)/body/sleep' as any),
      }
    : workouts.length === 0
    ? {
        icon: 'dumbbell',
        iconColor: '#F9B24E',
        eyebrow: 'Movement',
        title: 'No movement logged today',
        detail: 'Capture training or a session when it happens so the energy picture stays honest.',
        cta: 'Log workout',
        onPress: () => router.push('/(app)/body/workouts' as any),
      }
    : habitPct !== null && habitPct < 100
    ? {
        icon: 'check-circle-outline',
        iconColor: MIND_COLOR,
        eyebrow: 'Consistency',
        title: `${completedHabits}/${todayHabits.length} habits complete`,
        detail: 'One more repetition may be the difference between intention and a real pattern.',
        cta: 'Open habits',
        onPress: () => router.push('/(app)/mind/habits' as any),
      }
    : {
        icon: 'chart-line',
        iconColor: '#60A5FA',
        eyebrow: 'Patterns',
        title: 'The system has enough to compare',
        detail: 'Use the pattern layer to see what today looks like against recent signals.',
        cta: 'Review',
        onPress: () => router.push('/(app)/progress' as any),
      };

  function applyHydrationChange(amountMl: number) {
    addHydration.mutate(amountMl, {
      onSuccess: () => setHydrationPickerVisible(false),
      onError: (error) => Alert.alert('Could not log water', error.message),
    });
  }

  function quickAddWater() {
    applyHydrationChange(selectedHydrationAmount);
  }

  function lowerWater() {
    if (total_ml <= 0) {
      Alert.alert('Nothing to lower', 'There is no logged water to lower yet.');
      return;
    }
    applyHydrationChange(-Math.min(selectedHydrationAmount, total_ml));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          <Text style={styles.greeting}>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </Text>
          <Text style={styles.subtitle}>{coverageMessage}</Text>
        </View>

        <Pressable
          style={[styles.heroCard, { borderColor: coverageColor + '33' }]}
          onPress={() => router.push('/(app)/progress' as any)}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>Signal coverage</Text>
              <Text style={[styles.heroScore, { color: coverageColor }]}>
                {signalCoveragePct}
                <Text style={styles.heroScoreSuffix}>%</Text>
              </Text>
            </View>
            <View style={styles.heroSummary}>
              <Text style={styles.heroSummaryLabel}>Logged</Text>
              <Text style={styles.heroSummaryValue}>{signalCoverageCount}/6</Text>
            </View>
          </View>

          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${signalCoveragePct}%`, backgroundColor: coverageColor }]} />
          </View>

          <Text style={styles.heroHint}>
            AXIS gets stronger when your physical, emotional, and reflective signals are all in view.
          </Text>

          <View style={styles.chipsRow}>
            <MetricChip
              icon="water"
              label="Water"
              value={formatHydration(total_ml)}
              pct={hydrationPct}
              accent="#6AADE4"
            />
            <MetricChip
              icon="food-apple-outline"
              label="Nutrition"
              value={calories > 0 ? `${calories} kcal` : 'Not logged'}
              pct={nutritionPct || null}
              accent={color.success}
            />
            <MetricChip
              icon="emoticon-outline"
              label="Mood"
              value={todayMood ? `${moodEmoji(todayMood.mood_score)} ${moodLabel(todayMood.mood_score)}` : 'Check in'}
              pct={moodPct}
              accent={MIND_COLOR}
            />
            <MetricChip
              icon="notebook-outline"
              label="Reflection"
              value={journalWords > 0 ? `${journalWords} words` : 'Not started'}
              pct={reflectionPct}
              accent="#F59E0B"
            />
          </View>
        </Pressable>

        <Pressable style={styles.readCard} onPress={() => router.push(axisRead.route as any)}>
          <View style={styles.readHeader}>
            <View style={styles.readCopy}>
              <Text style={styles.readEyebrow}>AXIS read</Text>
              <Text style={[styles.readHeadline, { color: axisRead.accent }]}>{axisRead.headline}</Text>
            </View>
            <View style={[styles.readIconWrap, { backgroundColor: axisRead.accent + '18' }]}>
              <MaterialCommunityIcons name={axisRead.icon as any} size={20} color={axisRead.accent} />
            </View>
          </View>

          <Text style={styles.readDetail}>{axisRead.detail}</Text>

          <View style={styles.readStats}>
            <View style={styles.readPill}>
              <Text style={styles.readPillLabel}>Energy</Text>
              <Text style={styles.readPillValue}>{formatSignedCalories(energy.estimated_balance_calories)}</Text>
            </View>
            <View style={styles.readPill}>
              <Text style={styles.readPillLabel}>Sleep</Text>
              <Text style={styles.readPillValue}>
                {sleepMinutes > 0 ? formatDuration(sleepMinutes) : 'Missing'}
              </Text>
            </View>
            <View style={styles.readPill}>
              <Text style={styles.readPillLabel}>Consistency</Text>
              <Text style={styles.readPillValue}>
                {habitsLoading
                  ? 'Loading...'
                  : todayHabits.length > 0
                  ? `${completedHabits}/${todayHabits.length}`
                  : 'No habits'}
              </Text>
            </View>
          </View>

          <View style={styles.readAction}>
            <Text style={[styles.readActionText, { color: axisRead.accent }]}>{axisRead.cta}</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color={axisRead.accent} />
          </View>
        </Pressable>

        <Text style={styles.sectionLabel}>Act on the next signal</Text>
        <View style={styles.actionGrid}>
          <View style={styles.actionRow}>
            <ActionCard
              icon="water"
              iconColor="#6AADE4"
              eyebrow="Hydration"
              title={hydrationRemaining > 0 ? `${formatHydration(hydrationRemaining)} left` : 'Goal complete'}
              detail={hydrationRemaining > 0
                ? 'A quick water check-in will improve the physical baseline for today.'
                : 'You are covered here. Adjust the total if you need to correct it.'}
              cta={addHydration.isPending ? '...' : `+${formatHydration(selectedHydrationAmount)}`}
              tone="highlight"
              onPress={() => setHydrationPickerVisible(true)}
            />
            <ActionCard
              icon="food-apple-outline"
              iconColor={color.success}
              eyebrow="Nutrition"
              title={calories > 0 ? `${calories}${calorieTarget ? ` / ${calorieTarget}` : ''} kcal` : 'Nothing logged yet'}
              detail={calories > 0
                ? `${nutrition.meal_count} meal${nutrition.meal_count === 1 ? '' : 's'} logged today.`
                : 'Log the first meal so your energy estimate has a real input.'}
              cta={calories > 0 ? 'Add meal' : 'Log first meal'}
              onPress={() => router.push('/(app)/body/nutrition' as any)}
            />
          </View>

          <View style={styles.actionRow}>
            <ActionCard
              icon="brain"
              iconColor={MIND_COLOR}
              eyebrow="Reflection"
              title={reflectionAction.title}
              detail={reflectionAction.detail}
              cta={reflectionAction.cta}
              onPress={reflectionAction.onPress}
            />
            <ActionCard
              icon={fourthAction.icon}
              iconColor={fourthAction.iconColor}
              eyebrow={fourthAction.eyebrow}
              title={fourthAction.title}
              detail={fourthAction.detail}
              cta={fourthAction.cta}
              onPress={fourthAction.onPress}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Explore AXIS</Text>
        <View style={styles.layerList}>
          <LayerLink
            icon="heart-pulse"
            label="Body signals"
            detail="Hydration, nutrition, sleep, recovery, and movement"
            accent={color.success}
            onPress={() => router.push('/(app)/body' as any)}
          />
          <LayerLink
            icon="calendar-blank-outline"
            label="Time companion"
            detail="Today, upcoming blocks, weekly agenda, and view-only block details"
            accent="#3B82F6"
            onPress={() => router.push('/(app)/time' as any)}
          />
          <LayerLink
            icon="brain"
            label="Mind signals"
            detail="Mood, habits, journal entries, and reflective context"
            accent={MIND_COLOR}
            onPress={() => router.push('/(app)/mind' as any)}
          />
          <LayerLink
            icon="chart-line"
            label="Patterns"
            detail="Compare recent signals and see what is actually shifting"
            accent="#60A5FA"
            onPress={() => router.push('/(app)/progress' as any)}
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={hydrationPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHydrationPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalCopy}>
                <Text style={styles.modalTitle}>Log water</Text>
                <Text style={styles.modalSubtitle}>Choose the amount you actually drank.</Text>
              </View>
              <Pressable onPress={() => setHydrationPickerVisible(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={20} color={color.text.muted} />
              </Pressable>
            </View>

            <View style={styles.modalOptions}>
              {HYDRATION_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.modalOption,
                    selectedHydrationAmount === option && styles.modalOptionActive,
                  ]}
                  onPress={() => setSelectedHydrationAmount(option)}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedHydrationAmount === option && styles.modalOptionTextActive,
                    ]}
                  >
                    {option}ml
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalSecondaryBtn, (addHydration.isPending || total_ml <= 0) && styles.disabledBtn]}
                onPress={lowerWater}
                disabled={addHydration.isPending || total_ml <= 0}
              >
                <Text style={styles.modalSecondaryBtnText}>
                  {addHydration.isPending ? 'Lowering...' : `Lower by ${selectedHydrationAmount}ml`}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalPrimaryBtn, addHydration.isPending && styles.disabledBtn]}
                onPress={quickAddWater}
                disabled={addHydration.isPending}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  {addHydration.isPending ? 'Adding...' : `Add ${selectedHydrationAmount}ml`}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.modalLink}
              onPress={() => {
                setHydrationPickerVisible(false);
                router.push('/(app)/body/hydration' as any);
              }}
            >
              <Text style={styles.modalLinkText}>Open full hydration tracker</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  header: { paddingTop: space.lg, marginBottom: space.lg, gap: space.xs },
  date: { fontSize: typography.sm, color: color.text.muted },
  greeting: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 22,
    maxWidth: 330,
  },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.xl,
    gap: space.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroEyebrow: {
    fontSize: typography.sm,
    color: color.text.muted,
    marginBottom: 4,
  },
  heroScore: {
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: -2,
  },
  heroScoreSuffix: {
    fontSize: typography['2xl'],
    color: color.text.muted,
    fontWeight: '500',
  },
  heroSummary: {
    alignItems: 'flex-end',
    gap: 4,
  },
  heroSummaryLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroSummaryValue: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
  },
  heroTrack: {
    height: 6,
    backgroundColor: color.outline,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  heroHint: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  readCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.xl,
    gap: space.md,
  },
  readHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  readCopy: {
    flex: 1,
    gap: 4,
  },
  readEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  readHeadline: {
    fontSize: typography.lg,
    color: color.text.primary,
    fontWeight: '700',
    lineHeight: 24,
  },
  readIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readDetail: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  readStats: {
    flexDirection: 'row',
    gap: space.xs,
  },
  readPill: {
    flex: 1,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: color.outline,
    gap: 2,
  },
  readPillLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  readPillValue: {
    fontSize: typography.sm,
    color: color.text.primary,
    fontWeight: '700',
  },
  readAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readActionText: {
    fontSize: typography.sm,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: space.sm,
    fontWeight: '600',
  },
  actionGrid: { gap: space.sm },
  actionRow: { flexDirection: 'row', gap: space.sm, alignItems: 'stretch' },
  layerList: {
    gap: space.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    padding: space.lg,
  },
  modalCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  modalCopy: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  modalSubtitle: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  modalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  modalOption: {
    minWidth: 88,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
    alignItems: 'center',
  },
  modalOptionActive: {
    borderColor: '#6AADE4',
    backgroundColor: '#6AADE422',
  },
  modalOptionText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  modalOptionTextActive: {
    color: '#6AADE4',
  },
  modalActions: {
    gap: space.sm,
  },
  modalSecondaryBtn: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  modalPrimaryBtn: {
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.success,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.inverse,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  modalLink: {
    alignSelf: 'center',
  },
  modalLinkText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.success,
  },
});
