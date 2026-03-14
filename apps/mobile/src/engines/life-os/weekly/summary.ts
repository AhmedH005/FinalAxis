import type { GoalAlignmentBand, GoalRecommendationPriority } from '../goal-alignment/types';
import type { LifeOsConfidence, LifeOsDomain } from '../types';
import type {
  LifeOsHistoryGoalContext,
  LifeOsHistoryPatternItem,
  LifeOsHistoryRecord,
  LifeOsHistoryShiftCandidate,
  LifeOsWeeklyAlignmentTrend,
  LifeOsWeeklyConsistencyLevel,
  LifeOsWeeklyConsistencyTrend,
  LifeOsWeeklySummary,
  LifeOsWeeklyTrendDirection,
} from '../history/types';

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

function mergeConfidence(left: LifeOsConfidence, right: LifeOsConfidence): LifeOsConfidence {
  if (left === 'low' || right === 'low') return 'low';
  if (left === 'medium' || right === 'medium') return 'medium';
  return 'high';
}

function bandScore(band: GoalAlignmentBand | null) {
  switch (band) {
    case 'aligned':
      return 3;
    case 'at_risk':
      return 2;
    case 'misaligned':
      return 1;
    default:
      return null;
  }
}

function recommendationPriorityWeight(priority: GoalRecommendationPriority) {
  switch (priority) {
    case 'primary':
      return 3;
    case 'secondary':
      return 2;
    default:
      return 1;
  }
}

function buildWeeklyConfidence(records: LifeOsHistoryRecord[]): LifeOsConfidence {
  if (records.length < 3) return 'low';

  const averageCoverage = records.reduce((sum, record) => sum + record.signalCoverage.pct, 0) / records.length;
  const lowConfidenceDays = records.filter((record) => record.signalCoverage.confidence === 'low').length;

  if (records.length >= 5 && averageCoverage >= 70 && lowConfidenceDays <= 1) {
    return 'high';
  }

  if (averageCoverage >= 50 && lowConfidenceDays <= 2) {
    return 'medium';
  }

  return 'low';
}

function buildGoalContext(records: LifeOsHistoryRecord[]): LifeOsHistoryGoalContext | null {
  const goalRecords = records.filter((record) => record.goalAlignment);
  if (goalRecords.length === 0) return null;

  const counts = new Map<string, {
    goalId: string;
    goalTitle: string;
    archetype: NonNullable<LifeOsHistoryRecord['goalAlignment']>['archetype'];
    count: number;
  }>();

  for (const record of goalRecords) {
    const goal = record.goalAlignment!;
    const current = counts.get(goal.goalId);
    counts.set(goal.goalId, current
      ? { ...current, count: current.count + 1 }
      : {
          goalId: goal.goalId,
          goalTitle: goal.goalTitle,
          archetype: goal.archetype,
          count: 1,
        });
  }

  const dominant = [...counts.values()]
    .sort((left, right) => right.count - left.count || left.goalId.localeCompare(right.goalId))[0];

  return dominant
    ? {
        goalId: dominant.goalId,
        goalTitle: dominant.goalTitle,
        archetype: dominant.archetype,
        activeDays: dominant.count,
        mixedGoals: counts.size > 1,
      }
    : null;
}

function aggregatePatterns(
  records: LifeOsHistoryRecord[],
  key: 'blockers' | 'supports',
): LifeOsHistoryPatternItem[] {
  const counts = new Map<string, LifeOsHistoryPatternItem>();

  for (const record of records) {
    const seenToday = new Set<string>();

    for (const item of record[key]) {
      const mapKey = `${item.source}:${item.code}`;
      if (seenToday.has(mapKey)) continue;
      seenToday.add(mapKey);

      const current = counts.get(mapKey);
      counts.set(mapKey, current
        ? {
            ...current,
            count: current.count + 1,
            confidence: mergeConfidence(current.confidence, item.confidence),
          }
        : {
            code: item.code,
            label: item.label,
            domain: item.domain,
            source: item.source,
            count: 1,
            sharePct: 0,
            confidence: item.confidence,
          });
    }
  }

  const minRecurringCount = records.length >= 4 ? 2 : 1;

  return [...counts.values()]
    .map((item) => ({
      ...item,
      sharePct: Math.round((item.count / records.length) * 100),
    }))
    .filter((item) => item.count >= minRecurringCount)
    .sort((left, right) =>
      right.count - left.count
      || confidenceRank(right.confidence) - confidenceRank(left.confidence)
      || left.code.localeCompare(right.code))
    .slice(0, 3);
}

