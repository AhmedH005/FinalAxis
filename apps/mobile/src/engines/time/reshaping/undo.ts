import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TimeReshapeUndoResult } from './types';
import {
  appliedDayReshapeQueryKey,
  clearAppliedDayReshapeRecord,
  loadAppliedDayReshapeRecord,
  reverseDayReshapePatch,
  runDayReshapePatches,
} from './apply-plan';

export async function undoLastAppliedDayReshape(): Promise<TimeReshapeUndoResult> {
  const record = await loadAppliedDayReshapeRecord();
  if (!record) {
    return {
      undone: false,
      issues: [
        {
          code: 'undo_unavailable',
          detail: 'There is no applied reshape to undo right now.',
        },
      ],
      record: null,
    };
  }

  try {
    const undoPatches = record.patches
      .slice()
      .reverse()
      .map(reverseDayReshapePatch);

    await runDayReshapePatches(undoPatches);
    await clearAppliedDayReshapeRecord();

    return {
      undone: true,
      issues: [],
      record,
    };
  } catch (error) {
    return {
      undone: false,
      issues: [
        {
          code: 'apply_failed',
          detail: error instanceof Error ? error.message : 'AXIS could not undo the applied reshape.',
        },
      ],
      record,
    };
  }
}

export function useUndoDayReshapePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: undoLastAppliedDayReshape,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['time'] }),
        queryClient.invalidateQueries({ queryKey: appliedDayReshapeQueryKey }),
      ]);
    },
  });
}
