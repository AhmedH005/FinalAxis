import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DayReshapeBlockPatch, DayReshapePlan } from '@/engines/life-os';
import type { TimeBlock } from '../types';
import type {
  AppliedDayReshapeRecord,
  TimeEngineBlockRef,
  TimeReshapeApplyInput,
  TimeReshapeApplyResult,
  TimeReshapeIssue,
  TimeReshapeValidationResult,
} from './types';

const APPLIED_DAY_RESHAPE_STORAGE_KEY = 'axis:time:day-reshape:last-applied';
export const appliedDayReshapeQueryKey = ['time', 'reshape', 'applied'] as const;
type AsyncStorageStatic = typeof import('@react-native-async-storage/async-storage').default;

function issue(
  code: TimeReshapeIssue['code'],
  detail: string,
  patch?: { blockId?: string; actionId?: string },
): TimeReshapeIssue {
  return {
    code,
    detail,
    blockId: patch?.blockId,
    actionId: patch?.actionId,
  };
}

function intervalStart(value: string) {
  return new Date(value).getTime();
}

function intervalsOverlap(
  left: { start: string; end: string },
  right: { start: string; end: string },
) {
  return intervalStart(left.start) < intervalStart(right.end)
    && intervalStart(left.end) > intervalStart(right.start);
}

export function parseTimeEngineBlockRef(blockId: string): TimeEngineBlockRef | null {
  const match = /^(primary|time):block:(.+)$/.exec(blockId);
  if (!match) return null;

  return {
    sourceKey: match[1] as TimeEngineBlockRef['sourceKey'],
    recordId: match[2],
  };
}

export function reverseDayReshapePatch(patch: DayReshapeBlockPatch): DayReshapeBlockPatch {
  return {
    blockId: patch.blockId,
    fromStart: patch.toStart,
    fromEnd: patch.toEnd,
    toStart: patch.fromStart,
    toEnd: patch.fromEnd,
  };
}

export function applyDayReshapePatchesToBlocks(
  blocks: TimeBlock[],
  patches: DayReshapeBlockPatch[],
): TimeBlock[] {
  const patchMap = new Map(patches.map((patch) => [patch.blockId, patch]));

  return blocks.map((block) => {
    const patch = patchMap.get(block.id);
    if (!patch) return block;

    return {
      ...block,
      start: patch.toStart,
      end: patch.toEnd,
    };
  });
}

export function buildAppliedDayReshapeRecord(plan: DayReshapePlan): AppliedDayReshapeRecord {
  const appliedAt = new Date().toISOString();
  const patches = Array.from(
    new Map(
      plan.actions
        .flatMap((action) => action.patches)
        .map((patch) => [patch.blockId, patch]),
    ).values(),
  );

  return {
    id: `${plan.date}:${appliedAt}`,
    date: plan.date,
    appliedAt,
    planWhyNow: plan.whyNow,
    confidence: plan.confidence,
    expectedBenefit: plan.expectedBenefit,
    actions: plan.actions.map((action) => ({
      id: action.id,
      type: action.type,
      title: action.title,
      detail: action.detail,
      affectedBlockIds: action.affectedBlocks.map((block) => block.blockId),
    })),
    patches,
  };
}

