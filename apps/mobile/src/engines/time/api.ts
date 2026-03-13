import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { hasDedicatedTimeSupabase, timeSupabase } from '@/lib/supabase/timeClient';
import type { TimeBlock, TimeColour, TimePriority } from './types';

export interface TimeSourceUsers {
  primaryUserId?: string | null;
  timeUserId?: string | null;
}

function mapColour(energyIntensity?: string | null): TimeColour {
  switch (energyIntensity) {
    case 'deep':  return 'VIOLET';
    case 'light': return 'EMERALD';
    default:      return 'SKY';
  }
}

function mapPriority(priority?: number | null): TimePriority {
  if (!priority)     return 'MEDIUM';
  if (priority >= 4) return 'HIGH';
  if (priority <= 2) return 'LOW';
  return 'MEDIUM';
}

function sortBlocks(blocks: TimeBlock[]) {
  return [...blocks].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function dedupeBlocks(blocks: TimeBlock[]) {
  const seen = new Set<string>();
  return blocks.filter((block) => {
    const key = [block.title, block.start, block.end, block.task?.title ?? ''].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isIgnorableTimeSourceError(error: { code?: string; message: string }) {
  if (error.code && ['42P01', 'PGRST200', 'PGRST201', 'PGRST205'].includes(error.code)) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes('schema cache') ||
    message.includes('could not find the table') ||
    message.includes('could not find a relationship') ||
    message.includes('relation') && message.includes('does not exist')
  );
}

async function listNativeBlocks(
  client: SupabaseClient<Database>,
  userId: string,
  start: Date,
  end: Date,
  sourceKey: string,
): Promise<TimeBlock[]> {
  const { data, error } = await client
    .from('scheduled_blocks')
    .select(`
      id,
      user_id,
      task_id,
      start_at,
      end_at,
      is_locked,
      created_at,
      tasks (
        id,
        title,
        total_duration,
        deadline,
        priority,
        energy_intensity,
        created_at
      )
    `)
    .eq('user_id', userId)
    .gte('start_at', start.toISOString())
    .lte('start_at', end.toISOString())
    .order('start_at', { ascending: true });

  if (error) {
    if (isIgnorableTimeSourceError(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const task = row.tasks as unknown as Record<string, unknown> | null;
    const colour = mapColour(task?.energy_intensity as string | null);

    return {
      id: `${sourceKey}:block:${row.id as string}`,
      userId: row.user_id as string,
      taskId: (row.task_id as string | null) ? `${sourceKey}:task:${row.task_id as string}` : null,
      title: (task?.title as string | null) ?? 'Untitled block',
      start: row.start_at as string,
      end: row.end_at as string,
      source: 'engine',
      colour,
      isLocked: (row.is_locked as boolean) ?? false,
      createdAt: (row.created_at as string | null) ?? null,
      task: task
        ? {
            id: `${sourceKey}:task:${task.id as string}`,
            userId: row.user_id as string,
            title: task.title as string,
            notes: null,
            estMinutes: (task.total_duration as number | null) ?? null,
            due: (task.deadline as string | null) ?? null,
            priority: mapPriority(task.priority as number | null),
            colour,
            createdAt: task.created_at as string,
          }
        : null,
    };
  });
}

async function listExternalCalendarBlocks(
  client: SupabaseClient<Database>,
  userId: string,
  start: Date,
  end: Date,
  sourceKey: string,
): Promise<TimeBlock[]> {
  const { data: calendars, error: calendarsError } = await client
    .from('external_calendars')
    .select('id')
    .eq('user_id', userId)
    .eq('is_enabled', true);

  if (calendarsError) {
    if (isIgnorableTimeSourceError(calendarsError)) return [];
    throw new Error(calendarsError.message);
  }

  const enabledCalendarIds = (calendars ?? []).map((row) => row.id as string);
  if (enabledCalendarIds.length === 0) return [];

  const { data, error } = await client
    .from('external_calendar_events')
    .select(`
      id,
      user_id,
      title,
      start_at,
      end_at,
      created_at
    `)
    .eq('user_id', userId)
    .eq('is_all_day', false)
    .neq('status', 'cancelled')
    .in('external_calendar_id', enabledCalendarIds)
    .lt('start_at', end.toISOString())
    .gt('end_at', start.toISOString())
    .order('start_at', { ascending: true });

  if (error) {
    if (isIgnorableTimeSourceError(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: `${sourceKey}:external:${row.id as string}`,
    userId: row.user_id as string,
    taskId: null,
    title: (row.title as string | null) ?? 'Busy',
    start: row.start_at as string,
    end: row.end_at as string,
    source: 'external_calendar',
    colour: 'AMBER',
    isLocked: true,
    createdAt: (row.created_at as string | null) ?? null,
    task: null,
  }));
}

export async function listTimeBlocks(
  users: TimeSourceUsers,
  start: Date,
  end: Date,
): Promise<TimeBlock[]> {
  const sources: Array<{
    client: SupabaseClient<Database>;
    userId: string;
    sourceKey: string;
  }> = [];

  if (users.primaryUserId) {
    sources.push({ client: supabase, userId: users.primaryUserId, sourceKey: 'primary' });
  }

  if (hasDedicatedTimeSupabase && users.timeUserId) {
    sources.push({ client: timeSupabase, userId: users.timeUserId, sourceKey: 'time' });
  }

  const settled = await Promise.allSettled(
    sources.map(async ({ client, userId, sourceKey }) => {
      const [nativeBlocks, externalBlocks] = await Promise.all([
        listNativeBlocks(client, userId, start, end, sourceKey),
        listExternalCalendarBlocks(client, userId, start, end, sourceKey),
      ]);
      return [...nativeBlocks, ...externalBlocks];
    }),
  );

  const fulfilled = settled
    .filter((result): result is PromiseFulfilledResult<TimeBlock[]> => result.status === 'fulfilled')
    .map((result) => result.value)
    .flat();

  if (fulfilled.length > 0) {
    return sortBlocks(dedupeBlocks(fulfilled));
  }

  const rejected = settled
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => result.reason);

  const realError = rejected.find((reason) => {
    if (!(reason instanceof Error)) return true;
    return !isIgnorableTimeSourceError({ message: reason.message });
  });

  if (realError) {
    throw realError instanceof Error ? realError : new Error('Unable to load Time Engine data.');
  }

  return [];
}
