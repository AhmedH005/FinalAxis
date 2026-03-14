import type { LifeOsContextSnapshot } from '../types';
import {
  STRICTNESS_PROFILE,
  classifySignalConfidence,
  invertScore,
  limitConfidence,
  scoreAgainstTarget,
  scoreGainCalories,
  scoreLoseCalories,
  scoreMaintainCalories,
} from './score-helpers';
import type {
  GoalDefinition,
  GoalSignalCode,
  GoalSignalMissingReason,
  GoalSignalSet,
  GoalSignalValue,
  GoalTargetCode,
} from './types';

function hasInferredTarget(goal: GoalDefinition, code: GoalTargetCode) {
  return goal.assumptions.inferredTargets.includes(code);
}

function buildSignalValue(args: GoalSignalValue): GoalSignalValue {
  return args;
}

function resolveSleepTarget(goal: GoalDefinition) {
  const target = goal.targets.sleepTargetMinutes ?? 480;
  const inferred = goal.targets.sleepTargetMinutes == null;
  return { target, inferred };
}

function resolveHydrationTarget(goal: GoalDefinition) {
  if (goal.targets.dailyWaterTargetMl != null) {
    return { target: goal.targets.dailyWaterTargetMl, inferred: hasInferredTarget(goal, 'dailyWaterTargetMl') };
  }
  return { target: null, inferred: false };
}

function resolveCalorieTarget(goal: GoalDefinition) {
  if (goal.targets.dailyCalorieTarget != null) {
    return { target: goal.targets.dailyCalorieTarget, inferred: hasInferredTarget(goal, 'dailyCalorieTarget') };
  }
  return { target: null, inferred: false };
}

function resolveDeepWorkTarget(goal: GoalDefinition) {
  if (goal.targets.deepWorkTargetMinutes != null) {
    return {
      target: goal.targets.deepWorkTargetMinutes,
      inferred: hasInferredTarget(goal, 'deepWorkTargetMinutes'),
    };
  }

  return {
    target: STRICTNESS_PROFILE[goal.strictness].defaultDeepWorkTargetMinutes,
    inferred: true,
  };
}

function buildMissingSignal(args: {
  code: GoalSignalCode;
  domain: GoalSignalValue['domain'];
  rawValue?: GoalSignalValue['rawValue'];
  targetValue?: number | null;
  reason: GoalSignalMissingReason;
  targetInferred?: boolean;
}): GoalSignalValue {
  return {
    code: args.code,
    domain: args.domain,
    score: null,
    rawValue: args.rawValue ?? null,
    targetValue: args.targetValue,
    confidence: 'low',
    missingReason: args.reason,
    targetInferred: args.targetInferred,
  };
}

function buildSleepScore(snapshot: LifeOsContextSnapshot, goal: GoalDefinition): GoalSignalValue {
  const actual = snapshot.summaries.body?.sleep_minutes ?? null;
  const { target, inferred } = resolveSleepTarget(goal);

  if (snapshot.summaries.body == null) {
    return buildMissingSignal({
      code: 'sleepScore',
      domain: 'body',
      targetValue: target,
      targetInferred: inferred,
      reason: 'body_summary_missing',
    });
  }

  if (actual === null) {
    return buildMissingSignal({
      code: 'sleepScore',
      domain: 'body',
      targetValue: target,
      targetInferred: inferred,
      reason: 'sleep_missing',
    });
  }

  return buildSignalValue({
    code: 'sleepScore',
    domain: 'body',
    score: scoreAgainstTarget(actual, target),
    rawValue: actual,
    targetValue: target,
    confidence: classifySignalConfidence({
      hasValue: true,
      inferredTarget: inferred,
      critical: true,
    }),
    targetInferred: inferred,
  });
}

function buildHydrationScore(snapshot: LifeOsContextSnapshot, goal: GoalDefinition): GoalSignalValue {
  const hydration = snapshot.summaries.body?.hydration ?? null;
  const actual = hydration?.total_ml ?? null;
  const { target, inferred } = resolveHydrationTarget(goal);

  if (snapshot.summaries.body == null) {
    return buildMissingSignal({
      code: 'hydrationScore',
      domain: 'body',
      targetValue: target,
      targetInferred: inferred,
      reason: 'body_summary_missing',
    });
  }
  if (hydration == null || actual === null) {
    return buildMissingSignal({
      code: 'hydrationScore',
      domain: 'body',
      targetValue: target,
      targetInferred: inferred,
      reason: 'hydration_missing',
    });
  }
  if (target == null) {
    return buildMissingSignal({
      code: 'hydrationScore',
      domain: 'body',
      rawValue: actual,
      reason: 'target_missing',
    });
  }

  return buildSignalValue({
    code: 'hydrationScore',
    domain: 'body',
    score: scoreAgainstTarget(actual, target),
    rawValue: actual,
    targetValue: target,
    confidence: classifySignalConfidence({
      hasValue: true,
      inferredTarget: inferred,
    }),
    targetInferred: inferred,
  });
}

