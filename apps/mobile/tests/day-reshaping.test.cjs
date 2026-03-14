const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGoalAlignmentSnapshot } = require('../.test-dist/src/engines/life-os/goal-alignment/alignment.js');
const { buildLifeOsObservations } = require('../.test-dist/src/engines/life-os/observations.js');
const { buildDayReshapePlan } = require('../.test-dist/src/engines/life-os/day-reshaping/planner.js');

const {
  buildBalancedPerformSnapshot,
  buildLowCoveragePerformSnapshot,
  buildPerformGoal,
  buildRecoveryCollapsePerformSnapshot,
} = require('./goal-alignment-fixtures.cjs');

function buildBlock(args) {
  return {
    id: args.id,
    userId: 'user-1',
    taskId: args.taskId ?? null,
    title: args.title,
    start: args.start,
    end: args.end,
    source: args.source ?? 'engine',
    colour: args.colour ?? 'SKY',
    isLocked: args.isLocked ?? false,
    task: args.task ?? null,
  };
}

test('planner protects an existing focus window when perform pressure and fragmentation collide', () => {
  const snapshot = buildBalancedPerformSnapshot();
  snapshot.summaries.time.fragmentation.score = 82;
  snapshot.summaries.time.fragmentation.level = 'high';
  snapshot.currentState.time.deepWorkMinutes = 120;

  const observations = buildLifeOsObservations(snapshot);
  const goalAlignment = buildGoalAlignmentSnapshot({
    date: snapshot.date,
    goal: buildPerformGoal(),
    snapshot,
    observations,
  });

  const plan = buildDayReshapePlan({
    snapshot,
    observations,
    goalAlignment,
    blocks: [
      buildBlock({
        id: 'focus',
        title: 'Deep build',
        start: '2026-03-13T09:00:00',
        end: '2026-03-13T11:00:00',
        colour: 'VIOLET',
        taskId: 'task-focus',
        task: {
          id: 'task-focus',
          userId: 'user-1',
          title: 'Deep build',
          priority: 'HIGH',
          colour: 'VIOLET',
          createdAt: '2026-03-12T08:00:00',
        },
      }),
      buildBlock({
        id: 'short-1',
        title: 'Quick sync',
        start: '2026-03-13T11:15:00',
        end: '2026-03-13T11:45:00',
      }),
      buildBlock({
        id: 'short-2',
        title: 'Admin tidy-up',
        start: '2026-03-13T14:15:00',
        end: '2026-03-13T14:45:00',
      }),
    ],
  });

  assert.ok(plan.actions.some((item) => item.type === 'protect_focus_window'));
  assert.equal(plan.actions.length <= 3, true);
  assert.equal(
    plan.actions.every((item) => item.patches.length > 0),
    true,
  );
  assert.equal(
    new Set(plan.actions.flatMap((item) => item.patches.map((patch) => patch.blockId))).size,
    plan.actions.flatMap((item) => item.patches).length,
  );
});

test('planner reduces load and preserves recovery when the day is overloaded', () => {
  const snapshot = buildRecoveryCollapsePerformSnapshot();
  snapshot.summaries.time.deepWorkMinutes = 0;
  snapshot.currentState.time.deepWorkMinutes = 0;

  const observations = buildLifeOsObservations(snapshot);
  const goalAlignment = buildGoalAlignmentSnapshot({
    date: snapshot.date,
    goal: buildPerformGoal(),
    snapshot,
    observations,
  });

  const plan = buildDayReshapePlan({
    snapshot,
    observations,
    goalAlignment,
    blocks: [
      buildBlock({
        id: 'late-review',
        title: 'Late review',
        start: '2026-03-13T18:30:00',
        end: '2026-03-13T19:15:00',
        taskId: 'task-late',
        task: {
          id: 'task-late',
          userId: 'user-1',
          title: 'Late review',
          priority: 'HIGH',
          colour: 'SKY',
          createdAt: '2026-03-12T08:00:00',
        },
      }),
      buildBlock({
        id: 'follow-up',
        title: 'Inbox cleanup',
        start: '2026-03-13T16:30:00',
        end: '2026-03-13T17:00:00',
        taskId: 'task-follow',
        task: {
          id: 'task-follow',
          userId: 'user-1',
          title: 'Inbox cleanup',
          priority: 'LOW',
          colour: 'SKY',
          createdAt: '2026-03-12T08:00:00',
        },
      }),
    ],
  });

  assert.ok(plan.actions.some((item) => item.type === 'reduce_load'));
  assert.equal(
    new Set(plan.actions.flatMap((item) => item.patches.map((patch) => patch.blockId))).size,
    plan.actions.flatMap((item) => item.patches).length,
  );
  assert.match(plan.whyNow, /recovery|load/i);
});

test('planner holds back when signal coverage is too low', () => {
  const snapshot = buildLowCoveragePerformSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const goalAlignment = buildGoalAlignmentSnapshot({
    date: snapshot.date,
    goal: buildPerformGoal(),
    snapshot,
    observations,
  });

  const plan = buildDayReshapePlan({
    snapshot,
    observations,
    goalAlignment,
    blocks: [
      buildBlock({
        id: 'locked',
        title: 'External call',
        start: '2026-03-13T10:00:00',
        end: '2026-03-13T10:30:00',
        source: 'external_calendar',
        isLocked: true,
      }),
    ],
  });

  assert.equal(plan.actions.length, 0);
  assert.ok(plan.blockedReasons.some((item) => item.code === 'low_signal_confidence'));
  assert.equal(plan.confidence, 'low');
});
