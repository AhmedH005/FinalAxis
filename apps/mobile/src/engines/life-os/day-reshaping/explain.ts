import type { GoalAlignmentSnapshot } from '../goal-alignment/types';
import type { LifeOsConfidence, LifeOsContextSnapshot } from '../types';
import type { DayReshapeAction, DayReshapePlan } from './types';

function mergeConfidence(left: LifeOsConfidence, right: LifeOsConfidence): LifeOsConfidence {
  if (left === 'low' || right === 'low') return 'low';
  if (left === 'medium' || right === 'medium') return 'medium';
  return 'high';
}

export function buildDayReshapeConfidence(args: {
  snapshot: LifeOsContextSnapshot;
  goalAlignment: GoalAlignmentSnapshot | null;
  actions: DayReshapeAction[];
}): LifeOsConfidence {
  const base = args.goalAlignment
    ? mergeConfidence(args.snapshot.signalCoverage.confidence, args.goalAlignment.confidence)
    : args.snapshot.signalCoverage.confidence;

  if (args.actions.length === 0) {
    return base;
  }

  return args.actions.reduce(
    (current, action) => mergeConfidence(current, action.confidence),
    base,
  );
}

export function buildDayReshapeWhyNow(args: {
  snapshot: LifeOsContextSnapshot;
  goalAlignment: GoalAlignmentSnapshot | null;
  actions: DayReshapeAction[];
  blockedReasons: DayReshapePlan['blockedReasons'];
}): string {
  if (args.actions.length > 0) {
    const primary = args.actions[0];
    return primary.reason;
  }

  if (args.snapshot.signalCoverage.confidence === 'low') {
    return 'AXIS is holding back because today’s signal coverage is still too thin for a reshaping recommendation.';
  }

  if (args.goalAlignment?.goal.archetype === 'perform') {
    return 'AXIS does not see a safe enough reshaping move yet, so it is leaving the day intact for now.';
  }

  if (args.blockedReasons.length > 0) {
    return args.blockedReasons[0].detail;
  }

  return 'AXIS does not see enough pressure to justify a schedule reshape right now.';
}

export function buildDayReshapeExpectedBenefit(actions: DayReshapeAction[]): string[] {
  const unique = new Set<string>();

  for (const action of actions) {
    switch (action.type) {
      case 'protect_focus_window':
        unique.add('Preserve a cleaner stretch of deep work.');
        break;
      case 'compress_fragmentation':
        unique.add('Reduce schedule fragmentation and create more usable margin.');
        break;
      case 'defer_internal_block':
        unique.add('Move one lower-leverage commitment out of the current day.');
        break;
      case 'reduce_load':
        unique.add('Lower the total cognitive cost of the day.');
        break;
      case 'preserve_recovery_window':
        unique.add('Protect the back end of the day so recovery has more room.');
        break;
    }
  }

  return [...unique];
}
