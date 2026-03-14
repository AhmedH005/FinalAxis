import type { GoalArchetype } from '../goal-alignment/types';
import type { LifeOsConfidence, LifeOsObservation } from '../types';
import type { TimeBlock } from '../../time/types';
import type {
  DayReshapeAction,
  DayReshapeBlockedReason,
  DayReshapeBlockPatch,
  DayReshapePlanInput,
  DayReshapeRuleContext,
  DayReshapeRuleResult,
} from './types';

function toBlockRef(block: TimeBlock) {
  return {
    blockId: block.id,
    title: block.title,
    start: block.start,
    end: block.end,
    taskId: block.taskId ?? null,
    source: block.source,
    isLocked: block.isLocked,
  };
}

function minutesBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + (minutes * 60_000));
}

function isMovableInternalBlock(block: TimeBlock) {
  return block.source === 'engine' && !block.isLocked;
}

function isDeepWorkBlock(block: TimeBlock) {
  return block.colour === 'VIOLET' || block.task?.colour === 'VIOLET';
}

function isShortBlock(block: TimeBlock) {
  return minutesBetween(block.start, block.end) <= 45;
}

function isLateBlock(block: TimeBlock) {
  const hour = new Date(block.start).getHours();
  return hour >= 18;
}

function mergeConfidence(left: LifeOsConfidence, right: LifeOsConfidence): LifeOsConfidence {
  if (left === 'low' || right === 'low') return 'low';
  if (left === 'medium' || right === 'medium') return 'medium';
  return 'high';
}

function moveBlockToStart(block: TimeBlock, nextStartIso: string) {
  const duration = minutesBetween(block.start, block.end);
  const nextStart = new Date(nextStartIso);
  const nextEnd = addMinutes(nextStart, duration);

  return {
    blockId: block.id,
    fromStart: block.start,
    fromEnd: block.end,
    toStart: nextStart.toISOString(),
    toEnd: nextEnd.toISOString(),
  };
}

function moveBlockToNextDay(block: TimeBlock) {
  const nextStart = new Date(block.start);
  nextStart.setDate(nextStart.getDate() + 1);
  return moveBlockToStart(block, nextStart.toISOString());
}

function buildSequentialPatches(blocks: TimeBlock[], anchorStartIso: string) {
  const sorted = blocks
    .slice()
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());
  const patches: DayReshapeBlockPatch[] = [];
  let cursor = new Date(anchorStartIso);

  for (const block of sorted) {
    const patch = moveBlockToStart(block, cursor.toISOString());
    patches.push(patch);
    cursor = new Date(patch.toEnd);
  }

  return patches;
}

function distanceFromFocusWindow(block: TimeBlock, focusBlock: TimeBlock) {
  const blockStart = new Date(block.start).getTime();
  const blockEnd = new Date(block.end).getTime();
  const focusStart = new Date(focusBlock.start).getTime();
  const focusEnd = new Date(focusBlock.end).getTime();

  if (blockEnd <= focusStart) {
    return focusStart - blockEnd;
  }

  if (blockStart >= focusEnd) {
    return blockStart - focusEnd;
  }

  return 0;
}

function hasObservation(observations: LifeOsObservation[], code: string) {
  return observations.some((item) => item.code === code);
}

function movableConfidence(context: DayReshapeRuleContext) {
  return mergeConfidence(
    context.timeConfidence,
    context.goalAlignment?.confidence ?? context.snapshot.signalCoverage.confidence,
  );
}

function blockedReason(code: DayReshapeBlockedReason['code'], detail: string): DayReshapeBlockedReason {
  return { code, detail };
}

function action(args: Omit<DayReshapeAction, 'id'>): DayReshapeAction {
  return {
    ...args,
    id: `${args.type}:${args.patches.map((item) => item.blockId).join(',') || args.affectedBlocks.map((item) => item.blockId).join(',') || 'none'}`,
  };
}

