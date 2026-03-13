const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDailyTimeSummary } = require('../.test-dist/src/engines/time/summary.js');

test('buildDailyTimeSummary derives deterministic load, pressure, and coverage metrics', () => {
  const summary = buildDailyTimeSummary({
    date: '2026-03-13',
    blocks: [
      {
        id: 'overnight',
        userId: 'user-1',
        taskId: 'task-overnight',
        title: 'Late review',
        start: '2026-03-12T23:00:00',
        end: '2026-03-13T01:00:00',
        source: 'engine',
        colour: 'SKY',
        isLocked: false,
        task: {
          id: 'task-overnight',
          userId: 'user-1',
          title: 'Late review',
          priority: 'MEDIUM',
          colour: 'SKY',
          createdAt: '2026-03-10T09:00:00',
          due: null,
        },
      },
      {
        id: 'deep-1',
        userId: 'user-1',
        taskId: 'task-deep',
        title: 'Deep build',
        start: '2026-03-13T09:00:00',
        end: '2026-03-13T11:00:00',
        source: 'engine',
        colour: 'VIOLET',
        isLocked: false,
        task: {
          id: 'task-deep',
          userId: 'user-1',
          title: 'Deep build',
          priority: 'HIGH',
          colour: 'VIOLET',
          createdAt: '2026-03-11T09:00:00',
          due: '2026-03-13T17:00:00',
        },
      },
      {
        id: 'task-2',
        userId: 'user-1',
        taskId: 'task-follow-up',
        title: 'Follow-up',
        start: '2026-03-13T11:30:00',
        end: '2026-03-13T12:30:00',
        source: 'engine',
        colour: 'SKY',
        isLocked: false,
        task: {
          id: 'task-follow-up',
          userId: 'user-1',
          title: 'Follow-up',
          priority: 'MEDIUM',
          colour: 'SKY',
          createdAt: '2026-03-11T10:00:00',
          due: '2026-03-15T10:00:00',
        },
      },
      {
        id: 'calendar-1',
        userId: 'user-1',
        taskId: null,
        title: 'External meeting',
        start: '2026-03-13T13:00:00',
        end: '2026-03-13T14:00:00',
        source: 'external_calendar',
        colour: 'AMBER',
        isLocked: true,
        task: null,
      },
    ],
  });

  assert.equal(summary.blockCount, 4);
  assert.equal(summary.plannedMinutes, 300);
  assert.equal(summary.busyMinutes, 300);
  assert.equal(summary.taskMinutes, 240);
  assert.equal(summary.deepWorkMinutes, 120);
  assert.equal(summary.externalCalendarMinutes, 60);
  assert.equal(summary.externalCalendarRatio, 0.2);
  assert.equal(summary.lockedMinutes, 60);
  assert.equal(summary.unlockedMinutes, 240);
  assert.equal(summary.lockedToEngineRatio, 0.2);
  assert.equal(summary.focusLoadScore, 94);
  assert.equal(summary.focusLoadLevel, 'high');
  assert.equal(summary.deadlinePressure.score, 45);
  assert.equal(summary.deadlinePressure.level, 'medium');
  assert.equal(summary.deadlinePressure.scheduledTaskCount, 3);
  assert.equal(summary.deadlinePressure.dueTodayTaskCount, 1);
  assert.equal(summary.deadlinePressure.dueSoonTaskCount, 1);
  assert.equal(summary.fragmentation.level, 'low');
  assert.equal(summary.fragmentation.largestFocusWindowMinutes, 120);
  assert.equal(summary.signalCoverage.pct, 100);
  assert.equal(summary.signalCoverage.taskMetadataCoveragePct, 100);
  assert.equal(
    new Date(summary.firstBlockStart).toISOString(),
    new Date('2026-03-13T00:00:00').toISOString(),
  );
  assert.equal(
    new Date(summary.lastBlockEnd).toISOString(),
    new Date('2026-03-13T14:00:00').toISOString(),
  );
});