function buildHabitAdherenceScore(snapshot: LifeOsContextSnapshot, goal: GoalDefinition): GoalSignalValue {
  const pattern = snapshot.mindPattern;
  const targetedItems = goal.supportingHabitIds.length > 0 && pattern
    ? pattern.habits.items.filter((item) => goal.supportingHabitIds.includes(item.habit.id))
    : [];
  const targetedAverage = targetedItems.length > 0
    ? Math.round(
      targetedItems.reduce((sum, item) => sum + item.adherencePct, 0) / targetedItems.length,
    )
    : null;
  const dailyFallback = snapshot.summaries.mind?.habitsTotal
    ? Math.round(
      (snapshot.summaries.mind.habitsCompleted / snapshot.summaries.mind.habitsTotal) * 100,
    )
    : null;
  const score = targetedAverage
    ?? snapshot.mindPattern?.habits.overallAdherencePct
    ?? dailyFallback;

  if (score === null) {
    return buildMissingSignal({
      code: 'habitAdherenceScore',
      domain: 'mind',
      reason: snapshot.mindPattern == null ? 'mind_pattern_missing' : 'habit_adherence_missing',
    });
  }

  return buildSignalValue({
    code: 'habitAdherenceScore',
    domain: 'mind',
    score,
    rawValue: score,
    confidence: targetedAverage !== null
      ? 'high'
      : snapshot.mindPattern?.habits.overallAdherencePct !== null
      && snapshot.mindPattern?.habits.overallAdherencePct !== undefined
      ? 'high'
      : 'medium',
  });
}

function buildMindStabilityScore(snapshot: LifeOsContextSnapshot): GoalSignalValue {
  if (snapshot.mindStabilityScore !== null) {
    return buildSignalValue({
      code: 'mindStabilityScore',
      domain: 'mind',
      score: snapshot.mindStabilityScore,
      rawValue: snapshot.mindStabilityScore,
      confidence: 'high',
    });
  }

  if (snapshot.currentState.mind.moodScore !== null) {
    return buildSignalValue({
      code: 'mindStabilityScore',
      domain: 'mind',
      score: snapshot.currentState.mind.moodScore * 10,
      rawValue: snapshot.currentState.mind.moodScore,
      confidence: 'medium',
    });
  }

  return buildMissingSignal({
    code: 'mindStabilityScore',
    domain: 'mind',
    reason: snapshot.summaries.mind == null ? 'mind_summary_missing' : 'mind_stability_missing',
  });
}

function buildRecoverySupportScore(snapshot: LifeOsContextSnapshot): GoalSignalValue {
  if (snapshot.recoveryRiskScore !== null) {
    return buildSignalValue({
      code: 'recoverySupportScore',
      domain: 'body',
      score: invertScore(snapshot.recoveryRiskScore),
      rawValue: snapshot.recoveryRiskScore,
      confidence: 'high',
    });
  }

  if (snapshot.bodyReadinessScore !== null) {
    return buildSignalValue({
      code: 'recoverySupportScore',
      domain: 'body',
      score: snapshot.bodyReadinessScore,
      rawValue: snapshot.bodyReadinessScore,
      confidence: 'medium',
    });
  }

  return buildMissingSignal({
    code: 'recoverySupportScore',
    domain: 'body',
    reason: snapshot.summaries.body == null ? 'body_summary_missing' : 'recovery_missing',
  });
}

function buildTimeSupportSignal(
  snapshot: LifeOsContextSnapshot,
  args: {
    code: 'fragmentationSupportScore' | 'focusCapacityScore' | 'deadlineSupportScore';
    rawValue: number | null;
    reason: GoalSignalMissingReason;
  },
): GoalSignalValue {
  if (snapshot.summaries.time == null) {
    return buildMissingSignal({
      code: args.code,
      domain: 'time',
      reason: 'time_summary_missing',
    });
  }
  if (args.rawValue === null) {
    return buildMissingSignal({
      code: args.code,
      domain: 'time',
      reason: args.reason,
    });
  }

  return buildSignalValue({
    code: args.code,
    domain: 'time',
    score: invertScore(args.rawValue),
    rawValue: args.rawValue,
    confidence: limitConfidence('high', snapshot.summaries.time.signalCoverage.confidence),
  });
}

