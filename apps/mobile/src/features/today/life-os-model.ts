import type { Href } from 'expo-router';
import { appRoutes } from '../../types/navigation';
import type {
  DayReshapePlan,
  GoalAlignmentBand,
  GoalAlignmentRecommendation,
  GoalAlignmentSnapshot,
  GoalPathModel,
  LifeOsWeeklyReflectionModel,
  LifeOsConfidence,
  LifeOsContextSnapshot,
  LifeOsDomain,
  LifeOsObservation,
  LifeOsObservationSeverity,
  LifeOsObservationStance,
  LifeOsObservationTimeWindow,
} from '@/engines/life-os';
import type { AppliedDayReshapeRecord } from '@/engines/time';

export interface TodayLifeOsSignal {
  key: 'focus' | 'recovery' | 'mind' | 'momentum' | 'coverage';
  label: string;
  value: string;
  tone: 'strong' | 'steady' | 'fragile' | 'unknown';
}

export interface TodayLifeOsCurrentState {
  primaryRead: string;
  secondaryRead: string | null;
  supportingSignals: TodayLifeOsSignal[];
}

export interface TodayLifeOsInsight {
  id: string;
  code: string;
  title: string;
  explanation: string;
  stance: LifeOsObservationStance;
  severity: LifeOsObservationSeverity;
  confidence: LifeOsConfidence;
  timeWindow: LifeOsObservationTimeWindow;
  sourceDomains: LifeOsDomain[];
  targetRoute: Href;
  priority: number;
}

export interface TodayLifeOsAction {
  id: string;
  title: string;
  detail: string;
  cta: string;
  route: Href;
  domain: LifeOsDomain;
  category?: string;
  sourceObservationIds: string[];
  sourceGoalRecommendationCodes?: string[];
  emphasis: 'primary' | 'secondary';
}

export interface TodayLifeOsEngineLink {
  domain: LifeOsDomain;
  label: string;
  detail: string;
  route: Href;
  emphasized: boolean;
}

export interface TodayGoalAlignmentShift {
  label: string;
  domain: LifeOsDomain;
  route: Href;
}

export interface TodayGoalAlignmentSection {
  isVisible: boolean;
  detailRoute: Href | null;
  goalLabel: string | null;
  band: GoalAlignmentBand | null;
  confidence: LifeOsConfidence | null;
  currentPathTitle: string | null;
  currentPathSummary: string | null;
  moreAlignedPathTitle: string | null;
  moreAlignedPathSummary: string | null;
  shifts: TodayGoalAlignmentShift[];
  topRecommendationCodes: string[];
}

export interface TodayDayReshapingSection {
  isVisible: boolean;
  detailRoute: Href | null;
  status: 'hidden' | 'available' | 'applied';
  title: string | null;
  summary: string | null;
  confidence: LifeOsConfidence | null;
  actionCount: number;
}

export interface TodayWeeklyReflectionSection {
  isVisible: boolean;
  detailRoute: Href | null;
  title: string | null;
  summary: string | null;
  confidence: LifeOsConfidence | null;
}

export interface TodayLifeOsModel {
  currentState: TodayLifeOsCurrentState;
  primaryInsight: TodayLifeOsInsight | null;
  supportingInsights: TodayLifeOsInsight[];
  positiveInsight: TodayLifeOsInsight | null;
  goalAlignment: TodayGoalAlignmentSection;
  dayReshaping: TodayDayReshapingSection;
  weeklyReflection: TodayWeeklyReflectionSection;
  courseCorrections: {
    primaryAction: TodayLifeOsAction | null;
    secondaryAction: TodayLifeOsAction | null;
  };
  engineLinks: TodayLifeOsEngineLink[];
}

function severityRank(severity: LifeOsObservationSeverity) {
  switch (severity) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    default:
      return 1;
  }
}

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

function stanceRank(stance: LifeOsObservationStance) {
  switch (stance) {
    case 'negative':
      return 3;
    case 'positive':
      return 2;
    default:
      return 1;
  }
}

function roundScore(value: number | null) {
  return value === null ? null : Math.round(value);
}

