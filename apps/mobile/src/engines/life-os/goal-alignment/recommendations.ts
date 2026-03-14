import type { LifeOsConfidence, LifeOsContextSnapshot, LifeOsObservation } from '../types';
import { confidenceFactor, STRICTNESS_PROFILE } from './score-helpers';
import type {
  GoalAlignmentBand,
  GoalAlignmentRecommendation,
  GoalAlignmentSignal,
  GoalDefinition,
  GoalDomainAssessment,
  GoalRecommendationCategory,
  GoalSignalCode,
} from './types';

type RecommendationInput = {
  date: string;
  goal: GoalDefinition;
  snapshot: LifeOsContextSnapshot;
  observations: LifeOsObservation[];
  domainAssessments: GoalDomainAssessment[];
  blockers: GoalAlignmentSignal[];
  supports: GoalAlignmentSignal[];
  alignmentBand: GoalAlignmentBand;
  confidence: LifeOsConfidence;
};

type DraftRecommendation = Omit<GoalAlignmentRecommendation, 'priority'>;

const CODE_SUPPRESSION: Partial<Record<string, string[]>> = {
  capture_more_signals: [],
};

function domainWeightFor(
  domain: GoalDomainAssessment['domain'],
  domainAssessments: GoalDomainAssessment[],
) {
  return domainAssessments.find((item) => item.domain === domain)?.weight ?? 0.2;
}

function buildDraft(args: {
  input: RecommendationInput;
  code: string;
  category: GoalRecommendationCategory;
  domain: GoalAlignmentRecommendation['domain'];
  title: string;
  explanation: string;
  blockerStrength: number;
  confidence: LifeOsConfidence;
  sourceSignalCodes: GoalSignalCode[];
  urgent?: boolean;
}): DraftRecommendation {
  const profile = STRICTNESS_PROFILE[args.input.goal.strictness];
  const urgencyMultiplier = args.urgent ? profile.urgencyMultiplier : 1;

  return {
    id: `${args.code}:${args.input.date}:${args.input.goal.id}`,
    code: args.code,
    category: args.category,
    priorityScore: Math.round(
      args.blockerStrength
      * domainWeightFor(args.domain, args.input.domainAssessments)
      * confidenceFactor(args.confidence)
      * urgencyMultiplier,
    ),
    domain: args.domain,
    title: args.title,
    explanation: args.explanation,
    sourceSignalCodes: args.sourceSignalCodes,
  };
}

function findSignal(
  items: GoalAlignmentSignal[],
  code: GoalSignalCode,
) {
  return items.find((item) => item.code === code) ?? null;
}

function assignPriority(items: DraftRecommendation[]): GoalAlignmentRecommendation[] {
  return items.map((item, index) => ({
    ...item,
    priority: index === 0 ? 'primary' : index === 1 ? 'secondary' : 'watch',
  }));
}

function dedupeRecommendations(items: DraftRecommendation[]) {
  const byCode = new Map<string, DraftRecommendation>();
  for (const item of items) {
    const current = byCode.get(item.code);
    if (!current || current.priorityScore < item.priorityScore) {
      byCode.set(item.code, item);
    }
  }

  const sorted = [...byCode.values()].sort((left, right) => right.priorityScore - left.priorityScore);
  const kept: DraftRecommendation[] = [];
  const usedCategories = new Set<GoalRecommendationCategory>();
  const suppressedCodes = new Set<string>();

  for (const item of sorted) {
    if (suppressedCodes.has(item.code)) continue;
    if (usedCategories.has(item.category)) continue;

    kept.push(item);
    usedCategories.add(item.category);

    for (const code of CODE_SUPPRESSION[item.code] ?? []) {
      suppressedCodes.add(code);
    }
  }

  return kept.slice(0, 3);
}

