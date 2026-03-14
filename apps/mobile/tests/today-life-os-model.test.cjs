const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGoalAlignmentSnapshot } = require('../.test-dist/src/engines/life-os/goal-alignment/alignment.js');
const { buildGoalPathModel } = require('../.test-dist/src/engines/life-os/goal-alignment/path-model.js');
const { buildDayReshapePlan } = require('../.test-dist/src/engines/life-os/day-reshaping/planner.js');
const { buildLifeOsObservations } = require('../.test-dist/src/engines/life-os/observations.js');
const { buildLifeOsWeeklyReflectionModel } = require('../.test-dist/src/engines/life-os/weekly/reflection-model.js');
const { buildLifeOsWeeklySummary } = require('../.test-dist/src/engines/life-os/weekly/summary.js');
const { buildTodayLifeOsModel } = require('../.test-dist/src/features/today/life-os-model.js');
const { appRoutes } = require('../.test-dist/src/types/navigation.js');

const {
  buildBalancedLoseSnapshot,
  buildBalancedPerformSnapshot,
  buildLoseGoal,
  buildLowCoveragePerformSnapshot,
  buildPerformGoal,
  buildRecoveryCollapsePerformSnapshot,
} = require('./goal-alignment-fixtures.cjs');
const {
  buildImprovingPerformWeek,
  buildLowConfidenceMixedWeek,
} = require('./weekly-reflection-fixtures.cjs');

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

test('Today model keeps goal alignment hidden when no active goal exists', () => {
  const snapshot = buildBalancedPerformSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const model = buildTodayLifeOsModel(snapshot, observations);

  assert.equal(model.goalAlignment.isVisible, false);
  assert.equal(typeof model.currentState.primaryRead, 'string');
});

test('Today model exposes a compact goal-alignment section for an active perform goal', () => {
  const snapshot = buildBalancedPerformSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const alignment = buildGoalAlignmentSnapshot({
    date: snapshot.date,
    goal: buildPerformGoal(),
    snapshot,
    observations,
  });
  const path = buildGoalPathModel(alignment);
  const model = buildTodayLifeOsModel(snapshot, observations, {
    alignment,
    path,
  });

  assert.equal(model.goalAlignment.isVisible, true);
  assert.equal(model.goalAlignment.detailRoute, appRoutes.goalAlignment);
  assert.equal(model.goalAlignment.goalLabel, path.goalLabel);
  assert.equal(model.goalAlignment.topRecommendationCodes[0], alignment.recommendationCandidates[0]?.code ?? null);
});

test('Today model uses the same compact goal-alignment section for body-composition goals', () => {
  const snapshot = buildBalancedLoseSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const alignment = buildGoalAlignmentSnapshot({
    date: snapshot.date,
    goal: buildLoseGoal(),
    snapshot,
    observations,
  });
  const path = buildGoalPathModel(alignment);
  const model = buildTodayLifeOsModel(snapshot, observations, {
    alignment,
    path,
  });

  assert.equal(model.goalAlignment.isVisible, true);
  assert.equal(model.goalAlignment.detailRoute, appRoutes.goalAlignment);
  assert.equal(model.goalAlignment.band, alignment.alignmentBand);
  assert.equal(model.goalAlignment.goalLabel, path.goalLabel);
  assert.equal(typeof model.goalAlignment.currentPathSummary, 'string');
  assert.ok(Array.isArray(model.goalAlignment.shifts));
});

test('Today model hides goal alignment when confidence is too low', () => {
  const snapshot = buildLowCoveragePerformSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const alignment = buildGoalAlignmentSnapshot({
    date: snapshot.date,
    goal: buildPerformGoal(),
    snapshot,
    observations,
  });
  const path = buildGoalPathModel(alignment);
  const model = buildTodayLifeOsModel(snapshot, observations, {
    alignment,
    path,
  });

  assert.equal(model.goalAlignment.isVisible, false);
  assert.equal(model.goalAlignment.detailRoute, null);
});

