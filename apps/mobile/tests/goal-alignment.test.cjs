const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGoalAlignmentSnapshot } = require('../.test-dist/src/engines/life-os/goal-alignment/alignment.js');

const {
  buildAtRiskPerformSnapshot,
  buildAtRiskBodyGoalSnapshot,
  buildBalancedPerformSnapshot,
  buildBalancedGainSnapshot,
  buildBalancedLoseSnapshot,
  buildBalancedMaintainSnapshot,
  buildBorderlinePerformSnapshot,
  buildBorderlineBodyGoalSnapshot,
  buildConflictingBodyGoalSnapshot,
  buildGainGoal,
  buildLowCoveragePerformSnapshot,
  buildLowCoverageBodyGoalSnapshot,
  buildLoseGoal,
  buildMaintainGoal,
  buildPerformGoal,
  buildRecoveryCollapseBodyGoalSnapshot,
  buildRecoveryCollapsePerformSnapshot,
} = require('./goal-alignment-fixtures.cjs');

const BODY_GOAL_CASES = [
  {
    archetype: 'lose',
    buildGoal: buildLoseGoal,
    buildBalancedSnapshot: buildBalancedLoseSnapshot,
  },
  {
    archetype: 'maintain',
    buildGoal: buildMaintainGoal,
    buildBalancedSnapshot: buildBalancedMaintainSnapshot,
  },
  {
    archetype: 'gain',
    buildGoal: buildGainGoal,
    buildBalancedSnapshot: buildBalancedGainSnapshot,
  },
];

test('perform goal aligns on a balanced day', () => {
  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal(),
    snapshot: buildBalancedPerformSnapshot(),
    observations: [],
  });

  assert.equal(alignment.alignmentBand, 'aligned');
  assert.equal(alignment.confidence, 'medium');
  assert.equal(alignment.domainAssessments[0].domain, 'time');
  assert.ok(alignment.supports.some((item) => item.code === 'deepWorkTargetScore'));
});

test('perform goal becomes at risk when one domain weakens', () => {
  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal(),
    snapshot: buildAtRiskPerformSnapshot(),
    observations: [],
  });

  assert.equal(alignment.alignmentBand, 'at_risk');
  assert.ok(alignment.blockers.some((item) => item.code === 'recoverySupportScore'));
});

test('perform goal misaligns when recovery collapses', () => {
  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal(),
    snapshot: buildRecoveryCollapsePerformSnapshot(),
    observations: [],
  });

  assert.equal(alignment.alignmentBand, 'misaligned');
  assert.ok(alignment.blockers.some((item) => item.code === 'recoverySupportScore'));
});

test('perform goal stays unclear when coverage is too low', () => {
  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal(),
    snapshot: buildLowCoveragePerformSnapshot(),
    observations: [],
  });

  assert.equal(alignment.alignmentBand, 'unclear');
  assert.equal(alignment.confidence, 'low');
});

test('missing calorie targets lower confidence for body-composition goals', () => {
  const goal = buildPerformGoal({
    title: 'Support body composition growth',
  });
  goal.archetype = 'gain';
  goal.object = 'body_composition';
  goal.targets.dailyCalorieTarget = null;
  goal.assumptions.inferredTargets = goal.assumptions.inferredTargets.filter((code) => code !== 'dailyCalorieTarget');

  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal,
    snapshot: buildBalancedPerformSnapshot(),
    observations: [],
  });

  const body = alignment.domainAssessments.find((item) => item.domain === 'body');
  assert.equal(body?.confidence, 'medium');
  assert.equal(body?.primarySignals.find((item) => item.code === 'calorieTargetScore')?.missingReason, 'target_missing');
});

test('strictness changes thresholds without changing raw snapshot inputs', () => {
  const light = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal({ strictness: 'light' }),
    snapshot: buildBorderlinePerformSnapshot(),
    observations: [],
  });
  const aggressive = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal({ strictness: 'aggressive' }),
    snapshot: buildBorderlinePerformSnapshot(),
    observations: [],
  });

  assert.equal(light.alignmentScore, aggressive.alignmentScore);
  assert.notEqual(light.alignmentBand, aggressive.alignmentBand);
});

