import { format, subDays } from 'date-fns';
import type { DailyMindSummary, Habit, HabitLog, JournalEntry, MoodLog } from './types';
import { moodColor, moodLabel, todayDateStr } from './utils';

export interface MindTrendDelta {
  change: number;
  up: boolean;
}

export interface MindMoodPoint {
  date: string;
  label: string;
  score: number | null;
  color: string | null;
}

export interface MindMoodSummary {
  points: MindMoodPoint[];
  average: number | null;
  priorAverage: number | null;
  trend: MindTrendDelta | null;
  volatility: number | null;
  stressAverage: number | null;
  stressTrend: MindTrendDelta | null;
  energyAverage: number | null;
  energyTrend: MindTrendDelta | null;
  logCount: number;
}

export interface MindHabitPattern {
  habit: Habit;
  completedDays: number;
  totalDays: number;
  adherencePct: number;
}

export interface MindHabitSummary {
  items: MindHabitPattern[];
  overallAdherencePct: number | null;
  priorOverallAdherencePct: number | null;
  adherenceTrend: MindTrendDelta | null;
  stableHabitCount: number;
}

export interface MindJournalSummary {
  totalWords: number;
  entryCount: number;
  activeDays: number;
  averageWordsOnWritingDays: number | null;
  frequencyTrend: MindTrendDelta | null;
  depthTrend: MindTrendDelta | null;
  wroteByDay: Record<string, boolean>;
}

export interface MindPatternSnapshot {
  days: string[];
  priorDays: string[];
  mood: MindMoodSummary;
  habits: MindHabitSummary;
  journal: MindJournalSummary;
  reflection: string;
}

export function buildMindDayRange(length = 7, offset = 0) {
  return Array.from({ length }, (_, index) =>
    format(subDays(new Date(), length - 1 - index + offset), 'yyyy-MM-dd'),
  );
}

function dayLabel(dateStr: string) {
  return format(new Date(`${dateStr}T12:00:00`), 'EEE').slice(0, 1);
}