function formatScoreLabel(value: number | null) {
  const rounded = roundScore(value);
  return rounded === null ? 'Missing' : `${rounded}`;
}

function formatSleepLabel(minutes: number | null) {
  if (minutes === null || minutes <= 0) return 'Missing';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMomentumValue(snapshot: LifeOsContextSnapshot) {
  const positive = snapshot.momentum.filter((item) => item.direction === 'positive').length;
  const negative = snapshot.momentum.filter((item) => item.direction === 'negative').length;
  const mixed = snapshot.momentum.filter((item) => item.direction === 'mixed').length;

  if (negative >= 2) return 'Under pressure';
  if (negative === 1 && mixed > 0) return 'Pressure rising';
  if (negative === 1) return 'Strained';
  if (positive >= 2) return 'Supportive';
  if (positive === 1) return 'Holding steady';
  if (mixed > 0) return 'Mixed';
  return 'Flat';
}

function momentumTone(snapshot: LifeOsContextSnapshot): TodayLifeOsSignal['tone'] {
  const negative = snapshot.momentum.some((item) => item.direction === 'negative');
  const positiveCount = snapshot.momentum.filter((item) => item.direction === 'positive').length;

  if (negative) return 'fragile';
  if (positiveCount >= 2) return 'strong';
  if (snapshot.momentum.some((item) => item.direction === 'mixed')) return 'steady';
  return 'unknown';
}

function routeForDomain(domain: LifeOsDomain): Href {
  switch (domain) {
    case 'body':
      return appRoutes.body;
    case 'mind':
      return appRoutes.mind;
    default:
      return appRoutes.time;
  }
}

function preferredCoverageDomain(snapshot: LifeOsContextSnapshot): LifeOsDomain {
  if (snapshot.signalCoverage.missingDomains.length > 0) {
    return snapshot.signalCoverage.missingDomains[0];
  }

  if (snapshot.currentState.body.state === 'unknown') return 'body';
  if (snapshot.currentState.mind.state === 'unknown') return 'mind';
  return 'time';
}

function dominantImbalanceDomain(snapshot: LifeOsContextSnapshot): LifeOsDomain {
  const focusLoadScore = snapshot.currentState.time.focusLoadScore;
  const bodyGap = snapshot.bodyReadinessScore !== null
    ? Math.max(0, focusLoadScore - snapshot.bodyReadinessScore)
    : 0;
  const mindGap = snapshot.mindStabilityScore !== null
    ? Math.max(0, focusLoadScore - snapshot.mindStabilityScore)
    : 0;

  if (bodyGap >= mindGap && bodyGap > 0) return 'body';
  if (mindGap > bodyGap) return 'mind';
  return 'time';
}

function resolveObservationDomain(
  observation: LifeOsObservation,
  snapshot: LifeOsContextSnapshot,
): LifeOsDomain {
  switch (observation.code) {
    case 'high_focus_load_low_recovery':
    case 'deadline_pressure_recovery_collision':
    case 'focused_work_protected':
      return 'time';
    case 'sleep_and_hydration_below_target':
    case 'recovery_foundation_supportive':
      return 'body';
    case 'workload_rising_mind_stability_falling':
    case 'habits_support_goal':
      return 'mind';
    case 'cross_engine_imbalance':
      return dominantImbalanceDomain(snapshot);
    case 'low_signal_coverage':
      return preferredCoverageDomain(snapshot);
    default:
      return observation.sourceDomains[0] ?? 'time';
  }
}

function sortObservations(observations: LifeOsObservation[]) {
  return observations
    .slice()
    .sort((left, right) => {
      const stanceDelta = stanceRank(right.stance) - stanceRank(left.stance);
      if (stanceDelta !== 0) return stanceDelta;

      const severityDelta = severityRank(right.severity) - severityRank(left.severity);
      if (severityDelta !== 0) return severityDelta;

      const confidenceDelta = confidenceRank(right.confidence) - confidenceRank(left.confidence);
      if (confidenceDelta !== 0) return confidenceDelta;

      return left.code.localeCompare(right.code);
    });
}

function buildInsight(
  observation: LifeOsObservation,
  priority: number,
  snapshot: LifeOsContextSnapshot,
): TodayLifeOsInsight {
  const domain = resolveObservationDomain(observation, snapshot);

  return {
    id: observation.id,
    code: observation.code,
    title: observation.title,
    explanation: observation.explanation,
    stance: observation.stance,
    severity: observation.severity,
    confidence: observation.confidence,
    timeWindow: observation.timeWindow,
    sourceDomains: observation.sourceDomains,
    targetRoute: routeForDomain(domain),
    priority,
  };
}

function buildPrimaryRead(
  snapshot: LifeOsContextSnapshot,
  primaryInsight: TodayLifeOsInsight | null,
  positiveInsight: TodayLifeOsInsight | null,
) {
  switch (primaryInsight?.code) {
    case 'high_focus_load_low_recovery':
      return 'Focus load is rising while recovery is fragile.';
    case 'deadline_pressure_recovery_collision':
      return 'Deadline pressure is pushing against recovery capacity.';
    case 'workload_rising_mind_stability_falling':
      return 'Workload is rising while emotional stability is softening.';
    case 'sleep_and_hydration_below_target':
      return 'The physical baseline is lighter than the day needs.';
    case 'cross_engine_imbalance':
      return 'Time, body, and mind are not pulling in the same direction right now.';
    case 'low_signal_coverage':
      return 'AXIS is still reading through a thin set of signals today.';
    default:
      break;
  }

  switch (positiveInsight?.code) {
    case 'recovery_foundation_supportive':
      return 'Recovery looks supportive for the day ahead.';
    case 'focused_work_protected':
      return 'Focused work has a protected window today.';
    case 'habits_support_goal':
      return 'Current habits are reinforcing the goal you are aiming at.';
    case 'positive_cross_engine_momentum':
      return 'Time, body, and mind are moving in a supportive direction.';
    default:
      break;
  }

  if (snapshot.currentState.time.state === 'fragile') {
    return 'The day is carrying more load than usual.';
  }
  if (snapshot.currentState.body.state === 'fragile') {
    return 'Recovery needs more attention before the day gets heavier.';
  }
  if (snapshot.currentState.mind.state === 'fragile') {
    return 'Mental stability looks softer than the day would ideally allow.';
  }
  if (snapshot.signalCoverage.confidence === 'low') {
    return 'The read is still forming because signal coverage is light.';
  }

  return 'Today is readable without a strong alarm across the system.';
}

function buildSecondaryRead(
  snapshot: LifeOsContextSnapshot,
  primaryInsight: TodayLifeOsInsight | null,
  positiveInsight: TodayLifeOsInsight | null,
) {
  const primaryDomain = primaryInsight?.sourceDomains[0] ?? null;

  if (primaryDomain !== 'mind' && snapshot.currentState.mind.state === 'strong') {
    return 'Emotional stability is holding steady.';
  }
  if (primaryDomain !== 'body' && snapshot.currentState.body.state === 'strong') {
    return 'Recovery is still giving the day some room.';
  }
  if (primaryDomain !== 'time' && snapshot.currentState.time.state === 'strong') {
    return 'Time pressure is not the main constraint.';
  }
  if (snapshot.signalCoverage.confidence === 'low') {
    return 'Capture one more signal before making a hard adjustment.';
  }
  if (positiveInsight) {
    return positiveInsight.title;
  }

  return null;
}

function buildCurrentState(
  snapshot: LifeOsContextSnapshot,
  primaryInsight: TodayLifeOsInsight | null,
  positiveInsight: TodayLifeOsInsight | null,
): TodayLifeOsCurrentState {
  const recoveryValue = snapshot.recoveryRiskLevel !== 'low' || snapshot.bodyReadinessScore === null
    ? snapshot.recoveryRiskScore !== null
      ? `${titleCase(snapshot.recoveryRiskLevel)} risk · ${formatScoreLabel(snapshot.recoveryRiskScore)}`
      : 'Signal missing'
    : `Readiness ${formatScoreLabel(snapshot.bodyReadinessScore)}`;
  const mindValue = snapshot.mindStabilityScore !== null
    ? `Stability ${formatScoreLabel(snapshot.mindStabilityScore)}`
    : snapshot.currentState.mind.moodScore !== null
    ? `Mood ${snapshot.currentState.mind.moodScore}/10`
    : 'Signal missing';

  return {
    primaryRead: buildPrimaryRead(snapshot, primaryInsight, positiveInsight),
    secondaryRead: buildSecondaryRead(snapshot, primaryInsight, positiveInsight),
    supportingSignals: [
      {
        key: 'focus',
        label: 'Focus',
        value: `${titleCase(snapshot.currentState.time.focusLoadLevel)} load · ${snapshot.currentState.time.focusLoadScore}`,
        tone: snapshot.currentState.time.state === 'unknown' ? 'unknown' : snapshot.currentState.time.state,
      },
      {
        key: 'recovery',
        label: 'Recovery',
        value: recoveryValue,
        tone: snapshot.currentState.body.state === 'unknown' ? 'unknown' : snapshot.currentState.body.state,
      },
      {
        key: 'mind',
        label: 'Mind',
        value: mindValue,
        tone: snapshot.currentState.mind.state === 'unknown' ? 'unknown' : snapshot.currentState.mind.state,
      },
      {
        key: 'momentum',
        label: 'Momentum',
        value: formatMomentumValue(snapshot),
        tone: momentumTone(snapshot),
      },
      {
        key: 'coverage',
        label: 'Coverage',
        value: `${snapshot.signalCoverage.pct}% · ${titleCase(snapshot.signalCoverage.confidence)}`,
        tone: snapshot.signalCoverage.confidence === 'high'
          ? 'strong'
          : snapshot.signalCoverage.confidence === 'medium'
          ? 'steady'
          : 'fragile',
      },
    ],
  };
}

function buildActionFromInsight(
  insight: TodayLifeOsInsight,
  emphasis: 'primary' | 'secondary',
): TodayLifeOsAction {
  switch (insight.code) {
    case 'high_focus_load_low_recovery':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Protect deep work while recovery catches up',
        detail: 'Trim non-essential load and keep the schedule narrow until the body baseline looks stronger.',
        cta: 'Open Time',
        route: appRoutes.time,
        domain: 'time',
        category: 'load',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    case 'deadline_pressure_recovery_collision':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Reduce deadline pressure before adding more intensity',
        detail: 'Re-sequence what matters most now. Recovery risk is already too elevated for more load.',
        cta: 'Open Time',
        route: appRoutes.time,
        domain: 'time',
        category: 'load',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    case 'workload_rising_mind_stability_falling':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Lower cognitive intensity and check in mentally',
        detail: 'Stability is softening. Reduce the mental load and give the mind layer some explicit context.',
        cta: 'Open Mind',
        route: appRoutes.mind,
        domain: 'mind',
        category: 'mind_support',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    case 'sleep_and_hydration_below_target':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Rebuild the physical baseline first',
        detail: 'Sleep and hydration are both behind. Fix those before trying to force a bigger day.',
        cta: 'Open Body',
        route: appRoutes.body,
        domain: 'body',
        category: 'recovery',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    case 'cross_engine_imbalance':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Rebalance around the weakest system',
        detail: 'The biggest gains today come from reducing the mismatch between load and capacity.',
        cta: insight.targetRoute === appRoutes.body ? 'Open Body' : insight.targetRoute === appRoutes.mind ? 'Open Mind' : 'Open Time',
        route: insight.targetRoute,
        domain: insight.targetRoute === appRoutes.body ? 'body' : insight.targetRoute === appRoutes.mind ? 'mind' : 'time',
        category: 'imbalance',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    case 'low_signal_coverage':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Capture one more signal before adjusting the day',
        detail: 'AXIS needs one more solid input before it can make a sharper recommendation.',
        cta: insight.targetRoute === appRoutes.body ? 'Open Body' : insight.targetRoute === appRoutes.mind ? 'Open Mind' : 'Open Time',
        route: insight.targetRoute,
        domain: insight.targetRoute === appRoutes.body ? 'body' : insight.targetRoute === appRoutes.mind ? 'mind' : 'time',
        category: 'coverage',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    case 'focused_work_protected':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Protect the focus window that is already working',
        detail: 'There is real usable focus in the schedule. Preserve it instead of overfilling the day.',
        cta: 'Open Time',
        route: appRoutes.time,
        domain: 'time',
        category: 'focus',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    case 'recovery_foundation_supportive':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Use the recovery margin well',
        detail: 'The body is supporting the day. Keep the basics steady rather than chasing unnecessary corrections.',
        cta: 'Open Body',
        route: appRoutes.body,
        domain: 'body',
        category: 'recovery',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    case 'habits_support_goal':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Maintain the habit pattern that is already working',
        detail: 'The current routine is aligned with the goal. Consistency matters more than novelty here.',
        cta: 'Open Mind',
        route: appRoutes.mind,
        domain: 'mind',
        category: 'consistency',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    case 'positive_cross_engine_momentum':
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: 'Keep the supportive momentum intact',
        detail: 'Multiple engines are moving well together. Stay consistent and avoid unnecessary overcorrection.',
        cta: insight.targetRoute === appRoutes.body ? 'Open Body' : insight.targetRoute === appRoutes.mind ? 'Open Mind' : 'Open Time',
        route: insight.targetRoute,
        domain: insight.targetRoute === appRoutes.body ? 'body' : insight.targetRoute === appRoutes.mind ? 'mind' : 'time',
        category: 'focus',
        sourceObservationIds: [insight.id],
        emphasis,
      };
    default:
      return {
        id: `${insight.code}:action:${emphasis}`,
        title: insight.title,
        detail: insight.explanation,
        cta: insight.targetRoute === appRoutes.body ? 'Open Body' : insight.targetRoute === appRoutes.mind ? 'Open Mind' : 'Open Time',
        route: insight.targetRoute,
        domain: insight.targetRoute === appRoutes.body ? 'body' : insight.targetRoute === appRoutes.mind ? 'mind' : 'time',
        category: undefined,
        sourceObservationIds: [insight.id],
        emphasis,
      };
  }
}