export function validateDayReshapePlanForApply(
  input: TimeReshapeApplyInput,
): TimeReshapeValidationResult {
  const issues: TimeReshapeIssue[] = [];
  const blockMap = new Map(input.blocks.map((block) => [block.id, block]));
  const patchEntries = input.plan.actions.flatMap((action) =>
    action.patches.map((patch) => ({ actionId: action.id, patch })),
  );

  if (patchEntries.length === 0) {
    return {
      isValid: false,
      issues: [issue('no_actions', 'AXIS does not have a concrete reshape patch set to apply.')],
      executableActions: [],
      patches: [],
    };
  }

  const seenPatchTargets = new Set<string>();
  const validPatches: DayReshapeBlockPatch[] = [];

  for (const entry of patchEntries) {
    const current = blockMap.get(entry.patch.blockId);
    if (seenPatchTargets.has(entry.patch.blockId)) {
      issues.push(issue(
        'duplicate_patch_target',
        'The reshape plan tries to move the same block more than once.',
        { blockId: entry.patch.blockId, actionId: entry.actionId },
      ));
      continue;
    }
    seenPatchTargets.add(entry.patch.blockId);

    if (!current) {
      issues.push(issue(
        'block_not_found',
        'A block in the reshape plan could not be found in the current schedule window.',
        { blockId: entry.patch.blockId, actionId: entry.actionId },
      ));
      continue;
    }

    if (current.source !== 'engine' || current.isLocked) {
      issues.push(issue(
        'block_not_movable',
        'This reshape touches a block AXIS should not move.',
        { blockId: current.id, actionId: entry.actionId },
      ));
      continue;
    }

    if (!parseTimeEngineBlockRef(current.id)) {
      issues.push(issue(
        'unsupported_block_reference',
        'This block reference cannot be mapped back to a writable Time record.',
        { blockId: current.id, actionId: entry.actionId },
      ));
      continue;
    }

    if (current.start !== entry.patch.fromStart || current.end !== entry.patch.fromEnd) {
      issues.push(issue(
        'stale_block',
        'The schedule has changed since AXIS built this reshape plan.',
        { blockId: current.id, actionId: entry.actionId },
      ));
      continue;
    }

    if (
      !Number.isFinite(intervalStart(entry.patch.toStart))
      || !Number.isFinite(intervalStart(entry.patch.toEnd))
      || intervalStart(entry.patch.toEnd) <= intervalStart(entry.patch.toStart)
    ) {
      issues.push(issue(
        'invalid_patch',
        'One of the proposed block moves has an invalid time range.',
        { blockId: current.id, actionId: entry.actionId },
      ));
      continue;
    }

    validPatches.push(entry.patch);
  }

  if (issues.length > 0) {
    return {
      isValid: false,
      issues,
      executableActions: [],
      patches: [],
    };
  }

  const touchedIds = new Set(validPatches.map((patch) => patch.blockId));
  const proposedBlocks = applyDayReshapePatchesToBlocks(input.blocks, validPatches);
  const touchedBlocks = proposedBlocks.filter((block) => touchedIds.has(block.id));
  const untouchedBlocks = proposedBlocks.filter((block) => !touchedIds.has(block.id));

  for (const block of touchedBlocks) {
    const collision = untouchedBlocks.find((other) => intervalsOverlap(block, other));
    if (collision) {
      issues.push(issue(
        'overlapping_patch',
        'Applying this reshape would create an overlap with another scheduled block.',
        { blockId: block.id },
      ));
    }
  }

  for (let index = 0; index < touchedBlocks.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < touchedBlocks.length; otherIndex += 1) {
      if (intervalsOverlap(touchedBlocks[index], touchedBlocks[otherIndex])) {
        issues.push(issue(
          'overlapping_patch',
          'Applying this reshape would cause two moved blocks to overlap each other.',
          { blockId: touchedBlocks[index].id },
        ));
      }
    }
  }

  if (issues.length > 0) {
    return {
      isValid: false,
      issues,
      executableActions: [],
      patches: [],
    };
  }

  return {
    isValid: true,
    issues: [],
    executableActions: input.plan.actions.filter((action) => action.patches.length > 0),
    patches: validPatches,
  };
}

async function getAsyncStorage(): Promise<AsyncStorageStatic> {
  const mod = await import('@react-native-async-storage/async-storage');
  return mod.default as unknown as AsyncStorageStatic;
}

export async function loadAppliedDayReshapeRecord(): Promise<AppliedDayReshapeRecord | null> {
  const storage = await getAsyncStorage();
  const raw = await storage.getItem(APPLIED_DAY_RESHAPE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppliedDayReshapeRecord;
  } catch {
    await storage.removeItem(APPLIED_DAY_RESHAPE_STORAGE_KEY);
    return null;
  }
}

export async function saveAppliedDayReshapeRecord(record: AppliedDayReshapeRecord) {
  const storage = await getAsyncStorage();
  await storage.setItem(APPLIED_DAY_RESHAPE_STORAGE_KEY, JSON.stringify(record));
}

