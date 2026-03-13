import { Platform } from 'react-native';
import { addHours, format, startOfDay, subDays } from 'date-fns';
import type { HealthKitPermissions, HealthStatusResult } from 'react-native-health';
import type { SleepStageBreakdown, AppleHealthSleepRecordInput } from './sleep';
import { todayStr } from './utils';

type ReactNativeHealthModule = typeof import('react-native-health');

interface AppleHealthStatus {
  available: boolean;
  connected: boolean;
  status: string;
}

interface AppleHealthSnapshot {
  date: string;
  steps: number | null;
  sleep_minutes: number | null;
  sleep_start: string | null;
  sleep_end: string | null;
  source: 'healthkit';
}

type SleepSampleKind = 'in_bed' | 'asleep_unspecified' | 'rem' | 'core' | 'deep' | 'awake' | 'unknown';

export interface AppleHealthWorkoutEnergy {
  calories: number;
  source: 'healthkit_workout' | 'healthkit_active_energy';
  start: string;
  end: string;
  tracked: boolean;
  source_name: string | null;
  device: string | null;
}

type RawSleepSample = {
  startDate?: string;
  endDate?: string;
  value?: string | number;
  sourceName?: string;
  sourceId?: string;
};

type RawEnergySample = {
  startDate?: string;
  endDate?: string;
  value?: number;
};

type RawAnchoredWorkout = {
  calories?: number;
  tracked?: boolean;
  sourceName?: string;
  device?: string;
  start?: string;
  end?: string;
};

type MergedSleepInterval = {
  start: Date;
  end: Date;
  sourceName: string | null;
};

type ParsedSleepSample = {
  start: Date;
  end: Date;
  kind: SleepSampleKind;
  sourceName: string | null;
};

function getAppleHealthModule(): ReactNativeHealthModule | null {
  if (Platform.OS !== 'ios') return null;

  try {
    return require('react-native-health') as ReactNativeHealthModule;
  } catch {
    return null;
  }
}

function getAppleHealthPermissions(mod: ReactNativeHealthModule): HealthKitPermissions {
  const readPermissions = [
    mod.default.Constants.Permissions.Steps,
    mod.default.Constants.Permissions.SleepAnalysis,
    mod.default.Constants.Permissions.ActiveEnergyBurned,
    mod.default.Constants.Permissions.Workout,
  ];

  return {
    permissions: {
      read: readPermissions,
      write: [],
    },
  } as HealthKitPermissions;
}

async function isAppleHealthAvailable(mod: ReactNativeHealthModule) {
  return new Promise<boolean>((resolve) => {
    mod.default.isAvailable((error, results) => {
      if (error) {
        resolve(false);
        return;
      }

      resolve(Boolean(results));
    });
  });
}

async function initAppleHealth(mod: ReactNativeHealthModule) {
  return new Promise<void>((resolve, reject) => {
    mod.default.initHealthKit(getAppleHealthPermissions(mod), (error) => {
      if (error) {
        reject(new Error(String(error)));
        return;
      }

      resolve();
    });
  });
}

async function getAuthStatus(mod: ReactNativeHealthModule) {
  return new Promise<HealthStatusResult>((resolve, reject) => {
    mod.default.getAuthStatus(getAppleHealthPermissions(mod), (error, results) => {
      if (error) {
        reject(new Error(String(error)));
        return;
      }

      resolve(results as HealthStatusResult);
    });
  });
}

async function getStepCount(mod: ReactNativeHealthModule, date: string) {
  return new Promise<number | null>((resolve, reject) => {
    mod.default.getStepCount(
      { date, includeManuallyAdded: true },
      (error, results) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }

        const value = typeof results?.value === 'number' ? Math.round(results.value) : null;
        resolve(value);
      },
    );
  });
}

async function getSleepSamples(mod: ReactNativeHealthModule, startDate: string, endDate: string) {
  return new Promise<RawSleepSample[]>((resolve, reject) => {
    mod.default.getSleepSamples(
      { startDate, endDate, ascending: true, limit: 240 },
      (error, results) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }

        resolve((results as unknown as RawSleepSample[]) ?? []);
      },
    );
  });
}

async function getActiveEnergySamples(mod: ReactNativeHealthModule, startDate: string, endDate: string) {
  return new Promise<RawEnergySample[]>((resolve, reject) => {
    mod.default.getActiveEnergyBurned(
      { startDate, endDate, ascending: true, includeManuallyAdded: true },
      (error, results) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }

        resolve((results as unknown as RawEnergySample[]) ?? []);
      },
    );
  });
}