function buildActionFromGoalRecommendation(
  recommendation: GoalAlignmentRecommendation,
  emphasis: 'primary' | 'secondary',
): TodayLifeOsAction {
  const route = routeForDomain(recommendation.domain);

  return {
    id: `${recommendation.code}:goal:${emphasis}`,
    title: recommendation.title,
    detail: recommendation.explanation,
    cta: recommendation.domain === 'body'
      ? 'Open Body'
      : recommendation.domain === 'mind'
      ? 'Open Mind'
      : 'Open Time',
    route,
    domain: recommendation.domain,
    category: recommendation.category,
    sourceObservationIds: [],
    sourceGoalRecommendationCodes: [recommendation.code],
    emphasis,
  };
}

function buildGoalAlignmentSection(args: {
  alignment: GoalAlignmentSnapshot | null;
  path: GoalPathModel | null;
}): TodayGoalAlignmentSection {
  if (!args.alignment || !args.path || args.alignment.confidence === 'low') {
    return {
      isVisible: false,
      detailRoute: null,
      goalLabel: null,
      band: null,
      confidence: null,
      currentPathTitle: null,
      currentPathSummary: null,
      moreAlignedPathTitle: null,
      moreAlignedPathSummary: null,
      shifts: [],
      topRecommendationCodes: [],
    };
  }

  return {
    isVisible: true,
    detailRoute: appRoutes.goalAlignment,
    goalLabel: args.path.goalLabel,
    band: args.alignment.alignmentBand,
    confidence: args.alignment.confidence,
    currentPathTitle: args.path.currentPath.title,
    currentPathSummary: args.path.currentPath.summary,
    moreAlignedPathTitle: args.path.moreAlignedPath.title,
    moreAlignedPathSummary: args.path.moreAlignedPath.summary,
    shifts: args.path.moreAlignedPath.shifts.map((shift) => ({
      label: shift.label,
      domain: shift.domain,
      route: routeForDomain(shift.domain),
    })),
    topRecommendationCodes: args.alignment.recommendationCandidates.map((item) => item.code),
  };
}

