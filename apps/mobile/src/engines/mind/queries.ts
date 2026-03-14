import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay } from 'date-fns';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import { todayDateStr } from './utils';
import type { HabitWithStatus } from './types';

// ─── Journal ─────────────────────────────────────────────────────────────────

export function useJournalEntries(limit = 40) {
  return useQuery({
    queryKey: ['mind', 'journal', 'list', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentJournalEntries(days = 30) {
  return useQuery({
    queryKey: ['mind', 'journal', 'recent', days],
    queryFn: async () => {
      const since = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .gte('entry_date', since)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTodayJournalEntry() {
  const date = todayDateStr();
  return useQuery({
    queryKey: ['mind', 'journal', 'today', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('entry_date', date)
        .eq('entry_type', 'journal')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useJournalEntry(id: string | null) {
  return useQuery({
    queryKey: ['mind', 'journal', 'entry', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useJournalStreak() {
  return useQuery({
    queryKey: ['mind', 'journal', 'streak'],
    queryFn: async () => {
      const since = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('journal_entries')
        .select('entry_date')
        .gte('entry_date', since)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      if (!data?.length) return 0;

      const unique = [...new Set(data.map(e => e.entry_date))].sort().reverse();
      const today  = todayDateStr();
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

      if (unique[0] !== today && unique[0] !== yesterday) return 0;

      let streak = 1;
      for (let i = 1; i < unique.length; i++) {
        const diff =
          (new Date(`${unique[i - 1]}T12:00:00`).getTime() -
           new Date(`${unique[i]}T12:00:00`).getTime()) / 86_400_000;
        if (Math.round(diff) === 1) streak++;
        else break;
      }
      return streak;
    },
    staleTime: 60 * 1000,
  });
}

// ─── Mood ──────────────────────────────────────────────────────────────────────

export function useTodayMood() {
  const date = todayDateStr();
  return useQuery({
    queryKey: ['mind', 'mood', 'today', date],
    queryFn: async () => {
      const start = new Date(`${date}T00:00:00`).toISOString();
      const end   = new Date(`${date}T23:59:59.999`).toISOString();
      const { data, error } = await supabase
        .from('mood_logs')
        .select('*')
        .gte('logged_at', start)
        .lte('logged_at', end)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentMoodLogs(days = 14) {
  return useQuery({
    queryKey: ['mind', 'mood', 'recent', days],
    queryFn: async () => {
      const start = startOfDay(subDays(new Date(), days - 1)).toISOString();
      const { data, error } = await supabase
        .from('mood_logs')
        .select('*')
        .gte('logged_at', start)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export function useHabits() {
  return useQuery({
    queryKey: ['mind', 'habits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at',  { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useTodayHabitLogs() {
  const date = todayDateStr();
  return useQuery({
    queryKey: ['mind', 'habit_logs', 'today', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('log_date', date);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useHabitLogsRecent(habitId: string, days = 30) {
  return useQuery({
    queryKey: ['mind', 'habit_logs', 'recent', habitId, days],
    queryFn: async () => {
      const since = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('habit_id', habitId)
        .gte('log_date', since)
        .order('log_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!habitId,
  });
}

export function useHabitsWithStatus(): { data: HabitWithStatus[]; isLoading: boolean } {
  const { data: habits  = [], isLoading: habitsLoading } = useHabits();
  const { data: todayLogs = [], isLoading: logsLoading }  = useTodayHabitLogs();

  const data = useMemo<HabitWithStatus[]>(
    () => habits.map(habit => {
      const log = todayLogs.find(l => l.habit_id === habit.id);
      return {
        ...habit,
        todayCompleted: log?.completed ?? false,
        streak: 0,
      };
    }),
    [habits, todayLogs],
  );

  return { data, isLoading: habitsLoading || logsLoading };
}

export function useRecentHabitLogs(days = 14) {
  return useQuery({
    queryKey: ['mind', 'habit_logs', 'recent', days],
    queryFn: async () => {
      const since = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('habit_logs')
        .select('habit_id, log_date, completed')
        .gte('log_date', since)
        .order('log_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
