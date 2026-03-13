import { useMemo } from 'react';
import { color } from '@axis/theme';
import {
  MIND_COLOR,
  buildMindDayRange,
  buildMindPatternSnapshot,
  formatMoodAverageLabel,
  useHabits,
  useJournalStreak,
  useRecentHabitLogs,
  useRecentJournalEntries,
  useRecentMoodLogs,
  moodColor,
} from '@/engines/mind';

const PATTERN_DAYS = 7;
const PATTERN_HISTORY_DAYS = 14;
const JOURNAL_HISTORY_DAYS = 30;

function formatWordTotal(totalWords: number) {
  return totalWords > 999 ? `${(totalWords / 1000).toFixed(1)}k` : `${totalWords}`;
}

export function useMindPatternsScreen() {
  const { data: moodLogs = [] } = useRecentMoodLogs(PATTERN_HISTORY_DAYS);
  const { data: habitLogs = [] } = useRecentHabitLogs(PATTERN_HISTORY_DAYS);
  const { data: habits = [] } = useHabits();
  const { data: journalStreak = 0 } = useJournalStreak();
  const { data: journalEntries = [] } = useRecentJournalEntries(JOURNAL_HISTORY_DAYS);

  const days = useMemo(() => buildMindDayRange(PATTERN_DAYS), []);
  const snapshot = useMemo(
    () => buildMindPatternSnapshot({ moodLogs, habitLogs, habits, journalEntries, days }),
    [days, habitLogs, habits, journalEntries, moodLogs],
  );

  return {
    snapshot,
    journalStreak,
    hasHabitData: snapshot.habits.items.length > 0,
    insights: [
      {
        icon: 'notebook-outline',
        label: 'Journal streak',
        value: journalStreak === 0 ? '—' : `${journalStreak}d`,
        color: MIND_COLOR,
      },
      {
        icon: 'pencil-outline',
        label: 'Words written',
        value: formatWordTotal(snapshot.journal.totalWords),
        color: color.success,
      },
      {
        icon: 'emoticon-outline',
        label: 'Avg mood (7d)',
        value: formatMoodAverageLabel(snapshot.mood.average),
        color: snapshot.mood.average !== null ? moodColor(snapshot.mood.average) : color.text.muted,
      },
    ],
  };
}