async function getAnchoredWorkouts(mod: ReactNativeHealthModule, startDate: string, endDate: string) {
  return new Promise<RawAnchoredWorkout[]>((resolve, reject) => {
    mod.default.getAnchoredWorkouts(
      { startDate, endDate, type: 'Workout' as any },
      (error, results) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }

        resolve(((results?.data as unknown) as RawAnchoredWorkout[]) ?? []);
      },
    );
  });
}

function getSleepSampleKind(value: string | number | undefined): SleepSampleKind {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'REM') return 'rem';
  if (normalized === 'CORE') return 'core';
  if (normalized === 'DEEP') return 'deep';
  if (normalized === 'AWAKE') return 'awake';
  if (normalized.includes('ASLEEP')) return 'asleep_unspecified';
  if (normalized === 'INBED' || normalized === 'IN_BED') return 'in_bed';
  return 'unknown';
}

function mergeSleepSamples(samples: ParsedSleepSample[]) {
  const intervals = samples
    .map((sample) => ({
      sourceName: sample.sourceName ?? null,
      start: sample.start,
      end: sample.end,
    }))
    .filter((interval) => (
      Number.isFinite(interval.start.getTime())
      && Number.isFinite(interval.end.getTime())
      && interval.end > interval.start
    ))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: MergedSleepInterval[] = [];

  for (const interval of intervals) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push(interval);
      continue;
    }

    const gapMinutes = (interval.start.getTime() - previous.end.getTime()) / 60000;
    if (gapMinutes <= 45) {
      previous.end = new Date(Math.max(previous.end.getTime(), interval.end.getTime()));
      previous.sourceName = previous.sourceName ?? interval.sourceName;
      continue;
    }

    merged.push(interval);
  }

  return merged;
}

function sumMergedMinutes(intervals: MergedSleepInterval[]) {
  return Math.round(intervals.reduce(
    (sum, interval) => sum + ((interval.end.getTime() - interval.start.getTime()) / 60000),
    0,
  ));
}

function parseSleepSamples(samples: RawSleepSample[]) {
  return samples
    .map((sample): ParsedSleepSample | null => {
      const start = new Date(sample.startDate ?? '');
      const end = new Date(sample.endDate ?? '');
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;

      return {
        start,
        end,
        kind: getSleepSampleKind(sample.value),
        sourceName: sample.sourceName ?? null,
      };
    })
    .filter((sample): sample is ParsedSleepSample => Boolean(sample));
}

function countInterruptions(args: {
  awakeIntervals: MergedSleepInterval[];
  trackedIntervals: MergedSleepInterval[];
}) {
  const awakeCount = args.awakeIntervals.filter((interval) => (
    ((interval.end.getTime() - interval.start.getTime()) / 60000) >= 3
  )).length;
  if (awakeCount > 0) return awakeCount;

  let gapCount = 0;
  for (let index = 1; index < args.trackedIntervals.length; index += 1) {
    const previous = args.trackedIntervals[index - 1];
    const current = args.trackedIntervals[index];
    const gapMinutes = (current.start.getTime() - previous.end.getTime()) / 60000;
    if (gapMinutes >= 10) gapCount += 1;
  }
  return gapCount > 0 ? gapCount : null;
}