function buildCaptureMoreSignals(input: RecommendationInput): DraftRecommendation | null {
  if (input.confidence !== 'low' && input.alignmentBand !== 'unclear') return null;

  const domain = input.snapshot.signalCoverage.missingDomains[0]
    ?? input.domainAssessments.find((item) => item.confidence === 'low')?.domain
    ?? 'time';

  return buildDraft({
    input,
    code: 'capture_more_signals',
    category: 'coverage',
    domain,
    title: 'Capture one more strong signal first',
    explanation: 'Today is still partially obscured. One more meaningful signal will make the goal read more reliable.',
    blockerStrength: 95,
    confidence: 'high',
    sourceSignalCodes: [],
  });
}

function buildProtectSleepWindow(input: RecommendationInput): DraftRecommendation | null {
  const sleep = findSignal(input.blockers, 'sleepScore');
  const recovery = findSignal(input.blockers, 'recoverySupportScore');
  if (!sleep && !recovery) return null;

  const confidence = sleep?.confidence ?? recovery?.confidence ?? 'medium';
  return buildDraft({
    input,
    code: 'protect_sleep_window',
    category: 'sleep',
    domain: 'time',
    title: 'Protect tonight’s sleep window',
    explanation: 'Recovery is already carrying less margin. Preserving sleep is the cleanest way to reduce goal strain before adding more demand.',
    blockerStrength: Math.max(sleep?.strength ?? 0, recovery?.strength ?? 0),
    confidence,
    sourceSignalCodes: [sleep?.code, recovery?.code].filter((code): code is GoalSignalCode => Boolean(code)),
    urgent: true,
  });
}

function buildReduceCognitiveLoad(input: RecommendationInput): DraftRecommendation | null {
  const focus = findSignal(input.blockers, 'focusCapacityScore');
  const deadline = findSignal(input.blockers, 'deadlineSupportScore');
  if (!focus && !deadline) return null;

  return buildDraft({
    input,
    code: 'reduce_cognitive_load',
    category: 'load',
    domain: 'time',
    title: 'Reduce cognitive load before pushing harder',
    explanation: 'Today is already carrying more mental demand than the goal benefits from. Trim non-essential load first.',
    blockerStrength: Math.max(focus?.strength ?? 0, deadline?.strength ?? 0),
    confidence: focus?.confidence ?? deadline?.confidence ?? 'medium',
    sourceSignalCodes: [focus?.code, deadline?.code].filter((code): code is GoalSignalCode => Boolean(code)),
    urgent: input.goal.archetype === 'perform',
  });
}

function buildHoldGoalIntensity(input: RecommendationInput): DraftRecommendation | null {
  const recovery = findSignal(input.blockers, 'recoverySupportScore');
  const mind = findSignal(input.blockers, 'mindStabilityScore');
  if (!recovery && !mind) return null;

  return buildDraft({
    input,
    code: 'hold_goal_intensity',
    category: 'recovery',
    domain: recovery ? 'body' : 'mind',
    title: 'Shift from aggressive to sustainable today',
    explanation: 'The goal does not need to be abandoned, but it does need a steadier path while capacity is softer.',
    blockerStrength: Math.max(recovery?.strength ?? 0, mind?.strength ?? 0),
    confidence: recovery?.confidence ?? mind?.confidence ?? 'medium',
    sourceSignalCodes: [recovery?.code, mind?.code].filter((code): code is GoalSignalCode => Boolean(code)),
    urgent: true,
  });
}

function buildReducePlanFragmentation(input: RecommendationInput): DraftRecommendation | null {
  const fragmentation = findSignal(input.blockers, 'fragmentationSupportScore');
  if (!fragmentation) return null;

  return buildDraft({
    input,
    code: 'reduce_plan_fragmentation',
    category: 'focus',
    domain: 'time',
    title: 'Reduce schedule fragmentation',
    explanation: 'The goal benefits more from a cleaner schedule than from adding more items to the plan.',
    blockerStrength: fragmentation.strength,
    confidence: fragmentation.confidence,
    sourceSignalCodes: [fragmentation.code],
  });
}

