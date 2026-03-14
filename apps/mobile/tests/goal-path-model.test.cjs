const test = require('node:test');
const assert = require('node:assert/strict');

const { buildGoalAlignmentSnapshot } = require('../.test-dist/src/engines/life-os/goal-alignment/alignment.js');
const { buildGoalPathModel } = require('../.test-dist/src/engines/life-os/goal-alignment/path-model.js');

const {
  buildBalancedPerformSnapshot,
  buildPerformGoal,
  buildRecoveryCollapsePerformSnapshot,
} = require('./goal-alignment-fixtures.cjs');

test('path model stays grounded on aligned days', () => {
  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal(),
    snapshot: buildBalancedPerformSnapshot(),
    observations: [],
  });
  const path = buildGoalPathModel(alignment);

  assert.equal(path.currentPath.band, 'aligned');
  assert.match(path.currentPath.title, /supporting the goal/);
  assert.equal(path.moreAlignedPath.shifts.length <= 2, true);
});

test('path model avoids prophetic language on misaligned days', () => {
  const alignment = buildGoalAlignmentSnapshot({
    date: '2026-03-13',
    goal: buildPerformGoal(),
    snapshot: buildRecoveryCollapsePerformSnapshot(),
    observations: [],
  });
  const path = buildGoalPathModel(alignment);

  assert.equal(path.currentPath.band, 'misaligned');
  assert.doesNotMatch(path.currentPath.summary, /\bwill\b/i);
  assert.doesNotMatch(path.moreAlignedPath.summary, /\bwill\b/i);
});
