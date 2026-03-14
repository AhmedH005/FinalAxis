import {
  buildHydrationCaptureResult,
  buildJournalNoteCaptureResult,
  buildMoodCaptureResult,
  buildRejectedCaptureResult,
  buildTaskReminderCaptureResult,
  buildTimeBlockUnavailableResult,
} from './intents';
import type { CaptureResult } from './types';

const MOOD_TAG_VOCAB = new Set([
  'anxious',
  'calm',
  'drained',
  'focused',
  'low',
  'restless',
  'stressed',
  'tired',
]);

function sanitizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function toMl(value: number, unit: string) {
  return unit.toLowerCase() === 'l'
    ? Math.round(value * 1000)
    : Math.round(value);
}

function extractMoodTags(note: string | null) {
  if (!note) return [];

  return sanitizeWhitespace(note)
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((token) => MOOD_TAG_VOCAB.has(token))
    .slice(0, 3);
}

function parseHydration(input: string): CaptureResult | null {
  const explicit = input.match(/^(?:(?:i\s+)?drank|water)\s+(\d+(?:\.\d+)?)\s*(ml|l)\b(?:\s+of\s+water|\s+water)?$/i)
    ?? input.match(/^(\d+(?:\.\d+)?)\s*(ml|l)\s+water$/i);

  if (explicit) {
    const amountMl = toMl(Number(explicit[1]), explicit[2]);
    if (!Number.isFinite(amountMl) || amountMl < 50 || amountMl > 5000) {
      return buildRejectedCaptureResult({ reason: 'ambiguous_amount' });
    }
    return buildHydrationCaptureResult({ amountMl }, 'high');
  }

  const shorthand = input.match(/^(\d+(?:\.\d+)?)\s*(ml|l)$/i);
  if (!shorthand) return null;

  const amountMl = toMl(Number(shorthand[1]), shorthand[2]);
  if (!Number.isFinite(amountMl) || amountMl < 50 || amountMl > 5000) {
    return buildRejectedCaptureResult({ reason: 'ambiguous_amount' });
  }

  return buildHydrationCaptureResult({ amountMl }, 'medium');
}

function parseMood(input: string): CaptureResult | null {
  const keywordMatch = input.match(/^mood\s+(\d{1,2})(?:\s*\/\s*10)?(?:\s+(.+))?$/i);
  if (keywordMatch) {
    const moodScore = Number(keywordMatch[1]);
    if (moodScore < 1 || moodScore > 10) {
      return buildRejectedCaptureResult({ reason: 'ambiguous_mood' });
    }

    const note = keywordMatch[2] ? sanitizeWhitespace(keywordMatch[2]) : null;
    return buildMoodCaptureResult({
      moodScore,
      note,
      tags: extractMoodTags(note),
    }, 'high');
  }

  const feelingMatch = input.match(/^feeling\s+(.+?)\s+(\d{1,2})\s*\/\s*10$/i);
  if (feelingMatch) {
    const moodScore = Number(feelingMatch[2]);
    if (moodScore < 1 || moodScore > 10) {
      return buildRejectedCaptureResult({ reason: 'ambiguous_mood' });
    }

    const note = sanitizeWhitespace(feelingMatch[1]);
    return buildMoodCaptureResult({
      moodScore,
      note,
      tags: extractMoodTags(note),
    }, 'high');
  }

  const shorthandMatch = input.match(/^(\d{1,2})\s*\/\s*10(?:\s+(.+))?$/i);
  if (!shorthandMatch) return null;

  const moodScore = Number(shorthandMatch[1]);
  if (moodScore < 1 || moodScore > 10) {
    return buildRejectedCaptureResult({ reason: 'ambiguous_mood' });
  }

  const note = shorthandMatch[2] ? sanitizeWhitespace(shorthandMatch[2]) : null;
  return buildMoodCaptureResult({
    moodScore,
    note,
    tags: extractMoodTags(note),
  }, 'medium');
}

function parseJournalNote(input: string): CaptureResult | null {
  const match = input.match(/^note:\s*(.+)$/i);
  if (!match) return null;

  const body = sanitizeWhitespace(match[1]);
  if (!body) {
    return buildRejectedCaptureResult({ reason: 'unsupported_intent', title: 'AXIS needs a note body', summary: 'Use “note:” followed by a short thought or observation.' });
  }

  return buildJournalNoteCaptureResult({ body }, 'high');
}

function parseTaskReminder(input: string): CaptureResult | null {
  const match = input.match(/^(?:remind me to|todo:)\s*(.+)$/i);
  if (!match) return null;

  const title = sanitizeWhitespace(match[1]);
  if (!title) {
    return buildRejectedCaptureResult({
      reason: 'unsupported_intent',
      title: 'AXIS needs a clearer reminder',
      summary: 'Try something like “remind me to call Sam”.',
    });
  }

  return buildTaskReminderCaptureResult({
    title: title.charAt(0).toUpperCase() + title.slice(1),
    body: '',
    tags: ['reminder', 'capture'],
  }, 'high');
}

function parseTimeBlock(input: string): CaptureResult | null {
  const match = input.match(/^block\s+(.+?)\s+for\s+(.+)$/i);
  if (!match) return null;

  const startsAtLabel = sanitizeWhitespace(match[1]);
  const title = sanitizeWhitespace(match[2]);
  if (!startsAtLabel || !title) {
    return buildRejectedCaptureResult({ reason: 'write_path_unavailable' });
  }

  return buildTimeBlockUnavailableResult({
    startsAtLabel,
    title,
  });
}

export function parseQuickCaptureInput(rawInput: string): CaptureResult {
  const input = sanitizeWhitespace(rawInput);

  if (!input) {
    return buildRejectedCaptureResult({ reason: 'empty_input' });
  }

  const parsers = [
    parseTimeBlock,
    parseJournalNote,
    parseTaskReminder,
    parseHydration,
    parseMood,
  ];

  const matches = parsers
    .map((parser) => parser(input))
    .filter((result): result is CaptureResult => result !== null);

  if (matches.length === 0) {
    return buildRejectedCaptureResult({ reason: 'unsupported_intent' });
  }

  if (matches.length > 1) {
    return buildRejectedCaptureResult({ reason: 'multiple_intents_not_supported', confidence: 'medium' });
  }

  return matches[0];
}
