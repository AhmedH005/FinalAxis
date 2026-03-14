import type { DayReshapePlan, LifeOsConfidence } from '@/engines/life-os';
import type { AppliedDayReshapeRecord } from '@/engines/time';

export interface DayReshapingShiftItem {
  id: string;
  title: string;
  detail: string;
  affectedLabel: string;
  confidence: LifeOsConfidence;
}

export interface DayReshapingModel {
  isAvailable: boolean;
  status: 'preview' | 'applied' | 'unavailable';
  header: {
    title: string | null;
    confidence: LifeOsConfidence | null;
    whyNow: string | null;
  };
  proposedShifts: DayReshapingShiftItem[];
  expectedBenefit: string[];
  blockedReasons: string[];
  notes: string[];
  emptyState: {
    title: string;
    summary: string;
  } | null;
}

function affectedLabel(count: number) {
  if (count <= 0) return 'No block changes';
  if (count === 1) return '1 block will move';
  return `${count} blocks will move`;
}

function buildPlanShiftItems(plan: DayReshapePlan): DayReshapingShiftItem[] {
  return plan.actions.map((action) => ({
    id: action.id,
    title: action.title,
    detail: action.detail,
    affectedLabel: affectedLabel(action.patches.length),
    confidence: action.confidence,
  }));
}

function buildAppliedShiftItems(record: AppliedDayReshapeRecord): DayReshapingShiftItem[] {
  return record.actions.map((action) => ({
    id: action.id,
    title: action.title,
    detail: action.detail,
    affectedLabel: affectedLabel(action.affectedBlockIds.length),
    confidence: record.confidence,
  }));
}

function buildNotes(plan: DayReshapePlan | null, record: AppliedDayReshapeRecord | null) {
  const actionTypes = new Set([
    ...(plan?.actions.map((action) => action.type) ?? []),
    ...(record?.actions.map((action) => action.type) ?? []),
  ]);
  const notes: string[] = [];

  if (actionTypes.has('preserve_recovery_window')) {
    notes.push('Evening protection is still using a late-day heuristic, not a true bedtime target yet.');
  }

  if (actionTypes.has('defer_internal_block') || actionTypes.has('reduce_load')) {
    notes.push('These shifts only use visible movable blocks. AXIS is not claiming full backlog awareness yet.');
  }

  return notes;
}

export function buildDayReshapingModel(
  plan: DayReshapePlan | null,
  appliedRecord: AppliedDayReshapeRecord | null,
): DayReshapingModel {
  if (appliedRecord) {
    return {
      isAvailable: true,
      status: 'applied',
      header: {
        title: 'A reshape is already in place',
        confidence: appliedRecord.confidence,
        whyNow: appliedRecord.planWhyNow,
      },
      proposedShifts: buildAppliedShiftItems(appliedRecord),
      expectedBenefit: appliedRecord.expectedBenefit,
      blockedReasons: [],
      notes: buildNotes(plan, appliedRecord),
      emptyState: null,
    };
  }

  if (!plan || plan.confidence === 'low' || plan.actions.length === 0) {
    return {
      isAvailable: false,
      status: 'unavailable',
      header: {
        title: null,
        confidence: null,
        whyNow: null,
      },
      proposedShifts: [],
      expectedBenefit: [],
      blockedReasons: [],
      notes: [],
      emptyState: {
        title: 'No reshape in view right now',
        summary: 'AXIS only proposes schedule changes when it sees a clear enough and safe enough move.',
      },
    };
  }

  return {
    isAvailable: true,
    status: 'preview',
    header: {
      title: 'AXIS can reshape today',
      confidence: plan.confidence,
      whyNow: plan.whyNow,
    },
    proposedShifts: buildPlanShiftItems(plan),
    expectedBenefit: plan.expectedBenefit,
    blockedReasons: plan.blockedReasons.map((item) => item.detail).slice(0, 3),
    notes: buildNotes(plan, null),
    emptyState: null,
  };
}
