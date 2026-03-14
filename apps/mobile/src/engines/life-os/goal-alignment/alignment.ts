import type { LifeOsObservation } from '../types';
import {
  STRICTNESS_PROFILE,
  classifyAlignmentBand,
  classifyDomainBand,
  classifyDomainConfidence,
  mergeConfidence,
  weightedAverageAvailable,
} from './score-helpers';
import { extractGoalSignals } from './signal-mapping';
import { buildGoalAlignmentRecommendations } from './recommendations';
import type {
  GoalAlignmentSignal,
  GoalAlignmentSnapshot,
  GoalDefinition,
  GoalDomainAssessment,
  GoalDomainSignalWeight,
  GoalObject,
  GoalSignalCode,
  GoalSignalSet,
} from './types';

type ArchetypeProfile = {
  object: GoalObject;
  domains: Record<'time' | 'body' | 'mind', { weight: number; signals: GoalDomainSignalWeight[] }>;
};

const ARCHETYPE_PROFILES: Record<GoalDefinition['archetype'], ArchetypeProfile> = {
  lose: {
    object: 'body_composition',
    domains: {
      body: {
        weight: 0.55,
        signals: [
          { code: 'calorieTargetScore', weight: 0.4, primary: true },
          { code: 'sleepScore', weight: 0.2, primary: true },
          { code: 'hydrationScore', weight: 0.15, primary: false },
          { code: 'recoverySupportScore', weight: 0.25, primary: true },
        ],
      },
      mind: {
        weight: 0.25,
        signals: [
          { code: 'habitAdherenceScore', weight: 0.6, primary: true },
          { code: 'mindStabilityScore', weight: 0.4, primary: false },
        ],
      },
      time: {
        weight: 0.2,
        signals: [
          { code: 'focusCapacityScore', weight: 0.45, primary: false },
          { code: 'fragmentationSupportScore', weight: 0.55, primary: true },
        ],
      },
    },
  },
  maintain: {
    object: 'body_composition',
    domains: {
      body: {
        weight: 0.45,
        signals: [
          { code: 'calorieTargetScore', weight: 0.35, primary: true },
          { code: 'sleepScore', weight: 0.25, primary: true },
          { code: 'hydrationScore', weight: 0.15, primary: false },
          { code: 'recoverySupportScore', weight: 0.25, primary: true },
        ],
      },
      mind: {
        weight: 0.3,
        signals: [
          { code: 'habitAdherenceScore', weight: 0.5, primary: true },
          { code: 'mindStabilityScore', weight: 0.5, primary: true },
        ],
      },
      time: {
        weight: 0.25,
        signals: [
          { code: 'fragmentationSupportScore', weight: 0.6, primary: true },
          { code: 'focusCapacityScore', weight: 0.4, primary: false },
        ],
      },
    },
  },
  gain: {
    object: 'body_composition',
    domains: {
      body: {
        weight: 0.55,
        signals: [
          { code: 'calorieTargetScore', weight: 0.45, primary: true },
          { code: 'sleepScore', weight: 0.3, primary: true },
          { code: 'hydrationScore', weight: 0.1, primary: false },
          { code: 'recoverySupportScore', weight: 0.15, primary: true },
        ],
      },
      mind: {
        weight: 0.2,
        signals: [
          { code: 'habitAdherenceScore', weight: 0.55, primary: true },
          { code: 'mindStabilityScore', weight: 0.45, primary: false },
        ],
      },
      time: {
        weight: 0.25,
        signals: [
          { code: 'focusCapacityScore', weight: 0.4, primary: true },
          { code: 'fragmentationSupportScore', weight: 0.3, primary: false },
          { code: 'deadlineSupportScore', weight: 0.3, primary: false },
        ],
      },
    },
  },
  perform: {
    object: 'cognitive_output',
    domains: {
      time: {
        weight: 0.45,
        signals: [
          { code: 'deepWorkTargetScore', weight: 0.35, primary: true },
          { code: 'fragmentationSupportScore', weight: 0.25, primary: true },
          { code: 'deadlineSupportScore', weight: 0.25, primary: true },
          { code: 'focusCapacityScore', weight: 0.15, primary: true },
        ],
      },
      body: {
        weight: 0.35,
        signals: [
          { code: 'recoverySupportScore', weight: 0.45, primary: true },
          { code: 'sleepScore', weight: 0.35, primary: true },
          { code: 'hydrationScore', weight: 0.2, primary: false },
        ],
      },
      mind: {
        weight: 0.2,
        signals: [
          { code: 'mindStabilityScore', weight: 0.7, primary: true },
          { code: 'habitAdherenceScore', weight: 0.3, primary: false },
        ],
      },
    },
  },
};

