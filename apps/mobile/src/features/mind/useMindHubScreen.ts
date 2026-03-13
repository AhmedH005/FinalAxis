import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { appRoutes, journalEntryRoute } from '@/types/navigation';
import {
  buildDailyMindSummary,
  formatFullDate,
  getDailyPrompt,
  getGreeting,
  isHabitScheduledToday,
  todayDateStr,
  useAddMoodLog,
  useCreateJournalEntry,
  useHabitsWithStatus,
  useTodayJournalEntry,
  useTodayMood,
  useToggleHabitLog,
} from '@/engines/mind';

export function useMindHubScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const today = todayDateStr();

  const { data: todayEntry, isLoading: entryLoading } = useTodayJournalEntry();
  const { data: todayMood } = useTodayMood();
  const { data: habits, isLoading: habitsLoading } = useHabitsWithStatus();

  const addMood = useAddMoodLog();
  const toggleHabit = useToggleHabitLog();
  const createEntry = useCreateJournalEntry();

  const todayHabits = useMemo(
    () => habits.filter((habit) => isHabitScheduledToday(habit)),
    [habits],
  );
  const completedCount = todayHabits.filter((habit) => habit.todayCompleted).length;
  const dailySummary = buildDailyMindSummary({
    moodScore: todayMood?.mood_score ?? null,
    journalEntry: todayEntry,
    habitsCompleted: completedCount,
    habitsTotal: todayHabits.length,
    date: today,
  });

  return {
    greeting: getGreeting(profile?.full_name),
    dateLabel: formatFullDate(),
    prompt: getDailyPrompt(),
    todayEntry,
    entryLoading,
    todayMood,
    habitsLoading,
    todayHabits,
    completedCount,
    dailySummary,
    isCreatingEntry: createEntry.isPending,
    isSavingMood: addMood.isPending,
    openRoute: (route: typeof appRoutes[keyof typeof appRoutes]) => router.push(route),
    handleBeginWriting: () => {
      if (entryLoading) return;
      if (todayEntry) {
        router.push(journalEntryRoute(todayEntry.id));
        return;
      }

      createEntry.mutate(
        { entry_type: 'journal', entry_date: today },
        { onSuccess: (entry) => router.push(journalEntryRoute(entry.id)) },
      );
    },
    handleQuickMood: (score: number) => {
      if (todayMood) return;
      addMood.mutate({ mood_score: score });
    },
    handleToggleHabit: (habitId: string, completed: boolean) => {
      toggleHabit.mutate({ habit_id: habitId, log_date: today, completed });
    },
    openMood: () => router.push(appRoutes.mindMood),
    openHabits: () => router.push(appRoutes.mindHabits),
  };
}
