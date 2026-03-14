import type { GoalAlignmentSnapshot } from '../goal-alignment/types';
import type {
  LifeOsConfidence,
  LifeOsContextSnapshot,
  LifeOsObservation,
} from '../types';
import type { TimeBlock } from '../../time/types';

export type DayReshapeActionType =
  | 'protect_focus_window'
  | 'compress_fragmentation'
  | 'defer_internal_block'
  | 'reduce_load'
  | 'preserve_recovery_window';

export type DayReshapeBlockedReasonCode =
  | 'low_signal_confidence'
  | 'no_movable_blocks'
  | 'only_locked_or_external_blocks'
  | 'no_existing_focus_window'
  | 'no_overload_detected'
  | 'no_fragmentation_pressure'
  | 'no_recovery_pressure'
  | 'no_late_internal_blocks'
  | 'goal_not_perform';

export interface DayReshapeBlockRef {
  blockId: string;
  title: string;
  start: string;
  end: string;
  taskId?: string | null;
  source: TimeBlock['source'];
  isLocked: boolean;
}

export interface DayReshapeBlockPatch {
  blockId: string;
  fromStart: string;
  fromEnd: string;
  toStart: string;
  toEnd: string;
}

export interface DayReshapeAction {
  id: string;
  type: DayReshapeActionType;
  title: string;
  detail: string;
  reason: string;
  confidence: LifeOsConfidence;
  priority: number;
  affectedBlocks: DayReshapeBlockRef[];
  patches: DayReshapeBlockPatch[];
}

export interface DayReshapeBlockedReason {
  code: DayReshapeBlockedReasonCode;
  detail: string;
}

export interface DayReshapePlan {
  date: string;
  actions: DayReshapeAction[];
  whyNow: string;
  confidence: LifeOsConfidence;
  blockedReasons: DayReshapeBlockedReason[];
  expectedBenefit: string[];
}

export interface DayReshapePlanInput {
  snapshot: LifeOsContextSnapshot;
  observations: LifeOsObservation[];
  goalAlignment: GoalAlignmentSnapshot | null;
  blocks: TimeBlock[];
}

export interface DayReshapeRuleContext extends DayReshapePlanInput {
  movableBlocks: TimeBlock[];
  deepWorkBlocks: TimeBlock[];
  shortMovableBlocks: TimeBlock[];
  lateMovableBlocks: TimeBlock[];
  overloadDetected: boolean;
  timeConfidence: LifeOsConfidence;
}

export interface DayReshapeRuleResult {
  action?: DayReshapeAction | null;
  blockedReason?: DayReshapeBlockedReason | null;
}