function buildDayReshapingSection(args: {
  plan: DayReshapePlan | null;
  appliedRecord: AppliedDayReshapeRecord | null;
}): TodayDayReshapingSection {
  if (args.appliedRecord) {
    return {
      isVisible: true,
      detailRoute: appRoutes.dayReshaping,
      status: 'applied',
      title: 'A reshape is already in place',
      summary: 'AXIS has already moved a small set of safe blocks. You can review the shifts or undo them if the day changes.',
      confidence: args.appliedRecord.confidence,
      actionCount: args.appliedRecord.actions.length,
    };
  }

  if (!args.plan || args.plan.confidence === 'low' || args.plan.actions.length === 0) {
    return {
      isVisible: false,
      detailRoute: null,
      status: 'hidden',
      title: null,
      summary: null,
      confidence: null,
      actionCount: 0,
    };
  }

  return {
    isVisible: true,
    detailRoute: appRoutes.dayReshaping,
    status: 'available',
    title: 'AXIS can reshape today',
    summary: args.plan.whyNow,
    confidence: args.plan.confidence,
    actionCount: args.plan.actions.length,
  };
}

function buildWeeklyReflectionSection(args: {
  reflection: LifeOsWeeklyReflectionModel | null;
}): TodayWeeklyReflectionSection {
  if (!args.reflection || !args.reflection.isAvailable || args.reflection.confidence === 'low') {
    return {
      isVisible: false,
      detailRoute: null,
      title: null,
      summary: null,
      confidence: null,
    };
  }

  return {
    isVisible: true,
    detailRoute: appRoutes.weeklyReflection,
    title: args.reflection.teaserTitle,
    summary: args.reflection.teaserSummary,
    confidence: args.reflection.confidence,
  };
}

