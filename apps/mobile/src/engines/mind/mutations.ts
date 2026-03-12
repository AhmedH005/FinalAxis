import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { todayDateStr, countWords } from './utils';
import type { EntryType, HabitCategory } from './types';

// ─── Journal ──────────────────────────────────────────────────────────────────

interface CreateEntryInput {
  title?: string | null;
  body?: string;
  entry_type?: EntryType;
  entry_date?: string;
  tags?: string[];
}

export function useCreateJournalEntry() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEntryInput = {}) => {
      const body = input.body ?? '';
      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id:    session!.user.id,
          title:      input.title ?? null,
          body,
          entry_type: input.entry_type ?? 'journal',
          entry_date: input.entry_date ?? todayDateStr(),
          tags:       input.tags ?? [],
          word_count: countWords(body),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mind', 'journal'] });
    },
  });
}

interface UpdateEntryInput {
  id: string;
  title?: string | null;
  body?: string;
  tags?: string[];
  mood_score?: number | null;
  is_pinned?: boolean;
}

export function useUpdateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body, ...rest }: UpdateEntryInput) => {
      const patch: Record<string, unknown> = { ...rest };
      if (body !== undefined) {
        patch.body       = body;
        patch.word_count = countWords(body);
      }
      const { error } = await supabase
        .from('journal_entries')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mind', 'journal'] });
    },
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mind', 'journal'] });
    },
  });
}

// ─── Mood ──────────────────────────────────────────────────────────────────────

interface AddMoodInput {
  mood_score: number;
  energy_level?: number | null;
  stress_level?: number | null;
  note?: string | null;
  tags?: string[];
}

export function useAddMoodLog() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddMoodInput) => {
      const { error } = await supabase.from('mood_logs').insert({
        user_id:      session!.user.id,
        logged_at:    new Date().toISOString(),
        mood_score:   input.mood_score,
        energy_level: input.energy_level ?? null,
        stress_level: input.stress_level ?? null,
        note:         input.note ?? null,
        tags:         input.tags ?? [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mind', 'mood'] });
    },
  });
}

export function useDeleteMoodLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('mood_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mind', 'mood'] });
    },
  });
}

// ─── Habits ───────────────────────────────────────────────────────────────────

interface CreateHabitInput {
  name: string;
  description?: string | null;
  category?: HabitCategory;
  target_days?: number[];
}

export function useCreateHabit() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateHabitInput) => {
      const { error } = await supabase.from('habits').insert({
        user_id:     session!.user.id,
        name:        input.name.trim(),
        description: input.description ?? null,
        category:    input.category ?? 'mind',
        target_days: input.target_days ?? [0, 1, 2, 3, 4, 5, 6],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mind', 'habits'] });
    },
  });
}

interface UpdateHabitInput {
  id: string;
  name?: string;
  description?: string | null;
  target_days?: number[];
  sort_order?: number;
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: UpdateHabitInput) => {
      const { error } = await supabase.from('habits').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mind', 'habits'] });
    },
  });
}

/** Soft-deletes a habit by setting is_active = false, preserving logs. */
export function useArchiveHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('habits').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mind', 'habits'] });
    },
  });
}

// ─── Habit Logs ───────────────────────────────────────────────────────────────

interface ToggleHabitInput {
  habit_id:  string;
  log_date:  string; // YYYY-MM-DD
  completed: boolean;
}

export function useToggleHabitLog() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ habit_id, log_date, completed }: ToggleHabitInput) => {
      const { error } = await supabase.from('habit_logs').upsert(
        { user_id: session!.user.id, habit_id, log_date, completed },
        { onConflict: 'user_id,habit_id,log_date' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mind', 'habit_logs'] });
    },
  });
}
