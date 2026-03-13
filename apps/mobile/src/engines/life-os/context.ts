import type { DailyBodySummary } from '../body/types';
import type { MindPatternSnapshot } from '../mind/patterns';
import type { DailyMindSummary } from '../mind/types';
import type { TimeDailySummary } from '../time/types';
import type {
  LifeOsConfidence,
  LifeOsContextItem,
  LifeOsContextSnapshot,
  LifeOsContextSnapshotInput,
  LifeOsDomain,
  LifeOsImbalanceLevel,
  LifeOsMomentum,
  LifeOsRecoveryRiskLevel,
  LifeOsState,
} from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function weightedAverageAvailable(
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

function classifyConfidence(pct: number): LifeOsConfidence {
  if (pct >= 75) return 'high';
  if (pct >= 45) return 'medium';
  return 'low';
}

function classifyLevel(score: number): LifeOsImbalanceLevel {
  if (score >= 70) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

function classifyRecoveryRiskLevel(score: number | null): LifeOsRecoveryRiskLevel {
  if (score === null) return 'low';
  if (score >= 70) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

function buildBodyCoverage(body: DailyBodySummary | null) {
  if (!body) return 0;

  const checks = [
    (body.hydration?.total_ml ?? 0) > 0,
    (body.nutrition?.total_calories ?? 0) > 0,
    (body.sleep_minutes ?? 0) > 0,
    (body.recovery?.recovery_score ?? body.recovery?.steps ?? null) !== null,
    body.workout_count > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function buildMindCoverage(mind: DailyMindSummary | null, mindPattern: MindPatternSnapshot | null | undefined) {
  if (!mind) return 0;

  const checks = [
    mind.moodScore !== null,
    mind.hasJournalEntry || mind.wordCount > 0,
    mind.habitsTotal > 0,
    Boolean(
      mindPattern
      && (
        mindPattern.mood.logCount > 0
        || mindPattern.journal.entryCount > 0
        || mindPattern.habits.items.length > 0
      ),
    ),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function buildSignalCoverage(args: {
  time: TimeDailySummary | null;
  body: DailyBodySummary | null;
  mind: DailyMindSummary | null;
  mindPattern?: MindPatternSnapshot | null;
}) {
  const availableDomains = [
    args.time ? 'time' : null,
    args.body ? 'body' : null,
    args.mind ? 'mind' : null,
  ].filter((domain): domain is LifeOsDomain => domain !== null);
  const missingDomains = (['time', 'body', 'mind'] as const).filter(
    (domain) => !availableDomains.includes(domain),
  );
  const timeCoverage = args.time?.signalCoverage.pct ?? 0;
  const bodyCoverage = buildBodyCoverage(args.body);
  const mindCoverage = buildMindCoverage(args.mind, args.mindPattern);
  const pct = Math.round((timeCoverage + bodyCoverage + mindCoverage) / 3);

  return {
    availableDomains: availableDomains.length,
    totalDomains: 3,
    pct,
    confidence: classifyConfidence(pct),
    missingDomains: [...missingDomains],
  };
}

function buildBodyReadinessScore(body: DailyBodySummary | null, sleepTargetMinutes: number) {
  if (!body) return null;

  const sleepReadinessScore = body.sleep_minutes !== null
    ? clamp(Math.round((body.sleep_minutes / sleepTargetMinutes) * 100), 0, 100)
    : null;

  return weightedAverageAvailable([
    { value: body.recovery?.recovery_score ?? null, weight: 0.6 },
    { value: sleepReadinessScore, weight: 0.4 },
  ]);
}

function buildMindStabilityScore(mindPattern: MindPatternSnapshot | null | undefined) {
  if (!mindPattern) return null;

  const volatility = mindPattern.mood.volatility;
  const trend = mindPattern.mood.trend?.change ?? null;
  const mindVolatilityScore = volatility !== null
    ? clamp(Math.round((volatility / 3) * 100), 0, 100)
    : null;
  const mindTrendPenalty = trend !== null && trend < 0
    ? clamp(Math.round(Math.abs(trend) * 20), 0, 100)
    : 0;
  const strainScore = weightedAverageAvailable([
    { value: mindVolatilityScore, weight: 0.7 },
    { value: mindTrendPenalty, weight: 0.3 },
  ]);

  return strainScore !== null ? roundScore(100 - strainScore) : null;
}

function buildRecoveryRiskScore(args: {
  body: DailyBodySummary | null;
  time: TimeDailySummary | null;
  sleepTargetMinutes: number;
}) {
  if (!args.body && !args.time) return null;

  const sleepReadinessScore = args.body?.sleep_minutes !== null && args.body?.sleep_minutes !== undefined
    ? clamp(Math.round(((args.body.sleep_minutes ?? 0) / args.sleepTargetMinutes) * 100), 0, 100)
    : null;
  const sleepPenalty = sleepReadinessScore !== null ? 100 - sleepReadinessScore : null;
  const recoveryPenalty = args.body?.recovery?.recovery_score !== null && args.body?.recovery?.recovery_score !== undefined
    ? 100 - (args.body.recovery?.recovery_score ?? 0)
    : null;
  const workoutLoadScore = args.body?.energy?.workout_expenditure_calories !== null && args.body?.energy?.workout_expenditure_calories !== undefined
    ? clamp(Math.round(((args.body.energy?.workout_expenditure_calories ?? 0) / 600) * 100), 0, 100)
    : null;

  return weightedAverageAvailable([
    { value: recoveryPenalty, weight: 0.4 },
    { value: sleepPenalty, weight: 0.3 },
    { value: args.time?.focusLoadScore ?? null, weight: 0.2 },
    { value: workoutLoadScore, weight: 0.1 },
  ]);
}

function buildTimeState(time: TimeDailySummary | null): LifeOsState {
  if (!time) return 'unknown';
  if (
    time.focusLoadLevel === 'high'
    || time.deadlinePressure.level === 'high'
    || time.fragmentation.level === 'high'
  ) {
    return 'fragile';
  }
  if (
    time.focusLoadLevel === 'low'
    && time.deadlinePressure.level === 'low'
    && time.fragmentation.level === 'low'
  ) {
    return 'strong';
  }
  return 'steady';
}

function buildBodyState(bodyReadinessScore: number | null, recoveryRiskScore: number | null): LifeOsState {
  if (bodyReadinessScore === null) return 'unknown';
  if (bodyReadinessScore < 35 || (recoveryRiskScore ?? 0) >= 70) return 'fragile';
  if (bodyReadinessScore >= 70 && (recoveryRiskScore ?? 0) < 35) return 'strong';
  return 'steady';
}

function buildMindState(mind: DailyMindSummary | null, mindStabilityScore: number | null): LifeOsState {
  if (!mind && mindStabilityScore === null) return 'unknown';
  if ((mind?.moodScore ?? 10) <= 4 || (mindStabilityScore !== null && mindStabilityScore < 35)) {
    return 'fragile';
  }
  if ((mind?.moodScore ?? 0) >= 7 || (mindStabilityScore !== null && mindStabilityScore >= 70)) {
    return 'strong';
  }
  return 'steady';
}

function pushItem(
  items: LifeOsContextItem[],
  item: LifeOsContextItem | null,
) {
  if (item) items.push(item);
}

function buildMomentum(args: {
  time: TimeDailySummary | null;
  body: DailyBodySummary | null;
  mind: DailyMindSummary | null;
  mindPattern?: MindPatternSnapshot | null;
  mindStabilityScore: number | null;
  bodyReadinessScore: number | null;
  recoveryRiskScore: number | null;
}): Array<{ domain: LifeOsDomain; direction: LifeOsMomentum; confidence: LifeOsConfidence; code: string }> {
  const timeDirection: LifeOsMomentum = !args.time
    ? 'unknown'
    : args.time.blockCount === 0
    ? 'flat'
    : args.time.focusLoadLevel === 'high' || args.time.deadlinePressure.level === 'high'
    ? 'negative'
    : args.time.deepWorkMinutes >= 90 && args.time.fragmentation.level === 'low'
    ? 'positive'
    : 'mixed';

  const bodyDirection: LifeOsMomentum = !args.body
    ? 'unknown'
    : (args.recoveryRiskScore ?? 0) >= 70
    ? 'negative'
    : (args.bodyReadinessScore ?? 0) >= 70
    ? 'positive'
    : args.body.workout_count === 0 && (args.body.sleep_minutes ?? 0) === 0
    ? 'flat'
    : 'mixed';

  const mindDirection: LifeOsMomentum = !args.mind
    ? 'unknown'
    : (args.mind.moodScore ?? 10) <= 4 || (args.mindStabilityScore ?? 100) < 35
    ? 'negative'
    : (args.mind.moodScore ?? 0) >= 7 || (args.mindStabilityScore ?? 0) >= 70
    ? 'positive'
    : !args.mind.hasJournalEntry && args.mind.moodScore === null
    ? 'flat'
    : 'mixed';

  return [
    {
      domain: 'time',
      direction: timeDirection,
      confidence: args.time?.signalCoverage.confidence ?? 'low',
      code: `time-${timeDirection}`,
    },
    {
      domain: 'body',
      direction: bodyDirection,
      confidence: args.body ? classifyConfidence(buildBodyCoverage(args.body)) : 'low',
      code: `body-${bodyDirection}`,
    },
    {
      domain: 'mind',
      direction: mindDirection,
      confidence: args.mind ? classifyConfidence(buildMindCoverage(args.mind, args.mindPattern)) : 'low',
      code: `mind-${mindDirection}`,
    },
  ];
}

export function buildLifeOsContextSnapshot(
  input: LifeOsContextSnapshotInput,
): LifeOsContextSnapshot {
  const sleepTargetMinutes = input.goals?.sleep_target_minutes ?? 480;
  const signalCoverage = buildSignalCoverage({
    time: input.time,
    body: input.body,
    mind: input.mind,
    mindPattern: input.mindPattern,
  });
  const bodyReadinessScore = buildBodyReadinessScore(input.body, sleepTargetMinutes);
  const mindStabilityScore = buildMindStabilityScore(input.mindPattern);
  const recoveryRiskScore = buildRecoveryRiskScore({
    body: input.body,
    time: input.time,
    sleepTargetMinutes,
  });

  const loadRecoveryGap = bodyReadinessScore !== null && input.time
    ? Math.max(0, input.time.focusLoadScore - bodyReadinessScore)
    : null;
  const loadMindGap = mindStabilityScore !== null && input.time
    ? Math.max(0, input.time.focusLoadScore - mindStabilityScore)
    : null;
  const coveragePenalty = 100 - signalCoverage.pct;
  const imbalanceScore = weightedAverageAvailable([
    { value: loadRecoveryGap, weight: 0.45 },
    { value: loadMindGap, weight: 0.35 },
    { value: coveragePenalty, weight: 0.2 },
  ]) ?? coveragePenalty;

  const habitsCompletionPct = input.mind && input.mind.habitsTotal > 0
    ? Math.round((input.mind.habitsCompleted / input.mind.habitsTotal) * 100)
    : null;
  const moodTrend = input.mindPattern?.mood.trend?.change ?? null;
  const moodVolatility = input.mindPattern?.mood.volatility ?? null;

  const keyStrengths: LifeOsContextItem[] = [];
  pushItem(
    keyStrengths,
    input.time && input.time.deepWorkMinutes >= 90 && input.time.fragmentation.level === 'low'
      ? { code: 'time-focus-protected', domain: 'time', label: 'Focused workload is protected', confidence: input.time.signalCoverage.confidence }
      : null,
  );
  pushItem(
    keyStrengths,
    bodyReadinessScore !== null && bodyReadinessScore >= 70
      ? { code: 'body-ready', domain: 'body', label: 'Recovery inputs are supportive', confidence: classifyConfidence(bodyReadinessScore) }
      : null,
  );
  pushItem(
    keyStrengths,
    mindStabilityScore !== null && mindStabilityScore >= 70
      ? { code: 'mind-stable', domain: 'mind', label: 'Mood pattern is stable', confidence: classifyConfidence(mindStabilityScore) }
      : null,
  );
  pushItem(
    keyStrengths,
    signalCoverage.pct >= 75
      ? { code: 'coverage-strong', domain: 'time', label: 'Cross-engine signal coverage is strong', confidence: signalCoverage.confidence }
      : null,
  );

  const warnings: LifeOsContextItem[] = [];
  pushItem(
    warnings,
    input.time && input.time.focusLoadLevel === 'high'
      ? { code: 'time-load-high', domain: 'time', label: 'Cognitive load is elevated', confidence: input.time.signalCoverage.confidence }
      : null,
  );
  pushItem(
    warnings,
    recoveryRiskScore !== null && recoveryRiskScore >= 70
      ? { code: 'recovery-risk-high', domain: 'body', label: 'Recovery risk is elevated', confidence: classifyConfidence(recoveryRiskScore) }
      : null,
  );
  pushItem(
    warnings,
    mindStabilityScore !== null && mindStabilityScore < 35
      ? { code: 'mind-stability-low', domain: 'mind', label: 'Mind stability is under pressure', confidence: classifyConfidence(100 - mindStabilityScore) }
      : null,
  );
  pushItem(
    warnings,
    imbalanceScore >= 70
      ? { code: 'cross-engine-imbalance', domain: 'time', label: 'Engines are materially out of balance', confidence: classifyConfidence(imbalanceScore) }
      : null,
  );
  pushItem(
    warnings,
    signalCoverage.pct < 45
      ? { code: 'coverage-thin', domain: 'time', label: 'Signal coverage is still thin', confidence: signalCoverage.confidence }
      : null,
  );

  const calorieTarget = input.goals?.daily_calorie_target ?? input.body?.nutrition?.calorie_target ?? null;
  const hydrationTarget = input.goals?.daily_water_target_ml ?? input.body?.hydration?.target_ml ?? null;

  const hasGoalInputs = Boolean(
    input.goals?.goal_type
    || calorieTarget
    || hydrationTarget
    || input.goals?.sleep_target_minutes
    || input.mind,
  );

  return {
    date: input.date,
    summaries: {
      time: input.time,
      body: input.body,
      mind: input.mind,
    },
    mindPattern: input.mindPattern ?? null,
    currentState: {
      time: {
        state: buildTimeState(input.time),
        busyMinutes: input.time?.busyMinutes ?? 0,
        deepWorkMinutes: input.time?.deepWorkMinutes ?? 0,
        focusLoadScore: input.time?.focusLoadScore ?? 0,
        focusLoadLevel: input.time?.focusLoadLevel ?? 'low',
        deadlinePressure: input.time?.deadlinePressure.level ?? 'unknown',
      },
      body: {
        state: buildBodyState(bodyReadinessScore, recoveryRiskScore),
        sleepMinutes: input.body?.sleep_minutes ?? null,
        workoutCount: input.body?.workout_count ?? 0,
        recoveryScore: input.body?.recovery?.recovery_score ?? null,
        estimatedBalanceCalories: input.body?.energy?.estimated_balance_calories ?? null,
      },
      mind: {
        state: buildMindState(input.mind, mindStabilityScore),
        moodScore: input.mind?.moodScore ?? null,
        hasJournalEntry: input.mind?.hasJournalEntry ?? false,
        habitsCompletionPct,
        moodVolatility,
        moodTrend,
      },
    },
    signalCoverage,
    imbalanceScore,
    imbalanceLevel: classifyLevel(imbalanceScore),
    recoveryRiskScore,
    recoveryRiskLevel: classifyRecoveryRiskLevel(recoveryRiskScore),
    bodyReadinessScore,
    mindStabilityScore,
    keyStrengths,
    warnings,
    momentum: buildMomentum({
      time: input.time,
      body: input.body,
      mind: input.mind,
      mindPattern: input.mindPattern,
      mindStabilityScore,
      bodyReadinessScore,
      recoveryRiskScore,
    }),
    goalAlignment: hasGoalInputs
      ? {
          goalType: input.goals?.goal_type ?? null,
          caloriesOnTarget: calorieTarget && input.body?.nutrition
            ? Math.abs(input.body.nutrition.total_calories - calorieTarget) <= calorieTarget * 0.15
            : null,
          hydrationOnTarget: hydrationTarget && input.body?.hydration
            ? input.body.hydration.total_ml >= hydrationTarget * 0.85
            : null,
          sleepOnTarget: input.body?.sleep_minutes !== null && input.body?.sleep_minutes !== undefined
            ? (input.body.sleep_minutes ?? 0) >= sleepTargetMinutes * 0.9
            : null,
          habitsOnTrack: habitsCompletionPct !== null ? habitsCompletionPct >= 60 : null,
        }
      : null,
  };
}
