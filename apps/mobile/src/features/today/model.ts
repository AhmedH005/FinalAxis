import { color } from '@axis/theme';
import { MIND_COLOR, moodEmoji, moodLabel } from '@/engines/mind';

export type TodayTarget =
  | 'mind'
  | 'mind-patterns'
  | 'mind-habits'
  | 'body-sleep'
  | 'body-hydration'
  | 'body-nutrition'
  | 'body-workouts'
  | 'progress';

export interface SignalCoverageSummary {
  count: number;
  total: number;
  pct: number;
  color: string;
  message: string;
}

export interface AxisReadSummary {
  icon: string;
  accent: string;
  headline: string;
  detail: string;
  cta: string;
  target: TodayTarget;
}

export interface TodayActionSummary {
  icon?: string;
  iconColor?: string;
  eyebrow?: string;
  title: string;
  detail: string;
  cta: string;
  target: TodayTarget;
}

export function formatSignedCalories(value: number | null) {
  if (value === null) return 'Estimating...';
  return `${value > 0 ? '+' : ''}${value} kcal`;
}

export function buildSignalCoverageSummary(args: {
  totalMl: number;
  calories: number;
  sleepMinutes: number;
  workoutsCount: number;
  moodScore: number | null;
  journalWords: number;
}): SignalCoverageSummary {
  const checks = [
    args.totalMl > 0,
    args.calories > 0,
    args.sleepMinutes > 0,
    args.workoutsCount > 0,
    args.moodScore !== null,
    args.journalWords > 0,
  ];
  const count = checks.filter(Boolean).length;
  const total = checks.length;
  const pct = Math.round((count / total) * 100);
  const summaryColor = pct >= 75
    ? color.success
    : pct >= 45
    ? color.warn
    : color.danger;
  const message = count <= 2
    ? 'Capture a few more signals. AXIS gets sharper with context.'
    : count <= 4
    ? 'The day is coming into focus. One more check-in will sharpen the read.'
    : 'Body and mind are both in view. Review the pattern layer while the day is still fresh.';

  return {
    count,
    total,
    pct,
    color: summaryColor,
    message,
  };
}

export function buildAxisRead(args: {
  totalMl: number;
  waterTarget: number;
  sleepMinutes: number;
  sleepTarget: number;
  calories: number;
  moodScore: number | null;
  journalWords: number;
  completedHabits: number;
  totalHabits: number;
}): AxisReadSummary {
  const hydrationLow = args.totalMl < args.waterTarget * 0.5;
  const sleepLow = args.sleepMinutes === 0 || args.sleepMinutes < args.sleepTarget * 0.85;
  const moodLow = args.moodScore !== null && args.moodScore <= 4;
  const moodStrong = args.moodScore !== null && args.moodScore >= 7;
  const hasReflection = args.journalWords > 0;
  const habitConsistency = args.totalHabits > 0 ? args.completedHabits / args.totalHabits : null;

  if (args.moodScore === null && !hasReflection) {
    return {
      icon: 'brain',
      accent: MIND_COLOR,
      headline: 'Your internal signals are still missing.',
      detail: 'Log a mood or write a few lines so AXIS can interpret more than body data.',
      cta: 'Open mind',
      target: 'mind',
    };
  }

  if (sleepLow && moodLow) {
    return {
      icon: 'weather-night',
      accent: '#A855F7',
      headline: 'Low recovery is likely shaping today.',
      detail: 'Sleep and mood are both under pressure. Keep the day narrow and protect essentials first.',
      cta: 'Check sleep',
      target: 'body-sleep',
    };
  }

  if (hydrationLow) {
    return {
      icon: 'water',
      accent: '#6AADE4',
      headline: 'Body basics are the main constraint right now.',
      detail: sleepLow
        ? 'Hydration is behind and recovery looks light. Fix the physical baseline before judging the day.'
        : 'Hydration is still lagging. A simple physical reset may improve the rest of the day.',
      cta: 'Log water',
      target: 'body-hydration',
    };
  }

  if (moodStrong && habitConsistency !== null && habitConsistency >= 0.6) {
    return {
      icon: 'check-decagram-outline',
      accent: color.success,
      headline: 'Your routine is creating stability today.',
      detail: hasReflection
        ? 'Mood and consistency are aligned. This is a good day to capture what is working.'
        : 'Mood is strong and your habits are moving. Add a short reflection while the pattern is clear.',
      cta: 'See patterns',
      target: 'mind-patterns',
    };
  }

  if (args.sleepMinutes > 0 && args.calories > 0 && hasReflection) {
    return {
      icon: 'chart-line',
      accent: '#60A5FA',
      headline: 'You have enough signal to read the shape of the day.',
      detail: 'Body and mind are both checked in. Compare today against recent patterns while the context is fresh.',
      cta: 'Open patterns',
      target: 'progress',
    };
  }

  return {
    icon: 'tune-variant',
    accent: color.warn,
    headline: 'The picture is forming, but one more signal will sharpen it.',
    detail: args.sleepMinutes === 0
      ? 'Start with last night\'s sleep so your body baseline is complete.'
      : args.moodScore === null
      ? 'A quick mood check-in would add context to everything else you have logged.'
      : 'A short journal reflection will make this day easier to understand later.',
    cta: args.sleepMinutes === 0 ? 'Log sleep' : 'Add context',
    target: args.sleepMinutes === 0 ? 'body-sleep' : 'mind',
  };
}

