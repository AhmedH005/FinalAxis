import type { Href } from 'expo-router';
import type { IntensityLevel } from '@/engines/body';

type RouteBuilder = (...args: never[]) => Href;

type StaticRouteMap = Record<string, string>;

type StaticRouteValue<T extends StaticRouteMap> = T[keyof T];

export const authRoutes = {
  welcome: '/(auth)/welcome',
  login: '/(auth)/login',
  signup: '/(auth)/signup',
  onboardingProfile: '/(auth)/onboarding/profile',
  onboardingBody: '/(auth)/onboarding/body',
  onboardingGoals: '/(auth)/onboarding/goals',
} as const;

export const appRoutes = {
  home: '/(app)',
  time: '/(app)/time',
  body: '/(app)/body',
  bodyNutrition: '/(app)/body/nutrition',
  bodyHydration: '/(app)/body/hydration',
  bodySleep: '/(app)/body/sleep',
  bodyRecovery: '/(app)/body/recovery',
  bodyMetrics: '/(app)/body/metrics',
  bodyWorkouts: '/(app)/body/workouts',
  bodyWorkoutSession: '/(app)/body/workouts/session',
  mind: '/(app)/mind',
  mindMood: '/(app)/mind/mood',
  mindHabits: '/(app)/mind/habits',
  mindJournal: '/(app)/mind/journal',
  mindPatterns: '/(app)/mind/patterns',
  progress: '/(app)/progress',
  settings: '/(app)/settings',
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
    pathname: '/(app)/time/[blockId]',
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
    pathname: '/(app)/body/workouts/[workoutId]',
    params: { workoutId },
  } as const satisfies Href;
}

export function journalEntryRoute(id: string) {
  return {
    pathname: '/(app)/mind/journal/[id]',
    params: { id },
  } as const satisfies Href;
}

export const appTabRoutes = [
  appRoutes.home,
  appRoutes.time,
  appRoutes.body,
  appRoutes.mind,
  appRoutes.settings,
] as const;

export type AuthRoute = StaticRouteValue<typeof authRoutes>;
export type AppStaticRoute = StaticRouteValue<typeof appRoutes>;
export type AppDynamicRoute =
  | ReturnType<typeof timeBlockRoute>
  | ReturnType<typeof workoutSessionRoute>
  | ReturnType<typeof workoutDetailRoute>
  | ReturnType<typeof journalEntryRoute>;
export type AppRoute = AuthRoute | AppStaticRoute | AppDynamicRoute;
export type NavigationRoute =
  | AuthRoute
  | AppStaticRoute
  | AppDynamicRoute
  | RouteBuilder;
