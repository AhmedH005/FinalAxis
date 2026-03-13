import { differenceInMinutes, format } from 'date-fns';
import type { SleepLog } from '@/lib/supabase/database.types';

export type AxisSleepSource = 'healthkit' | 'manual' | 'estimated';
export type AxisSleepConfidence = 'high' | 'medium' | 'low';

export interface SleepStageBreakdown {
  rem_minutes: number | null;
  core_minutes: number | null;
  deep_minutes: number | null;
  awake_minutes: number | null;
  asleep_unspecified_minutes: number | null;
}

export interface AxisSleepScore {
  value: number | null;
  confidence: AxisSleepConfidence;
  summary: string;
  components: {
    duration: number | null;
    consistency: number | null;
    efficiency: number | null;
    interruptions: number | null;
    stages: number | null;
  };
  available_inputs: string[];
  missing_inputs: string[];
}

export interface AxisSleepRecord {
  id: string;
  user_id: string;
  sleep_start: string;
  sleep_end: string;
  bedtime: string;
  wake_time: string;
  duration_minutes: number | null;
  time_in_bed_minutes: number | null;
  sleep_efficiency_pct: number | null;
  stage_minutes: SleepStageBreakdown | null;
  interruptions_count: number | null;
  source: AxisSleepSource;
  source_label: string;
  source_confidence: AxisSleepConfidence;
  quality_rating: number | null;
  notes: string | null;
  created_at: string;
  sleep_score: AxisSleepScore | null;
  metadata: {
    has_stage_data: boolean;
    has_time_in_bed: boolean;
    is_manual: boolean;
  };
}