function buildAlignmentTrend(records: LifeOsHistoryRecord[], goal: LifeOsHistoryGoalContext | null): LifeOsWeeklyAlignmentTrend {
  const relevant = goal
    ? records.filter((record) => record.goalAlignment?.goalId === goal.goalId)
    : [];
  const scored = relevant
    .map((record) => ({
      band: record.goalAlignment?.alignmentBand ?? null,
      score: record.goalAlignment?.alignmentScore ?? null,
    }))
    .filter((item) => item.band !== null);
  const firstScored = scored[0] ?? null;
  const lastScored = scored[scored.length - 1] ?? null;
  const shortWindowScoreChange = scored.length >= 2
    && firstScored?.score !== null
    && lastScored?.score !== null
    ? Math.round((lastScored.score - firstScored.score) * 10) / 10
    : null;

  if (scored.length < 3) {
    return {
      direction: 'unclear',
      firstBand: firstScored?.band ?? null,
      lastBand: lastScored?.band ?? null,
      scoreChange: shortWindowScoreChange,
      validDays: scored.length,
    };
  }

  const first = scored[0];
  const last = scored[scored.length - 1];
  const firstBandScore = bandScore(first.band);
  const lastBandScore = bandScore(last.band);
  const scoreChange = first.score !== null && last.score !== null
    ? Math.round((last.score - first.score) * 10) / 10
    : null;

  let direction: LifeOsWeeklyTrendDirection = 'steady';
  if (firstBandScore !== null && lastBandScore !== null) {
    const delta = lastBandScore - firstBandScore;
    if (delta >= 1 || (scoreChange !== null && scoreChange >= 8)) {
      direction = 'improving';
    } else if (delta <= -1 || (scoreChange !== null && scoreChange <= -8)) {
      direction = 'worsening';
    } else {
      const bandSet = new Set(scored.map((item) => item.band));
      direction = bandSet.size >= 3 ? 'mixed' : 'steady';
    }
  } else {
    direction = 'unclear';
  }

  return {
    direction,
    firstBand: first.band,
    lastBand: last.band,
    scoreChange,
    validDays: scored.length,
  };
}

function buildConsistencyTrend(records: LifeOsHistoryRecord[]): LifeOsWeeklyConsistencyTrend {
  const lowConfidenceDays = records.filter((record) => record.signalCoverage.confidence === 'low').length;
  const supportiveDays = records.filter((record) =>
    record.signalCoverage.confidence !== 'low' && record.supports.length >= record.blockers.length).length;
  const blockerHeavyDays = records.filter((record) =>
    record.blockers.length > record.supports.length
    || record.currentState.body.recoveryRiskLevel === 'high'
    || record.currentState.time.focusLoadScore >= 70).length;

  let level: LifeOsWeeklyConsistencyLevel = 'mixed';
  if (records.length < 3 || lowConfidenceDays >= Math.ceil(records.length / 2)) {
    level = 'unclear';
  } else if (blockerHeavyDays >= Math.ceil(records.length / 2)) {
    level = 'fragile';
  } else if (supportiveDays >= Math.ceil(records.length / 2)) {
    level = 'stable';
  }

  return {
    level,
    supportiveDays,
    blockerHeavyDays,
    lowConfidenceDays,
  };
}

