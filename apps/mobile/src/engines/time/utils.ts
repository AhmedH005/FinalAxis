import {
  addDays,
  differenceInMinutes,
  format,
  isAfter,
  isSameDay,
  isToday,
  isTomorrow,
  isWithinInterval,
  parseISO,
  startOfWeek,
} from 'date-fns';
import type { TimeBlock, TimeColour } from './types';

export const TIME_COLOR = '#3B82F6';

export const TIME_COLOR_MAP: Record<TimeColour, string> = {
  SLATE: '#64748B',
  EMERALD: '#10B981',
  SKY: '#0EA5E9',
  VIOLET: '#8B5CF6',
  AMBER: '#F59E0B',
  ROSE: '#F43F5E',
};

export function getBlockAccent(colour: TimeColour) {
  return TIME_COLOR_MAP[colour] ?? TIME_COLOR;
}

export function formatBlockTimeRange(block: TimeBlock) {
  const start = parseISO(block.start);
  const end = parseISO(block.end);
  return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
}

export function formatBlockDate(block: TimeBlock) {
  const start = parseISO(block.start);

  if (isToday(start)) return 'Today';
  if (isTomorrow(start)) return 'Tomorrow';

  return format(start, 'EEEE, MMM d');
}

export function getBlockDurationMinutes(block: TimeBlock) {
  return Math.max(0, differenceInMinutes(parseISO(block.end), parseISO(block.start)));
}

export function formatDurationLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function isBlockNow(block: TimeBlock, now = new Date()) {
  return isWithinInterval(now, {
    start: parseISO(block.start),
    end: parseISO(block.end),
  });
}

export function getCurrentAndNextBlock(blocks: TimeBlock[], now = new Date()) {
  const current = blocks.find((block) => isBlockNow(block, now)) ?? null;
  const next = blocks.find((block) => isAfter(parseISO(block.start), now)) ?? null;
  return { current, next };
}

export function groupBlocksByDay(blocks: TimeBlock[]) {
  const groups = new Map<string, TimeBlock[]>();

  for (const block of blocks) {
    const key = format(parseISO(block.start), 'yyyy-MM-dd');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(block);
  }

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    label: formatGroupLabel(items[0]),
    items: items.slice().sort((a, b) => (
      parseISO(a.start).getTime() - parseISO(b.start).getTime()
    )),
  }));
}

function formatGroupLabel(block: TimeBlock) {
  const date = parseISO(block.start);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEEE, MMM d');
}

export function getWeekDays(blocks: TimeBlock[], now = new Date()) {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    const dayBlocks = blocks.filter((block) => isSameDay(parseISO(block.start), day));
    const totalMinutes = dayBlocks.reduce((sum, block) => sum + getBlockDurationMinutes(block), 0);

    return {
      date: day,
      label: format(day, 'EEE'),
      dateLabel: format(day, 'MMM d'),
      count: dayBlocks.length,
      totalMinutes,
      first: dayBlocks[0] ?? null,
      last: dayBlocks[dayBlocks.length - 1] ?? null,
      items: dayBlocks,
    };
  });
}