export interface AppleHealthSleepRecordInput {
  id: string;
  sleep_start: string;
  sleep_end: string;
  duration_minutes: number | null;
  time_in_bed_minutes: number | null;
  stage_minutes: SleepStageBreakdown | null;
  interruptions_count: number | null;
  source_name: string | null;
  created_at: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sleepDayKey(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso.slice(0, 10);
  return format(date, 'yyyy-MM-dd');
}

function minutesOrDiff(startIso: string, endIso: string, minutes: number | null | undefined) {
  if (typeof minutes === 'number' && Number.isFinite(minutes)) return minutes;

  const start = new Date(startIso);
  const end = new Date(endIso);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;
  return differenceInMinutes(end, start);
}

function toSleepClockMinutes(iso: string) {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  let total = (hours * 60) + minutes;
  if (hours < 12) total += 24 * 60;
  return total;
}

function circularMedian(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function minutesDelta(a: number, b: number) {
  return Math.abs(a - b);
}

function buildDurationScore(durationMinutes: number | null, targetMinutes: number) {
  if (!durationMinutes || durationMinutes <= 0) return null;

  const ratio = durationMinutes / Math.max(targetMinutes, 1);
  if (ratio >= 0.95 && ratio <= 1.1) return 100;
  if (ratio < 0.95) return clamp(Math.round(100 - ((0.95 - ratio) * 140)), 0, 99);
  return clamp(Math.round(100 - ((ratio - 1.1) * 80)), 70, 99);
}

function buildConsistencyScore(record: AxisSleepRecord, history: AxisSleepRecord[]) {
  const baseline = history
    .filter((item) => item.bedtime && item.wake_time)
    .slice(0, 6);

  if (baseline.length < 3) return null;

  const bedtimeMedian = circularMedian(baseline.map((item) => toSleepClockMinutes(item.bedtime)));
  const wakeMedian = circularMedian(baseline.map((item) => toSleepClockMinutes(item.wake_time)));
  if (bedtimeMedian === null || wakeMedian === null) return null;

  const bedtimeDelta = minutesDelta(toSleepClockMinutes(record.bedtime), bedtimeMedian);
  const wakeDelta = minutesDelta(toSleepClockMinutes(record.wake_time), wakeMedian);
  const bedtimeScore = clamp(Math.round(100 - (bedtimeDelta * 0.65)), 0, 100);
  const wakeScore = clamp(Math.round(100 - (wakeDelta * 0.55)), 0, 100);

  return Math.round((bedtimeScore + wakeScore) / 2);
}

function buildEfficiencyScore(record: AxisSleepRecord) {
  if (!record.time_in_bed_minutes || !record.duration_minutes || record.time_in_bed_minutes <= 0) return null;
  const efficiency = (record.duration_minutes / record.time_in_bed_minutes) * 100;
  return clamp(Math.round((efficiency - 70) * 4.5), 0, 100);
}

function buildInterruptionsScore(record: AxisSleepRecord) {
  const awakeMinutes = record.stage_minutes?.awake_minutes ?? null;
  const interruptions = record.interruptions_count;
  if (awakeMinutes === null && interruptions === null) return null;

  const awakePenalty = awakeMinutes !== null ? Math.min(45, awakeMinutes * 1.5) : 0;
  const interruptionPenalty = interruptions !== null ? Math.max(0, interruptions - 1) * 8 : 0;
  return clamp(Math.round(100 - awakePenalty - interruptionPenalty), 0, 100);
}

function bandScore(value: number, minIdeal: number, maxIdeal: number, spread: number) {
  if (value >= minIdeal && value <= maxIdeal) return 100;
  if (value < minIdeal) return clamp(Math.round(100 - (((minIdeal - value) / spread) * 100)), 0, 100);
  return clamp(Math.round(100 - (((value - maxIdeal) / spread) * 100)), 0, 100);
}

function buildStagesScore(record: AxisSleepRecord) {
  if (!record.stage_minutes || !record.duration_minutes || record.duration_minutes <= 0) return null;

  const rem = record.stage_minutes.rem_minutes ?? 0;
  const deep = record.stage_minutes.deep_minutes ?? 0;
  if (rem <= 0 && deep <= 0) return null;

  const remPct = (rem / record.duration_minutes) * 100;
  const deepPct = (deep / record.duration_minutes) * 100;
  const remScore = bandScore(remPct, 18, 28, 15);
  const deepScore = bandScore(deepPct, 10, 22, 12);
  return Math.round((remScore + deepScore) / 2);
}

function buildScoreSummary(components: AxisSleepScore['components']) {
  if ((components.duration ?? 0) < 65) return 'Sleep duration was the main limiter.';
  if ((components.consistency ?? 100) < 70) return 'Timing drift lowered consistency.';
  if ((components.efficiency ?? 100) < 70) return 'A lot of time in bed was not converted into sleep.';
  if ((components.interruptions ?? 100) < 70) return 'Interruptions reduced sleep continuity.';
  if ((components.stages ?? 100) < 70) return 'Stage distribution was less restorative than usual.';
  return 'Sleep looked solid overall for the data AXIS has.';
}

export function computeAxisSleepScore(args: {
  record: AxisSleepRecord;
  history: AxisSleepRecord[];
  targetMinutes: number;
}): AxisSleepScore {
  const { record, history, targetMinutes } = args;
  const components = {
    duration: buildDurationScore(record.duration_minutes, targetMinutes),
    consistency: buildConsistencyScore(record, history),
    efficiency: buildEfficiencyScore(record),
    interruptions: buildInterruptionsScore(record),
    stages: buildStagesScore(record),
  };

  const componentWeights: Array<[keyof AxisSleepScore['components'], number, string]> = [
    ['duration', 45, 'sleep duration'],
    ['consistency', 20, 'consistency history'],
    ['efficiency', 20, 'time in bed'],
    ['interruptions', 10, 'interruptions'],
    ['stages', 5, 'sleep stages'],
  ];

  const available = componentWeights.filter(([key]) => components[key] !== null);
  const missing_inputs = componentWeights
    .filter(([key]) => components[key] === null)
    .map(([, , label]) => label);

  if (available.length === 0) {
    return {
      value: null,
      confidence: 'low',
      summary: 'AXIS needs more sleep data before it can score this night.',
      components,
      available_inputs: [],
      missing_inputs,
    };
  }

  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  const weightedValue = available.reduce(
    (sum, [key, weight]) => sum + ((components[key] ?? 0) * weight),
    0,
  ) / totalWeight;

  const confidence: AxisSleepConfidence = record.source === 'healthkit'
    ? record.metadata.has_stage_data || record.metadata.has_time_in_bed
      ? 'high'
      : 'medium'
    : 'medium';

  return {
    value: Math.round(weightedValue),
    confidence,
    summary: buildScoreSummary(components),
    components,
    available_inputs: available.map(([, , label]) => label),
    missing_inputs,
  };
}

export function normalizeManualSleepLog(log: SleepLog): AxisSleepRecord {
  const durationMinutes = minutesOrDiff(log.sleep_start, log.sleep_end, log.duration_minutes);

  return {
    id: log.id,
    user_id: log.user_id,
    sleep_start: log.sleep_start,
    sleep_end: log.sleep_end,
    bedtime: log.sleep_start,
    wake_time: log.sleep_end,
    duration_minutes: durationMinutes,
    time_in_bed_minutes: durationMinutes,
    sleep_efficiency_pct: durationMinutes ? 100 : null,
    stage_minutes: null,
    interruptions_count: null,
    source: 'manual',
    source_label: 'Manual log',
    source_confidence: 'medium',
    quality_rating: log.quality_rating ?? null,
    notes: log.notes ?? null,
    created_at: log.created_at,
    sleep_score: null,
    metadata: {
      has_stage_data: false,
      has_time_in_bed: Boolean(durationMinutes),
      is_manual: true,
    },
  };
}

export function normalizeAppleHealthSleepRecord(record: AppleHealthSleepRecordInput): AxisSleepRecord {
  const efficiency = (
    record.duration_minutes
    && record.time_in_bed_minutes
    && record.time_in_bed_minutes > 0
  )
    ? Math.round((record.duration_minutes / record.time_in_bed_minutes) * 100)
    : null;

  const hasStageData = Boolean(
    record.stage_minutes
    && (
      (record.stage_minutes.rem_minutes ?? 0) > 0
      || (record.stage_minutes.core_minutes ?? 0) > 0
      || (record.stage_minutes.deep_minutes ?? 0) > 0
      || (record.stage_minutes.awake_minutes ?? 0) > 0
    ),
  );

  return {
    id: record.id,
    user_id: 'healthkit',
    sleep_start: record.sleep_start,
    sleep_end: record.sleep_end,
    bedtime: record.sleep_start,
    wake_time: record.sleep_end,
    duration_minutes: record.duration_minutes,
    time_in_bed_minutes: record.time_in_bed_minutes,
    sleep_efficiency_pct: efficiency,
    stage_minutes: record.stage_minutes,
    interruptions_count: record.interruptions_count,
    source: 'healthkit',
    source_label: record.source_name ? `Apple Health · ${record.source_name}` : 'Apple Health',
    source_confidence: hasStageData || record.time_in_bed_minutes ? 'high' : 'medium',
    quality_rating: null,
    notes: null,
    created_at: record.created_at,
    sleep_score: null,
    metadata: {
      has_stage_data: hasStageData,
      has_time_in_bed: Boolean(record.time_in_bed_minutes),
      is_manual: false,
    },
  };
}

export function mergeAxisSleepRecords(records: AxisSleepRecord[], limit: number) {
  const merged = new Map<string, AxisSleepRecord>();
  const getSourceScore = (record: AxisSleepRecord) => {
    if (record.source === 'healthkit') return 3;
    if (record.source === 'manual') return 2;
    return 1;
  };

  for (const record of [...records].sort((a, b) => b.wake_time.localeCompare(a.wake_time))) {
    const key = sleepDayKey(record.wake_time);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, record);
      continue;
    }

    const candidateScore = getSourceScore(record);
    const existingScore = getSourceScore(existing);
    if (
      candidateScore > existingScore
      || (
        candidateScore === existingScore
        && ((record.duration_minutes ?? 0) > (existing.duration_minutes ?? 0))
      )
    ) {
      merged.set(key, record);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.wake_time.localeCompare(a.wake_time))
    .slice(0, limit);
}

export function attachAxisSleepScores(records: AxisSleepRecord[], targetMinutes: number) {
  const sorted = [...records].sort((a, b) => b.wake_time.localeCompare(a.wake_time));

  return sorted.map((record, index) => ({
    ...record,
    sleep_score: computeAxisSleepScore({
      record,
      history: sorted.slice(index + 1, index + 14),
      targetMinutes,
    }),
  }));
}

export function formatSleepClock(iso: string) {
  return format(new Date(iso), 'h:mm a');
}
