import type {
  GoalAlignmentBand,
  GoalArchetype,
  GoalRecommendationPriority,
} from '../goal-alignment/types';
import type {
  LifeOsConfidence,
  LifeOsContextItem,
  LifeOsDomain,
  LifeOsMomentum,
  LifeOsRecoveryRiskLevel,
  LifeOsState,
} from '../types';

export type LifeOsHistorySignalSource = 'life_os' | 'goal_alignment';

export interface LifeOsHistorySignal {
  code: string;
  label: string;
  domain: LifeOsDomain;
  confidence: LifeOsConfidence;
  source: LifeOsHistorySignalSource;
}

export interface LifeOsHistoryGoalRecommendation {
  code: string;
  title: string;
  domain: LifeOsDomain;
  priority: GoalRecommendationPriority;
}

export interface LifeOsHistoryGoalSummary {
  goalId: string;
  goalTitle: string;
  archetype: GoalArchetype;
  alignmentBand: GoalAlignmentBand;
  alignmentScore: number | null;
  confidence: LifeOsConfidence;
  blockers: LifeOsHistorySignal[];
  supports: LifeOsHistorySignal[];
  recommendations: LifeOsHistoryGoalRecommendation[];
}

export interface LifeOsHistoryRecord {
  version: 1;
  date: string;
  recordedAt: string;
  signalCoverage: {
    pct: number;
    confidence: LifeOsConfidence;
    missingDomains: LifeOsDomain[];
  };
  currentState: {
    time: {
      state: LifeOsState;
      focusLoadScore: number;
      deepWorkMinutes: number;
    };
    body: {
      state: LifeOsState;
      recoveryRiskScore: number | null;
      recoveryRiskLevel: LifeOsRecoveryRiskLevel;
      bodyReadinessScore: number | null;
      sleepMinutes: number | null;
    };
    mind: {
      state: LifeOsState;
      mindStabilityScore: number | null;
      moodScore: number | null;
      habitsCompletionPct: number | null;
      hasJournalEntry: boolean;
    };
  };
  momentum: Array<{
    domain: LifeOsDomain;
    direction: LifeOsMomentum;
    confidence: LifeOsConfidence;
    code: string;
  }>;
  blockers: LifeOsHistorySignal[];
  supports: LifeOsHistorySignal[];
  goalAlignment: LifeOsHistoryGoalSummary | null;
}

export interface LifeOsHistoryStore {
  version: 1;
  records: LifeOsHistoryRecord[];
}

export interface LifeOsHistoryPatternItem {
  code: string;
  label: string;
  domain: LifeOsDomain;
  source: LifeOsHistorySignalSource;
  count: number;
  sharePct: number;
  confidence: LifeOsConfidence;
}

export interface LifeOsHistoryShiftCandidate {
  code: string;
  title: string;
  domain: LifeOsDomain;
  count: number;
  confidence: LifeOsConfidence;
}

export interface LifeOsHistoryGoalContext {
  goalId: string;
  goalTitle: string;
  archetype: GoalArchetype;
  activeDays: number;
  mixedGoals: boolean;
}

export type LifeOsWeeklyTrendDirection = 'improving' | 'steady' | 'worsening' | 'mixed' | 'unclear';
export type LifeOsWeeklyConsistencyLevel = 'stable' | 'mixed' | 'fragile' | 'unclear';

export interface LifeOsWeeklyAlignmentTrend {
  direction: LifeOsWeeklyTrendDirection;
  firstBand: GoalAlignmentBand | null;
  lastBand: GoalAlignmentBand | null;
  scoreChange: number | null;
  validDays: number;
}

export interface LifeOsWeeklyConsistencyTrend {
  level: LifeOsWeeklyConsistencyLevel;
  supportiveDays: number;
  blockerHeavyDays: number;
  lowConfidenceDays: number;
}

export interface LifeOsWeeklySummary {
  startDate: string;
  endDate: string;
  recordedDays: number;
  totalDays: number;
  confidence: LifeOsConfidence;
  goal: LifeOsHistoryGoalContext | null;
  recurringBlockers: LifeOsHistoryPatternItem[];
  recurringSupports: LifeOsHistoryPatternItem[];
  alignmentTrend: LifeOsWeeklyAlignmentTrend;
  consistencyTrend: LifeOsWeeklyConsistencyTrend;
  strongestShiftCandidate: LifeOsHistoryShiftCandidate | null;
}

export interface LifeOsWeeklyReflectionModel {
  isAvailable: boolean;
  weekLabel: string | null;
  confidence: LifeOsConfidence | null;
  teaserTitle: string | null;
  teaserSummary: string | null;
  header: {
    title: string | null;
    summary: string | null;
  };
  recurringBlockers: Array<{
    id: string;
    label: string;
    detail: string;
    domain: LifeOsDomain;
  }>;
  recurringSupports: Array<{
    id: string;
    label: string;
    detail: string;
    domain: LifeOsDomain;
  }>;
  alignmentRead: {
    title: string | null;
    summary: string | null;
  };
  strongestShift: {
    title: string | null;
    summary: string | null;
    domain: LifeOsDomain | null;
    code: string | null;
  };
  evidenceNote: string | null;
  emptyState: {
    title: string;
    summary: string;
  } | null;
}

export type LifeOsWeeklySourceItem = LifeOsContextItem;
