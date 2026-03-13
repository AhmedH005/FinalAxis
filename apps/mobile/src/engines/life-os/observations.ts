import type { DailyBodySummary } from '../body/types';
import type { MindPatternSnapshot } from '../mind/patterns';
import type { TimeDailySummary } from '../time/types';
import type {
  LifeOsConfidence,
  LifeOsContextSnapshot,
  LifeOsDomain,
  LifeOsObservation,
  LifeOsObservationCategory,
  LifeOsObservationKind,
  LifeOsObservationSeverity,
  LifeOsObservationStance,
  LifeOsObservationTimeWindow,
  LifeOsRelatedMetric,
} from './types';

function confidenceRank(confidence: LifeOsConfidence) {
  switch (confidence) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    default:
      return 1;
  }
}

function minConfidence(...confidences: LifeOsConfidence[]): LifeOsConfidence {
  const lowest = confidences.reduce(
    (current, candidate) => (confidenceRank(candidate) < confidenceRank(current) ? candidate : current),
    'high' as LifeOsConfidence,
  );

  return lowest;
}

function buildBodyConfidence(body: DailyBodySummary | null): LifeOsConfidence {
  if (!body) return 'low';

  const hasSleep = body.sleep_minutes !== null;
  const hasRecovery = body.recovery?.recovery_score !== null && body.recovery?.recovery_score !== undefined;

  if (hasSleep && hasRecovery) return 'high';
  if (hasSleep || hasRecovery) return 'medium';
  return 'low';
}

function buildHydrationSleepConfidence(body: DailyBodySummary | null): LifeOsConfidence {
  if (!body) return 'low';

  const hasSleep = body.sleep_minutes !== null;
  const hasHydration = body.hydration !== null;

  if (hasSleep && hasHydration) return 'high';
  if (hasSleep || hasHydration) return 'medium';
  return 'low';
}

function buildMoodConfidence(mindPattern: MindPatternSnapshot | null): LifeOsConfidence {
  const logCount = mindPattern?.mood.logCount ?? 0;
  if (logCount >= 3) return 'high';
  if (logCount >= 1) return 'medium';
  return 'low';
}

function buildHabitConfidence(mindPattern: MindPatternSnapshot | null): LifeOsConfidence {
  const habitCount = mindPattern?.habits.items.length ?? 0;
  if (habitCount >= 2) return 'high';
  if (habitCount >= 1) return 'medium';
  return 'low';
}

function kindToStance(kind: LifeOsObservationKind): LifeOsObservationStance {
  switch (kind) {
    case 'warning':
    case 'tension':
      return 'negative';
    case 'strength':
    case 'support':
      return 'positive';
    default:
      return 'neutral';
  }
}

function buildObservationId(
  code: string,
  date: string,
  timeWindow: LifeOsObservationTimeWindow,
) {
  return `${code}:${date}:${timeWindow}`;
}

function buildObservation(args: {
  snapshot: LifeOsContextSnapshot;
  code: string;
  category: LifeOsObservationCategory;
  kind: LifeOsObservationKind;
  severity: LifeOsObservationSeverity;
  confidence: LifeOsConfidence;
  sourceDomains: LifeOsDomain[];
  title: string;
  explanation: string;
  timeWindow: LifeOsObservationTimeWindow;
  relatedMetrics: LifeOsRelatedMetric[];
}): LifeOsObservation {
  return {
    id: buildObservationId(args.code, args.snapshot.date, args.timeWindow),
    code: args.code,
    category: args.category,
    kind: args.kind,
    stance: kindToStance(args.kind),
    severity: args.severity,
    confidence: args.confidence,
    sourceDomains: args.sourceDomains,
    title: args.title,
    explanation: args.explanation,
    timeWindow: args.timeWindow,
    relatedMetrics: args.relatedMetrics,
  };
}