for (const goalCase of BODY_GOAL_CASES) {
  test(`${goalCase.archetype} goal aligns on a balanced day`, () => {
    const alignment = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal(),
      snapshot: goalCase.buildBalancedSnapshot(),
      observations: [],
    });

    const bodyAssessment = alignment.domainAssessments.find((item) => item.domain === 'body');

    assert.equal(alignment.alignmentBand, 'aligned');
    assert.ok(bodyAssessment?.score !== null);
    assert.ok(alignment.supports.some((item) => item.code === 'calorieTargetScore'));
  });

  test(`${goalCase.archetype} goal becomes at risk when one supporting domain weakens`, () => {
    const alignment = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal(),
      snapshot: buildAtRiskBodyGoalSnapshot(goalCase.archetype),
      observations: [],
    });

    assert.equal(alignment.alignmentBand, 'at_risk');
    assert.ok(alignment.blockers.some((item) => item.code === 'habitAdherenceScore'));
    assert.ok(alignment.supports.some((item) => item.code === 'calorieTargetScore'));
  });

  test(`${goalCase.archetype} goal misaligns when recovery collapses`, () => {
    const alignment = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal(),
      snapshot: buildRecoveryCollapseBodyGoalSnapshot(goalCase.archetype),
      observations: [],
    });
    const bodyAssessment = alignment.domainAssessments.find((item) => item.domain === 'body');
    const calorieSignal = bodyAssessment?.primarySignals.find((item) => item.code === 'calorieTargetScore');

    assert.equal(alignment.alignmentBand, 'misaligned');
    assert.ok(alignment.blockers.some((item) => item.code === 'recoverySupportScore'));
    assert.ok((calorieSignal?.score ?? 100) < 60);
  });

  test(`${goalCase.archetype} goal stays unclear when coverage is too low`, () => {
    const alignment = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal(),
      snapshot: buildLowCoverageBodyGoalSnapshot(goalCase.archetype),
      observations: [],
    });

    assert.equal(alignment.alignmentBand, 'unclear');
    assert.equal(alignment.confidence, 'low');
  });

  test(`${goalCase.archetype} goal keeps mixed support and blocker signals visible`, () => {
    const alignment = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal(),
      snapshot: buildConflictingBodyGoalSnapshot(goalCase.archetype),
      observations: [],
    });

    assert.notEqual(alignment.alignmentBand, 'aligned');
    assert.ok(alignment.supports.some((item) => item.code === 'calorieTargetScore'));
    assert.ok(
      alignment.blockers.some((item) =>
        item.code === 'focusCapacityScore' || item.code === 'fragmentationSupportScore',
      ),
    );
  });

  test(`missing calorie targets lower confidence for ${goalCase.archetype} goals`, () => {
    const goal = goalCase.buildGoal();
    goal.targets.dailyCalorieTarget = null;
    goal.assumptions.inferredTargets = goal.assumptions.inferredTargets.filter(
      (code) => code !== 'dailyCalorieTarget',
    );

    const alignment = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal,
      snapshot: goalCase.buildBalancedSnapshot(),
      observations: [],
    });

    const body = alignment.domainAssessments.find((item) => item.domain === 'body');
    const calorieSignal = body?.primarySignals.find((item) => item.code === 'calorieTargetScore');

    assert.equal(body?.confidence, 'medium');
    assert.equal(calorieSignal?.missingReason, 'target_missing');
  });

  test(`strictness changes thresholds for ${goalCase.archetype} without changing the raw score`, () => {
    const snapshot = buildBorderlineBodyGoalSnapshot(goalCase.archetype);
    if (goalCase.archetype === 'gain') {
      snapshot.summaries.body.hydration.total_ml = 1800;
    }

    const light = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal({ strictness: 'light' }),
      snapshot,
      observations: [],
    });
    const aggressive = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal({ strictness: 'aggressive' }),
      snapshot,
      observations: [],
    });

    assert.equal(light.alignmentScore, aggressive.alignmentScore);
    assert.notEqual(light.alignmentBand, aggressive.alignmentBand);
  });
}
