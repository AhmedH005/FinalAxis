export type BodyFocusTarget = 'hydration' | 'nutrition' | 'sleep' | 'recovery';

export interface BodyFocusSummary {
  title: string;
  summary: string;
  color: string;
  icon: string;
  target: BodyFocusTarget;
}

export function buildBodyFocusSummary(args: {
  hydrationRemainingMl: number;
  calories: number;
  sleepMinutes: number | null;
  recoveryScore: number | null;
}): BodyFocusSummary {
  const {
    hydrationRemainingMl,
    calories,
    sleepMinutes,
    recoveryScore,
  } = args;

  if (hydrationRemainingMl > 0) {
    return {
      title: 'Hydration',
      summary: hydrationRemainingMl >= 1000
        ? `${(hydrationRemainingMl / 1000).toFixed(1)}L left`
        : `${Math.round(hydrationRemainingMl)}ml left`,
      color: '#6AADE4',
      icon: 'water',
      target: 'hydration',
    };
  }

  if (calories === 0) {
    return {
      title: 'Nutrition',
      summary: 'First meal still missing',
      color: '#43D9A3',
      icon: 'food-apple-outline',
      target: 'nutrition',
    };
  }

  if (!sleepMinutes) {
    return {
      title: 'Sleep',
      summary: 'No sleep imported yet',
      color: '#A855F7',
      icon: 'moon-waning-crescent',
      target: 'sleep',
    };
  }

  return {
    title: 'Recovery',
    summary: recoveryScore !== null ? `${recoveryScore}% today` : 'Log check-in',
    color: '#F9B24E',
    icon: 'heart-pulse',
    target: 'recovery',
  };
}