function getTimeConfidence(time: TimeDailySummary | null): LifeOsConfidence {
  return time?.signalCoverage.confidence ?? 'low';
}

function formatScore(value: number | null) {
  return value === null ? 'unknown' : `${Math.round(value)}`;
}

function pushObservation(
  observations: LifeOsObservation[],
  observation: LifeOsObservation | null,
) {
  if (observation) observations.push(observation);
}

function buildCoverageObservation(snapshot: LifeOsContextSnapshot) {
  if (snapshot.signalCoverage.pct >= 45) return null;

  const severity: LifeOsObservationSeverity = snapshot.signalCoverage.pct < 30 ? 'high' : 'medium';

  return buildObservation({
    snapshot,
    code: 'low_signal_coverage',
    category: 'coverage',
    kind: 'warning',
    severity,
    confidence: 'high',
    sourceDomains: ['time', 'body', 'mind'],
    title: 'Signal coverage is too thin for a strong read',
    explanation: `${snapshot.signalCoverage.pct}% of the expected daily signals are available across Time, Body, and Mind. Keep today’s interpretation conservative until more inputs land.`,
    timeWindow: 'today',
    relatedMetrics: [
      { key: 'signal_coverage_pct', value: snapshot.signalCoverage.pct, unit: 'pct' },
      { key: 'available_domains', value: snapshot.signalCoverage.availableDomains, unit: 'count' },
    ],
  });
}

function buildImbalanceObservation(snapshot: LifeOsContextSnapshot) {
  if (snapshot.imbalanceLevel !== 'high') return null;

  const time = snapshot.summaries.time;
  const loadRecoveryGap = snapshot.bodyReadinessScore !== null && time
    ? Math.max(0, time.focusLoadScore - snapshot.bodyReadinessScore)
    : null;
  const loadMindGap = snapshot.mindStabilityScore !== null && time
    ? Math.max(0, time.focusLoadScore - snapshot.mindStabilityScore)
    : null;
  const coveragePenalty = 100 - snapshot.signalCoverage.pct;
  const dominantDriver = [
    {
      label: 'cognitive load is outrunning recovery',
      value: loadRecoveryGap,
    },
    {
      label: 'cognitive load is outrunning emotional stability',
      value: loadMindGap,
    },
    {
      label: 'signal coverage is still thin',
      value: coveragePenalty,
    },
  ]
    .filter((item): item is { label: string; value: number } => item.value !== null)
    .sort((left, right) => right.value - left.value)[0];

  return buildObservation({
    snapshot,
    code: 'cross_engine_imbalance',
    category: 'imbalance',
    kind: 'tension',
    severity: 'high',
    confidence: snapshot.signalCoverage.confidence,
    sourceDomains: ['time', 'body', 'mind'],
    title: 'The day is materially out of balance',
    explanation: `Cross-engine imbalance is high at ${formatScore(snapshot.imbalanceScore)}. The main driver is that ${dominantDriver?.label ?? 'multiple systems are pulling in different directions'}.`,
    timeWindow: 'today_plus_recent',
    relatedMetrics: [
      { key: 'imbalance_score', value: snapshot.imbalanceScore, unit: 'score' },
      { key: 'focus_load_score', value: time?.focusLoadScore ?? null, unit: 'score' },
      { key: 'body_readiness_score', value: snapshot.bodyReadinessScore, unit: 'score' },
      { key: 'mind_stability_score', value: snapshot.mindStabilityScore, unit: 'score' },
      { key: 'signal_coverage_pct', value: snapshot.signalCoverage.pct, unit: 'pct' },
    ],
  });
}