export function buildDayReshapeRuleContext(
  input: DayReshapePlanInput,
): DayReshapeRuleContext {
  const movableBlocks = input.blocks.filter(isMovableInternalBlock);
  const deepWorkBlocks = input.blocks.filter((block) => isDeepWorkBlock(block));
  const shortMovableBlocks = movableBlocks.filter(isShortBlock);
  const lateMovableBlocks = movableBlocks.filter(isLateBlock);
  const overloadDetected = input.snapshot.currentState.time.focusLoadLevel === 'high'
    || input.snapshot.recoveryRiskLevel === 'high'
    || input.snapshot.imbalanceLevel === 'high'
    || hasObservation(input.observations, 'high_focus_load_low_recovery')
    || hasObservation(input.observations, 'deadline_pressure_recovery_collision');
  const timeConfidence = input.snapshot.summaries.time?.signalCoverage.confidence
    ?? input.snapshot.signalCoverage.confidence;

  return {
    ...input,
    movableBlocks,
    deepWorkBlocks,
    shortMovableBlocks,
    lateMovableBlocks,
    overloadDetected,
    timeConfidence,
  };
}

export function protectFocusWindowRule(context: DayReshapeRuleContext): DayReshapeRuleResult | null {
  const goalType: GoalArchetype | null = context.goalAlignment?.goal.archetype ?? null;
  if (goalType !== 'perform') {
    return null;
  }

  const fragmented = context.snapshot.summaries.time?.fragmentation.level === 'high';
  const hasDeepWork = context.snapshot.summaries.time?.deepWorkMinutes
    ? context.snapshot.summaries.time.deepWorkMinutes > 0
    : false;

  if (!fragmented || !hasDeepWork) {
    return null;
  }

  const focusBlock = context.deepWorkBlocks.find((block) => block.source === 'engine')
    ?? context.deepWorkBlocks[0]
    ?? null;
  if (!focusBlock) {
    return {
      blockedReason: blockedReason(
        'no_existing_focus_window',
        'A focus block was expected, but AXIS could not find a concrete window to protect.',
      ),
    };
  }

  const nearbyMovable = context.shortMovableBlocks
    .filter((block) => block.id !== focusBlock.id)
    .sort((left, right) =>
      distanceFromFocusWindow(left, focusBlock) - distanceFromFocusWindow(right, focusBlock))
    .slice(0, 2);

  if (nearbyMovable.length === 0) {
    return {
      blockedReason: blockedReason(
        'no_movable_blocks',
        'A focus window exists, but there are no small movable internal blocks near it to reshape safely.',
      ),
    };
  }

  const nearbyPatches = buildSequentialPatches(nearbyMovable, focusBlock.end);

  return {
    action: action({
      type: 'protect_focus_window',
      title: 'Protect the existing focus window',
      detail: 'A real deep work block already exists. Keep smaller movable work from crowding around it.',
      reason: 'The active goal is perform-oriented and fragmentation is high while a focus block is already on the calendar.',
      confidence: movableConfidence(context),
      priority: 95,
      affectedBlocks: [focusBlock, ...nearbyMovable].map(toBlockRef),
      patches: nearbyPatches,
    }),
  };
}

export function compressFragmentationRule(context: DayReshapeRuleContext): DayReshapeRuleResult | null {
  const fragmentationScore = context.snapshot.summaries.time?.fragmentation.score ?? null;
  if (fragmentationScore === null || fragmentationScore < 70) {
    return null;
  }

  if (context.shortMovableBlocks.length < 2) {
    return {
      blockedReason: blockedReason(
        context.movableBlocks.length === 0 ? 'no_movable_blocks' : 'no_fragmentation_pressure',
        context.movableBlocks.length === 0
          ? 'Fragmentation is high, but there are no movable internal blocks to consolidate.'
          : 'Fragmentation is high, but there are not enough short movable blocks to compress safely.',
      ),
    };
  }

  const selectedBlocks = context.shortMovableBlocks
    .slice(0, 3)
    .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());
  const anchorStart = selectedBlocks[0]?.start ?? null;

  return {
    action: action({
      type: 'compress_fragmentation',
      title: 'Compress the most fragmented part of the day',
      detail: 'Combine the smaller movable blocks first so the schedule holds more usable margin.',
      reason: 'Fragmentation is high and there are multiple short internal blocks that can be consolidated without touching locked time.',
      confidence: context.timeConfidence,
      priority: 82,
      affectedBlocks: selectedBlocks.map(toBlockRef),
      patches: anchorStart ? buildSequentialPatches(selectedBlocks, anchorStart) : [],
    }),
  };
}

