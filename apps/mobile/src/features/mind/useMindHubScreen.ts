import { useCallback, useMemo, useRef } from 'react';
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

  // Stable refs so mutation callbacks don't change on every render
  const addMoodRef = useRef(addMood);
  addMoodRef.current = addMood;
  const toggleHabitRef = useRef(toggleHabit);
  toggleHabitRef.current = toggleHabit;
  const createEntryRef = useRef(createEntry);
  createEntryRef.current = createEntry;
  const todayMoodRef = useRef(todayMood);
  todayMoodRef.current = todayMood;
  const todayEntryRef = useRef(todayEntry);
  todayEntryRef.current = todayEntry;
  const entryLoadingRef = useRef(entryLoading);
  entryLoadingRef.current = entryLoading;
  const todayRef = useRef(today);
  todayRef.current = today;

  const todayHabits = useMemo(
    () => habits.filter((habit) => isHabitScheduledToday(habit)),
    [habits],
  );
  const completedCount = useMemo(
    () => todayHabits.filter((habit) => habit.todayCompleted).length,
    [todayHabits],
  );
  const dailySummary = useMemo(() => buildDailyMindSummary({
    moodScore: todayMood?.mood_score ?? null,
    journalEntry: todayEntry,
    habitsCompleted: completedCount,
    habitsTotal: todayHabits.length,
    date: today,
  }), [completedCount, today, todayEntry, todayHabits.length, todayMood?.mood_score]);

  const greeting = useMemo(() => getGreeting(profile?.full_name), [profile?.full_name]);
  const dateLabel = useMemo(() => formatFullDate(), []);
  const prompt = useMemo(() => getDailyPrompt(), []);

  const openRoute = useCallback(
    (route: typeof appRoutes[keyof typeof appRoutes]) => router.push(route),
    [router],
  );

  // Stable callbacks — read from refs so useMutation's ever-changing object doesn't bust memo()
  const handleBeginWriting = useCallback(() => {
    if (entryLoadingRef.current) return;
    const entry = todayEntryRef.current;
    if (entry) {
      router.push(journalEntryRoute(entry.id));
      return;
    }
    createEntryRef.current.mutate(
      { entry_type: 'journal', entry_date: todayRef.current },
      { onSuccess: (newEntry) => router.push(journalEntryRoute(newEntry.id)) },
    );
  }, [router]);

  const handleQuickMood = useCallback((score: number) => {
    if (todayMoodRef.current) return;
    addMoodRef.current.mutate({ mood_score: score });
  }, []);

  const handleToggleHabit = useCallback((habitId: string, completed: boolean) => {
    toggleHabitRef.current.mutate({ habit_id: habitId, log_date: todayRef.current, completed });
  }, []);

  const openMood = useCallback(() => router.push(appRoutes.mindMood), [router]);
  const openHabits = useCallback(() => router.push(appRoutes.mindHabits), [router]);

  return {
    greeting,
    dateLabel,
    prompt,
    todayEntry,
    entryLoading,
    todayMood,
    habitsLoading,
    todayHabits,
    completedCount,
    dailySummary,
    isCreatingEntry: createEntry.isPending,
    isSavingMood: addMood.isPending,
    openRoute,
    handleBeginWriting,
    handleQuickMood,
    handleToggleHabit,
    openMood,
    openHabits,
  };
}
