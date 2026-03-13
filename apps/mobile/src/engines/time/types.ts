// Time Engine mobile types.
// These mirror the web Time Engine DTOs closely enough for read-only mobile use.

export type TimePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TimeColour = 'SLATE' | 'EMERALD' | 'SKY' | 'VIOLET' | 'AMBER' | 'ROSE';
export type TimeViewMode = 'today' | 'upcoming' | 'week';
export type TimeBlockSource = 'engine' | 'external_calendar';
export type TimeSummaryConfidence = 'low' | 'medium' | 'high';
export type TimePressureLevel = 'low' | 'medium' | 'high' | 'unknown';
export type TimeFragmentationLevel = 'low' | 'moderate' | 'high';
export type TimeFocusLoadLevel = 'low' | 'moderate' | 'high';
export type TimeBlockedReason =
  | 'task_feed_unavailable'
  | 'history_unavailable'
  | 'settings_unavailable';

export interface TimeTask {
  id: string;
  userId: string;
  title: string;
  notes?: string | null;
  estMinutes?: number | null;
  due?: string | null;
  priority: TimePriority;
  colour: TimeColour;
  createdAt: string;
  updatedAt?: string | null;
  completedAt?: string | null;
}

export interface TimeBlock {
  id: string;
  userId: string;
  taskId?: string | null;
  title: string;
  start: string;
  end: string;
  source: TimeBlockSource;
  colour: TimeColour;
  isLocked: boolean;
  createdAt?: string | null;
  task?: TimeTask | null;
}

export interface TimeBlockedMetric {
  available: false;
  reason: TimeBlockedReason;
}

export interface TimeDeadlinePressure {
  level: TimePressureLevel;
  score: number;
  scheduledTaskCount: number;
  overdueScheduledTaskCount: number;
  dueTodayTaskCount: number;
  dueSoonTaskCount: number;
  limitedToScheduledTasks: true;
}

export interface TimeFragmentationSummary {
  level: TimeFragmentationLevel;
  score: number;
  blockCount: number;
  shortBlockCount: number;
  focusBlockCount: number;
  averageBlockMinutes: number | null;
  largestFocusWindowMinutes: number;
}

export interface TimeSignalCoverage {
  confidence: TimeSummaryConfidence;
  availableSignals: number;
  totalSignals: number;
  pct: number;
  taskMetadataCoveragePct: number | null;
  blockers: TimeBlockedReason[];
}

export interface TimeDailySummary {
  date: string;
  blockCount: number;
  plannedMinutes: number;
  busyMinutes: number;
  taskMinutes: number;
  deepWorkMinutes: number;
  externalCalendarMinutes: number;
  externalCalendarRatio: number | null;
  lockedMinutes: number;
  unlockedMinutes: number;
  lockedToEngineRatio: number | null;
  firstBlockStart: string | null;
  lastBlockEnd: string | null;
  focusLoadScore: number;
  focusLoadLevel: TimeFocusLoadLevel;
  deadlinePressure: TimeDeadlinePressure;
  fragmentation: TimeFragmentationSummary;
  overdueBacklog: TimeBlockedMetric;
  carryover: TimeBlockedMetric;
  signalCoverage: TimeSignalCoverage;
}

export interface TimeBlocksApiResponse {
  success: boolean;
  data?: TimeBlock[];
  error?: string;
}