function buildFocusRecoveryObservation(snapshot: LifeOsContextSnapshot) {
  const time = snapshot.summaries.time;
  if (!time || snapshot.bodyReadinessScore === null) return null;
  if (time.focusLoadScore < 70 || snapshot.bodyReadinessScore >= 45) return null;

  const gap = time.focusLoadScore - snapshot.bodyReadinessScore;
  const severity: LifeOsObservationSeverity = gap >= 35 ? 'high' : 'medium';

  return buildObservation({
    snapshot,
    code: 'high_focus_load_low_recovery',
    category: 'overload',
    kind: 'warning',
    severity,
    confidence: minConfidence(
      getTimeConfidence(time),
      buildBodyConfidence(snapshot.summaries.body),
      snapshot.signalCoverage.confidence,
    ),
    sourceDomains: ['time', 'body'],
    title: 'High focus load is colliding with low recovery',
    explanation: `Today’s focus load is ${time.focusLoadScore} while body readiness is ${formatScore(snapshot.bodyReadinessScore)}. The schedule is asking more than recovery looks ready to support.`,
    timeWindow: 'today',
    relatedMetrics: [
      { key: 'focus_load_score', value: time.focusLoadScore, unit: 'score' },
      { key: 'body_readiness_score', value: snapshot.bodyReadinessScore, unit: 'score' },
      { key: 'deep_work_minutes', value: time.deepWorkMinutes, unit: 'minutes' },
    ],
  });
}

function buildDeadlineRecoveryObservation(snapshot: LifeOsContextSnapshot) {
  const time = snapshot.summaries.time;
  if (!time || snapshot.recoveryRiskScore === null) return null;
  if (time.deadlinePressure.level !== 'high' || snapshot.recoveryRiskScore < 60) return null;

  const severity: LifeOsObservationSeverity =
    time.deadlinePressure.overdueScheduledTaskCount > 0 || snapshot.recoveryRiskScore >= 70
      ? 'high'
      : 'medium';

  return buildObservation({
    snapshot,
    code: 'deadline_pressure_recovery_collision',
    category: 'recovery',
    kind: 'warning',
    severity,
    confidence: minConfidence(
      getTimeConfidence(time),
      buildBodyConfidence(snapshot.summaries.body),
      snapshot.signalCoverage.confidence,
    ),
    sourceDomains: ['time', 'body'],
    title: 'Deadline pressure is colliding with recovery risk',
    explanation: `Deadline pressure is high and recovery risk is ${formatScore(snapshot.recoveryRiskScore)}. That combination usually compresses decision quality and makes the day harder to absorb.`,
    timeWindow: 'today',
    relatedMetrics: [
      { key: 'deadline_pressure_score', value: time.deadlinePressure.score, unit: 'score' },
      { key: 'overdue_scheduled_task_count', value: time.deadlinePressure.overdueScheduledTaskCount, unit: 'count' },
      { key: 'recovery_risk_score', value: snapshot.recoveryRiskScore, unit: 'score' },
    ],
  });
}

function buildWorkloadMindObservation(snapshot: LifeOsContextSnapshot) {
  const time = snapshot.summaries.time;
  const mindPattern = snapshot.mindPattern;
  const moodTrend = mindPattern?.mood.trend?.change ?? null;
  const moodLogCount = mindPattern?.mood.logCount ?? 0;

  if (!time || snapshot.mindStabilityScore === null || moodTrend === null) return null;
  if (time.focusLoadScore < 60 || snapshot.mindStabilityScore >= 50 || moodTrend >= -1 || moodLogCount < 3) {
    return null;
  }

  const severity: LifeOsObservationSeverity =
    moodTrend <= -2 || snapshot.mindStabilityScore < 35 ? 'high' : 'medium';

  return buildObservation({
    snapshot,
    code: 'workload_rising_mind_stability_falling',
    category: 'imbalance',
    kind: 'tension',
    severity,
    confidence: minConfidence(
      getTimeConfidence(time),
      buildMoodConfidence(mindPattern),
      snapshot.signalCoverage.confidence,
    ),
    sourceDomains: ['time', 'mind'],
    title: 'Workload is rising while emotional stability is falling',
    explanation: `Focus load is ${time.focusLoadScore}, mind stability is ${formatScore(snapshot.mindStabilityScore)}, and recent mood trend is ${moodTrend.toFixed(1)}. The workload pattern is starting to lean against emotional capacity.`,
    timeWindow: 'today_plus_recent',
    relatedMetrics: [
      { key: 'focus_load_score', value: time.focusLoadScore, unit: 'score' },
      { key: 'mind_stability_score', value: snapshot.mindStabilityScore, unit: 'score' },
      { key: 'mood_trend', value: moodTrend, unit: 'score' },
      { key: 'mood_log_count', value: moodLogCount, unit: 'count' },
    ],
  });
}