function pickSourceName(samples: ParsedSleepSample[]) {
  const counts = new Map<string, number>();
  for (const sample of samples) {
    const name = sample.sourceName?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function buildSleepStageBreakdown(input: {
  rem: MergedSleepInterval[];
  core: MergedSleepInterval[];
  deep: MergedSleepInterval[];
  awake: MergedSleepInterval[];
  asleepUnspecified: MergedSleepInterval[];
  hasDetailedStages: boolean;
}): SleepStageBreakdown | null {
  const rem = sumMergedMinutes(input.rem);
  const core = sumMergedMinutes(input.core);
  const deep = sumMergedMinutes(input.deep);
  const awake = sumMergedMinutes(input.awake);
  const unspecified = input.hasDetailedStages ? 0 : sumMergedMinutes(input.asleepUnspecified);

  if ([rem, core, deep, awake, unspecified].every((value) => value === 0)) return null;

  return {
    rem_minutes: rem || null,
    core_minutes: core || null,
    deep_minutes: deep || null,
    awake_minutes: awake || null,
    asleep_unspecified_minutes: unspecified || null,
  };
}

function buildHealthSleepRecords(samples: RawSleepSample[], limit: number): AppleHealthSleepRecordInput[] {
  const parsed = parseSleepSamples(samples);
  const nightly = new Map<string, ParsedSleepSample[]>();

  for (const sample of parsed) {
    const dayKey = format(sample.end, 'yyyy-MM-dd');
    const entries = nightly.get(dayKey) ?? [];
    entries.push(sample);
    nightly.set(dayKey, entries);
  }

  const nights = Array.from(nightly.entries()).map(([dayKey, entries]): AppleHealthSleepRecordInput | null => {
    const inBed = mergeSleepSamples(entries.filter((entry) => entry.kind === 'in_bed'));
    const rem = mergeSleepSamples(entries.filter((entry) => entry.kind === 'rem'));
    const core = mergeSleepSamples(entries.filter((entry) => entry.kind === 'core'));
    const deep = mergeSleepSamples(entries.filter((entry) => entry.kind === 'deep'));
    const awake = mergeSleepSamples(entries.filter((entry) => entry.kind === 'awake'));
    const asleepUnspecified = mergeSleepSamples(entries.filter((entry) => entry.kind === 'asleep_unspecified'));
    const hasDetailedStages = rem.length > 0 || core.length > 0 || deep.length > 0 || awake.length > 0;
    const tracked = hasDetailedStages
      ? mergeSleepSamples(entries.filter((entry) => ['rem', 'core', 'deep', 'asleep_unspecified'].includes(entry.kind)))
      : asleepUnspecified;

    const allIntervals = [...tracked, ...inBed].sort((a, b) => a.start.getTime() - b.start.getTime());
    const first = allIntervals[0];
    const last = allIntervals[allIntervals.length - 1];
    if (!first || !last) return null;

    const durationMinutes = tracked.length > 0 ? sumMergedMinutes(tracked) : null;
    const timeInBedMinutes = inBed.length > 0 ? sumMergedMinutes(inBed) : null;
    const stageMinutes = buildSleepStageBreakdown({
      rem,
      core,
      deep,
      awake,
      asleepUnspecified,
      hasDetailedStages,
    });

    return {
      id: `healthkit-${dayKey}`,
      sleep_start: first.start.toISOString(),
      sleep_end: last.end.toISOString(),
      duration_minutes: durationMinutes,
      time_in_bed_minutes: timeInBedMinutes,
      stage_minutes: stageMinutes,
      interruptions_count: countInterruptions({ awakeIntervals: awake, trackedIntervals: tracked }),
      source_name: pickSourceName(entries),
      created_at: last.end.toISOString(),
    };
  }).filter((night): night is AppleHealthSleepRecordInput => night !== null);

  return nights
    .sort((a, b) => b.sleep_end.localeCompare(a.sleep_end))
    .slice(0, limit);
}

async function getConnectedAppleHealthModule() {
  const mod = getAppleHealthModule();
  if (!mod) return null;

  const available = await isAppleHealthAvailable(mod);
  if (!available) return null;

  const status = await getAppleHealthStatus();
  if (!status.connected) return null;

  try {
    await initAppleHealth(mod);
  } catch {
    return null;
  }

  return mod;
}

export async function getAppleHealthStatus(): Promise<AppleHealthStatus> {
  if (Platform.OS !== 'ios') {
    return {
      available: false,
      connected: false,
      status: 'Only available on iPhone',
    };
  }

  const mod = getAppleHealthModule();
  if (!mod) {
    return {
      available: false,
      connected: false,
      status: 'Apple Health bridge is not installed',
    };
  }

  const available = await isAppleHealthAvailable(mod);
  if (!available) {
    return {
      available: false,
      connected: false,
      status: 'Apple Health is unavailable on this device',
    };
  }

  try {
    const auth = await getAuthStatus(mod);
    const readStatuses = auth.permissions.read ?? [];
    const requiredReadStatuses = readStatuses.slice(0, 2);
    const optionalReadStatuses = readStatuses.slice(2);
    const requiredAuthorized = requiredReadStatuses.length > 0 && requiredReadStatuses.every(
      (code) => code === mod.HealthStatusCode.SharingAuthorized,
    );
    const optionalAuthorized = optionalReadStatuses.length > 0 && optionalReadStatuses.every(
      (code) => code === mod.HealthStatusCode.SharingAuthorized,
    );

    if (requiredAuthorized) {
      return {
        available: true,
        connected: true,
        status: optionalAuthorized
          ? 'Connected for iPhone steps, sleep imports, and workout energy'
          : 'Connected for iPhone steps and sleep imports',
      };
    }

    if (readStatuses.some((code) => code === mod.HealthStatusCode.SharingDenied)) {
      return {
        available: true,
        connected: false,
        status: 'Access denied. Enable sleep and step access in Apple Health.',
      };
    }
  } catch {
    // Fall through to the default pre-authorization state below.
  }

  return {
    available: true,
    connected: false,
    status: 'Ready to connect',
  };
}

export async function requestAppleHealthPermissions() {
  const mod = getAppleHealthModule();
  if (!mod) return getAppleHealthStatus();

  const available = await isAppleHealthAvailable(mod);
  if (!available) return getAppleHealthStatus();

  try {
    await initAppleHealth(mod);
  } catch {
    // Apple Health reports permission failures through auth status after init.
  }

  return getAppleHealthStatus();
}

export async function getAppleHealthSleepRecords(limit = 14): Promise<AppleHealthSleepRecordInput[]> {
  const mod = await getConnectedAppleHealthModule();
  if (!mod) return [];

  const now = new Date();
  const startDate = subDays(startOfDay(now), Math.max(limit, 2) + 1);

  try {
    const samples = await getSleepSamples(mod, startDate.toISOString(), now.toISOString());
    return buildHealthSleepRecords(samples, limit);
  } catch {
    return [];
  }
}

export async function getAppleHealthSnapshot(): Promise<AppleHealthSnapshot | null> {
  const mod = await getConnectedAppleHealthModule();
  if (!mod) return null;

  try {
    const nowIso = new Date().toISOString();
    const [steps, sleepRecords] = await Promise.all([
      getStepCount(mod, nowIso),
      getAppleHealthSleepRecords(1),
    ]);
    const latestSleep = sleepRecords[0] ?? null;

    return {
      date: todayStr(),
      steps,
      sleep_minutes: latestSleep?.duration_minutes ?? null,
      sleep_start: latestSleep?.sleep_start ?? null,
      sleep_end: latestSleep?.sleep_end ?? null,
      source: 'healthkit',
    };
  } catch {
    return null;
  }
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / 60000);
}

function getOverlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, (end - start) / 60000);
}