const SIGNAL_META: Record<GoalSignalCode, { label: string; unit?: GoalAlignmentSignal['unit'] }> = {
  sleepScore: { label: 'Sleep support', unit: 'score' },
  hydrationScore: { label: 'Hydration support', unit: 'score' },
  habitAdherenceScore: { label: 'Habit adherence', unit: 'pct' },
  mindStabilityScore: { label: 'Mind stability', unit: 'score' },
  recoverySupportScore: { label: 'Recovery support', unit: 'score' },
  fragmentationSupportScore: { label: 'Schedule cohesion', unit: 'score' },
  focusCapacityScore: { label: 'Focus capacity', unit: 'score' },
  deadlineSupportScore: { label: 'Deadline pressure support', unit: 'score' },
  deepWorkTargetScore: { label: 'Deep work support', unit: 'score' },
  calorieTargetScore: { label: 'Calorie target support', unit: 'score' },
};

const SIGNAL_OBSERVATION_MAP: Partial<Record<GoalSignalCode, string[]>> = {
  sleepScore: ['sleep_and_hydration_below_target'],
  hydrationScore: ['sleep_and_hydration_below_target'],
  habitAdherenceScore: ['habits_support_goal'],
  mindStabilityScore: ['workload_rising_mind_stability_falling'],
  recoverySupportScore: [
    'high_focus_load_low_recovery',
    'deadline_pressure_recovery_collision',
    'recovery_foundation_supportive',
  ],
  fragmentationSupportScore: ['focused_work_protected'],
  focusCapacityScore: ['high_focus_load_low_recovery', 'focused_work_protected'],
  deadlineSupportScore: ['deadline_pressure_recovery_collision'],
  deepWorkTargetScore: ['focused_work_protected'],
};

function buildObservationEvidence(
  code: GoalSignalCode,
  observations: LifeOsObservation[],
) {
  const allowed = SIGNAL_OBSERVATION_MAP[code] ?? [];
  return observations
    .filter((item) => allowed.includes(item.code))
    .map((item) => item.code);
}

function buildDomainAssessment(args: {
  goal: GoalDefinition;
  weight: number;
  signalWeights: GoalDomainSignalWeight[];
  signals: GoalSignalSet;
}): GoalDomainAssessment {
  const allSignals = args.signalWeights.map((definition) => args.signals[definition.code]);
  const primarySignals = args.signalWeights
    .filter((definition) => definition.primary)
    .map((definition) => args.signals[definition.code]);
  const secondarySignals = args.signalWeights
    .filter((definition) => !definition.primary)
    .map((definition) => args.signals[definition.code]);
  const primaryAvailable = primarySignals.filter((signal) => signal.score !== null);
  const confidence = classifyDomainConfidence({
    primaryCount: primarySignals.length,
    primaryAvailable: primaryAvailable.length,
    primaryConfidences: primaryAvailable.map((signal) => signal.confidence),
  });
  const score = primaryAvailable.length === 0
    ? null
    : weightedAverageAvailable(
      args.signalWeights.map((definition) => ({
        value: args.signals[definition.code].score,
        weight: definition.weight,
      })),
    );

  return {
    domain: allSignals[0]?.domain ?? 'time',
    weight: args.weight,
    score,
    band: classifyDomainBand({
      score,
      confidence,
      strictness: args.goal.strictness,
    }),
    confidence,
    primarySignals,
    secondarySignals,
  };
}

