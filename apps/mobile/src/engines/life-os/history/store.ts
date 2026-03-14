import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GoalAlignmentSnapshot } from '../goal-alignment/types';
import type { LifeOsContextItem, LifeOsContextSnapshot } from '../types';
import type {
  LifeOsHistoryRecord,
  LifeOsHistorySignal,
  LifeOsHistoryStore,
} from './types';

const STORAGE_KEY = 'axis.life-os.history.v1';
const MAX_HISTORY_DAYS = 42;

let memoryStore: LifeOsHistoryStore | null = null;

function mergeConfidence(left: LifeOsHistorySignal['confidence'], right: LifeOsHistorySignal['confidence']) {
  if (left === 'low' || right === 'low') return 'low';
  if (left === 'medium' || right === 'medium') return 'medium';
  return 'high';
}

function toHistorySignal(
  item: LifeOsContextItem,
  source: LifeOsHistorySignal['source'],
): LifeOsHistorySignal {
  return {
    code: item.code,
    label: item.label,
    domain: item.domain,
    confidence: item.confidence,
    source,
  };
}

function dedupeSignals(items: LifeOsHistorySignal[]) {
  const map = new Map<string, LifeOsHistorySignal>();

  for (const item of items) {
    const key = `${item.source}:${item.code}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }

    map.set(key, {
      ...existing,
      confidence: mergeConfidence(existing.confidence, item.confidence),
    });
  }

  return [...map.values()].sort((left, right) =>
    left.domain.localeCompare(right.domain) || left.code.localeCompare(right.code));
}

function toGoalHistory(snapshot: GoalAlignmentSnapshot): LifeOsHistoryRecord['goalAlignment'] {
  return {
    goalId: snapshot.goal.id,
    goalTitle: snapshot.goal.title,
    archetype: snapshot.goal.archetype,
    alignmentBand: snapshot.alignmentBand,
    alignmentScore: snapshot.alignmentScore,
    confidence: snapshot.confidence,
    blockers: dedupeSignals(
      snapshot.blockers.map((item) => ({
        code: item.code,
        label: item.label,
        domain: item.domain,
        confidence: item.confidence,
        source: 'goal_alignment' as const,
      })),
    ),
    supports: dedupeSignals(
      snapshot.supports.map((item) => ({
        code: item.code,
        label: item.label,
        domain: item.domain,
        confidence: item.confidence,
        source: 'goal_alignment' as const,
      })),
    ),
    recommendations: snapshot.recommendationCandidates.map((item) => ({
      code: item.code,
      title: item.title,
      domain: item.domain,
      priority: item.priority,
    })),
  };
}

export function buildLifeOsHistoryRecord(args: {
  snapshot: LifeOsContextSnapshot;
  goalAlignment: GoalAlignmentSnapshot | null;
  recordedAt?: string;
}): LifeOsHistoryRecord {
  const goalAlignment = args.goalAlignment ? toGoalHistory(args.goalAlignment) : null;
  const blockers = dedupeSignals([
    ...args.snapshot.warnings.map((item) => toHistorySignal(item, 'life_os')),
    ...(goalAlignment?.blockers ?? []),
  ]);
  const supports = dedupeSignals([
    ...args.snapshot.keyStrengths.map((item) => toHistorySignal(item, 'life_os')),
    ...(goalAlignment?.supports ?? []),
  ]);

  return {
    version: 1,
    date: args.snapshot.date,
    recordedAt: args.recordedAt ?? new Date().toISOString(),
    signalCoverage: {
      pct: args.snapshot.signalCoverage.pct,
      confidence: args.snapshot.signalCoverage.confidence,
      missingDomains: [...args.snapshot.signalCoverage.missingDomains],
    },
    currentState: {
      time: {
        state: args.snapshot.currentState.time.state,
        focusLoadScore: args.snapshot.currentState.time.focusLoadScore,
        deepWorkMinutes: args.snapshot.currentState.time.deepWorkMinutes,
      },
      body: {
        state: args.snapshot.currentState.body.state,
        recoveryRiskScore: args.snapshot.recoveryRiskScore,
        recoveryRiskLevel: args.snapshot.recoveryRiskLevel,
        bodyReadinessScore: args.snapshot.bodyReadinessScore,
        sleepMinutes: args.snapshot.currentState.body.sleepMinutes,
      },
      mind: {
        state: args.snapshot.currentState.mind.state,
        mindStabilityScore: args.snapshot.mindStabilityScore,
        moodScore: args.snapshot.currentState.mind.moodScore,
        habitsCompletionPct: args.snapshot.currentState.mind.habitsCompletionPct,
        hasJournalEntry: args.snapshot.currentState.mind.hasJournalEntry,
      },
    },
    momentum: args.snapshot.momentum.map((item) => ({ ...item })),
    blockers,
    supports,
    goalAlignment,
  };
}

async function loadStore() {
  if (memoryStore) return memoryStore;

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    memoryStore = {
      version: 1,
      records: [],
    };
    return memoryStore;
  }

  try {
    const parsed = JSON.parse(raw) as LifeOsHistoryStore;
    memoryStore = {
      version: 1,
      records: Array.isArray(parsed.records) ? parsed.records : [],
    };
  } catch {
    memoryStore = {
      version: 1,
      records: [],
    };
  }

  return memoryStore;
}

async function persistStore(records: LifeOsHistoryRecord[]) {
  const nextStore: LifeOsHistoryStore = {
    version: 1,
    records: records
      .slice()
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, MAX_HISTORY_DAYS),
  };

  memoryStore = nextStore;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
  return nextStore;
}

export async function listLifeOsHistoryRecords() {
  const store = await loadStore();
  return store.records.slice().sort((left, right) => right.date.localeCompare(left.date));
}

export async function upsertLifeOsHistoryRecord(args: {
  snapshot: LifeOsContextSnapshot;
  goalAlignment: GoalAlignmentSnapshot | null;
}) {
  const store = await loadStore();
  const existing = store.records.find((record) => record.date === args.snapshot.date) ?? null;
  const nextRecord = buildLifeOsHistoryRecord({
    snapshot: args.snapshot,
    goalAlignment: args.goalAlignment,
    recordedAt: existing?.recordedAt,
  });

  if (existing && JSON.stringify(existing) === JSON.stringify(nextRecord)) {
    return existing;
  }

  const nextRecords = [
    nextRecord,
    ...store.records.filter((record) => record.date !== nextRecord.date),
  ];

  await persistStore(nextRecords);
  return nextRecord;
}

export async function clearLifeOsHistoryStore() {
  memoryStore = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
