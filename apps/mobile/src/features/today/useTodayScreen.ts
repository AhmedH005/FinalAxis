import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { appRoutes, journalEntryRoute } from '@/types/navigation';
import {
  formatDuration,
  formatHydration,
  progressPct,
  useAddHydrationLog,
  useDailyEnergySummary,
  useGoals,
  useLastNightSleep,
  useTodayHydrationTotal,
  useTodayNutritionSummary,
  useTodayWorkouts,
} from '@/engines/body';
import {
  MIND_COLOR,
  formatFullDate,
  getGreeting,
  moodEmoji,
  moodLabel,
  useHabitsWithStatus,
  useTodayJournalEntry,
  useTodayMood,
} from '@/engines/mind';
import {
  buildAxisRead,
  buildReflectionAction,
  buildSignalCoverageSummary,
  buildSupplementalAction,
  formatSignedCalories,
  type TodayTarget,
} from './model';

const HYDRATION_OPTIONS = [150, 250, 350, 500];

function routeForTarget(target: TodayTarget) {
  switch (target) {
    case 'mind':
      return appRoutes.mind;
    case 'mind-patterns':
      return appRoutes.mindPatterns;
    case 'mind-habits':
      return appRoutes.mindHabits;
    case 'body-sleep':
      return appRoutes.bodySleep;
    case 'body-hydration':
      return appRoutes.bodyHydration;
    case 'body-nutrition':
      return appRoutes.bodyNutrition;
    case 'body-workouts':
      return appRoutes.bodyWorkouts;
    case 'progress':
      return appRoutes.progress;
  }
}

function buildLayerLinks() {
  return [
    {
      icon: 'heart-pulse',
      label: 'Body signals',
      detail: 'Hydration, nutrition, sleep, recovery, and movement',
      accent: '#43D9A3',
      route: appRoutes.body,
    },
    {
      icon: 'calendar-blank-outline',
      label: 'Time companion',
      detail: 'Today, upcoming blocks, weekly agenda, and view-only block details',
      accent: '#3B82F6',
      route: appRoutes.time,
    },
    {
      icon: 'brain',
      label: 'Mind signals',
      detail: 'Mood, habits, journal entries, and reflective context',
      accent: MIND_COLOR,
      route: appRoutes.mind,
    },
    {
      icon: 'chart-line',
      label: 'Patterns',
      detail: 'Compare recent signals and see what is actually shifting',
      accent: '#60A5FA',
      route: appRoutes.progress,
    },
  ] as const;
}

