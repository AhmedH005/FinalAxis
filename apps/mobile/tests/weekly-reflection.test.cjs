const test = require('node:test');
const assert = require('node:assert/strict');

const { buildLifeOsWeeklySummary } = require('../.test-dist/src/engines/life-os/weekly/summary.js');
const {
  buildImprovingPerformWeek,
  buildLowConfidenceMixedWeek,
  buildWorseningBodyWeek,
} = require('./weekly-reflection-fixtures.cjs');

test('weekly summary surfaces a strong recurring blocker pattern', () => {
  const records = buildWorseningBodyWeek('lose');
  const summary = buildLifeOsWeeklySummary({
    date: '2026-03-13',
    records,
    totalDays: 7,
  });

  assert.equal(summary.recurringBlockers[0]?.code, 'recovery-risk-high');
  assert.equal(summary.recurringBlockers[0]?.count >= 3, true);
  assert.equal(summary.strongestShiftCandidate?.code === 'protect_sleep_window' || summary.strongestShiftCandidate?.code === 'hold_goal_intensity', true);
});

test('weekly summary surfaces a strong recurring support pattern', () => {
  const records = buildImprovingPerformWeek();
  const summary = buildLifeOsWeeklySummary({
    date: '2026-03-13',
    records,
    totalDays: 7,
  });

  assert.equal(summary.recurringSupports[0]?.code, 'time-focus-protected');
  assert.equal(summary.recurringSupports[0]?.count >= 3, true);
  assert.equal(summary.alignmentTrend.direction, 'improving');
});

test('weekly summary stays cautious on a mixed low-confidence week', () => {
  const summary = buildLifeOsWeeklySummary({
    date: '2026-03-13',
    records: buildLowConfidenceMixedWeek(),
    totalDays: 7,
  });

  assert.equal(summary.confidence, 'low');
  assert.equal(summary.consistencyTrend.level, 'unclear');
});

test('weekly summary detects worsening alignment for body-composition goals', () => {
  const summary = buildLifeOsWeeklySummary({
    date: '2026-03-12',
    records: buildWorseningBodyWeek('maintain'),
    totalDays: 7,
  });

  assert.equal(summary.alignmentTrend.direction, 'worsening');
  assert.equal(summary.goal?.archetype, 'maintain');
});

test('weekly summary stays generic across perform, lose, maintain, and gain', () => {
  const perform = buildLifeOsWeeklySummary({
    date: '2026-03-13',
    records: buildImprovingPerformWeek(),
    totalDays: 7,
  });
  const lose = buildLifeOsWeeklySummary({
    date: '2026-03-12',
    records: buildWorseningBodyWeek('lose'),
    totalDays: 7,
  });
  const maintain = buildLifeOsWeeklySummary({
    date: '2026-03-12',
    records: buildWorseningBodyWeek('maintain'),
    totalDays: 7,
  });
  const gain = buildLifeOsWeeklySummary({
    date: '2026-03-12',
    records: buildWorseningBodyWeek('gain'),
    totalDays: 7,
  });

  assert.equal(perform.goal?.archetype, 'perform');
  assert.equal(lose.goal?.archetype, 'lose');
  assert.equal(maintain.goal?.archetype, 'maintain');
  assert.equal(gain.goal?.archetype, 'gain');
});
