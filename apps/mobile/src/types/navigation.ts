// Navigation type helpers.
// Expo Router uses file-based typed routes — this file documents the app's route tree
// for reference and for use with useRouter() + router.push().

export type AuthRoute =
  | '/(auth)/welcome'
  | '/(auth)/login'
  | '/(auth)/signup'
  | '/(auth)/onboarding/profile'
  | '/(auth)/onboarding/body'
  | '/(auth)/onboarding/goals';

export type AppRoute =
  | '/(app)'
  | '/(app)/time'
  | `/(app)/time/${string}`
  | '/(app)/body'
  | '/(app)/body/nutrition'
  | '/(app)/body/hydration'
  | '/(app)/body/sleep'
  | '/(app)/body/workouts'
  | '/(app)/body/metrics'
  | '/(app)/progress'
  | '/(app)/settings';

export type AppScreenRoute = AuthRoute | AppRoute;
