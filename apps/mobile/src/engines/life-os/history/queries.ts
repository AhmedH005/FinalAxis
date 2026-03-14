import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { addDays, parseISO, startOfDay } from 'date-fns';
import type { GoalAlignmentSnapshot } from '../goal-alignment/types';
import type { LifeOsContextSnapshot } from '../types';
import { listLifeOsHistoryRecords, upsertLifeOsHistoryRecord } from './store';

export const lifeOsHistoryQueryKey = ['life-os', 'history'] as const;

function filterHistoryWindow(date: string, days: number, records: Awaited<ReturnType<typeof listLifeOsHistoryRecords>>) {
  const end = addDays(startOfDay(new Date(`${date}T12:00:00`)), 1);
  const start = addDays(end, -days);

  return records.filter((record) => {
    const recordDate = parseISO(`${record.date}T12:00:00`);
    return recordDate >= start && recordDate < end;
  });
}

export function useLifeOsHistoryRecords() {
  return useQuery({
    queryKey: lifeOsHistoryQueryKey,
    queryFn: listLifeOsHistoryRecords,
    staleTime: 1000 * 60,
  });
}

export function useLifeOsHistoryWindow(date: string, days: number) {
  const query = useLifeOsHistoryRecords();

  const data = useMemo(
    () => filterHistoryWindow(date, days, query.data ?? []),
    [date, days, query.data],
  );

  return {
    ...query,
    data,
  };
}

export function usePersistLifeOsDailyHistoryRecord(args: {
  enabled: boolean;
  snapshot: LifeOsContextSnapshot;
  goalAlignment: GoalAlignmentSnapshot | null;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: upsertLifeOsHistoryRecord,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lifeOsHistoryQueryKey });
    },
  });

  const argsRef = useRef(args);
  argsRef.current = args;
  const mutationRef = useRef(mutation);
  mutationRef.current = mutation;

  const signature = useMemo(
    () => JSON.stringify({
      date: args.snapshot.date,
      coverage: args.snapshot.signalCoverage,
      warnings: args.snapshot.warnings.map((item) => item.code),
      strengths: args.snapshot.keyStrengths.map((item) => item.code),
      goal: args.goalAlignment
        ? {
            id: args.goalAlignment.goal.id,
            band: args.goalAlignment.alignmentBand,
            score: args.goalAlignment.alignmentScore,
            blockers: args.goalAlignment.blockers.map((item) => item.code),
            supports: args.goalAlignment.supports.map((item) => item.code),
            recommendations: args.goalAlignment.recommendationCandidates.map((item) => item.code),
          }
        : null,
    }),
    [args.goalAlignment, args.snapshot],
  );

  useEffect(() => {
    const { enabled, snapshot, goalAlignment } = argsRef.current;
    const mut = mutationRef.current;
    if (!enabled || mut.isPending) return;
    void mut.mutateAsync({ snapshot, goalAlignment });
  // Only re-run when the content signature changes — not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.enabled, signature]);
}