function buildDeepWorkTargetScore(snapshot: LifeOsContextSnapshot, goal: GoalDefinition): GoalSignalValue {
  const actual = snapshot.summaries.time?.deepWorkMinutes ?? null;
  const { target, inferred } = resolveDeepWorkTarget(goal);

  if (snapshot.summaries.time == null) {
    return buildMissingSignal({
      code: 'deepWorkTargetScore',
      domain: 'time',
      targetValue: target,
      targetInferred: inferred,
      reason: 'time_summary_missing',
    });
  }
  if (actual === null) {
    return buildMissingSignal({
      code: 'deepWorkTargetScore',
      domain: 'time',
      targetValue: target,
      targetInferred: inferred,
      reason: 'deep_work_missing',
    });
  }

  return buildSignalValue({
    code: 'deepWorkTargetScore',
    domain: 'time',
    score: scoreAgainstTarget(actual, target),
    rawValue: actual,
    targetValue: target,
    confidence: limitConfidence(
      classifySignalConfidence({
        hasValue: true,
        inferredTarget: inferred,
        critical: goal.archetype === 'perform',
      }),
      snapshot.summaries.time.signalCoverage.confidence,
    ),
    targetInferred: inferred,
  });
}

function buildCalorieTargetScore(snapshot: LifeOsContextSnapshot, goal: GoalDefinition): GoalSignalValue {
  if (goal.archetype === 'perform') {
    return buildSignalValue({
      code: 'calorieTargetScore',
      domain: 'body',
      score: null,
      rawValue: null,
      confidence: 'high',
      missingReason: 'not_applicable',
    });
  }

  const actual = snapshot.summaries.body?.nutrition?.total_calories ?? null;
  const { target, inferred } = resolveCalorieTarget(goal);

  if (snapshot.summaries.body == null) {
    return buildMissingSignal({
      code: 'calorieTargetScore',
      domain: 'body',
      targetValue: target,
      targetInferred: inferred,
      reason: 'body_summary_missing',
    });
  }
  if (actual === null) {
    return buildMissingSignal({
      code: 'calorieTargetScore',
      domain: 'body',
      targetValue: target,
      targetInferred: inferred,
      reason: 'nutrition_missing',
    });
  }
  if (target == null) {
    return buildMissingSignal({
      code: 'calorieTargetScore',
      domain: 'body',
      rawValue: actual,
      reason: 'target_missing',
    });
  }

  const score = goal.archetype === 'lose'
    ? scoreLoseCalories(actual, target)
    : goal.archetype === 'gain'
    ? scoreGainCalories(actual, target)
    : scoreMaintainCalories(actual, target);

  return buildSignalValue({
    code: 'calorieTargetScore',
    domain: 'body',
    score,
    rawValue: actual,
    targetValue: target,
    confidence: classifySignalConfidence({
      hasValue: true,
      inferredTarget: inferred,
      critical: true,
    }),
    targetInferred: inferred,
  });
}

export function extractGoalSignals(args: {
  snapshot: LifeOsContextSnapshot;
  goal: GoalDefinition;
}): GoalSignalSet {
  const { snapshot, goal } = args;

  return {
    sleepScore: buildSleepScore(snapshot, goal),
    hydrationScore: buildHydrationScore(snapshot, goal),
    habitAdherenceScore: buildHabitAdherenceScore(snapshot, goal),
    mindStabilityScore: buildMindStabilityScore(snapshot),
    recoverySupportScore: buildRecoverySupportScore(snapshot),
    fragmentationSupportScore: buildTimeSupportSignal(snapshot, {
      code: 'fragmentationSupportScore',
      rawValue: snapshot.summaries.time?.fragmentation.score ?? null,
      reason: 'fragmentation_missing',
    }),
    focusCapacityScore: buildTimeSupportSignal(snapshot, {
      code: 'focusCapacityScore',
      rawValue: snapshot.summaries.time?.focusLoadScore ?? null,
      reason: 'focus_load_missing',
    }),
    deadlineSupportScore: buildTimeSupportSignal(snapshot, {
      code: 'deadlineSupportScore',
      rawValue: snapshot.summaries.time?.deadlinePressure.score ?? null,
      reason: 'deadline_pressure_missing',
    }),
    deepWorkTargetScore: buildDeepWorkTargetScore(snapshot, goal),
    calorieTargetScore: buildCalorieTargetScore(snapshot, goal),
  };
}
