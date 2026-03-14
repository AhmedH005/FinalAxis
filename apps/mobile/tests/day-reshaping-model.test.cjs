const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDayReshapingModel } = require('../.test-dist/src/features/day-reshaping/model.js');

test('day reshaping model is unavailable when there is no safe plan and no applied reshape', () => {
  const model = buildDayReshapingModel(null, null);

  assert.equal(model.isAvailable, false);
  assert.equal(model.status, 'unavailable');
  assert.equal(typeof model.emptyState.title, 'string');
});

test('day reshaping model builds a preview state from a plan', () => {
  const model = buildDayReshapingModel({
    date: '2026-03-13',
    actions: [
      {
        id: 'reduce_load:follow-up',
        type: 'reduce_load',
        title: 'Reduce load before pushing harder',
        detail: 'Trim the lower-leverage internal work first so recovery strain does not spill through the rest of the day.',
        reason: 'Recovery risk and focus load are both high.',
        confidence: 'high',
        priority: 100,
        affectedBlocks: [
          {
            blockId: 'primary:block:follow-up',
            title: 'Inbox cleanup',
            start: '2026-03-13T16:30:00.000Z',
            end: '2026-03-13T17:00:00.000Z',
            taskId: 'task-follow',
            source: 'engine',
            isLocked: false,
          },
        ],
        patches: [
          {
            blockId: 'primary:block:follow-up',
            fromStart: '2026-03-13T16:30:00.000Z',
            fromEnd: '2026-03-13T17:00:00.000Z',
            toStart: '2026-03-14T16:30:00.000Z',
            toEnd: '2026-03-14T17:00:00.000Z',
          },
        ],
      },
    ],
    whyNow: 'Recovery is fragile today.',
    confidence: 'high',
    blockedReasons: [],
    expectedBenefit: ['Lower the total cognitive cost of the day.'],
  }, null);

  assert.equal(model.isAvailable, true);
  assert.equal(model.status, 'preview');
  assert.equal(model.proposedShifts.length, 1);
  assert.match(model.header.whyNow, /Recovery/);
});

test('day reshaping model prefers the applied state when a reshape record exists', () => {
  const model = buildDayReshapingModel(null, {
    id: '2026-03-13:applied',
    date: '2026-03-13',
    appliedAt: '2026-03-13T09:00:00.000Z',
    planWhyNow: 'Recovery is fragile today.',
    confidence: 'medium',
    expectedBenefit: ['Protect the back end of the day so recovery has more room.'],
    actions: [
      {
        id: 'preserve_recovery_window:late-review',
        type: 'preserve_recovery_window',
        title: 'Preserve a cleaner recovery window',
        detail: 'Clear the latest movable block first so the evening has more room to recover.',
        affectedBlockIds: ['primary:block:late-review'],
      },
    ],
    patches: [
      {
        blockId: 'primary:block:late-review',
        fromStart: '2026-03-13T18:30:00.000Z',
        fromEnd: '2026-03-13T19:15:00.000Z',
        toStart: '2026-03-14T18:30:00.000Z',
        toEnd: '2026-03-14T19:15:00.000Z',
      },
    ],
  });

  assert.equal(model.isAvailable, true);
  assert.equal(model.status, 'applied');
  assert.ok(model.notes.some((item) => item.includes('late-day heuristic')));
});
