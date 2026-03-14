const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGoalAlignmentSnapshot } = require('../.test-dist/src/engines/life-os/goal-alignment/alignment.js');
const { buildGoalPathModel } = require('../.test-dist/src/engines/life-os/goal-alignment/path-model.js');
const { buildGoalAlignmentDetailModel } = require('../.test-dist/src/features/goal-alignment/detail-model.js');

const {
  buildAtRiskPerformSnapshot,
  buildBalancedGainSnapshot,
  buildBalancedLoseSnapshot,
  buildBalancedMaintainSnapshot,
  buildBalancedPerformSnapshot,
  buildGainGoal,
  buildLowCoveragePerformSnapshot,
  buildLoseGoal,
  buildMaintainGoal,
  buildPerformGoal,
  buildRecoveryCollapseBodyGoalSnapshot,
} = require('./goal-alignment-fixtures.cjs');

function buildModel(goal, snapshot) {
  const alignment = buildGoalAlignmentSnapshot({
    date: snapshot.date,
    goal,
    snapshot,
    observations: [],
  });
  const path = buildGoalPathModel(alignment);

  return {
    alignment,
    model: buildGoalAlignmentDetailModel(alignment, path),
  };
}

test('detail model explains an aligned perform day without dumping raw engine state', () => {
  const { model } = buildModel(buildPerformGoal(), buildBalancedPerformSnapshot());

  assert.equal(model.isAvailable, true);
  assert.equal(model.band, 'aligned');
  assert.equal(typeof model.headerSummary, 'string');
  assert.equal(model.currentPath.title, 'Current path is supporting the goal');
  assert.equal(model.supports.length > 0, true);
  assert.equal(model.recommendedShifts.length <= 2, true);
});

test('detail model surfaces blockers and shifts on at-risk days', () => {
  const { model } = buildModel(buildPerformGoal(), buildAtRiskPerformSnapshot());

  assert.equal(model.band, 'at_risk');
  assert.equal(model.blockers.length > 0, true);
  assert.equal(model.recommendedShifts.length > 0, true);
  assert.equal(model.moreAlignedPath.title, 'What would move today closer to the goal');
});

test('detail model keeps misaligned days grounded and calm', () => {
  const { model } = buildModel(buildLoseGoal(), buildRecoveryCollapseBodyGoalSnapshot('lose'));

  assert.equal(model.band, 'misaligned');
  assert.match(model.headerSummary, /leaning away from the goal/i);
  assert.equal(model.blockers.length > 0, true);
});

test('detail model shows an evidence note when confidence is low', () => {
  const { model } = buildModel(buildPerformGoal(), buildLowCoveragePerformSnapshot());

  assert.equal(model.isAvailable, true);
  assert.equal(model.confidence, 'low');
  assert.equal(model.band, 'unclear');
  assert.match(model.evidenceNote, /cautious|missing/i);
});

for (const goalCase of [
  {
    archetype: 'perform',
    goal: buildPerformGoal(),
    snapshot: buildBalancedPerformSnapshot(),
  },
  {
    archetype: 'lose',
    goal: buildLoseGoal(),
    snapshot: buildBalancedLoseSnapshot(),
  },
  {
    archetype: 'maintain',
    goal: buildMaintainGoal(),
    snapshot: buildBalancedMaintainSnapshot(),
  },
  {
    archetype: 'gain',
    goal: buildGainGoal(),
    snapshot: buildBalancedGainSnapshot(),
  },
]) {
  test(`detail model stays generic for ${goalCase.archetype} goals`, () => {
    const { model } = buildModel(goalCase.goal, goalCase.snapshot);

    assert.equal(model.isAvailable, true);
    assert.equal(typeof model.goalLabel, 'string');
    assert.equal(Array.isArray(model.blockers), true);
    assert.equal(Array.isArray(model.supports), true);
    assert.equal(Array.isArray(model.recommendedShifts), true);
  });
}