test('Today model keeps the reshape entry hidden when no safe plan exists', () => {
  const snapshot = buildBalancedPerformSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const model = buildTodayLifeOsModel(snapshot, observations);

  assert.equal(model.dayReshaping.isVisible, false);
  assert.equal(model.dayReshaping.detailRoute, null);
});

test('Today model exposes a compact reshape entry when a plan is available', () => {
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
        start: '2026-03-13T18:30:00.000Z',
        end: '2026-03-13T19:15:00.000Z',
        taskId: 'task-late',
        task: {
          id: 'task-late',
          userId: 'user-1',
          title: 'Late review',
          priority: 'HIGH',
          colour: 'SKY',
          createdAt: '2026-03-12T08:00:00.000Z',
        },
      }),
      buildBlock({
        id: 'follow-up',
        title: 'Inbox cleanup',
        start: '2026-03-13T16:30:00.000Z',
        end: '2026-03-13T17:00:00.000Z',
        taskId: 'task-follow',
        task: {
          id: 'task-follow',
          userId: 'user-1',
          title: 'Inbox cleanup',
          priority: 'LOW',
          colour: 'SKY',
          createdAt: '2026-03-12T08:00:00.000Z',
        },
      }),
    ],
  });

  const model = buildTodayLifeOsModel(snapshot, observations, undefined, {
    plan,
    appliedRecord: null,
  });

  assert.equal(model.dayReshaping.isVisible, true);
  assert.equal(model.dayReshaping.detailRoute, appRoutes.dayReshaping);
  assert.equal(model.dayReshaping.status, 'available');
  assert.equal('actions' in model.dayReshaping, false);
});

test('Today model suppresses low-confidence reshape previews', () => {
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
        start: '2026-03-13T10:00:00.000Z',
        end: '2026-03-13T10:30:00.000Z',
        source: 'external_calendar',
        isLocked: true,
      }),
    ],
  });
  const model = buildTodayLifeOsModel(snapshot, observations, undefined, {
    plan,
    appliedRecord: null,
  });

  assert.equal(model.dayReshaping.isVisible, false);
});

test('Today model exposes a compact weekly reflection teaser when the weekly read is strong enough', () => {
  const snapshot = buildBalancedPerformSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const weeklyReflection = buildLifeOsWeeklyReflectionModel(
    buildLifeOsWeeklySummary({
      date: snapshot.date,
      records: buildImprovingPerformWeek(),
      totalDays: 7,
    }),
  );
  const model = buildTodayLifeOsModel(snapshot, observations, undefined, undefined, {
    reflection: weeklyReflection,
  });

  assert.equal(model.weeklyReflection.isVisible, true);
  assert.equal(model.weeklyReflection.detailRoute, appRoutes.weeklyReflection);
});

test('Today model keeps the weekly teaser hidden when the weekly read is low confidence', () => {
  const snapshot = buildBalancedPerformSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const weeklyReflection = buildLifeOsWeeklyReflectionModel(
    buildLifeOsWeeklySummary({
      date: snapshot.date,
      records: buildLowConfidenceMixedWeek(),
      totalDays: 7,
    }),
  );
  const model = buildTodayLifeOsModel(snapshot, observations, undefined, undefined, {
    reflection: weeklyReflection,
  });

  assert.equal(model.weeklyReflection.isVisible, false);
});

test('Goal alignment does not override critical Life OS corrections on strained days', () => {
  const snapshot = buildRecoveryCollapsePerformSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const withoutGoal = buildTodayLifeOsModel(snapshot, observations);
  const alignment = buildGoalAlignmentSnapshot({
    date: snapshot.date,
    goal: buildPerformGoal(),
    snapshot,
    observations,
  });
  const path = buildGoalPathModel(alignment);
  const withGoal = buildTodayLifeOsModel(snapshot, observations, {
    alignment,
    path,
  });

  assert.equal(withGoal.primaryInsight?.code, withoutGoal.primaryInsight?.code);
  assert.equal(withGoal.courseCorrections.primaryAction?.sourceObservationIds.length > 0, true);
});
