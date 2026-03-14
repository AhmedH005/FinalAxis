import type {
  CaptureAcceptedResult,
  CaptureConfidence,
  CapturePreviewModel,
  CaptureRejectReason,
  CaptureRejectedResult,
  CaptureWriteTarget,
  HydrationCaptureFields,
  JournalNoteCaptureFields,
  MoodCaptureFields,
  TaskReminderCaptureFields,
  TimeBlockCaptureFields,
} from './types';

function preview(args: CapturePreviewModel): CapturePreviewModel {
  return args;
}

export function destinationLabelForWriteTarget(target: CaptureWriteTarget) {
  switch (target) {
    case 'body_hydration_log':
      return 'Body · Hydration';
    case 'mind_mood_log':
      return 'Mind · Mood';
    case 'mind_journal_note':
      return 'Mind · Journal';
    default:
      return null;
  }
}

export function buildHydrationCaptureResult(
  parsed: HydrationCaptureFields,
  confidence: CaptureConfidence,
): CaptureAcceptedResult {
  return {
    status: 'accepted',
    intent: 'hydration',
    parsed,
    confidence,
    ambiguityReason: null,
    writeTarget: 'body_hydration_log',
    requiresReview: false,
    preview: preview({
      eyebrow: confidence === 'high' ? 'Hydration' : 'Hydration guess',
      title: `Log ${parsed.amountMl}ml of water`,
      summary: 'This will add a hydration entry for today.',
      detail: confidence === 'medium'
        ? 'AXIS inferred this as hydration from the amount and unit only.'
        : null,
      destinationLabel: destinationLabelForWriteTarget('body_hydration_log'),
      confirmLabel: 'Log water',
    }),
  };
}

export function buildMoodCaptureResult(
  parsed: MoodCaptureFields,
  confidence: CaptureConfidence,
): CaptureAcceptedResult {
  const noteDetail = parsed.note ? ` with “${parsed.note}” attached.` : '.';

  return {
    status: 'accepted',
    intent: 'mood',
    parsed,
    confidence,
    ambiguityReason: null,
    writeTarget: 'mind_mood_log',
    requiresReview: false,
    preview: preview({
      eyebrow: confidence === 'high' ? 'Mood' : 'Mood guess',
      title: `Log mood at ${parsed.moodScore}/10`,
      summary: `This will save a mood check-in${noteDetail}`,
      detail: confidence === 'medium'
        ? 'AXIS accepted the score, but the phrasing was less explicit than the preferred mood format.'
        : null,
      destinationLabel: destinationLabelForWriteTarget('mind_mood_log'),
      confirmLabel: 'Save mood',
    }),
  };
}

export function buildJournalNoteCaptureResult(
  parsed: JournalNoteCaptureFields,
  confidence: CaptureConfidence,
): CaptureAcceptedResult {
  return {
    status: 'accepted',
    intent: 'journal_note',
    parsed,
    confidence,
    ambiguityReason: null,
    writeTarget: 'mind_journal_note',
    requiresReview: false,
    preview: preview({
      eyebrow: 'Journal note',
      title: 'Save note to Journal',
      summary: 'This will create a quick note entry so the thought stays visible.',
      detail: parsed.body,
      destinationLabel: destinationLabelForWriteTarget('mind_journal_note'),
      confirmLabel: 'Save note',
    }),
  };
}

export function buildTaskReminderCaptureResult(
  parsed: TaskReminderCaptureFields,
  confidence: CaptureConfidence,
): CaptureAcceptedResult {
  return {
    status: 'accepted',
    intent: 'task_reminder',
    parsed,
    confidence,
    ambiguityReason: null,
    writeTarget: 'mind_journal_note',
    requiresReview: true,
    preview: preview({
      eyebrow: 'Reminder note',
      title: 'Save reminder to Journal',
      summary: `This will save “${parsed.title}” as a visible reminder note.`,
      detail: 'AXIS does not expose a dedicated task write path on mobile yet, so reminders land in Journal notes for now.',
      destinationLabel: destinationLabelForWriteTarget('mind_journal_note'),
      confirmLabel: 'Save reminder',
    }),
  };
}

export function buildTimeBlockUnavailableResult(
  parsed: TimeBlockCaptureFields,
): CaptureRejectedResult {
  return {
    status: 'rejected',
    intent: 'time_block',
    parsed,
    confidence: 'medium',
    ambiguityReason: 'write_path_unavailable',
    writeTarget: null,
    requiresReview: false,
    preview: preview({
      eyebrow: 'Scheduling not ready',
      title: 'AXIS cannot create new time blocks from text yet',
      summary: 'The Time engine can read schedules and reshape existing blocks, but quick text scheduling is not safely exposed yet.',
      detail: `Parsed as “${parsed.startsAtLabel} for ${parsed.title}”, but this still needs a dedicated write path.`,
      destinationLabel: null,
      confirmLabel: null,
    }),
  };
}

export function buildRejectedCaptureResult(args: {
  reason: CaptureRejectReason;
  confidence?: CaptureConfidence;
  title?: string;
  summary?: string;
  detail?: string | null;
}): CaptureRejectedResult {
  const title = args.title ?? (
    args.reason === 'empty_input'
      ? 'Type one clear capture'
      : args.reason === 'ambiguous_amount'
      ? 'AXIS needs a clearer hydration amount'
      : args.reason === 'ambiguous_mood'
      ? 'AXIS needs a clearer mood score'
      : args.reason === 'multiple_intents_not_supported'
      ? 'AXIS only handles one capture at a time'
      : 'AXIS could not place that confidently'
  );

  const summary = args.summary ?? (
    args.reason === 'empty_input'
      ? 'Try one clear input like “drank 500ml”, “mood 6 stressed”, or “note: felt slow after lunch”.'
      : args.reason === 'ambiguous_amount'
      ? 'Use a water amount with a unit, like “drank 500ml” or “1.5l water”.'
      : args.reason === 'ambiguous_mood'
      ? 'Use a 1-10 mood score, like “mood 6 stressed” or “feeling anxious 4/10”.'
      : args.reason === 'multiple_intents_not_supported'
      ? 'Keep the input to one intent so AXIS can place it safely.'
      : 'Keep the input narrow and explicit so AXIS can route it safely.'
  );

  return {
    status: 'rejected',
    intent: 'unknown',
    parsed: null,
    confidence: args.confidence ?? 'low',
    ambiguityReason: args.reason,
    writeTarget: null,
    requiresReview: false,
    preview: preview({
      eyebrow: null,
      title,
      summary,
      detail: args.detail ?? null,
      destinationLabel: null,
      confirmLabel: null,
    }),
  };
}