function isDuplicateAction(
  left: TodayLifeOsAction,
  right: TodayLifeOsAction | null,
) {
  if (!right) return false;
  if (left.id === right.id) return true;
  if (left.category && right.category && left.category === right.category) return true;
  if (left.route === right.route && left.domain === right.domain) return true;
  return false;
}

function pickNextAction(
  candidates: Array<TodayLifeOsAction | null>,
  chosen: Array<TodayLifeOsAction | null>,
) {
  return candidates.find((candidate) =>
    candidate
    && !chosen.some((item) => isDuplicateAction(candidate, item)),
  ) ?? null;
}

function buildEngineLinks(
  snapshot: LifeOsContextSnapshot,
  emphasizedDomain: LifeOsDomain,
): TodayLifeOsEngineLink[] {
  const timeDetail = !snapshot.summaries.time
    ? 'Time signal missing'
    : snapshot.currentState.time.focusLoadLevel === 'high'
    ? `High load · ${titleCase(snapshot.currentState.time.deadlinePressure)} pressure`
    : snapshot.currentState.time.deepWorkMinutes > 0
    ? `${snapshot.currentState.time.deepWorkMinutes}m deep work protected`
    : 'Schedule is quiet for now';
  const bodyDetail = snapshot.recoveryRiskLevel === 'high'
    ? `Recovery risk high · ${formatScoreLabel(snapshot.recoveryRiskScore)}`
    : snapshot.bodyReadinessScore !== null
    ? `Readiness ${formatScoreLabel(snapshot.bodyReadinessScore)} · ${formatSleepLabel(snapshot.currentState.body.sleepMinutes)} sleep`
    : 'Body baseline still building';
  const mindDetail = snapshot.mindStabilityScore !== null
    ? `Stability ${formatScoreLabel(snapshot.mindStabilityScore)} · ${snapshot.currentState.mind.moodScore !== null ? `${snapshot.currentState.mind.moodScore}/10 mood` : 'mind signal in view'}`
    : 'Mind signal still thin';

  return [
    {
      domain: 'time',
      label: 'Time',
      detail: timeDetail,
      route: appRoutes.time,
      emphasized: emphasizedDomain === 'time',
    },
    {
      domain: 'body',
      label: 'Body',
      detail: bodyDetail,
      route: appRoutes.body,
      emphasized: emphasizedDomain === 'body',
    },
    {
      domain: 'mind',
      label: 'Mind',
      detail: mindDetail,
      route: appRoutes.mind,
      emphasized: emphasizedDomain === 'mind',
    },
  ];
}

