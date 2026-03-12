import { useQuery } from '@tanstack/react-query';
import { addDays, endOfDay, startOfDay, startOfWeek } from 'date-fns';
import { listTimeBlocks } from './api';

export function useTimeBlocksRange(userId: string | null | undefined, start: Date, end: Date) {
  return useQuery({
    queryKey: ['time', 'blocks', userId, start.toISOString(), end.toISOString()],
    queryFn: () => listTimeBlocks(userId!, start, end),
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });
}

export function useTimeCompanionWindow(userId: string | null | undefined) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfDay(addDays(new Date(), 14));

  return useTimeBlocksRange(userId, start, end);
}

export function useTimeBlockDetail(userId: string | null | undefined, blockId: string | null | undefined) {
  const start = startOfDay(addDays(new Date(), -30));
  const end = endOfDay(addDays(new Date(), 45));

  return useQuery({
    queryKey: ['time', 'block', userId, blockId],
    queryFn: async () => {
      const blocks = await listTimeBlocks(userId!, start, end);
      return blocks.find((block) => block.id === blockId) ?? null;
    },
    enabled: Boolean(userId && blockId),
    staleTime: 1000 * 60,
  });
}
