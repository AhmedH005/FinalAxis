import type { LifeOsConfidence } from '../types';
import type { GoalAlignmentBand, GoalStrictness } from './types';

export const STRICTNESS_PROFILE = {
  light: {
    alignedMin: 65,
    atRiskMin: 40,
    criticalDomainFloor: 30,
    blockerSignalFloor: 35,
    urgencyMultiplier: 0.9,
    defaultDeepWorkTargetMinutes: 90,
  },
  standard: {
    alignedMin: 70,
    atRiskMin: 45,
    criticalDomainFloor: 35,
    blockerSignalFloor: 40,
    urgencyMultiplier: 1,
    defaultDeepWorkTargetMinutes: 90,
  },
  aggressive: {
    alignedMin: 75,
    atRiskMin: 50,
    criticalDomainFloor: 45,
    blockerSignalFloor: 50,
    urgencyMultiplier: 1.15,
    defaultDeepWorkTargetMinutes: 90,
  },
} as const;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

export function weightedAverageAvailable(
  values: Array<{ value: number | null; weight: number }>,
): number | null {
  const available = values.filter((item) => item.value !== null);
  if (available.length === 0) return null;

  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  const weightedValue = available.reduce(
    (sum, item) => sum + ((item.value ?? 0) * item.weight),
    0,
  ) / totalWeight;

  return roundScore(weightedValue);
}

export function scoreAgainstTarget(actual: number | null, target: number | null) {
  if (actual === null || target === null || target <= 0) return null;
  return clamp(Math.round((actual / target) * 100), 0, 100);
}

export function scoreLoseCalories(actual: number | null, target: number | null) {
  if (actual === null || target === null || target <= 0) return null;
  if (actual <= target) return 100;
  return clamp(100 - Math.round(((actual - target) / target) * 100), 0, 100);
}

export function scoreGainCalories(actual: number | null, target: number | null) {
  if (actual === null || target === null || target <= 0) return null;
  if (actual >= target) return 100;
  return clamp(100 - Math.round(((target - actual) / target) * 100), 0, 100);
}

export function scoreMaintainCalories(actual: number | null, target: number | null) {
  if (actual === null || target === null || target <= 0) return null;
  return clamp(100 - Math.round((Math.abs(actual - target) / target) * 100), 0, 100);
}

export function invertScore(value: number | null) {
  return value === null ? null : clamp(100 - value, 0, 100);
}

export function mergeConfidence(confidences: LifeOsConfidence[]): LifeOsConfidence {
  if (confidences.length === 0) return 'low';
  if (confidences.includes('low')) return 'low';
  if (confidences.includes('medium')) return 'medium';
  return 'high';
}

export function limitConfidence(
  confidence: LifeOsConfidence,
  upperBound: LifeOsConfidence,
): LifeOsConfidence {
  if (confidence === 'low' || upperBound === 'low') return 'low';
  if (confidence === 'medium' || upperBound === 'medium') return 'medium';
  return 'high';
}

export function classifySignalConfidence(args: {
  hasValue: boolean;
  inferredTarget?: boolean;
  critical?: boolean;
}): LifeOsConfidence {
  if (!args.hasValue) return 'low';
  if (args.inferredTarget || args.critical) return 'medium';
  return 'high';
}

export function confidenceFactor(confidence: LifeOsConfidence) {
  switch (confidence) {
    case 'high':
      return 1;
    case 'medium':
      return 0.85;
    default:
      return 0.6;
  }
}

export function classifyDomainConfidence(args: {
  primaryCount: number;
  primaryAvailable: number;
  primaryConfidences: LifeOsConfidence[];
}): LifeOsConfidence {
  if (args.primaryCount === 0 || args.primaryAvailable === 0) return 'low';
  if (args.primaryAvailable < args.primaryCount) return 'medium';
  return mergeConfidence(args.primaryConfidences);
}

export function classifyDomainBand(args: {
  score: number | null;
  confidence: LifeOsConfidence;
  strictness: GoalStrictness;
}): GoalAlignmentBand {
  if (args.score === null || args.confidence === 'low') return 'unclear';
  const profile = STRICTNESS_PROFILE[args.strictness];
  if (args.score < profile.atRiskMin) return 'misaligned';
  if (args.score < profile.alignedMin) return 'at_risk';
  return 'aligned';
}

export function classifyAlignmentBand(args: {
  score: number | null;
  confidence: LifeOsConfidence;
  strictness: GoalStrictness;
  hasCriticalWeakDomain: boolean;
  availableDomainCount: number;
}): GoalAlignmentBand {
  if (args.score === null || args.confidence === 'low' || args.availableDomainCount < 2) {
    return 'unclear';
  }

  const profile = STRICTNESS_PROFILE[args.strictness];
  if (args.score < profile.atRiskMin) return 'misaligned';
  if (args.score < profile.alignedMin || args.hasCriticalWeakDomain) return 'at_risk';
  return 'aligned';
}