export async function getAppleHealthWorkoutEnergy(args: {
  startDate: string;
  endDate: string;
}): Promise<AppleHealthWorkoutEnergy | null> {
  const mod = await getConnectedAppleHealthModule();
  if (!mod) return null;

  const start = new Date(args.startDate);
  const end = new Date(args.endDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    return null;
  }

  const paddedStart = addHours(start, -2).toISOString();
  const paddedEnd = addHours(end, 2).toISOString();

  try {
    const workouts = await getAnchoredWorkouts(mod, paddedStart, paddedEnd);
    const bestMatch = workouts
      .map((workout) => {
        const workoutStart = new Date(workout.start ?? '');
        const workoutEnd = new Date(workout.end ?? '');
        if (!Number.isFinite(workoutStart.getTime()) || !Number.isFinite(workoutEnd.getTime()) || workoutEnd <= workoutStart) {
          return null;
        }

        const overlapMinutes = getOverlapMinutes(start, end, workoutStart, workoutEnd);
        const sessionMinutes = minutesBetween(start, end);
        const workoutMinutes = minutesBetween(workoutStart, workoutEnd);
        const overlapRatio = overlapMinutes / Math.max(Math.min(sessionMinutes, workoutMinutes), 1);
        const centerDistanceMinutes = Math.abs(
          ((start.getTime() + end.getTime()) / 2) - ((workoutStart.getTime() + workoutEnd.getTime()) / 2),
        ) / 60000;

        return {
          workout,
          overlapMinutes,
          overlapRatio,
          centerDistanceMinutes,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .sort((a, b) => {
        if (b.overlapMinutes !== a.overlapMinutes) return b.overlapMinutes - a.overlapMinutes;
        if (b.overlapRatio !== a.overlapRatio) return b.overlapRatio - a.overlapRatio;
        return a.centerDistanceMinutes - b.centerDistanceMinutes;
      })[0];

    if (
      bestMatch
      && (bestMatch.overlapMinutes >= 10 || bestMatch.overlapRatio >= 0.5)
      && typeof bestMatch.workout.calories === 'number'
      && bestMatch.workout.calories > 0
    ) {
      return {
        calories: Math.round(bestMatch.workout.calories),
        source: 'healthkit_workout',
        start: bestMatch.workout.start ?? args.startDate,
        end: bestMatch.workout.end ?? args.endDate,
        tracked: bestMatch.workout.tracked !== false,
        source_name: bestMatch.workout.sourceName ?? null,
        device: bestMatch.workout.device ?? null,
      };
    }

    const energySamples = await getActiveEnergySamples(mod, args.startDate, args.endDate);
    const calories = Math.round(
      energySamples.reduce((sum, sample) => sum + (typeof sample.value === 'number' ? sample.value : 0), 0),
    );

    if (calories > 0) {
      return {
        calories,
        source: 'healthkit_active_energy',
        start: args.startDate,
        end: args.endDate,
        tracked: true,
        source_name: 'Apple Health',
        device: null,
      };
    }
  } catch {
    return null;
  }

  return null;
}
