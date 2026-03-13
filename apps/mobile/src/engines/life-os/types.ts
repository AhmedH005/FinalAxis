import type { GoalType } from '@/lib/supabase/database.types';
import type { DailyBodySummary } from '../body/types';
import type { MindPatternSnapshot } from '../mind/patterns';
import type { DailyMindSummary } from '../mind/types';
import type {
  TimeDailySummary,
  TimeFocusLoadLevel,
  TimePressureLevel,
} from '../time/types';

export type LifeOsDomain = 'time' | 'body' | 'mind';
export type LifeOsConfidence = 'low' | 'medium' | 'high';
export type LifeOsState = 'strong' | 'steady' | 'fragile' | 'unknown';
export type LifeOsMomentum = 'positive' | 'mixed' | 'negative' | 'flat' | 'unknown';
export type LifeOsImbalanceLevel = 'low' | 'moderate' | 'high';
export type LifeOsRecoveryRiskLevel = 'low' | 'moderate' | 'high';
export type LifeOsObservationCategory =
  | 'overload'
  | 'recovery'
  | 'imbalance'
  | 'momentum'
  | 'goal'
  | 'coverage';
export type LifeOsObservationKind = 'warning' | 'tension' | 'strength' | 'support';
export type LifeOsObservationSeverity = 'low' | 'medium' | 'high';
export type LifeOsObservationStance = 'negative' | 'positive' | 'neutral';
export type LifeOsObservationTimeWindow = 'today' | 'recent_7d' | 'today_plus_recent';

export interface LifeOsContextItem {
  code: string;
  domain: LifeOsDomain;
  label: string;
  confidence: LifeOsConfidence;
}

export interface LifeOsContextSnapshot {
  date: string;
  summaries: {
    time: TimeDailySummary | null;
    body: DailyBodySummary | null;
    mind: DailyMindSummary | null;
  };
  mindPattern: MindPatternSnapshot | null;
  currentState: {
    time: {
      state: LifeOsState;
      busyMinutes: number;
      deepWorkMinutes: number;
      focusLoadScore: number;
      focusLoadLevel: TimeFocusLoadLevel;
      deadlinePressure: TimePressureLevel;
    };
    body: {
      state: LifeOsState;
      sleepMinutes: number | null;
      workoutCount: number;
      recoveryScore: number | null;
      estimatedBalanceCalories: number | null;
    };
    mind: {
      state: LifeOsState;
      moodScore: number | null;
      hasJournalEntry: boolean;
      habitsCompletionPct: number | null;
      moodVolatility: number | null;
      moodTrend: number | null;
    };
  };
  signalCoverage: {
    availableDomains: number;
    totalDomains: number;
    pct: number;
    confidence: LifeOsConfidence;
    missingDomains: LifeOsDomain[];
  };
  imbalanceScore: number;
  imbalanceLevel: LifeOsImbalanceLevel;
  recoveryRiskScore: number | null;
  recoveryRiskLevel: LifeOsRecoveryRiskLevel;
  bodyReadinessScore: number | null;
  mindStabilityScore: number | null;
  keyStrengths: LifeOsContextItem[];
  warnings: LifeOsContextItem[];
  momentum: Array<{
    domain: LifeOsDomain;
    direction: LifeOsMomentum;
    confidence: LifeOsConfidence;
    code: string;
  }>;
  goalAlignment: {
    goalType: GoalType | null;
    caloriesOnTarget: boolean | null;
    hydrationOnTarget: boolean | null;
    sleepOnTarget: boolean | null;
    habitsOnTrack: boolean | null;
  } | null;
}

export interface LifeOsContextSnapshotInput {
  date: string;
  time: TimeDailySummary | null;
  body: DailyBodySummary | null;
  mind: DailyMindSummary | null;
  mindPattern?: MindPatternSnapshot | null;
  goals?: {
    goal_type?: GoalType | null;
    daily_calorie_target?: number | null;
    daily_water_target_ml?: number | null;
    sleep_target_minutes?: number | null;
  } | null;
}

export interface LifeOsRelatedMetric {
  key: string;
  value: number | string | boolean | null;
  unit?: 'score' | 'minutes' | 'pct' | 'count' | 'ratio' | 'calories';
}

export interface LifeOsObservation {
  id: string;
  code: string;
  category: LifeOsObservationCategory;
  kind: LifeOsObservationKind;
  stance: LifeOsObservationStance;
  severity: LifeOsObservationSeverity;
  confidence: LifeOsConfidence;
  sourceDomains: LifeOsDomain[];
  title: string;
  explanation: string;
  timeWindow: LifeOsObservationTimeWindow;
  relatedMetrics: LifeOsRelatedMetric[];
}