export function buildTodayLifeOsModel(
  snapshot: LifeOsContextSnapshot,
  observations: LifeOsObservation[],
  goal?: {
    alignment: GoalAlignmentSnapshot | null;
    path: GoalPathModel | null;
  },
  dayReshaping?: {
    plan: DayReshapePlan | null;
    appliedRecord: AppliedDayReshapeRecord | null;
  },
  weekly?: {
    reflection: LifeOsWeeklyReflectionModel | null;
  },
): TodayLifeOsModel {
  const prioritized = sortObservations(observations).map((observation, index) =>
    buildInsight(observation, index + 1, snapshot),
  );
  const negativeInsights = prioritized.filter((insight) => insight.stance === 'negative');
  const positiveCandidates = prioritized.filter((insight) => insight.stance === 'positive');
  const primaryInsight = negativeInsights[0] ?? null;
  const supportingInsights = negativeInsights.slice(1, 3);
  const positiveInsight = positiveCandidates.find(
    (insight) => insight.confidence !== 'low' || insight.severity !== 'low',
  ) ?? null;

  const currentState = buildCurrentState(snapshot, primaryInsight, positiveInsight);

  const systemPrimaryAction = primaryInsight
    ? buildActionFromInsight(primaryInsight, 'primary')
    : positiveInsight
    ? buildActionFromInsight(positiveInsight, 'primary')
    : null;

  const lowCoverageInsight = negativeInsights.find((insight) => insight.code === 'low_signal_coverage');
  const secondarySource = snapshot.signalCoverage.confidence === 'low'
    ? lowCoverageInsight && lowCoverageInsight.id !== primaryInsight?.id
      ? lowCoverageInsight
      : null
    : supportingInsights[0] ?? null;

  const systemSecondaryAction = secondarySource
    ? buildActionFromInsight(secondarySource, 'secondary')
    : positiveInsight && positiveInsight.id !== primaryInsight?.id
    ? buildActionFromInsight(positiveInsight, 'secondary')
    : null;
  const goalAlignment = buildGoalAlignmentSection({
    alignment: goal?.alignment ?? null,
    path: goal?.path ?? null,
  });
  const dayReshapingSection = buildDayReshapingSection({
    plan: dayReshaping?.plan ?? null,
    appliedRecord: dayReshaping?.appliedRecord ?? null,
  });
  const weeklyReflectionSection = buildWeeklyReflectionSection({
    reflection: weekly?.reflection ?? null,
  });
  const goalPrimaryAction = goalAlignment.isVisible && goal?.alignment?.recommendationCandidates[0]
    ? buildActionFromGoalRecommendation(goal.alignment.recommendationCandidates[0], 'primary')
    : null;
  const goalSecondaryAction = goalAlignment.isVisible && goal?.alignment?.recommendationCandidates[1]
    ? buildActionFromGoalRecommendation(goal.alignment.recommendationCandidates[1], 'secondary')
    : null;

  const mergedPrimaryAction = primaryInsight
    ? systemPrimaryAction
    : goalPrimaryAction
    ?? systemPrimaryAction
    ?? null;
  const mergedSecondaryAction = pickNextAction(
    primaryInsight
      ? [goalPrimaryAction, systemSecondaryAction, goalSecondaryAction]
      : [goalSecondaryAction, systemSecondaryAction, systemPrimaryAction],
    [mergedPrimaryAction],
  );

  const emphasizedDomain = mergedPrimaryAction?.domain
    ?? (positiveInsight?.targetRoute === appRoutes.body
      ? 'body'
      : positiveInsight?.targetRoute === appRoutes.mind
      ? 'mind'
      : 'time');

  return {
    currentState,
    primaryInsight,
    supportingInsights,
    positiveInsight,
    goalAlignment,
    dayReshaping: dayReshapingSection,
    weeklyReflection: weeklyReflectionSection,
    courseCorrections: {
      primaryAction: mergedPrimaryAction,
      secondaryAction: mergedSecondaryAction,
    },
    engineLinks: buildEngineLinks(snapshot, emphasizedDomain),
  };
}