export function buildReflectionAction(args: {
  moodScore: number | null;
  journalWords: number;
}): TodayActionSummary {
  if (args.journalWords > 0) {
    return {
      title: `${args.journalWords} words captured`,
      detail: 'Keep writing while the day is fresh. This is the context layer AXIS cannot infer on its own.',
      cta: 'Continue',
      target: 'mind',
    };
  }

  if (args.moodScore !== null) {
    return {
      title: `${moodEmoji(args.moodScore)} ${moodLabel(args.moodScore)} logged`,
      detail: 'Turn that feeling into context with a quick reflection or note.',
      cta: 'Reflect',
      target: 'mind',
    };
  }

  return {
    title: 'No mind signal yet',
    detail: 'Add mood or reflection so AXIS can interpret more than body data.',
    cta: 'Check in',
    target: 'mind',
  };
}

export function buildSupplementalAction(args: {
  sleepMinutes: number;
  workoutsCount: number;
  completedHabits: number;
  totalHabits: number;
}): TodayActionSummary {
  const habitPct = args.totalHabits > 0
    ? Math.round((args.completedHabits / args.totalHabits) * 100)
    : null;

  if (args.sleepMinutes === 0) {
    return {
      icon: 'moon-waning-crescent',
      iconColor: '#A855F7',
      eyebrow: 'Sleep',
      title: 'No sleep check-in yet',
      detail: 'Recovery changes how the rest of your data should be read.',
      cta: 'Log sleep',
      target: 'body-sleep',
    };
  }

  if (args.workoutsCount === 0) {
    return {
      icon: 'dumbbell',
      iconColor: '#F9B24E',
      eyebrow: 'Movement',
      title: 'No movement logged today',
      detail: 'Capture training or a session when it happens so the energy picture stays honest.',
      cta: 'Log workout',
      target: 'body-workouts',
    };
  }

  if (habitPct !== null && habitPct < 100) {
    return {
      icon: 'check-circle-outline',
      iconColor: MIND_COLOR,
      eyebrow: 'Consistency',
      title: `${args.completedHabits}/${args.totalHabits} habits complete`,
      detail: 'One more repetition may be the difference between intention and a real pattern.',
      cta: 'Open habits',
      target: 'mind-habits',
    };
  }

  return {
    icon: 'chart-line',
    iconColor: '#60A5FA',
    eyebrow: 'Patterns',
    title: 'The system has enough to compare',
    detail: 'Use the pattern layer to see what today looks like against recent signals.',
    cta: 'Review',
    target: 'progress',
  };
}
