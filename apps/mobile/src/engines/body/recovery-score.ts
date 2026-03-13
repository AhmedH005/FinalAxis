export interface RecoveryScoreInput {
  sleepMinutes: number | null;
  energy: number | null;
  fatigue: number | null;
  soreness: number | null;
  sleepTargetMinutes?: number;
}

export function computeRecoveryScore(input: RecoveryScoreInput) {
  const sleepTarget = input.sleepTargetMinutes ?? 480;
  const parts: number[] = [];

  if (input.sleepMinutes) parts.push(Math.min(1, input.sleepMinutes / sleepTarget));
  if (input.energy) parts.push(input.energy / 5);
  if (input.fatigue) parts.push(1 - (input.fatigue - 1) / 4);
  if (input.soreness) parts.push(1 - (input.soreness - 1) / 4);

  if (parts.length === 0) return null;

  return Math.round((parts.reduce((sum, part) => sum + part, 0) / parts.length) * 100);
}
