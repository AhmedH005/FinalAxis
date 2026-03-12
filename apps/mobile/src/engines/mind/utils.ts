import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
import { color } from '@axis/theme';
import type { MoodDescriptor, Habit, HabitLog } from './types';

// ─── Accent color for Mind Engine ─────────────────────────────────────────────
export const MIND_COLOR = '#A855F7';

// ─── Mood ─────────────────────────────────────────────────────────────────────

export const MOOD_DESCRIPTORS: MoodDescriptor[] = [
  { score: 1,  label: 'exhausted', color: color.danger,    emoji: '😔' },
  { score: 2,  label: 'heavy',     color: color.danger,    emoji: '😔' },
  { score: 3,  label: 'struggling',color: color.warn,      emoji: '😐' },
  { score: 4,  label: 'meh',       color: color.warn,      emoji: '😐' },
  { score: 5,  label: 'okay',      color: color.text.muted,emoji: '🙂' },
  { score: 6,  label: 'decent',    color: color.text.muted,emoji: '🙂' },
  { score: 7,  label: 'good',      color: color.success,   emoji: '😊' },
  { score: 8,  label: 'great',     color: color.success,   emoji: '😊' },
  { score: 9,  label: 'alive',     color: MIND_COLOR,      emoji: '🤩' },
  { score: 10, label: 'radiant',   color: MIND_COLOR,      emoji: '🤩' },
];

// Five "quick select" buckets shown in the hub mood strip (score = midpoint of bucket)
export const MOOD_BUCKETS = [
  { score: 2,  label: 'heavy', emoji: '😔' },
  { score: 4,  label: 'meh',   emoji: '😐' },
  { score: 6,  label: 'okay',  emoji: '🙂' },
  { score: 8,  label: 'good',  emoji: '😊' },
  { score: 10, label: 'great', emoji: '🤩' },
];

export function getMoodDescriptor(score: number): MoodDescriptor {
  const idx = Math.max(0, Math.min(9, Math.round(score) - 1));
  return MOOD_DESCRIPTORS[idx];
}

export function moodColor(score: number): string {
  return getMoodDescriptor(score).color;
}

export function moodEmoji(score: number): string {
  return getMoodDescriptor(score).emoji;
}

export function moodLabel(score: number): string {
  return getMoodDescriptor(score).label;
}

// ─── Writing Prompts ──────────────────────────────────────────────────────────

const PROMPTS = [
  'What made you pause today?',
  'What are you grateful for right now?',
  "What's weighing on your mind?",
  'Describe your mood in three words.',
  'What would make today feel complete?',
  "What's one thing you've been avoiding — and why?",
  'What did you learn today?',
  'Who or what gave you energy today?',
  'What do you want to let go of?',
  'What is the most honest thing you could write right now?',
  'What are you afraid of right now?',
  'What does a good day look like for you?',
  "What's changed in you this week?",
  'What conversation needs to happen?',
  'What are you proud of today?',
  "What's one small thing that went right?",
  'What are you craving more of?',
  'Which habit is serving you? Which one is not?',
  'Where did your energy go today?',
  'What would your future self want you to remember?',
  'What did you feel — not just think — today?',
  "What's the story you keep telling yourself?",
  'What are you still figuring out?',
  'What do you want more space for?',
  "What's underneath your stress right now?",
  'What small thing brought you joy today?',
  'What are you ready to change?',
  'What do you wish someone understood about you?',
  "What's your body telling you?",
  'If today had a title, what would it be?',
];

/** Returns the same prompt for the full calendar day (stable across re-renders). */
export function getDailyPrompt(): string {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return PROMPTS[dayOfYear % PROMPTS.length];
}

// ─── Greeting & Date ──────────────────────────────────────────────────────────

export function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  const base =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
                'Good evening';
  return name ? `${base}, ${name.split(' ')[0]}` : base;
}

export function formatFullDate(): string {
  return format(new Date(), 'EEEE, MMMM d');
}

export function todayDateStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatEntryDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`); // noon avoids timezone edge cases
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, MMM d');
}

export function formatEntryTime(isoString: string): string {
  return format(new Date(isoString), 'h:mm a');
}

export function formatMonthHeader(dateStr: string): string {
  return format(new Date(`${dateStr}T12:00:00`), 'MMMM yyyy');
}

// ─── Word Count ───────────────────────────────────────────────────────────────

export function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export function wordCountLabel(count: number): string {
  return count === 1 ? '1 word' : `${count} words`;
}

// ─── Habit Utils ──────────────────────────────────────────────────────────────

export function isHabitScheduledToday(habit: Habit): boolean {
  return habit.target_days.includes(new Date().getDay());
}

/** Computes current streak from a list of habit logs (newest first or any order). */
export function computeStreak(logs: HabitLog[]): number {
  if (!logs.length) return 0;

  const completedDates = [...new Set(
    logs.filter(l => l.completed).map(l => l.log_date)
  )].sort().reverse();

  if (!completedDates.length) return 0;

  const today     = todayDateStr();
  const yesterday = format(new Date(Date.now() - 86_400_000), 'yyyy-MM-dd');

  // Streak must touch today or yesterday to be alive
  if (completedDates[0] !== today && completedDates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < completedDates.length; i++) {
    const prev = new Date(`${completedDates[i - 1]}T12:00:00`);
    const curr = new Date(`${completedDates[i]}T12:00:00`);
    if (differenceInCalendarDays(prev, curr) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function streakLabel(streak: number): string {
  if (streak === 0) return 'Start today';
  if (streak === 1) return '1 day';
  return `${streak} days`;
}

export function habitFrequencyLabel(targetDays: number[]): string {
  if (targetDays.length === 7) return 'Every day';
  if (targetDays.length === 5 && !targetDays.includes(0) && !targetDays.includes(6)) return 'Weekdays';
  if (targetDays.length === 2 && targetDays.includes(0) && targetDays.includes(6)) return 'Weekends';
  const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  return targetDays.sort().map(d => names[d]).join(' · ');
}