function buildSleepHydrationObservation(snapshot: LifeOsContextSnapshot) {
  if (!snapshot.goalAlignment || snapshot.goalAlignment.sleepOnTarget !== false || snapshot.goalAlignment.hydrationOnTarget !== false) {
    return null;
  }

  const severity: LifeOsObservationSeverity =
    (snapshot.recoveryRiskScore ?? 0) >= 60 || snapshot.currentState.body.state === 'fragile'
      ? 'high'
      : 'medium';

  return buildObservation({
    snapshot,
    code: 'sleep_and_hydration_below_target',
    category: 'recovery',
    kind: 'warning',
    severity,
    confidence: minConfidence(
      buildHydrationSleepConfidence(snapshot.summaries.body),
      snapshot.signalCoverage.confidence,
    ),
    sourceDomains: ['body'],
    title: 'Sleep and hydration are both below target',
    explanation: 'Both recovery basics missed their target today. That usually raises fragility before the heavier work even starts to bite.',
    timeWindow: 'today',
    relatedMetrics: [
      { key: 'sleep_on_target', value: snapshot.goalAlignment.sleepOnTarget },
      { key: 'hydration_on_target', value: snapshot.goalAlignment.hydrationOnTarget },
      { key: 'recovery_risk_score', value: snapshot.recoveryRiskScore, unit: 'score' },
    ],
  });
}

function buildFocusedWorkObservation(snapshot: LifeOsContextSnapshot) {
  const time = snapshot.summaries.time;
  if (!time) return null;
  if (time.deepWorkMinutes < 90 || time.fragmentation.level !== 'low') return null;

  return buildObservation({
    snapshot,
    code: 'focused_work_protected',
    category: 'momentum',
    kind: 'strength',
    severity: 'medium',
    confidence: minConfidence(getTimeConfidence(time), snapshot.signalCoverage.confidence),
    sourceDomains: ['time'],
    title: 'Focused work is protected',
    explanation: `${time.deepWorkMinutes} minutes of deep work landed with low fragmentation. The day has at least one clear stretch of usable focus.`,
    timeWindow: 'today',
    relatedMetrics: [
      { key: 'deep_work_minutes', value: time.deepWorkMinutes, unit: 'minutes' },
      { key: 'fragmentation_score', value: time.fragmentation.score, unit: 'score' },
      { key: 'largest_focus_window_minutes', value: time.fragmentation.largestFocusWindowMinutes, unit: 'minutes' },
    ],
  });
}

function buildRecoverySupportObservation(snapshot: LifeOsContextSnapshot) {
  if (snapshot.bodyReadinessScore === null || snapshot.recoveryRiskScore === null) return null;
  if (snapshot.bodyReadinessScore < 70 || snapshot.recoveryRiskScore >= 35) return null;

  return buildObservation({
    snapshot,
    code: 'recovery_foundation_supportive',
    category: 'recovery',
    kind: 'strength',
    severity: 'medium',
    confidence: minConfidence(
      buildBodyConfidence(snapshot.summaries.body),
      snapshot.signalCoverage.confidence,
    ),
    sourceDomains: ['body'],
    title: 'Recovery foundation is supportive',
    explanation: `Body readiness is ${formatScore(snapshot.bodyReadinessScore)} and recovery risk is ${formatScore(snapshot.recoveryRiskScore)}. Recovery inputs are supporting the day instead of constraining it.`,
    timeWindow: 'today',
    relatedMetrics: [
      { key: 'body_readiness_score', value: snapshot.bodyReadinessScore, unit: 'score' },
      { key: 'recovery_risk_score', value: snapshot.recoveryRiskScore, unit: 'score' },
      { key: 'sleep_minutes', value: snapshot.currentState.body.sleepMinutes, unit: 'minutes' },
    ],
  });
}

