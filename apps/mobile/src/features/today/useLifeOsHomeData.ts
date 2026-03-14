import { addDays, parseISO, startOfDay } from 'date-fns';
import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import {
  buildDailyBodySummary,
  buildDailyHydrationSummary,
  buildDailyNutritionSummary,
  useDailyEnergySummary,
  useGoals,
  useLastNightSleep,
  useTodayHydrationTotal,
  useTodayNutritionSummary,
} from '@/engines/body';
import {
  buildDailyMindSummary,
  buildMindPatternSnapshot,
  isHabitScheduledToday,
  todayDateStr,
  useHabitsWithStatus,
  useRecentHabitLogs,
  useRecentJournalEntries,
  useRecentMoodLogs,
  useTodayJournalEntry,
  useTodayMood,
} from '@/engines/mind';
import {
  adaptUserGoalToDefinition,
  buildDayReshapePlan,
  buildGoalAlignmentSnapshot,
  buildGoalPathModel,
  buildLifeOsContextSnapshot,
  buildLifeOsObservations,
  buildLifeOsWeeklyReflectionModel,
  buildLifeOsWeeklySummary,
  useLifeOsHistoryWindow,
  usePersistLifeOsDailyHistoryRecord,
} from '@/engines/life-os';
import { buildDailyTimeSummary, useTimeCompanionWindow } from '@/engines/time';
import type { TimeBlock } from '@/engines/time';

const MIND_PATTERN_HISTORY_DAYS = 14;
const JOURNAL_HISTORY_DAYS = 30;

function filterBlocksToDate(date: string, blocks: TimeBlock[]) {
  const dayStart = startOfDay(new Date(`${date}T12:00:00`));
  const nextDayStart = addDays(dayStart, 1);

  return (blocks ?? []).filter((block) => {
    const start = parseISO(block.start);
    const end = parseISO(block.end);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      return false;
    }

    return start < nextDayStart && end > dayStart;
  });
}

