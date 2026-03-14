import type { GoalType } from '@/lib/supabase/database.types';
import type { LifeOsConfidence, LifeOsDomain } from '../types';

export type GoalArchetype = GoalType;
export type GoalObject = 'body_composition' | 'cognitive_output';
export type GoalStrictness = 'light' | 'standard' | 'aggressive';
export type GoalHorizon = '7d' | '30d' | '90d';
export type GoalState = 'active' | 'paused' | 'completed' | 'archived';
export type GoalPriority = 1 | 2 | 3;
export type GoalAlignmentBand = 'aligned' | 'at_risk' | 'misaligned' | 'unclear';
export type GoalRecommendationPriority = 'primary' | 'secondary' | 'watch';
export type GoalRecommendationCategory =
  | 'coverage'
  | 'load'
  | 'sleep'
  | 'hydration'
  | 'nutrition'
  | 'focus'
  | 'recovery'
  | 'consistency'
  | 'mind_support';
export type GoalTargetCode =
  | 'dailyCalorieTarget'
  | 'dailyWaterTargetMl'
  | 'sleepTargetMinutes'
  | 'deepWorkTargetMinutes'
  | 'habitAdherenceTargetPct';
export type GoalSignalCode =
  | 'sleepScore'
  | 'hydrationScore'
  | 'habitAdherenceScore'
  | 'mindStabilityScore'
  | 'recoverySupportScore'
  | 'fragmentationSupportScore'
  | 'focusCapacityScore'
  | 'deadlineSupportScore'
  | 'deepWorkTargetScore'
  | 'calorieTargetScore';
export type GoalSignalMissingReason =
  | 'not_applicable'
  | 'body_summary_missing'
  | 'time_summary_missing'
  | 'mind_summary_missing'
  | 'mind_pattern_missing'
  | 'sleep_missing'
  | 'hydration_missing'
  | 'nutrition_missing'
  | 'habit_adherence_missing'
  | 'mind_stability_missing'
  | 'recovery_missing'
  | 'fragmentation_missing'
  | 'focus_load_missing'
  | 'deadline_pressure_missing'
  | 'deep_work_missing'
  | 'target_missing';
export type GoalConstraintCode =
  | 'protect_sleep'
  | 'protect_recovery'
  | 'cap_focus_load'
  | 'minimum_hydration'
  | 'minimum_habit_adherence'
  | 'prefer_sustainable_path';

export interface GoalConstraint {
  code: GoalConstraintCode;
  enabled: boolean;
  threshold?: number | null;
}

export interface GoalSupportingTargets {
  dailyCalorieTarget?: number | null;
  dailyWaterTargetMl?: number | null;
  sleepTargetMinutes?: number | null;
  deepWorkTargetMinutes?: number | null;
  habitAdherenceTargetPct?: number | null;
}

export interface GoalDefinition {
  id: string;
  archetype: GoalArchetype;
  object: GoalObject;
  title: string;
  priority: GoalPriority;
  strictness: GoalStrictness;
  horizon: GoalHorizon;
  state: GoalState;
  activatedAt: string;
  pausedAt?: string | null;
  constraints: GoalConstraint[];
  supportingHabitIds: string[];
  targets: GoalSupportingTargets;
  assumptions: {
    inferredTargets: GoalTargetCode[];
  };
}

export interface GoalSignalValue {
  code: GoalSignalCode;
  domain: LifeOsDomain;
  score: number | null;
  rawValue: number | string | boolean | null;
  targetValue?: number | null;
  confidence: LifeOsConfidence;
  missingReason?: GoalSignalMissingReason;
  targetInferred?: boolean;
}

export interface GoalSignalSet {
  sleepScore: GoalSignalValue;
  hydrationScore: GoalSignalValue;
  habitAdherenceScore: GoalSignalValue;
  mindStabilityScore: GoalSignalValue;
  recoverySupportScore: GoalSignalValue;
  fragmentationSupportScore: GoalSignalValue;
  focusCapacityScore: GoalSignalValue;
  deadlineSupportScore: GoalSignalValue;
  deepWorkTargetScore: GoalSignalValue;
  calorieTargetScore: GoalSignalValue;
}

export interface GoalDomainSignalWeight {
  code: GoalSignalCode;
  weight: number;
  primary: boolean;
}

export interface GoalDomainAssessment {
  domain: LifeOsDomain;
  weight: number;
  score: number | null;
  band: GoalAlignmentBand;
  confidence: LifeOsConfidence;
  primarySignals: GoalSignalValue[];
  secondarySignals: GoalSignalValue[];
}

export interface GoalAlignmentSignal {
  code: GoalSignalCode;
  label: string;
  domain: LifeOsDomain;
  direction: 'support' | 'block' | 'mixed';
  strength: number;
  confidence: LifeOsConfidence;
  value: number | string | boolean | null;
  unit?: 'score' | 'minutes' | 'pct' | 'count' | 'ratio' | 'calories';
  evidenceObservationCodes: string[];
}

export interface GoalAlignmentRecommendation {
  id: string;
  code: string;
  category: GoalRecommendationCategory;
  priority: GoalRecommendationPriority;
  priorityScore: number;
  domain: LifeOsDomain;
  title: string;
  explanation: string;
  sourceSignalCodes: GoalSignalCode[];
}

export interface GoalAlignmentSnapshot {
  date: string;
  goal: GoalDefinition;
  alignmentScore: number | null;
  alignmentBand: GoalAlignmentBand;
  confidence: LifeOsConfidence;
  domainAssessments: GoalDomainAssessment[];
  blockers: GoalAlignmentSignal[];
  supports: GoalAlignmentSignal[];
  recommendationCandidates: GoalAlignmentRecommendation[];
}

export interface GoalPathModel {
  goalLabel: string;
  currentPath: {
    band: GoalAlignmentBand;
    title: string;
    summary: string;
    evidence: string[];
  };
  moreAlignedPath: {
    title: string;
    summary: string;
    shifts: Array<{
      label: string;
      domain: LifeOsDomain;
      recommendationCode: string;
    }>;
  };
}
