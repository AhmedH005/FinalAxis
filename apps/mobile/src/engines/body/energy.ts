import type { BiologicalSex, Profile, WorkoutLog } from '@/lib/supabase/database.types';
import type { DailyEnergySummary, IntensityLevel } from './types';

function getAgeYears(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const birthdayPassed = (
    now.getMonth() > dob.getMonth()
    || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())
  );

  if (!birthdayPassed) age -= 1;
  return age > 0 ? age : null;
}

export function estimateBaselineExpenditure(args: {
  weightKg: number | null;
  heightCm: number | null;
  biologicalSex: BiologicalSex | null | undefined;
  dateOfBirth: string | null | undefined;
}) {
  const { weightKg, heightCm, biologicalSex, dateOfBirth } = args;
  if (!weightKg) return null;

  const age = getAgeYears(dateOfBirth);

  if (heightCm && age && biologicalSex && biologicalSex !== 'other') {
    const sexOffset = biologicalSex === 'male' ? 5 : -161;
    return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + sexOffset);
  }

  // Conservative fallback when profile data is incomplete.
  return Math.round(weightKg * 22);
}

function getWorkoutMet(workoutType: string, intensity: IntensityLevel | null | undefined) {
  const type = workoutType.trim().toLowerCase();
  const level = intensity ?? 'moderate';

  const byType: Array<{ match: RegExp; mets: Record<IntensityLevel, number> }> = [
    { match: /(run|jog)/, mets: { low: 7, moderate: 9.8, high: 11.5 } },
    { match: /(walk|hike)/, mets: { low: 2.8, moderate: 3.5, high: 4.3 } },
    { match: /(cycle|bike|spin)/, mets: { low: 4, moderate: 6.8, high: 8.8 } },
    { match: /(strength|lift|hypertrophy|push|pull|legs)/, mets: { low: 3.5, moderate: 5, high: 6.5 } },
    { match: /(hiit|conditioning|circuit)/, mets: { low: 6, moderate: 8.5, high: 10 } },
    { match: /(yoga|pilates|mobility)/, mets: { low: 2.5, moderate: 3, high: 3.5 } },
  ];

  const match = byType.find((entry) => entry.match.test(type));
  return match?.mets[level] ?? { low: 4, moderate: 5.5, high: 7 }[level];
}

export function estimateWorkoutExpenditure(args: {
  workoutType: string;
  durationMinutes: number | null;
  intensity: IntensityLevel | null | undefined;
  bodyWeightKg: number | null;
}) {
  const { workoutType, durationMinutes, intensity, bodyWeightKg } = args;
  if (!bodyWeightKg || !durationMinutes || durationMinutes <= 0) return 0;

  const met = getWorkoutMet(workoutType, intensity);
  return Math.round((met * 3.5 * bodyWeightKg / 200) * durationMinutes);
}

export function estimateMovementExpenditure(args: {
  steps: number | null;
  bodyWeightKg: number | null;
}) {
  const { steps, bodyWeightKg } = args;
  if (!steps || !bodyWeightKg || steps <= 0) return null;

  const stepsAboveBaseline = Math.max(steps - 3000, 0);
  return Math.round(stepsAboveBaseline * bodyWeightKg * 0.00057);
}

export function buildDailyEnergySummary(args: {
  date: string;
  profile: Profile | null | undefined;
  bodyWeightKg: number | null;
  intakeCalories: number;
  steps: number | null;
  workouts: WorkoutLog[];
}) : DailyEnergySummary {
  const { date, profile, bodyWeightKg, intakeCalories, steps, workouts } = args;

  const baseline = estimateBaselineExpenditure({
    weightKg: bodyWeightKg,
    heightCm: profile?.height_cm ?? null,
    biologicalSex: profile?.biological_sex,
    dateOfBirth: profile?.date_of_birth,
  });

  const movement = estimateMovementExpenditure({
    steps,
    bodyWeightKg,
  });

  const workout = workouts.reduce((sum, item) => (
    sum + estimateWorkoutExpenditure({
      workoutType: item.workout_type,
      durationMinutes: item.duration_minutes,
      intensity: item.intensity,
      bodyWeightKg,
    })
  ), 0);

  const totalExpenditure = baseline !== null
    ? baseline + (movement ?? 0) + workout
    : null;

  const balance = totalExpenditure !== null
    ? Math.round(intakeCalories - totalExpenditure)
    : null;

  return {
    date,
    intake_calories: Math.round(intakeCalories),
    baseline_expenditure_calories: baseline,
    movement_expenditure_calories: movement,
    workout_expenditure_calories: workout,
    total_expenditure_calories: totalExpenditure,
    estimated_balance_calories: balance,
    body_weight_kg: bodyWeightKg,
    steps,
    note: totalExpenditure === null
      ? 'Estimate improves once weight and basic profile data are available.'
      : 'Estimated balance combines baseline needs, movement, and workouts. It is directional, not exact.',
  };
}
