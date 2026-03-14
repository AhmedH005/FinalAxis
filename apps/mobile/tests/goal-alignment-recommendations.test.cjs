const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGoalAlignmentSnapshot } = require('../.test-dist/src/engines/life-os/goal-alignment/alignment.js');

const {
  buildAtRiskPerformSnapshot,
  buildAtRiskBodyGoalSnapshot,
  buildBalancedGainSnapshot,
  buildBalancedLoseSnapshot,
  buildBalancedMaintainSnapshot,
  buildGainGoal,
  buildLowCoveragePerformSnapshot,
  buildLoseGoal,
  buildMaintainGoal,
  buildPerformGoal,
  buildRecoveryCollapseBodyGoalSnapshot,
  buildRecoveryCollapsePerformSnapshot,
} = require('./goal-alignment-fixtures.cjs');

const BODY_GOAL_CASES = [
  { archetype: 'lose', buildGoal: buildLoseGoal },
  { archetype: 'maintain', buildGoal: buildMaintainGoal },
  { archetype: 'gain', buildGoal: buildGainGoal },
];

test('recommendations prefer removing friction first on strained perform days', () => {
  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal(),
    snapshot: buildRecoveryCollapsePerformSnapshot(),
    observations: [],
  });

  assert.equal(alignment.recommendationCandidates.length <= 3, true);
  assert.equal(alignment.recommendationCandidates[0].priority, 'primary');
  assert.match(alignment.recommendationCandidates[0].code, /protect_sleep_window|hold_goal_intensity/);
});

test('recommendations keep distinct strategic and behavioral guidance when not redundant', () => {
  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal(),
    snapshot: buildAtRiskPerformSnapshot(),
    observations: [],
  });

  const categories = alignment.recommendationCandidates.map((item) => item.category);
  assert.equal(new Set(categories).size, categories.length);
});

test('low-coverage days include a signal-capture recommendation', () => {
  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal(),
    snapshot: buildLowCoveragePerformSnapshot(),
    observations: [],
  });

  assert.ok(alignment.recommendationCandidates.some((item) => item.code === 'capture_more_signals'));
});

for (const goalCase of BODY_GOAL_CASES) {
  test(`${goalCase.archetype} recommendations protect sleep and hold intensity when recovery collapses`, () => {
    const alignment = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal(),
      snapshot: buildRecoveryCollapseBodyGoalSnapshot(goalCase.archetype),
      observations: [],
    });

    const codes = alignment.recommendationCandidates.map((item) => item.code);

    assert.ok(codes.includes('protect_sleep_window'));
    assert.ok(codes.includes('hold_goal_intensity'));
  });

  test(`${goalCase.archetype} recommendations reinforce habits when consistency weakens`, () => {
    const alignment = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal(),
      snapshot: buildAtRiskBodyGoalSnapshot(goalCase.archetype),
      observations: [],
    });

    assert.ok(alignment.recommendationCandidates.some((item) => item.code === 'reinforce_supporting_habits'));
  });
}

test('body-composition goals surface hydration guidance when hydration is the cleanest correction', () => {
  const snapshot = buildBalancedLoseSnapshot();
  snapshot.summaries.body.hydration.total_ml = 500;

  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildLoseGoal(),
    snapshot,
    observations: [],
  });

  assert.ok(alignment.recommendationCandidates.some((item) => item.code === 'prioritize_hydration'));
});

for (const goalCase of BODY_GOAL_CASES) {
  test(`${goalCase.archetype} recommendations surface nutrition guidance when calories are the main blocker`, () => {
    const snapshot = goalCase.archetype === 'lose'
      ? buildBalancedLoseSnapshot()
      : goalCase.archetype === 'maintain'
      ? buildBalancedMaintainSnapshot()
      : buildBalancedGainSnapshot();

    const calories = goalCase.archetype === 'gain' ? 600 : 4800;
    snapshot.summaries.body.nutrition.total_calories = calories;
    snapshot.summaries.body.energy.intake_calories = calories;

    const alignment = buildGoalAlignmentSnapshot({
      date: '2026-03-13',
      goal: goalCase.buildGoal(),
      snapshot,
      observations: [],
    });

    assert.ok(alignment.recommendationCandidates.some((item) => item.code === 'stabilize_nutrition_target'));
  });
}
