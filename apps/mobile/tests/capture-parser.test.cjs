const test = require('node:test');
const assert = require('node:assert/strict');

const { parseQuickCaptureInput } = require('../.test-dist/src/engines/capture/parser.js');

test('parses explicit hydration input with high confidence', () => {
  const result = parseQuickCaptureInput('drank 500ml');

  assert.equal(result.status, 'accepted');
  assert.equal(result.intent, 'hydration');
  assert.equal(result.parsed.amountMl, 500);
  assert.equal(result.confidence, 'high');
  assert.equal(result.writeTarget, 'body_hydration_log');
  assert.match(result.preview.title, /500ml/i);
});

test('parses shorthand hydration input with degraded confidence', () => {
  const result = parseQuickCaptureInput('500ml');

  assert.equal(result.status, 'accepted');
  assert.equal(result.intent, 'hydration');
  assert.equal(result.confidence, 'medium');
  assert.match(result.preview.summary, /hydration/i);
});

test('parses mood inputs with score and note', () => {
  const result = parseQuickCaptureInput('mood 6 stressed');

  assert.equal(result.status, 'accepted');
  assert.equal(result.intent, 'mood');
  assert.equal(result.parsed.moodScore, 6);
  assert.equal(result.parsed.note, 'stressed');
  assert.equal(result.writeTarget, 'mind_mood_log');
});

test('parses feeling-based mood inputs', () => {
  const result = parseQuickCaptureInput('feeling anxious 4/10');

  assert.equal(result.status, 'accepted');
  assert.equal(result.intent, 'mood');
  assert.equal(result.parsed.moodScore, 4);
  assert.equal(result.parsed.note, 'anxious');
});

test('parses journal note inputs into note writes', () => {
  const result = parseQuickCaptureInput('note: felt slow after lunch');

  assert.equal(result.status, 'accepted');
  assert.equal(result.intent, 'journal_note');
  assert.equal(result.parsed.body, 'felt slow after lunch');
  assert.equal(result.writeTarget, 'mind_journal_note');
  assert.match(result.preview.title, /Journal/i);
});

test('parses reminder-style task capture into a visible reminder note', () => {
  const result = parseQuickCaptureInput('remind me to call Sam');

  assert.equal(result.status, 'accepted');
  assert.equal(result.intent, 'task_reminder');
  assert.equal(result.parsed.title, 'Call Sam');
  assert.equal(result.requiresReview, true);
  assert.equal(result.writeTarget, 'mind_journal_note');
  assert.match(result.preview.detail, /dedicated task write path/i);
});

test('rejects ambiguous hydration inputs', () => {
  const result = parseQuickCaptureInput('water');

  assert.equal(result.status, 'rejected');
  assert.equal(result.ambiguityReason, 'unsupported_intent');
});

test('rejects time block capture until a safe create path exists', () => {
  const result = parseQuickCaptureInput('block 2pm for writing');

  assert.equal(result.status, 'rejected');
  assert.equal(result.intent, 'time_block');
  assert.equal(result.ambiguityReason, 'write_path_unavailable');
  assert.match(result.preview.summary, /not safely exposed yet/i);
});