const BLOCKER_SHIFT_MAP: Record<string, { code: string; title: string; domain: LifeOsDomain }> = {
  'life_os:time-load-high': { code: 'reduce_cognitive_load', title: 'Reduce cognitive load earlier in the week', domain: 'time' },
  'life_os:recovery-risk-high': { code: 'protect_sleep_window', title: 'Protect sleep before the week gets heavier', domain: 'time' },
  'goal_alignment:hydrationScore': { code: 'prioritize_hydration', title: 'Stabilize hydration earlier each day', domain: 'body' },
  'goal_alignment:calorieTargetScore': { code: 'stabilize_nutrition_target', title: 'Keep nutrition closer to the target', domain: 'body' },
  'goal_alignment:habitAdherenceScore': { code: 'reinforce_supporting_habits', title: 'Reinforce the smallest supporting habit', domain: 'mind' },
  'goal_alignment:focusCapacityScore': { code: 'reduce_cognitive_load', title: 'Reduce cognitive load before it compounds', domain: 'time' },
  'goal_alignment:fragmentationSupportScore': { code: 'reduce_plan_fragmentation', title: 'Reduce schedule fragmentation earlier', domain: 'time' },
  'goal_alignment:sleepScore': { code: 'protect_sleep_window', title: 'Protect sleep before adding more demand', domain: 'time' },
  'goal_alignment:recoverySupportScore': { code: 'hold_goal_intensity', title: 'Choose the steadier path sooner', domain: 'body' },
  'goal_alignment:mindStabilityScore': { code: 'hold_goal_intensity', title: 'Lower goal strain while stability resets', domain: 'mind' },
};

function buildStrongestShiftCandidate(
  records: LifeOsHistoryRecord[],
  blockers: LifeOsHistoryPatternItem[],
  goal: LifeOsHistoryGoalContext | null,
  confidence: LifeOsConfidence,
): LifeOsHistoryShiftCandidate | null {
  const relevantGoalRecords = goal
    ? records.filter((record) => record.goalAlignment?.goalId === goal.goalId)
    : [];
  const recommendationCounts = new Map<string, {
    code: string;
    title: string;
    domain: LifeOsDomain;
    weightedCount: number;
  }>();

  for (const record of relevantGoalRecords) {
    for (const item of record.goalAlignment?.recommendations ?? []) {
      const current = recommendationCounts.get(item.code);
      const nextWeight = recommendationPriorityWeight(item.priority);
      recommendationCounts.set(item.code, current
        ? {
            ...current,
            weightedCount: current.weightedCount + nextWeight,
          }
        : {
            code: item.code,
            title: item.title,
            domain: item.domain,
            weightedCount: nextWeight,
          });
    }
  }

  const strongestRecommendation = [...recommendationCounts.values()]
    .sort((left, right) => right.weightedCount - left.weightedCount || left.code.localeCompare(right.code))[0];

  if (strongestRecommendation) {
    return {
      code: strongestRecommendation.code,
      title: strongestRecommendation.title,
      domain: strongestRecommendation.domain,
      count: strongestRecommendation.weightedCount,
      confidence,
    };
  }

  const fallback = blockers[0];
  if (!fallback) return null;

  const mapped = BLOCKER_SHIFT_MAP[`${fallback.source}:${fallback.code}`];
  if (!mapped) return null;

  return {
    code: mapped.code,
    title: mapped.title,
    domain: mapped.domain,
    count: fallback.count,
    confidence: fallback.confidence,
  };
}

export function buildLifeOsWeeklySummary(args: {
  date: string;
  records: LifeOsHistoryRecord[];
  totalDays?: number;
}): LifeOsWeeklySummary {
  const sorted = args.records
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));
  const totalDays = args.totalDays ?? 7;
  const confidence = buildWeeklyConfidence(sorted);
  const goal = buildGoalContext(sorted);
  const recurringBlockers = aggregatePatterns(sorted, 'blockers');
  const recurringSupports = aggregatePatterns(sorted, 'supports');
  const alignmentTrend = buildAlignmentTrend(sorted, goal);
  const consistencyTrend = buildConsistencyTrend(sorted);
  const strongestShiftCandidate = buildStrongestShiftCandidate(sorted, recurringBlockers, goal, confidence);

  return {
    startDate: sorted[0]?.date ?? args.date,
    endDate: sorted[sorted.length - 1]?.date ?? args.date,
    recordedDays: sorted.length,
    totalDays,
    confidence,
    goal,
    recurringBlockers,
    recurringSupports,
    alignmentTrend,
    consistencyTrend,
    strongestShiftCandidate,
  };
}
