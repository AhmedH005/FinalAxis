import { addDays, parseISO, startOfDay } from 'date-fns';
import type {
  TimeBlock,
  TimeDailySummary,
  TimeFocusLoadLevel,
  TimeFragmentationLevel,
  TimePressureLevel,
  TimeSummaryConfidence,
} from './types';

interface TimeInterval {
  start: Date;
  end: Date;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function maxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

function roundRatio(value: number) {
  return Math.round(value * 100) / 100;
}

function classifyPressureLevel(score: number, isUnknown: boolean): TimePressureLevel {
  if (isUnknown) return 'unknown';
  if (score >= 70) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

function classifyFragmentationLevel(score: number): TimeFragmentationLevel {
  if (score >= 70) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

function classifyFocusLoadLevel(score: number): TimeFocusLoadLevel {
  if (score >= 70) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

function classifySummaryConfidence(pct: number): TimeSummaryConfidence {
  if (pct >= 75) return 'high';
  if (pct >= 45) return 'medium';
  return 'low';
}

function intervalMinutes(interval: TimeInterval) {
  return Math.max(0, Math.round((interval.end.getTime() - interval.start.getTime()) / 60_000));
}

function clipBlockToDay(block: TimeBlock, date: string): TimeInterval | null {
  const dayStart = startOfDay(new Date(`${date}T12:00:00`));
  const nextDayStart = addDays(dayStart, 1);
  const blockStart = parseISO(block.start);
  const blockEnd = parseISO(block.end);

  if (!Number.isFinite(blockStart.getTime()) || !Number.isFinite(blockEnd.getTime()) || blockEnd <= blockStart) {
    return null;
  }

  const start = maxDate(blockStart, dayStart);
  const end = minDate(blockEnd, nextDayStart);
  if (end <= start) return null;

  return { start, end };
}

function mergeIntervals(intervals: TimeInterval[]) {
  if (intervals.length === 0) return [];

  const sorted = intervals
    .slice()
    .sort((left, right) => left.start.getTime() - right.start.getTime());
  const merged: TimeInterval[] = [sorted[0]];

  for (const interval of sorted.slice(1)) {
    const current = merged[merged.length - 1];
    if (interval.start.getTime() <= current.end.getTime()) {
      current.end = maxDate(current.end, interval.end);
      continue;
    }
    merged.push({ ...interval });
  }

  return merged;
}

function sumMergedMinutes(intervals: TimeInterval[]) {
  return mergeIntervals(intervals).reduce((sum, interval) => sum + intervalMinutes(interval), 0);
}

export function buildDailyTimeSummary(args: {
  date: string;
  blocks: TimeBlock[];
}): TimeDailySummary {
  const clippedBlocks = args.blocks
    .map((block) => {
      const interval = clipBlockToDay(block, args.date);
      if (!interval) return null;
      return { block, interval };
    })
    .filter((item): item is { block: TimeBlock; interval: TimeInterval } => item !== null);

  const allIntervals = clippedBlocks.map((item) => item.interval);
  const taskBlocks = clippedBlocks.filter((item) => item.block.source === 'engine' && item.block.task);
  const deepBlocks = taskBlocks.filter((item) => item.block.colour === 'VIOLET');
  const externalBlocks = clippedBlocks.filter((item) => item.block.source === 'external_calendar');
  const lockedBlocks = clippedBlocks.filter((item) => item.block.isLocked);
  const unlockedBlocks = clippedBlocks.filter((item) => !item.block.isLocked);
  const engineBlocks = clippedBlocks.filter((item) => item.block.source === 'engine');

  const plannedMinutes = allIntervals.reduce((sum, interval) => sum + intervalMinutes(interval), 0);
  const busyMinutes = sumMergedMinutes(allIntervals);
  const taskMinutes = sumMergedMinutes(taskBlocks.map((item) => item.interval));
  const deepWorkMinutes = sumMergedMinutes(deepBlocks.map((item) => item.interval));
  const externalCalendarMinutes = sumMergedMinutes(externalBlocks.map((item) => item.interval));
  const lockedMinutes = sumMergedMinutes(lockedBlocks.map((item) => item.interval));
  const unlockedMinutes = sumMergedMinutes(unlockedBlocks.map((item) => item.interval));

  const mergedTaskIntervals = mergeIntervals(taskBlocks.map((item) => item.interval));
  const largestFocusWindowMinutes = mergedTaskIntervals.reduce(
    (max, interval) => Math.max(max, intervalMinutes(interval)),
    0,
  );
  const blockCount = clippedBlocks.length;
  const shortBlockCount = clippedBlocks.filter((item) => intervalMinutes(item.interval) < 30).length;
  const focusBlockCount = mergedTaskIntervals.filter((interval) => intervalMinutes(interval) >= 60).length;
  const averageBlockMinutes = blockCount > 0 ? Math.round(plannedMinutes / blockCount) : null;

  const shortRatio = blockCount > 0 ? shortBlockCount / blockCount : 0;
  const focusGapPenalty = largestFocusWindowMinutes >= 90
    ? 0
    : largestFocusWindowMinutes >= 60
    ? 10
    : largestFocusWindowMinutes > 0
    ? 20
    : 30;
  const fragmentationScore = clamp(
    Math.round((Math.max(blockCount - 3, 0) * 8) + (shortRatio * 45) + focusGapPenalty),
    0,
    100,
  );

  const weightedFocusMinutes = (deepWorkMinutes * 1.5) + taskMinutes + (externalCalendarMinutes * 0.5);
  const focusLoadScore = clamp(Math.round((weightedFocusMinutes / 480) * 100), 0, 100);

  const tasksById = Array.from(
    new Map(
      taskBlocks
        .filter((item) => item.block.taskId && item.block.task)
        .map((item) => [item.block.taskId as string, item.block.task as NonNullable<TimeBlock['task']>]),
    ).values(),
  );

  const dayStart = startOfDay(new Date(`${args.date}T12:00:00`));
  const nextDayStart = addDays(dayStart, 1);
  const soonThreshold = addDays(nextDayStart, 3);
  const tasksWithDue = tasksById.filter((task) => {
    if (!task.due) return false;
    const due = parseISO(task.due);
    return Number.isFinite(due.getTime());
  });
  const overdueScheduledTaskCount = tasksWithDue.filter((task) => parseISO(task.due!) < dayStart).length;
  const dueTodayTaskCount = tasksWithDue.filter((task) => {
    const due = parseISO(task.due!);
    return due >= dayStart && due < nextDayStart;
  }).length;
  const dueSoonTaskCount = tasksWithDue.filter((task) => {
    const due = parseISO(task.due!);
    return due >= nextDayStart && due < soonThreshold;
  }).length;
  const deadlinePressureUnknown = tasksById.length > 0 && tasksWithDue.length === 0;
  const deadlinePressureScore = clamp(
    (overdueScheduledTaskCount * 45) + (dueTodayTaskCount * 30) + (dueSoonTaskCount * 15),
    0,
    100,
  );

  const taskMetadataCoveragePct = engineBlocks.length > 0
    ? Math.round((taskBlocks.length / engineBlocks.length) * 100)
    : null;
  const dueMetadataCoveragePct = tasksById.length > 0
    ? Math.round((tasksWithDue.length / tasksById.length) * 100)
    : null;

  let totalSignals = 1;
  let availableSignals = 1;

  if (engineBlocks.length > 0) {
    totalSignals += 1;
    if ((taskMetadataCoveragePct ?? 0) >= 60) availableSignals += 1;
  }

  if (tasksById.length > 0) {
    totalSignals += 1;
    if ((dueMetadataCoveragePct ?? 0) >= 60) availableSignals += 1;
  }

  if (externalBlocks.length > 0) {
    totalSignals += 1;
    availableSignals += 1;
  }

  const signalCoveragePct = Math.round((availableSignals / totalSignals) * 100);
  const firstBlockStart = clippedBlocks.length > 0
    ? clippedBlocks.reduce(
        (earliest, item) => (item.interval.start < earliest ? item.interval.start : earliest),
        clippedBlocks[0].interval.start,
      ).toISOString()
    : null;
  const lastBlockEnd = clippedBlocks.length > 0
    ? clippedBlocks.reduce(
        (latest, item) => (item.interval.end > latest ? item.interval.end : latest),
        clippedBlocks[0].interval.end,
      ).toISOString()
    : null;

  return {
    date: args.date,
    blockCount,
    plannedMinutes,
    busyMinutes,
    taskMinutes,
    deepWorkMinutes,
    externalCalendarMinutes,
    externalCalendarRatio: busyMinutes > 0 ? roundRatio(externalCalendarMinutes / busyMinutes) : null,
    lockedMinutes,
    unlockedMinutes,
    lockedToEngineRatio: busyMinutes > 0 ? roundRatio(lockedMinutes / busyMinutes) : null,
    firstBlockStart,
    lastBlockEnd,
    focusLoadScore,
    focusLoadLevel: classifyFocusLoadLevel(focusLoadScore),
    deadlinePressure: {
      level: classifyPressureLevel(deadlinePressureScore, deadlinePressureUnknown),
      score: deadlinePressureScore,
      scheduledTaskCount: tasksById.length,
      overdueScheduledTaskCount,
      dueTodayTaskCount,
      dueSoonTaskCount,
      limitedToScheduledTasks: true,
    },
    fragmentation: {
      level: classifyFragmentationLevel(fragmentationScore),
      score: fragmentationScore,
      blockCount,
      shortBlockCount,
      focusBlockCount,
      averageBlockMinutes,
      largestFocusWindowMinutes,
    },
    overdueBacklog: {
      available: false,
      reason: 'task_feed_unavailable',
    },
    carryover: {
      available: false,
      reason: 'history_unavailable',
    },
    signalCoverage: {
      confidence: classifySummaryConfidence(signalCoveragePct),
      availableSignals,
      totalSignals,
      pct: signalCoveragePct,
      taskMetadataCoveragePct,
      blockers: ['task_feed_unavailable', 'history_unavailable', 'settings_unavailable'],
    },
  };
}
