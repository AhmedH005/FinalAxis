// Mind Engine — domain types

export type EntryType = 'journal' | 'quick_thought' | 'note' | 'reflection';
export type HabitCategory = 'mind' | 'body' | 'time' | 'life';

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  entry_type: EntryType;
  entry_date: string; // YYYY-MM-DD
  mood_score: number | null;
  tags: string[];
  word_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface MoodLog {
  id: string;
  user_id: string;
  logged_at: string;
  mood_score: number;
  energy_level: number | null;
  stress_level: number | null;
  note: string | null;
  tags: string[];
  journal_entry_id: string | null;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  target_days: number[]; // 0 = Sunday … 6 = Saturday
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string; // YYYY-MM-DD
  completed: boolean;
  note: string | null;
  created_at: string;
}

export interface HabitWithStatus extends Habit {
  todayCompleted: boolean;
  streak: number;
}

export interface MoodDescriptor {
  score: number;
  label: string;
  color: string;
  emoji: string;
}

export interface DailyMindSummary {
  date: string;
  hasJournalEntry: boolean;
  moodScore: number | null;
  habitsCompleted: number;
  habitsTotal: number;
  wordCount: number;
}