function buildHabitGoalObservation(snapshot: LifeOsContextSnapshot) {
  const adherencePct = snapshot.mindPattern?.habits.overallAdherencePct ?? null;
  if (!snapshot.goalAlignment?.goalType || snapshot.goalAlignment.habitsOnTrack !== true || adherencePct === null || adherencePct < 70) {
    return null;
  }

  return buildObservation({
    snapshot,
    code: 'habits_support_goal',
    category: 'goal',
    kind: 'support',
    severity: 'medium',
    confidence: minConfidence(
      buildHabitConfidence(snapshot.mindPattern),
      snapshot.signalCoverage.confidence,
    ),
    sourceDomains: ['mind'],
    title: 'Current habits are supporting the active goal',
    explanation: `Recent habit adherence is ${adherencePct}%, and the active goal is still aligned with today’s habit pattern.`,
    timeWindow: 'recent_7d',
    relatedMetrics: [
      { key: 'habit_adherence_pct', value: adherencePct, unit: 'pct' },
      { key: 'stable_habit_count', value: snapshot.mindPattern?.habits.stableHabitCount ?? null, unit: 'count' },
      { key: 'goal_type', value: snapshot.goalAlignment.goalType },
    ],
  });
}

function buildPositiveMomentumObservation(snapshot: LifeOsContextSnapshot) {
  const positiveMomentum = snapshot.momentum.filter((item) => item.direction === 'positive');
  if (positiveMomentum.length < 2 || snapshot.momentum.some((item) => item.direction === 'negative')) {
    return null;
  }

  return buildObservation({
    snapshot,
    code: 'positive_cross_engine_momentum',
    category: 'momentum',
    kind: 'support',
    severity: 'low',
    confidence: minConfidence(
      snapshot.signalCoverage.confidence,
      ...positiveMomentum.map((item) => item.confidence),
    ),
    sourceDomains: positiveMomentum.map((item) => item.domain),
    title: 'Momentum is stacking across engines',
    explanation: `${positiveMomentum.map((item) => item.domain).join(', ')} are all moving in a supportive direction without a negative counter-signal showing up elsewhere.`,
    timeWindow: 'today_plus_recent',
    relatedMetrics: [
      { key: 'positive_momentum_count', value: positiveMomentum.length, unit: 'count' },
      { key: 'signal_coverage_pct', value: snapshot.signalCoverage.pct, unit: 'pct' },
    ],
  });
}

export function buildLifeOsObservations(
  snapshot: LifeOsContextSnapshot,
): LifeOsObservation[] {
  const observations: LifeOsObservation[] = [];

  pushObservation(observations, buildCoverageObservation(snapshot));
  pushObservation(observations, buildImbalanceObservation(snapshot));
  pushObservation(observations, buildFocusRecoveryObservation(snapshot));
  pushObservation(observations, buildDeadlineRecoveryObservation(snapshot));
  pushObservation(observations, buildWorkloadMindObservation(snapshot));
  pushObservation(observations, buildSleepHydrationObservation(snapshot));
  pushObservation(observations, buildFocusedWorkObservation(snapshot));
  pushObservation(observations, buildRecoverySupportObservation(snapshot));
  pushObservation(observations, buildHabitGoalObservation(snapshot));
  pushObservation(observations, buildPositiveMomentumObservation(snapshot));

  return observations;
}