export function reduceLoadRule(context: DayReshapeRuleContext): DayReshapeRuleResult | null {
  const shouldReduce = context.snapshot.recoveryRiskLevel === 'high'
    && context.snapshot.currentState.time.focusLoadLevel === 'high';

  if (!shouldReduce) {
    return null;
  }

  if (context.movableBlocks.length === 0) {
    return {
      blockedReason: blockedReason(
        'only_locked_or_external_blocks',
        'Load is high, but the schedule is currently made of locked or external blocks AXIS should not move.',
      ),
    };
  }

  const candidates = context.movableBlocks
    .filter((block) => !isDeepWorkBlock(block))
    .sort((left, right) => new Date(right.start).getTime() - new Date(left.start).getTime())
    .slice(0, 2);

  return {
    action: action({
      type: 'reduce_load',
      title: 'Reduce load before pushing harder',
      detail: 'Trim the lower-leverage internal work first so recovery strain does not spill through the rest of the day.',
      reason: 'Recovery risk and focus load are both high, which makes the current day too expensive to keep intact.',
      confidence: movableConfidence(context),
      priority: 100,
      affectedBlocks: (candidates.length > 0 ? candidates : context.movableBlocks.slice(-1)).map(toBlockRef),
      patches: (candidates.length > 0 ? candidates : context.movableBlocks.slice(-1)).map(moveBlockToNextDay),
    }),
  };
}

export function deferInternalBlockRule(context: DayReshapeRuleContext): DayReshapeRuleResult | null {
  if (!context.overloadDetected) {
    return {
      blockedReason: blockedReason(
        'no_overload_detected',
        'AXIS does not see enough overload pressure to justify deferring work right now.',
      ),
    };
  }

  // TODO: prefer true backlog- or effort-aware deferral once Time exposes standalone task feed quality and carryover semantics.
  const candidate = context.movableBlocks
    .filter((block) => !isDeepWorkBlock(block) && (block.task?.priority ?? 'MEDIUM') !== 'HIGH')
    .sort((left, right) => new Date(right.end).getTime() - new Date(left.end).getTime())[0]
    ?? null;

  if (!candidate) {
    return {
      blockedReason: blockedReason(
        'no_movable_blocks',
        'Overload is present, but AXIS could not find a low-risk internal block to defer.',
      ),
    };
  }

  return {
    action: action({
      type: 'defer_internal_block',
      title: 'Defer one movable internal block',
      detail: 'Move the least essential internal work out of the current day before adding more strain.',
      reason: 'The day is overloaded and this block is the safest candidate to move without touching locked or external time.',
      confidence: movableConfidence(context),
      priority: 90,
      affectedBlocks: [candidate].map(toBlockRef),
      patches: [moveBlockToNextDay(candidate)],
    }),
  };
}

export function preserveRecoveryWindowRule(context: DayReshapeRuleContext): DayReshapeRuleResult | null {
  if (context.snapshot.recoveryRiskLevel !== 'high') {
    return null;
  }

  if (context.lateMovableBlocks.length === 0) {
    return {
      blockedReason: blockedReason(
        'no_late_internal_blocks',
        'Recovery risk is high, but AXIS could not find a late internal block to clear from the schedule.',
      ),
    };
  }

  // TODO: replace the late-day heuristic with a real bedtime or recovery-window target when Time/Body exposes one.
  const latestBlock = context.lateMovableBlocks
    .sort((left, right) => new Date(right.start).getTime() - new Date(left.start).getTime())[0];

  return {
    action: action({
      type: 'preserve_recovery_window',
      title: 'Preserve a cleaner recovery window',
      detail: 'Clear the latest movable block first so the evening has more room to recover.',
      reason: 'Recovery is fragile today, so the schedule should protect the back end of the day instead of filling it.',
      confidence: movableConfidence(context),
      priority: 88,
      affectedBlocks: [latestBlock].map(toBlockRef),
      patches: [moveBlockToNextDay(latestBlock)],
    }),
  };
}
