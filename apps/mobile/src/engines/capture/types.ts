export type CaptureIntent =
  | 'hydration'
  | 'mood'
  | 'journal_note'
  | 'task_reminder'
  | 'time_block'
  | 'unknown';

export type CaptureConfidence = 'low' | 'medium' | 'high';

export type CaptureWriteTarget =
  | 'body_hydration_log'
  | 'mind_mood_log'
  | 'mind_journal_note';

export type CaptureRejectReason =
  | 'empty_input'
  | 'ambiguous_amount'
  | 'ambiguous_mood'
  | 'multiple_intents_not_supported'
  | 'unsupported_intent'
  | 'write_path_unavailable';

export interface CapturePreviewModel {
  eyebrow: string | null;
  title: string;
  summary: string;
  detail: string | null;
  destinationLabel: string | null;
  confirmLabel: string | null;
}

export interface HydrationCaptureFields {
  amountMl: number;
}

export interface MoodCaptureFields {
  moodScore: number;
  note: string | null;
  tags: string[];
}

export interface JournalNoteCaptureFields {
  body: string;
}

export interface TaskReminderCaptureFields {
  title: string;
  body: string;
  tags: string[];
}

export interface TimeBlockCaptureFields {
  startsAtLabel: string;
  title: string;
}

export type CaptureParsedFields =
  | HydrationCaptureFields
  | MoodCaptureFields
  | JournalNoteCaptureFields
  | TaskReminderCaptureFields
  | TimeBlockCaptureFields
  | null;

interface CaptureAcceptedBaseResult {
  status: 'accepted';
  confidence: CaptureConfidence;
  ambiguityReason: null;
  requiresReview: boolean;
  preview: CapturePreviewModel;
}

export interface HydrationCaptureResult extends CaptureAcceptedBaseResult {
  intent: 'hydration';
  parsed: HydrationCaptureFields;
  writeTarget: 'body_hydration_log';
}

export interface MoodCaptureResult extends CaptureAcceptedBaseResult {
  intent: 'mood';
  parsed: MoodCaptureFields;
  writeTarget: 'mind_mood_log';
}

export interface JournalNoteCaptureResult extends CaptureAcceptedBaseResult {
  intent: 'journal_note';
  parsed: JournalNoteCaptureFields;
  writeTarget: 'mind_journal_note';
}

export interface TaskReminderCaptureResult extends CaptureAcceptedBaseResult {
  intent: 'task_reminder';
  parsed: TaskReminderCaptureFields;
  writeTarget: 'mind_journal_note';
}

export type CaptureAcceptedResult =
  | HydrationCaptureResult
  | MoodCaptureResult
  | JournalNoteCaptureResult
  | TaskReminderCaptureResult;

export interface CaptureRejectedResult {
  status: 'rejected';
  intent: 'time_block' | 'unknown';
  parsed: TimeBlockCaptureFields | null;
  confidence: CaptureConfidence;
  ambiguityReason: CaptureRejectReason;
  writeTarget: null;
  requiresReview: false;
  preview: CapturePreviewModel;
}

export type CaptureResult = CaptureAcceptedResult | CaptureRejectedResult;
