import type { Href } from 'expo-router';
import type { IntensityLevel } from '@/engines/body/types';

export const authRoutes = {
  welcome: '/welcome',
  login: '/login',
  signup: '/signup',
  onboardingProfile: '/onboarding/profile',
  onboardingBody: '/onboarding/body',
  onboardingGoals: '/onboarding/goals',
} as const;

export const appRoutes = {
  home: '/',
  goalAlignment: '/goal-alignment',
  dayReshaping: '/day-reshaping',
  weeklyReflection: '/weekly-reflection',
  time: '/time',
  body: '/body',
  bodyNutrition: '/body/nutrition',
  bodyHydration: '/body/hydration',
  bodySleep: '/body/sleep',
  bodyRecovery: '/body/recovery',
  bodyMetrics: '/body/metrics',
  bodyWorkouts: '/body/workouts',
  bodyWorkoutSession: '/body/workouts/session',
  mind: '/mind',
  mindMood: '/mind/mood',
  mindHabits: '/mind/habits',
  mindJournal: '/mind/journal',
  mindPatterns: '/mind/patterns',
  progress: '/progress',
  settings: '/settings',
} as const;

export interface WorkoutSessionRouteParams extends Record<string, string | undefined> {
  programId?: string;
  dayId?: string;
  dayLabel?: string;
  mode?: 'log';
  exerciseIds?: string;
  intensity?: IntensityLevel;
  workoutType?: string;
}

export function timeBlockRoute(blockId: string) {
  return {
    pathname: '/time/[blockId]',
    params: { blockId },
  } as const satisfies Href;
}

export function workoutSessionRoute(params: WorkoutSessionRouteParams = {}) {
  return {
    pathname: appRoutes.bodyWorkoutSession,
    params,
  } as const satisfies Href;
}

export function workoutDetailRoute(workoutId: string) {
  return {
    pathname: '/body/workouts/[workoutId]',
    params: { workoutId },
  } as const satisfies Href;
}

export function journalEntryRoute(id: string) {
  return {
    pathname: '/mind/journal/[id]',
    params: { id },
  } as const satisfies Href;
}
