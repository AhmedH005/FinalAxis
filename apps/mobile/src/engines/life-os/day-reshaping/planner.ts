import {
  buildDayReshapeConfidence,
  buildDayReshapeExpectedBenefit,
  buildDayReshapeWhyNow,
} from './explain';
import {
  buildDayReshapeRuleContext,
  compressFragmentationRule,
  deferInternalBlockRule,
  preserveRecoveryWindowRule,
  protectFocusWindowRule,
  reduceLoadRule,
} from './rules';
import type {
  DayReshapeAction,
  DayReshapeBlockedReason,
  DayReshapePlan,
  DayReshapePlanInput,
  DayReshapeRuleResult,
} from './types';

function dedupeActions(actions: DayReshapeAction[]) {
  const seenTypes = new Set<DayReshapeAction['type']>();
  const seenBlockIds = new Set<string>();
  const kept: DayReshapeAction[] = [];

  for (const action of actions.sort((left, right) => right.priority - left.priority)) {
    const targetBlockIds = [
      ...new Set(
        (action.patches.length > 0 ? action.patches.map((item) => item.blockId) : action.affectedBlocks.map((item) => item.blockId))
          .sort(),
      ),
    ];
    if (seenTypes.has(action.type)) continue;
    if (targetBlockIds.some((blockId) => seenBlockIds.has(blockId))) continue;

    kept.push(action);
    seenTypes.add(action.type);
    for (const blockId of targetBlockIds) {
      seenBlockIds.add(blockId);
    }
  }

  return kept.slice(0, 3);
}

function dedupeBlockedReasons(items: DayReshapeBlockedReason[]) {
  const seen = new Set<DayReshapeBlockedReason['code']>();
  return items.filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

function collectRuleOutput(results: Array<DayReshapeRuleResult | null>) {
  const actions: DayReshapeAction[] = [];
  const blockedReasons: DayReshapeBlockedReason[] = [];

  for (const result of results) {
    if (!result) continue;
    if (result.action) actions.push(result.action);
    if (result.blockedReason) blockedReasons.push(result.blockedReason);
  }

  return {
    actions: dedupeActions(actions),
    blockedReasons: dedupeBlockedReasons(blockedReasons),
  };
}

export function buildDayReshapePlan(input: DayReshapePlanInput): DayReshapePlan {
  if (input.snapshot.signalCoverage.confidence === 'low') {
    const blockedReasons: DayReshapeBlockedReason[] = [
      {
        code: 'low_signal_confidence',
        detail: 'Signal coverage is still too thin to recommend a trustworthy day reshape.',
      },
    ];

    return {
      date: input.snapshot.date,
      actions: [],
      whyNow: buildDayReshapeWhyNow({
        snapshot: input.snapshot,
        goalAlignment: input.goalAlignment,
        actions: [],
        blockedReasons,
      }),
      confidence: 'low',
      blockedReasons,
      expectedBenefit: [],
    };
  }

  const context = buildDayReshapeRuleContext(input);
  const { actions, blockedReasons } = collectRuleOutput([
    reduceLoadRule(context),
    preserveRecoveryWindowRule(context),
    protectFocusWindowRule(context),
    compressFragmentationRule(context),
    deferInternalBlockRule(context),
  ]);

  return {
    date: input.snapshot.date,
    actions,
    whyNow: buildDayReshapeWhyNow({
      snapshot: input.snapshot,
      goalAlignment: input.goalAlignment,
      actions,
      blockedReasons,
    }),
    confidence: buildDayReshapeConfidence({
      snapshot: input.snapshot,
      goalAlignment: input.goalAlignment,
      actions,
    }),
    blockedReasons,
    expectedBenefit: buildDayReshapeExpectedBenefit(actions),
  };
}
