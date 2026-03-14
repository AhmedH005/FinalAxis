import type { DayReshapeAction, DayReshapeBlockPatch, DayReshapePlan, LifeOsConfidence } from '@/engines/life-os';
import type { TimeBlock } from '../types';

export type TimeReshapeIssueCode =
  | 'no_actions'
  | 'block_not_found'
  | 'block_not_movable'
  | 'stale_block'
  | 'invalid_patch'
  | 'duplicate_patch_target'
  | 'overlapping_patch'
  | 'unsupported_block_reference'
  | 'apply_failed'
  | 'undo_unavailable';

export interface TimeReshapeIssue {
  code: TimeReshapeIssueCode;
  detail: string;
  blockId?: string;
  actionId?: string;
}

export interface TimeReshapeValidationResult {
  isValid: boolean;
  issues: TimeReshapeIssue[];
  executableActions: DayReshapeAction[];
  patches: DayReshapeBlockPatch[];
}

export interface AppliedDayReshapeActionSummary {
  id: string;
  type: DayReshapeAction['type'];
  title: string;
  detail: string;
  affectedBlockIds: string[];
}

export interface AppliedDayReshapeRecord {
  id: string;
  date: string;
  appliedAt: string;
  planWhyNow: string;
  confidence: LifeOsConfidence;
  expectedBenefit: string[];
  actions: AppliedDayReshapeActionSummary[];
  patches: DayReshapeBlockPatch[];
}

export interface TimeReshapeApplyInput {
  plan: DayReshapePlan;
  blocks: TimeBlock[];
}

export interface TimeReshapeApplyResult {
  applied: boolean;
  issues: TimeReshapeIssue[];
  record: AppliedDayReshapeRecord | null;
}

export interface TimeReshapeUndoResult {
  undone: boolean;
  issues: TimeReshapeIssue[];
  record: AppliedDayReshapeRecord | null;
}

export interface TimeEngineBlockRef {
  sourceKey: 'primary' | 'time';
  recordId: string;
}
