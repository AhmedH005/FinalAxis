import { useQuery } from '@tanstack/react-query';
import { addDays, endOfDay, startOfDay, startOfWeek } from 'date-fns';
import { listTimeBlocks, type TimeSourceUsers } from './api';

export function useTimeBlocksRange(users: TimeSourceUsers, start: Date, end: Date) {
  return useQuery({
    queryKey: [
      'time',
      'blocks',
      users.primaryUserId ?? null,
      users.timeUserId ?? null,
      start.toISOString(),
      end.toISOString(),
    ],
    queryFn: () => listTimeBlocks(users, start, end),
    enabled: Boolean(users.primaryUserId || users.timeUserId),
    staleTime: 1000 * 60,
  });
}

export function useTimeCompanionWindow(users: TimeSourceUsers) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfDay(addDays(new Date(), 14));

  return useTimeBlocksRange(users, start, end);
}

export function useTimeBlockDetail(users: TimeSourceUsers, blockId: string | null | undefined) {
  const start = startOfDay(addDays(new Date(), -30));
  const end = endOfDay(addDays(new Date(), 45));

  return useQuery({
    queryKey: ['time', 'block', users.primaryUserId ?? null, users.timeUserId ?? null, blockId],
    queryFn: async () => {
      const blocks = await listTimeBlocks(users, start, end);
      return blocks.find((block) => block.id === blockId) ?? null;
    },
    enabled: Boolean((users.primaryUserId || users.timeUserId) && blockId),
    staleTime: 1000 * 60,
  });
}
