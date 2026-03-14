import type { Href } from 'expo-router';
import { appRoutes } from '../../types/navigation';
import type {
  GoalAlignmentBand,
  GoalAlignmentRecommendation,
  GoalAlignmentSnapshot,
  GoalPathModel,
  GoalSignalCode,
  GoalSignalMissingReason,
  GoalSignalValue,
  LifeOsConfidence,
  LifeOsDomain,
} from '@/engines/life-os';

export interface GoalAlignmentDetailSignalItem {
  id: string;
  code: GoalSignalCode;
  label: string;
  detail: string;
  domain: LifeOsDomain;
  route: Href;
  confidence: LifeOsConfidence;
}

export interface GoalAlignmentDetailShiftItem {
  id: string;
  code: string;
  title: string;
  detail: string;
  domain: LifeOsDomain;
  route: Href;
}

export interface GoalAlignmentDetailModel {
  isAvailable: boolean;
  goalLabel: string | null;
  band: GoalAlignmentBand | null;
  bandLabel: string | null;
  confidence: LifeOsConfidence | null;
  headerSummary: string | null;
  currentPath: {
    title: string | null;
    summary: string | null;
    evidence: string[];
  };
  moreAlignedPath: {
    title: string | null;
    summary: string | null;
  };
  blockers: GoalAlignmentDetailSignalItem[];
  supports: GoalAlignmentDetailSignalItem[];
  recommendedShifts: GoalAlignmentDetailShiftItem[];
  evidenceNote: string | null;
  emptyState: {
    title: string;
    summary: string;
  } | null;
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

function bandLabel(band: GoalAlignmentBand | null) {
  if (!band) return null;
  switch (band) {
    case 'at_risk':
      return 'At risk';
    case 'misaligned':
      return 'Misaligned';
    case 'aligned':
      return 'Aligned';
    default:
      return 'Unclear';
  }
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const remainder = value % 60;
  if (hours <= 0) return `${value}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function formatMissingDetail(reason: GoalSignalMissingReason | undefined) {
  switch (reason) {
    case 'target_missing':
      return 'The target needed for this read is still missing.';
    case 'body_summary_missing':
      return 'Body data is too thin to call this signal clearly.';
    case 'time_summary_missing':
      return 'Time data is too thin to call this signal clearly.';
    case 'mind_summary_missing':
    case 'mind_pattern_missing':
      return 'Mind data is still too partial to support a stronger read.';
    default:
      return 'This signal is still too thin to read confidently today.';
  }
}

function formatSignalDetail(signal: GoalSignalValue) {
  if (signal.score === null) {
    return formatMissingDetail(signal.missingReason);
  }

  switch (signal.code) {
    case 'sleepScore':
      return signal.targetValue != null
        ? `${formatMinutes(Number(signal.rawValue))} of sleep against a ${formatMinutes(signal.targetValue)} target.`
        : `${formatMinutes(Number(signal.rawValue))} of sleep logged today.`;
    case 'hydrationScore':
      return signal.targetValue != null
        ? `${signal.rawValue} ml logged against a ${signal.targetValue} ml target.`
        : `${signal.rawValue} ml of hydration logged today.`;
    case 'habitAdherenceScore':
      return `${signal.rawValue}% adherence across supporting habits.`;
    case 'mindStabilityScore':
      return `Mind stability is reading ${signal.score}/100 today.`;
    case 'recoverySupportScore':
      return `Recovery support is reading ${signal.score}/100 today.`;
    case 'fragmentationSupportScore':
      return `Schedule cohesion is reading ${signal.score}/100 today.`;
    case 'focusCapacityScore':
      return `Focus capacity is reading ${signal.score}/100 after today’s load.`;
    case 'deadlineSupportScore':
      return `Deadline pressure support is reading ${signal.score}/100 today.`;
    case 'deepWorkTargetScore':
      return signal.targetValue != null
        ? `${formatMinutes(Number(signal.rawValue))} of deep work against a ${formatMinutes(signal.targetValue)} target.`
        : `${formatMinutes(Number(signal.rawValue))} of deep work protected today.`;
    case 'calorieTargetScore':
      return signal.targetValue != null
        ? `${signal.rawValue} kcal logged against a ${signal.targetValue} kcal target.`
        : `${signal.rawValue} kcal logged today.`;
    default:
      return `This signal is reading ${signal.score}/100 today.`;
  }
}

function headerSummary(alignment: GoalAlignmentSnapshot) {
  if (alignment.confidence === 'low') {
    return 'The goal read is still partial because one or more goal-critical signals are missing.';
  }

  switch (alignment.alignmentBand) {
    case 'aligned':
      return 'Today is giving this goal enough support to stay on line.';
    case 'at_risk':
      return 'The goal still has traction, but one or more systems are starting to pull against it.';
    case 'misaligned':
      return 'Today is leaning away from the goal because the supporting systems are not holding together yet.';
    default:
      return 'There is not enough strong signal yet to call the goal path clearly.';
  }
}

function buildEvidenceNote(alignment: GoalAlignmentSnapshot) {
  const inferredTargets = alignment.goal.assumptions.inferredTargets;
  if (alignment.confidence === 'low') {
    return inferredTargets.length > 0
      ? 'This read is cautious because some goal-critical signals are missing and one or more targets are being inferred.'
      : 'This read is cautious because one or more goal-critical signals are missing today.';
  }
  if (inferredTargets.length > 0) {
    return 'Some targets are being inferred today, so this read should be treated as directional rather than exact.';
  }

  const partialDomains = alignment.domainAssessments.filter((item) => item.confidence !== 'high').length;
  if (partialDomains > 0) {
    return 'One or more goal-critical domains are still partial, so the read is strong enough to use but not fully settled.';
  }

  return null;
}

function indexSignals(alignment: GoalAlignmentSnapshot) {
  const entries = alignment.domainAssessments.flatMap((assessment) => [
    ...assessment.primarySignals,
    ...assessment.secondarySignals,
  ]);

  return new Map(entries.map((signal) => [signal.code, signal]));
}

function buildSignalItems(
  alignmentSignals: GoalAlignmentSnapshot['blockers'] | GoalAlignmentSnapshot['supports'],
  signalIndex: Map<GoalSignalCode, GoalSignalValue>,
) {
  return alignmentSignals.slice(0, 3).map((signal) => {
    const source = signalIndex.get(signal.code);
    return {
      id: `${signal.direction}:${signal.code}`,
      code: signal.code,
      label: signal.label,
      detail: source ? formatSignalDetail(source) : 'This signal is contributing to the goal read today.',
      domain: signal.domain,
      route: routeForDomain(signal.domain),
      confidence: signal.confidence,
    };
  });
}

function buildShiftItems(recommendations: GoalAlignmentRecommendation[]) {
  return recommendations.slice(0, 2).map((recommendation) => ({
    id: recommendation.id,
    code: recommendation.code,
    title: recommendation.title,
    detail: recommendation.explanation,
    domain: recommendation.domain,
    route: routeForDomain(recommendation.domain),
  }));
}

export function buildGoalAlignmentDetailModel(
  alignment: GoalAlignmentSnapshot | null,
  path: GoalPathModel | null,
): GoalAlignmentDetailModel {
  if (!alignment || !path) {
    return {
      isAvailable: false,
      goalLabel: null,
      band: null,
      bandLabel: null,
      confidence: null,
      headerSummary: null,
      currentPath: {
        title: null,
        summary: null,
        evidence: [],
      },
      moreAlignedPath: {
        title: null,
        summary: null,
      },
      blockers: [],
      supports: [],
      recommendedShifts: [],
      evidenceNote: null,
      emptyState: {
        title: 'No active goal read yet',
        summary: 'Choose an active direction first, then AXIS can show how today is lining up against it.',
      },
    };
  }

  const signalIndex = indexSignals(alignment);

  return {
    isAvailable: true,
    goalLabel: path.goalLabel,
    band: alignment.alignmentBand,
    bandLabel: bandLabel(alignment.alignmentBand),
    confidence: alignment.confidence,
    headerSummary: headerSummary(alignment),
    currentPath: {
      title: path.currentPath.title,
      summary: path.currentPath.summary,
      evidence: path.currentPath.evidence,
    },
    moreAlignedPath: {
      title: path.moreAlignedPath.title,
      summary: path.moreAlignedPath.summary,
    },
    blockers: buildSignalItems(alignment.blockers, signalIndex),
    supports: buildSignalItems(alignment.supports, signalIndex),
    recommendedShifts: buildShiftItems(alignment.recommendationCandidates),
    evidenceNote: buildEvidenceNote(alignment),
    emptyState: null,
  };
}
