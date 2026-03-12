import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecoveryCheckIn {
  date: string;
  steps: number | null;
  energy: number | null;
  fatigue: number | null;
  soreness: number | null;
}

const STORAGE_KEY = 'axis.body.recovery.v1';
const MAX_ENTRIES = 30;

let memory: RecoveryCheckIn[] | null = null;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function loadEntries() {
  if (memory) return memory;

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    memory = [];
    return memory;
  }

  try {
    memory = JSON.parse(raw) as RecoveryCheckIn[];
  } catch {
    memory = [];
  }

  return memory;
}

async function persistEntries(entries: RecoveryCheckIn[]) {
  memory = entries.slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  return memory;
}

export async function getRecoveryCheckIns() {
  return loadEntries();
}

export async function getTodayRecoveryCheckIn() {
  const entries = await loadEntries();
  const key = todayKey();
  return entries.find((entry) => entry.date === key) ?? null;
}

export async function saveRecoveryCheckIn(input: Omit<RecoveryCheckIn, 'date'> & { date?: string }) {
  const entries = await loadEntries();
  const date = input.date ?? todayKey();
  const nextEntry: RecoveryCheckIn = {
    date,
    steps: input.steps ?? null,
    energy: input.energy ?? null,
    fatigue: input.fatigue ?? null,
    soreness: input.soreness ?? null,
  };

  const nextEntries = [nextEntry, ...entries.filter((entry) => entry.date !== date)]
    .sort((a, b) => b.date.localeCompare(a.date));

  return persistEntries(nextEntries);
}

export function computeRecoveryScore(input: {
  sleepMinutes: number | null;
  energy: number | null;
  fatigue: number | null;
  soreness: number | null;
  sleepTargetMinutes?: number;
}) {
  const sleepTarget = input.sleepTargetMinutes ?? 480;
  const parts: number[] = [];

  if (input.sleepMinutes) parts.push(Math.min(1, input.sleepMinutes / sleepTarget));
  if (input.energy) parts.push(input.energy / 5);
  if (input.fatigue) parts.push(1 - (input.fatigue - 1) / 4);
  if (input.soreness) parts.push(1 - (input.soreness - 1) / 4);

  if (parts.length === 0) return null;

  return Math.round((parts.reduce((sum, part) => sum + part, 0) / parts.length) * 100);
}