function buildPrioritizeHydration(input: RecommendationInput): DraftRecommendation | null {
  const hydration = findSignal(input.blockers, 'hydrationScore');
  if (!hydration) return null;

  return buildDraft({
    input,
    code: 'prioritize_hydration',
    category: 'hydration',
    domain: 'body',
    title: 'Prioritize hydration early',
    explanation: 'Hydration is trailing the goal baseline. Fixing that is a low-friction correction with real downstream payoff.',
    blockerStrength: hydration.strength,
    confidence: hydration.confidence,
    sourceSignalCodes: [hydration.code],
  });
}

function buildStabilizeNutritionTarget(input: RecommendationInput): DraftRecommendation | null {
  const calories = findSignal(input.blockers, 'calorieTargetScore');
  if (!calories) return null;

  return buildDraft({
    input,
    code: 'stabilize_nutrition_target',
    category: 'nutrition',
    domain: 'body',
    title: 'Stabilize the nutrition target',
    explanation: 'Today’s intake pattern is not supporting the active goal yet. Bringing it back into range matters more than adding complexity.',
    blockerStrength: calories.strength,
    confidence: calories.confidence,
    sourceSignalCodes: [calories.code],
  });
}

function buildReinforceSupportingHabits(input: RecommendationInput): DraftRecommendation | null {
  const habits = findSignal(input.blockers, 'habitAdherenceScore');
  if (!habits) return null;

  return buildDraft({
    input,
    code: 'reinforce_supporting_habits',
    category: 'consistency',
    domain: 'mind',
    title: 'Reinforce the smallest supporting habit',
    explanation: 'Consistency is softer than the goal needs. Restore the simplest habit first instead of adding a bigger corrective plan.',
    blockerStrength: habits.strength,
    confidence: habits.confidence,
    sourceSignalCodes: [habits.code],
  });
}

function buildProtectFocusWindow(input: RecommendationInput): DraftRecommendation | null {
  if (input.alignmentBand !== 'aligned' || input.confidence === 'low') return null;
  const deepWork = findSignal(input.supports, 'deepWorkTargetScore');
  const focus = findSignal(input.supports, 'focusCapacityScore');
  if (!deepWork && !focus) return null;

  return buildDraft({
    input,
    code: 'protect_focus_window',
    category: 'focus',
    domain: 'time',
    title: 'Protect the clean focus window you already have',
    explanation: 'There is usable cognitive quality in the schedule. Preserve it rather than diluting it.',
    blockerStrength: Math.max(deepWork?.strength ?? 0, focus?.strength ?? 0),
    confidence: deepWork?.confidence ?? focus?.confidence ?? 'medium',
    sourceSignalCodes: [deepWork?.code, focus?.code].filter((code): code is GoalSignalCode => Boolean(code)),
  });
}

export function buildGoalAlignmentRecommendations(
  input: RecommendationInput,
): GoalAlignmentRecommendation[] {
  const candidates: DraftRecommendation[] = [];

  const captureMoreSignals = buildCaptureMoreSignals(input);
  if (captureMoreSignals) candidates.push(captureMoreSignals);

  const protectSleepWindow = buildProtectSleepWindow(input);
  if (protectSleepWindow) candidates.push(protectSleepWindow);

  const reduceCognitiveLoad = buildReduceCognitiveLoad(input);
  if (reduceCognitiveLoad) candidates.push(reduceCognitiveLoad);

  const holdGoalIntensity = buildHoldGoalIntensity(input);
  if (holdGoalIntensity) candidates.push(holdGoalIntensity);

  const reducePlanFragmentation = buildReducePlanFragmentation(input);
  if (reducePlanFragmentation) candidates.push(reducePlanFragmentation);

  const prioritizeHydration = buildPrioritizeHydration(input);
  if (prioritizeHydration) candidates.push(prioritizeHydration);

  const stabilizeNutritionTarget = buildStabilizeNutritionTarget(input);
  if (stabilizeNutritionTarget) candidates.push(stabilizeNutritionTarget);

  const reinforceSupportingHabits = buildReinforceSupportingHabits(input);
  if (reinforceSupportingHabits) candidates.push(reinforceSupportingHabits);

  const protectFocusWindow = buildProtectFocusWindow(input);
  if (protectFocusWindow) candidates.push(protectFocusWindow);

  return assignPriority(dedupeRecommendations(candidates));
}
