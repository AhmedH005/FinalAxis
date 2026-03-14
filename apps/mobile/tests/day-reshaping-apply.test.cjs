const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyDayReshapePatchesToBlocks,
  reverseDayReshapePatch,
  validateDayReshapePlanForApply,
} = require('../.test-dist/src/engines/time/reshaping/apply-plan.js');

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

test('apply validation blocks reshape plans that touch locked blocks', () => {
  const plan = {
    date: '2026-03-13',
    actions: [
      {
        id: 'reduce_load:late-review',
        type: 'reduce_load',
        title: 'Reduce load before pushing harder',
        detail: 'Trim the lower-leverage internal work first.',
        reason: 'Recovery risk and focus load are both high.',
        confidence: 'high',
        priority: 100,
        affectedBlocks: [
          {
            blockId: 'primary:block:late-review',
            title: 'Late review',
            start: '2026-03-13T18:30:00.000Z',
            end: '2026-03-13T19:15:00.000Z',
            taskId: 'task-late',
            source: 'engine',
            isLocked: true,
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
      },
    ],
    whyNow: 'Recovery is fragile today.',
    confidence: 'high',
    blockedReasons: [],
    expectedBenefit: ['Lower the total cognitive cost of the day.'],
  };

  const result = validateDayReshapePlanForApply({
    plan,
    blocks: [
      buildBlock({
        id: 'primary:block:late-review',
        title: 'Late review',
        start: '2026-03-13T18:30:00.000Z',
        end: '2026-03-13T19:15:00.000Z',
        isLocked: true,
      }),
    ],
  });

  assert.equal(result.isValid, false);
  assert.ok(result.issues.some((item) => item.code === 'block_not_movable'));
});

test('undo patch application restores the original block timing', () => {
  const blocks = [
    buildBlock({
      id: 'primary:block:follow-up',
      title: 'Inbox cleanup',
      start: '2026-03-13T16:30:00.000Z',
      end: '2026-03-13T17:00:00.000Z',
    }),
  ];
  const patches = [
    {
      blockId: 'primary:block:follow-up',
      fromStart: '2026-03-13T16:30:00.000Z',
      fromEnd: '2026-03-13T17:00:00.000Z',
      toStart: '2026-03-14T16:30:00.000Z',
      toEnd: '2026-03-14T17:00:00.000Z',
    },
  ];

  const applied = applyDayReshapePatchesToBlocks(blocks, patches);
  const restored = applyDayReshapePatchesToBlocks(
    applied,
    patches.slice().reverse().map(reverseDayReshapePatch),
  );

  assert.equal(applied[0].start, '2026-03-14T16:30:00.000Z');
  assert.equal(restored[0].start, blocks[0].start);
  assert.equal(restored[0].end, blocks[0].end);
});
