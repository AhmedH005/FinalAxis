import { TIME_ENGINE_API_URL } from '@/constants';
import type { TimeBlock, TimeBlocksApiResponse } from './types';

function buildUrl(path: string) {
  return new URL(path, TIME_ENGINE_API_URL.endsWith('/') ? TIME_ENGINE_API_URL : `${TIME_ENGINE_API_URL}/`);
}

export async function listTimeBlocks(userId: string, start: Date, end: Date): Promise<TimeBlock[]> {
  const url = buildUrl('api/calendar/blocks');
  url.searchParams.set('userId', userId);
  url.searchParams.set('start', start.toISOString());
  url.searchParams.set('end', end.toISOString());

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Time Engine request failed (${res.status})`);
  }

  const payload = await res.json() as TimeBlocksApiResponse;
  if (!payload.success) {
    throw new Error(payload.error ?? 'Failed to load Time Engine blocks');
  }

  return (payload.data ?? []).slice().sort((a, b) => (
    new Date(a.start).getTime() - new Date(b.start).getTime()
  ));
}