export function useLifeOsHomeData() {
  const { profile, session, timeSession, timeLoading } = useAuth();
  const date = todayDateStr();

  const sourceUsers = useMemo(
    () => ({
      primaryUserId: session?.user.id ?? null,
      timeUserId: timeSession?.user.id ?? null,
    }),
    [session?.user.id, timeSession?.user.id],
  );

  const { data: goals, isLoading: goalsLoading } = useGoals();
  const { data: blocks = [], isLoading: blocksLoading } = useTimeCompanionWindow(sourceUsers);
  const { total_ml, isLoading: hydrationLoading } = useTodayHydrationTotal();
  const { summary: nutrition, isLoading: nutritionLoading } = useTodayNutritionSummary();
  const { log: sleepLog, isLoading: sleepLoading } = useLastNightSleep();
  const {
    summary: energy,
    workouts,
    recoveryEntry,
    latestWeight,
    isLoading: energyLoading,
  } = useDailyEnergySummary();
  const { data: todayMood, isLoading: moodLoading } = useTodayMood();
  const { data: todayEntry, isLoading: entryLoading } = useTodayJournalEntry();
  const { data: habits = [], isLoading: habitsLoading } = useHabitsWithStatus();
  const { data: recentMoodLogs = [], isLoading: recentMoodLoading } = useRecentMoodLogs(MIND_PATTERN_HISTORY_DAYS);
  const { data: recentHabitLogs = [], isLoading: recentHabitLoading } = useRecentHabitLogs(MIND_PATTERN_HISTORY_DAYS);
  const { data: recentJournalEntries = [], isLoading: recentJournalLoading } = useRecentJournalEntries(JOURNAL_HISTORY_DAYS);

  const todayHabits = useMemo(
    () => habits.filter((habit) => isHabitScheduledToday(habit)),
    [habits],
  );
  const completedHabits = useMemo(
    () => todayHabits.filter((habit) => habit.todayCompleted).length,
    [todayHabits],
  );

  const isLoading = timeLoading
    || goalsLoading
    || blocksLoading
    || hydrationLoading
    || nutritionLoading
    || sleepLoading
    || energyLoading
    || habitsLoading
    || moodLoading
    || entryLoading
    || recentMoodLoading
    || recentHabitLoading
    || recentJournalLoading;

  const timeSummary = useMemo(
    () => buildDailyTimeSummary({ date, blocks }),
    [blocks, date],
  );

  const nutritionSummary = useMemo(
    () => buildDailyNutritionSummary({
      date,
      totalCalories: nutrition.total_calories,
      totalProteinG: nutrition.total_protein_g,
      totalCarbsG: nutrition.total_carbs_g,
      totalFatG: nutrition.total_fat_g,
      calorieTarget: goals?.daily_calorie_target ?? null,
    }),
    [
      date,
      goals?.daily_calorie_target,
      nutrition.total_calories,
      nutrition.total_carbs_g,
      nutrition.total_fat_g,
      nutrition.total_protein_g,
    ],
  );

  const hydrationSummary = useMemo(
    () => buildDailyHydrationSummary({
      date,
      totalMl: total_ml,
      targetMl: goals?.daily_water_target_ml ?? null,
    }),
    [date, goals?.daily_water_target_ml, total_ml],
  );

  const bodySummary = useMemo(
    () => buildDailyBodySummary({
      date,
      nutrition: nutritionSummary,
      hydration: hydrationSummary,
      energy,
      recoveryEntry: recoveryEntry ?? null,
      sleepRecord: sleepLog,
      workouts,
      latestWeightKg: latestWeight?.value ?? null,
      sleepTargetMinutes: goals?.sleep_target_minutes ?? 480,
    }),
    [
      date,
      energy,
      goals?.sleep_target_minutes,
      hydrationSummary,
      latestWeight?.value,
      nutritionSummary,
      recoveryEntry,
      sleepLog,
      workouts,
    ],
  );

  const mindSummary = useMemo(
    () => buildDailyMindSummary({
      moodScore: todayMood?.mood_score ?? null,
      journalEntry: todayEntry,
      habitsCompleted: completedHabits,
      habitsTotal: todayHabits.length,
      date,
    }),
    [completedHabits, date, todayEntry, todayHabits.length, todayMood?.mood_score],
  );

  const mindPattern = useMemo(
    () => buildMindPatternSnapshot({
      moodLogs: recentMoodLogs,
      habitLogs: recentHabitLogs,
      habits,
      journalEntries: recentJournalEntries,
    }),
    [habits, recentHabitLogs, recentJournalEntries, recentMoodLogs],
  );

  const snapshot = useMemo(
    () => buildLifeOsContextSnapshot({
      date,
      time: timeSummary,
      body: bodySummary,
      mind: mindSummary,
      mindPattern,
      goals,
    }),
    [bodySummary, date, goals, mindPattern, mindSummary, timeSummary],
  );

  const observations = useMemo(
    () => buildLifeOsObservations(snapshot),
    [snapshot],
  );

  const goalDefinition = useMemo(
    () => adaptUserGoalToDefinition(goals),
    [goals],
  );

  const goalAlignment = useMemo(
    () => goalDefinition
      ? buildGoalAlignmentSnapshot({
        date,
        goal: goalDefinition,
        snapshot,
        observations,
      })
      : null,
    [date, goalDefinition, observations, snapshot],
  );

  const goalPath = useMemo(
    () => goalAlignment ? buildGoalPathModel(goalAlignment) : null,
    [goalAlignment],
  );

  usePersistLifeOsDailyHistoryRecord({
    enabled: !isLoading,
    snapshot,
    goalAlignment,
  });

  const {
    data: weeklyHistory = [],
    isLoading: weeklyHistoryLoading,
  } = useLifeOsHistoryWindow(date, 7);

  const todayBlocks = useMemo(
    () => filterBlocksToDate(date, blocks),
    [blocks, date],
  );

  const dayReshapePlan = useMemo(
    () => buildDayReshapePlan({
      snapshot,
      observations,
      goalAlignment,
      blocks: todayBlocks,
    }),
    [goalAlignment, observations, snapshot, todayBlocks],
  );

  const weeklySummary = useMemo(
    () => buildLifeOsWeeklySummary({
      date,
      records: weeklyHistory,
      totalDays: 7,
    }),
    [date, weeklyHistory],
  );

  const weeklyReflection = useMemo(
    () => buildLifeOsWeeklyReflectionModel(weeklySummary),
    [weeklySummary],
  );

  return {
    blocks,
    date,
    dayReshapePlan,
    profile,
    isLoading,
    snapshot,
    observations,
    goalAlignment,
    goalPath,
    weeklyHistoryLoading,
    weeklyReflection,
    weeklySummary,
  };
}