function roundAverage(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function roundChange(value: number) {
  return Math.round(value * 10) / 10;
}

function averageAbsoluteDelta(values: number[]) {
  if (values.length < 2) return null;
  const deltas = values.slice(1).map((value, index) => Math.abs(value - values[index]));
  return roundAverage(deltas);
}

function buildTrendDelta(currentValue: number | null, priorValue: number | null): MindTrendDelta | null {
  if (currentValue === null || priorValue === null) return null;
  const change = roundChange(currentValue - priorValue);
  return {
    change,
    up: change >= 0,
  };
}

function averageMoodPointsForDays(
  logs: Array<Pick<MoodLog, 'logged_at' | 'mood_score'>>,
  days: string[],
): MindMoodPoint[] {
  return days.map((day) => {
    const dayLogs = logs.filter((log) => log.logged_at.startsWith(day));
    if (dayLogs.length === 0) {
      return {
        date: day,
        label: dayLabel(day),
        score: null,
        color: null,
      };
    }

    const average = Math.round(
      dayLogs.reduce((sum, log) => sum + log.mood_score, 0) / dayLogs.length,
    );

    return {
      date: day,
      label: dayLabel(day),
      score: average,
      color: moodColor(average),
    };
  });
}

export function buildMoodSummary(
  logs: Array<Pick<MoodLog, 'logged_at' | 'mood_score' | 'stress_level' | 'energy_level'>>,
  days: string[] = buildMindDayRange(),
  priorDays: string[] = buildMindDayRange(days.length, days.length),
): MindMoodSummary {
  const allowedDays = new Set(days);
  const priorDaySet = new Set(priorDays);
  const currentLogs = logs.filter((log) => allowedDays.has(log.logged_at.slice(0, 10)));
  const priorLogs = logs.filter((log) => priorDaySet.has(log.logged_at.slice(0, 10)));
  const points = averageMoodPointsForDays(logs, days);
  const pointScores = points
    .map((point) => point.score)
    .filter((score): score is number => score !== null);
  const stressValues = currentLogs
    .map((log) => log.stress_level)
    .filter((value): value is number => typeof value === 'number');
  const priorStressValues = priorLogs
    .map((log) => log.stress_level)
    .filter((value): value is number => typeof value === 'number');
  const energyValues = currentLogs
    .map((log) => log.energy_level)
    .filter((value): value is number => typeof value === 'number');
  const priorEnergyValues = priorLogs
    .map((log) => log.energy_level)
    .filter((value): value is number => typeof value === 'number');
  const average = roundAverage(currentLogs.map((log) => log.mood_score));
  const priorAverage = roundAverage(priorLogs.map((log) => log.mood_score));

  return {
    points,
    average,
    priorAverage,
    trend: buildTrendDelta(average, priorAverage),
    volatility: averageAbsoluteDelta(pointScores),
    stressAverage: roundAverage(stressValues),
    stressTrend: buildTrendDelta(roundAverage(stressValues), roundAverage(priorStressValues)),
    energyAverage: roundAverage(energyValues),
    energyTrend: buildTrendDelta(roundAverage(energyValues), roundAverage(priorEnergyValues)),
    logCount: currentLogs.length,
  };
}

function buildHabitItems(
  habits: Habit[],
  logs: Array<Pick<HabitLog, 'habit_id' | 'log_date' | 'completed'>>,
  days: string[],
): MindHabitPattern[] {
  return habits
    .map((habit) => {
      const scheduledDays = days.filter((day) => {
        const dayOfWeek = new Date(`${day}T12:00:00`).getDay();
        return habit.target_days.includes(dayOfWeek);
      });
      const completedDays = scheduledDays.filter((day) =>
        logs.some((log) => log.habit_id === habit.id && log.log_date === day && log.completed),
      );
      const adherencePct = scheduledDays.length > 0
        ? Math.round((completedDays.length / scheduledDays.length) * 100)
        : 0;

      return {
        habit,
        completedDays: completedDays.length,
        totalDays: scheduledDays.length,
        adherencePct,
      };
    })
    .filter((item) => item.totalDays > 0);
}

function averageAdherence(items: MindHabitPattern[]) {
  if (items.length === 0) return null;
  return Math.round(items.reduce((sum, item) => sum + item.adherencePct, 0) / items.length);
}

export function buildHabitPatternSummary(
  habits: Habit[],
  logs: Array<Pick<HabitLog, 'habit_id' | 'log_date' | 'completed'>>,
  days: string[] = buildMindDayRange(),
  priorDays: string[] = buildMindDayRange(days.length, days.length),
): MindHabitSummary {
  const items = buildHabitItems(habits, logs, days);
  const priorItems = buildHabitItems(habits, logs, priorDays);
  const overallAdherencePct = averageAdherence(items);
  const priorOverallAdherencePct = averageAdherence(priorItems);

  return {
    items,
    overallAdherencePct,
    priorOverallAdherencePct,
    adherenceTrend: buildTrendDelta(overallAdherencePct, priorOverallAdherencePct),
    stableHabitCount: items.filter((item) => item.adherencePct >= 70).length,
  };
}

export function buildJournalSummary(
  entries: Array<Pick<JournalEntry, 'entry_date' | 'word_count'>>,
  days: string[] = buildMindDayRange(),
  priorDays: string[] = buildMindDayRange(days.length, days.length),
): MindJournalSummary {
  const allowedDays = new Set(days);
  const priorDaySet = new Set(priorDays);
  const currentEntries = entries.filter((entry) => allowedDays.has(entry.entry_date));
  const priorEntries = entries.filter((entry) => priorDaySet.has(entry.entry_date));
  const currentActiveDays = new Set(currentEntries.map((entry) => entry.entry_date)).size;
  const priorActiveDays = new Set(priorEntries.map((entry) => entry.entry_date)).size;
  const wroteByDay = Object.fromEntries(
    days.map((day) => [day, currentEntries.some((entry) => entry.entry_date === day)]),
  ) as Record<string, boolean>;
  const currentWritingEntries = currentEntries.filter((entry) => (entry.word_count ?? 0) > 0);
  const priorWritingEntries = priorEntries.filter((entry) => (entry.word_count ?? 0) > 0);
  const totalWords = entries.reduce((sum, entry) => sum + (entry.word_count ?? 0), 0);

  return {
    totalWords,
    entryCount: entries.length,
    activeDays: currentActiveDays,
    averageWordsOnWritingDays: currentWritingEntries.length > 0
      ? Math.round(
          currentWritingEntries.reduce((sum, entry) => sum + (entry.word_count ?? 0), 0)
            / currentWritingEntries.length,
        )
      : null,
    frequencyTrend: buildTrendDelta(
      currentActiveDays > 0 ? currentActiveDays : null,
      priorActiveDays > 0 ? priorActiveDays : null,
    ),
    depthTrend: buildTrendDelta(
      currentWritingEntries.length > 0
        ? Math.round(
            currentWritingEntries.reduce((sum, entry) => sum + (entry.word_count ?? 0), 0)
              / currentWritingEntries.length,
          )
        : null,
      priorWritingEntries.length > 0
        ? Math.round(
            priorWritingEntries.reduce((sum, entry) => sum + (entry.word_count ?? 0), 0)
              / priorWritingEntries.length,
          )
        : null,
    ),
    wroteByDay,
  };
}

export function buildMindReflectionCopy(args: {
  moodAverage: number | null;
  moodLogCount: number;
}) {
  if (args.moodLogCount >= 3 && args.moodAverage !== null) {
    return `Your average mood this week is ${args.moodAverage}/10. ${
      args.moodAverage >= 7
        ? 'You seem to be in a good place. Keep paying attention to what is helping.'
        : 'Consider what might be weighing on you this week.'
    }`;
  }

  return 'Log your mood and journal daily to unlock personal pattern insights.';
}

export function buildMindPatternSnapshot(args: {
  moodLogs: Array<Pick<MoodLog, 'logged_at' | 'mood_score' | 'stress_level' | 'energy_level'>>;
  habitLogs: Array<Pick<HabitLog, 'habit_id' | 'log_date' | 'completed'>>;
  habits: Habit[];
  journalEntries: Array<Pick<JournalEntry, 'entry_date' | 'word_count'>>;
  days?: string[];
  priorDays?: string[];
}): MindPatternSnapshot {
  const days = args.days ?? buildMindDayRange();
  const priorDays = args.priorDays ?? buildMindDayRange(days.length, days.length);
  const mood = buildMoodSummary(args.moodLogs, days, priorDays);
  const habits = buildHabitPatternSummary(args.habits, args.habitLogs, days, priorDays);
  const journal = buildJournalSummary(args.journalEntries, days, priorDays);

  return {
    days,
    priorDays,
    mood,
    habits,
    journal,
    reflection: buildMindReflectionCopy({
      moodAverage: mood.average,
      moodLogCount: mood.logCount,
    }),
  };
}

export function buildDailyMindSummary(args: {
  moodScore: number | null;
  journalEntry: Pick<JournalEntry, 'entry_date' | 'word_count'> | null;
  habitsCompleted: number;
  habitsTotal: number;
  date?: string;
}): DailyMindSummary {
  return {
    date: args.date ?? todayDateStr(),
    hasJournalEntry: Boolean(args.journalEntry),
    moodScore: args.moodScore,
    habitsCompleted: args.habitsCompleted,
    habitsTotal: args.habitsTotal,
    wordCount: args.journalEntry?.word_count ?? 0,
  };
}

export function formatMoodAverageLabel(value: number | null) {
  if (value === null) return '—';
  return `${value}`;
}

export function formatMoodDescriptor(value: number | null) {
  if (value === null) return null;
  return `${value}/10 · ${moodLabel(value)}`;
}