export async function clearAppliedDayReshapeRecord() {
  const storage = await getAsyncStorage();
  await storage.removeItem(APPLIED_DAY_RESHAPE_STORAGE_KEY);
}

async function resolveWritableClient(sourceKey: TimeEngineBlockRef['sourceKey']) {
  const [{ supabase }, timeClient] = await Promise.all([
    // @ts-ignore Metro resolves the TS source path here; the Node16 test build is stricter about dynamic-import extensions.
    import('../../../lib/supabase/client'),
    // @ts-ignore Metro resolves the TS source path here; the Node16 test build is stricter about dynamic-import extensions.
    import('../../../lib/supabase/timeClient'),
  ]);

  if (sourceKey === 'primary') {
    return supabase;
  }

  if (timeClient.hasDedicatedTimeSupabase) {
    return timeClient.timeSupabase;
  }

  throw new Error('Dedicated Time Supabase is not available for this block source.');
}

export async function runDayReshapePatches(
  patches: DayReshapeBlockPatch[],
): Promise<void> {
  const applied: DayReshapeBlockPatch[] = [];

  try {
    for (const patch of patches) {
      const ref = parseTimeEngineBlockRef(patch.blockId);
      if (!ref) {
        throw issue(
          'unsupported_block_reference',
          'This block reference cannot be mapped back to a writable Time record.',
          { blockId: patch.blockId },
        );
      }

      const client = await resolveWritableClient(ref.sourceKey);
      const { data, error } = await client
        .from('scheduled_blocks')
        .update({
          start_at: patch.toStart,
          end_at: patch.toEnd,
        })
        .eq('id', ref.recordId)
        .select('id')
        .maybeSingle();

      if (error) {
        throw issue(
          'apply_failed',
          error.message,
          { blockId: patch.blockId },
        );
      }

      if (!data) {
        throw issue(
          'apply_failed',
          'AXIS could not confirm that the target block still exists.',
          { blockId: patch.blockId },
        );
      }

      applied.push(patch);
    }
  } catch (error) {
    if (applied.length > 0) {
      for (const patch of applied.slice().reverse()) {
        const inverse = reverseDayReshapePatch(patch);
        const ref = parseTimeEngineBlockRef(inverse.blockId);
        if (!ref) continue;
        try {
          const client = await resolveWritableClient(ref.sourceKey);
          await client
            .from('scheduled_blocks')
            .update({
              start_at: inverse.toStart,
              end_at: inverse.toEnd,
            })
            .eq('id', ref.recordId)
            .select('id')
            .maybeSingle();
        } catch {
          // Keep rollback best-effort. The caller still gets the original failure.
        }
      }
    }

    throw error;
  }
}

export async function applyDayReshapePlan(
  input: TimeReshapeApplyInput,
): Promise<TimeReshapeApplyResult> {
  const validation = validateDayReshapePlanForApply(input);
  if (!validation.isValid) {
    return {
      applied: false,
      issues: validation.issues,
      record: null,
    };
  }

  const record = buildAppliedDayReshapeRecord(input.plan);

  try {
    await runDayReshapePatches(validation.patches);
    try {
      await saveAppliedDayReshapeRecord(record);
    } catch (storageError) {
      await runDayReshapePatches(validation.patches.slice().reverse().map(reverseDayReshapePatch));
      throw storageError;
    }

    return {
      applied: true,
      issues: [],
      record,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'AXIS could not apply the reshape plan.';
    return {
      applied: false,
      issues: [issue('apply_failed', detail)],
      record: null,
    };
  }
}

export function useAppliedDayReshapeRecord() {
  return useQuery({
    queryKey: appliedDayReshapeQueryKey,
    queryFn: () => loadAppliedDayReshapeRecord(),
    staleTime: 1000 * 60,
  });
}

export function useApplyDayReshapePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyDayReshapePlan,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['time'] }),
        queryClient.invalidateQueries({ queryKey: appliedDayReshapeQueryKey }),
      ]);
    },
  });
}
