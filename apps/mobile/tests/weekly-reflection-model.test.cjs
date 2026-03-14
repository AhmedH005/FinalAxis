const test = require('node:test');
const assert = require('node:assert/strict');

const { buildLifeOsWeeklyReflectionModel } = require('../.test-dist/src/engines/life-os/weekly/reflection-model.js');
const { buildLifeOsWeeklySummary } = require('../.test-dist/src/engines/life-os/weekly/summary.js');
const {
  buildImprovingPerformWeek,
  buildLowConfidenceMixedWeek,
  buildWorseningBodyWeek,
} = require('./weekly-reflection-fixtures.cjs');

test('weekly reflection model explains an improving week cleanly', () => {
  const summary = buildLifeOsWeeklySummary({
    date: '2026-03-13',
    records: buildImprovingPerformWeek(),
    totalDays: 7,
  });
  const model = buildLifeOsWeeklyReflectionModel(summary);

  assert.equal(model.isAvailable, true);
  assert.match(model.header.title, /better direction|steadily/i);
  assert.equal(model.recurringSupports.length > 0, true);
  assert.equal(model.strongestShift.title !== null, true);
});

test('weekly reflection model stays cautious on a low-confidence mixed week', () => {
  const summary = buildLifeOsWeeklySummary({
    date: '2026-03-13',
    records: buildLowConfidenceMixedWeek(),
    totalDays: 7,
  });
  const model = buildLifeOsWeeklyReflectionModel(summary);

  assert.equal(model.isAvailable, true);
  assert.equal(model.confidence, 'low');
  assert.match(model.evidenceNote, /Signal coverage|cautious/i);
});

test('weekly reflection model keeps worsening weeks grounded for body-composition goals', () => {
  const summary = buildLifeOsWeeklySummary({
    date: '2026-03-12',
    records: buildWorseningBodyWeek('gain'),
    totalDays: 7,
  });
  const model = buildLifeOsWeeklyReflectionModel(summary);

  assert.equal(model.isAvailable, true);
  assert.match(model.alignmentRead.summary, /week/i);
  assert.equal(model.recurringBlockers.length > 0, true);
});

test('weekly reflection model hides itself when there is not enough history yet', () => {
  const summary = buildLifeOsWeeklySummary({
    date: '2026-03-13',
    records: buildImprovingPerformWeek().slice(0, 2),
    totalDays: 7,
  });
  const model = buildLifeOsWeeklyReflectionModel(summary);

  assert.equal(model.isAvailable, false);
  assert.equal(typeof model.emptyState.title, 'string');
});