function dedupeAlignmentSignals(items: GoalAlignmentSignal[]) {
  const seen = new Set<GoalSignalCode>();
  return items.filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

function buildAlignmentSignal(
  signal: GoalDomainAssessment['primarySignals'][number],
  observations: LifeOsObservation[],
  direction: GoalAlignmentSignal['direction'],
): GoalAlignmentSignal {
  const label = SIGNAL_META[signal.code].label;
  const strength = signal.score === null
    ? 0
    : direction === 'support'
    ? signal.score
    : 100 - signal.score;

  return {
    code: signal.code,
    label,
    domain: signal.domain,
    direction,
    strength,
    confidence: signal.confidence,
    value: signal.rawValue,
    unit: SIGNAL_META[signal.code].unit,
    evidenceObservationCodes: buildObservationEvidence(signal.code, observations),
  };
}

function deriveBlockersAndSupports(args: {
  goal: GoalDefinition;
  assessments: GoalDomainAssessment[];
  observations: LifeOsObservation[];
}): {
  blockers: GoalAlignmentSignal[];
  supports: GoalAlignmentSignal[];
} {
  const blockerFloor = STRICTNESS_PROFILE[args.goal.strictness].blockerSignalFloor;
  const blockerCandidates: GoalAlignmentSignal[] = [];
  const supportCandidates: GoalAlignmentSignal[] = [];

  for (const assessment of args.assessments) {
    for (const signal of assessment.primarySignals) {
      if (signal.score !== null && signal.score < blockerFloor) {
        blockerCandidates.push(buildAlignmentSignal(signal, args.observations, 'block'));
      } else if (signal.score !== null && signal.score >= 70 && signal.confidence !== 'low') {
        supportCandidates.push(buildAlignmentSignal(signal, args.observations, 'support'));
      }
    }

    for (const signal of assessment.secondarySignals) {
      if (signal.score !== null && signal.score < blockerFloor - 10) {
        blockerCandidates.push(buildAlignmentSignal(signal, args.observations, 'block'));
      } else if (signal.score !== null && signal.score >= 80 && signal.confidence !== 'low') {
        supportCandidates.push(buildAlignmentSignal(signal, args.observations, 'support'));
      }
    }
  }

  return {
    blockers: dedupeAlignmentSignals(blockerCandidates)
      .sort((left, right) => right.strength - left.strength)
      .slice(0, 4),
    supports: dedupeAlignmentSignals(supportCandidates)
      .sort((left, right) => right.strength - left.strength)
      .slice(0, 4),
  };
}

export function validateGoalDefinition(goal: GoalDefinition): void {
  if (goal.state !== 'active') throw new Error('Goal must be active');
  if (!(goal.archetype in ARCHETYPE_PROFILES)) {
    throw new Error(`Unsupported goal archetype: ${goal.archetype}`);
  }
}

export function buildGoalAlignmentSnapshot(args: {
  date: string;
  goal: GoalDefinition;
  snapshot: import('../types').LifeOsContextSnapshot;
  observations: LifeOsObservation[];
}): GoalAlignmentSnapshot {
  validateGoalDefinition(args.goal);

  const profile = ARCHETYPE_PROFILES[args.goal.archetype];
  const signals = extractGoalSignals({
    snapshot: args.snapshot,
    goal: args.goal,
  });

  const domainAssessments = (Object.entries(profile.domains) as Array<
    ['time' | 'body' | 'mind', ArchetypeProfile['domains']['time']]
  >).map(([domain, domainProfile]) =>
    buildDomainAssessment({
      goal: {
        ...args.goal,
        object: profile.object,
      },
      weight: domainProfile.weight,
      signalWeights: domainProfile.signals.map((signal) => ({
        ...signal,
        code: signal.code,
      })),
      signals,
    }),
  ).sort((left, right) => right.weight - left.weight || left.domain.localeCompare(right.domain));

  const availableDomainCount = domainAssessments.filter((item) => item.score !== null).length;
  const confidence = mergeConfidence([
    args.snapshot.signalCoverage.confidence,
    ...domainAssessments
      .filter((item) => item.score !== null)
      .map((item) => item.confidence),
  ]);
  const alignmentScore = weightedAverageAvailable(
    domainAssessments.map((item) => ({
      value: item.score,
      weight: item.weight,
    })),
  );
  const hasCriticalWeakDomain = domainAssessments.some(
    (item) =>
      item.score !== null
      && item.score < STRICTNESS_PROFILE[args.goal.strictness].criticalDomainFloor,
  );
  const alignmentBand = classifyAlignmentBand({
    score: alignmentScore,
    confidence,
    strictness: args.goal.strictness,
    hasCriticalWeakDomain,
    availableDomainCount,
  });
  const { blockers, supports } = deriveBlockersAndSupports({
    goal: args.goal,
    assessments: domainAssessments,
    observations: args.observations,
  });
  const recommendationCandidates = buildGoalAlignmentRecommendations({
    date: args.date,
    goal: args.goal,
    snapshot: args.snapshot,
    observations: args.observations,
    domainAssessments,
    blockers,
    supports,
    alignmentBand,
    confidence,
  });

  return {
    date: args.date,
    goal: {
      ...args.goal,
      object: profile.object,
    },
    alignmentScore,
    alignmentBand,
    confidence,
    domainAssessments,
    blockers,
    supports,
    recommendationCandidates,
  };
}

export { ARCHETYPE_PROFILES };