export function useTodayScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const greeting = getGreeting(profile?.full_name);

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

  const todayHabits = useMemo(
    () => habits.filter((habit) => habit.target_days.includes(new Date().getDay())),
    [habits],
  );
  const completedHabits = todayHabits.filter((habit) => habit.todayCompleted).length;

  const waterTarget = goals?.daily_water_target_ml ?? 2500;
  const hydrationRemaining = Math.max(waterTarget - total_ml, 0);
  const hydrationPct = progressPct(total_ml, waterTarget);

  const sleepTarget = goals?.sleep_target_minutes ?? 480;
  const sleepMinutes = sleepLog?.duration_minutes ?? 0;

  const calorieTarget = goals?.daily_calorie_target ?? null;
  const calories = Math.round(nutrition.total_calories);
  const nutritionPct = calorieTarget ? progressPct(calories, calorieTarget) : 0;

  const journalWords = todayEntry?.word_count ?? 0;
  const reflectionPct = journalWords > 0 ? Math.min(100, Math.round((journalWords / 120) * 100)) : null;
  const moodPct = todayMood ? todayMood.mood_score * 10 : null;
  const habitsValue = habitsLoading
    ? 'Loading...'
    : todayHabits.length > 0
    ? `${completedHabits}/${todayHabits.length}`
    : 'No habits';

  const signalCoverage = buildSignalCoverageSummary({
    totalMl: total_ml,
    calories,
    sleepMinutes,
    workoutsCount: workouts.length,
    moodScore: todayMood?.mood_score ?? null,
    journalWords,
  });

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

  const reflectionAction = buildReflectionAction({
    moodScore: todayMood?.mood_score ?? null,
    journalWords,
  });

  const supplementalAction = buildSupplementalAction({
    sleepMinutes,
    workoutsCount: workouts.length,
    completedHabits,
    totalHabits: todayHabits.length,
  });

  const metricChips = [
    {
      icon: 'water',
      label: 'Water',
      value: formatHydration(total_ml),
      pct: hydrationPct,
      accent: '#6AADE4',
    },
    {
      icon: 'food-apple-outline',
      label: 'Nutrition',
      value: calories > 0 ? `${calories} kcal` : 'Not logged',
      pct: nutritionPct || null,
      accent: '#43D9A3',
    },
    {
      icon: 'emoticon-outline',
      label: 'Mood',
      value: todayMood ? `${moodEmoji(todayMood.mood_score)} ${moodLabel(todayMood.mood_score)}` : 'Check in',
      pct: moodPct,
      accent: MIND_COLOR,
    },
    {
      icon: 'notebook-outline',
      label: 'Reflection',
      value: journalWords > 0 ? `${journalWords} words` : 'Not started',
      pct: reflectionPct,
      accent: '#F59E0B',
    },
  ] as const;

  const actionCards = [
    {
      icon: 'water',
      iconColor: '#6AADE4',
      eyebrow: 'Hydration',
      title: hydrationRemaining > 0 ? `${formatHydration(hydrationRemaining)} left` : 'Goal complete',
      detail: hydrationRemaining > 0
        ? 'A quick water check-in will improve the physical baseline for today.'
        : 'You are covered here. Adjust the total if you need to correct it.',
      cta: addHydration.isPending ? '...' : `+${formatHydration(selectedHydrationAmount)}`,
      tone: 'highlight' as const,
      onPress: () => setHydrationPickerVisible(true),
    },
    {
      icon: 'food-apple-outline',
      iconColor: '#43D9A3',
      eyebrow: 'Nutrition',
      title: calories > 0 ? `${calories}${calorieTarget ? ` / ${calorieTarget}` : ''} kcal` : 'Nothing logged yet',
      detail: calories > 0
        ? `${nutrition.meal_count} meal${nutrition.meal_count === 1 ? '' : 's'} logged today.`
        : 'Log the first meal so your energy estimate has a real input.',
      cta: calories > 0 ? 'Add meal' : 'Log first meal',
      tone: 'default' as const,
      onPress: () => router.push(appRoutes.bodyNutrition),
    },
  ];

  const layerLinks = useMemo(buildLayerLinks, []);

  const openReflectionAction = useCallback(() => {
    if (todayEntry && journalWords > 0) {
      router.push(journalEntryRoute(todayEntry.id));
      return;
    }

    router.push(routeForTarget(reflectionAction.target));
  }, [journalWords, reflectionAction.target, router, todayEntry]);

  const openSupplementalAction = useCallback(() => {
    router.push(routeForTarget(supplementalAction.target));
  }, [router, supplementalAction.target]);

  const applyHydrationChange = useCallback((amountMl: number) => {
    addHydration.mutate(amountMl, {
      onSuccess: () => setHydrationPickerVisible(false),
      onError: (error) => Alert.alert('Could not log water', error.message),
    });
  }, [addHydration]);

  const quickAddWater = useCallback(() => {
    applyHydrationChange(selectedHydrationAmount);
  }, [applyHydrationChange, selectedHydrationAmount]);

  const lowerWater = useCallback(() => {
    if (total_ml <= 0) {
      Alert.alert('Nothing to lower', 'There is no logged water to lower yet.');
      return;
    }

    applyHydrationChange(-Math.min(selectedHydrationAmount, total_ml));
  }, [applyHydrationChange, selectedHydrationAmount, total_ml]);

  return {
    dateLabel: formatFullDate(),
    greeting,
    signalCoverage,
    axisRead,
    reflectionAction,
    supplementalAction,
    actionCards,
    metricChips,
    layerLinks,
    selectedHydrationAmount,
    setSelectedHydrationAmount,
    hydrationPickerVisible,
    setHydrationPickerVisible,
    hydrationOptions: HYDRATION_OPTIONS,
    totalMl: total_ml,
    isSavingHydration: addHydration.isPending,
    energyValue: formatSignedCalories(energy.estimated_balance_calories),
    sleepValue: sleepMinutes > 0 ? formatDuration(sleepMinutes) : 'Missing',
    consistencyValue: habitsValue,
    subtitle: signalCoverage.message,
    openCoverage: () => router.push(appRoutes.progress),
    openAxisRead: () => router.push(routeForTarget(axisRead.target)),
    openReflectionAction,
    openSupplementalAction,
    lowerWater,
    quickAddWater,
    openHydrationTracker: () => {
      setHydrationPickerVisible(false);
      router.push(appRoutes.bodyHydration);
    },
    openLayer: (route: typeof layerLinks[number]['route']) => router.push(route),
  };
}
