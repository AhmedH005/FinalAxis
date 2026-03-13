const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDailyBodySummary, buildDailyHydrationSummary, buildDailyNutritionSummary } = require('../.test-dist/src/engines/body/summary.js');
const { buildLifeOsContextSnapshot } = require('../.test-dist/src/engines/life-os/context.js');
const { buildLifeOsObservations } = require('../.test-dist/src/engines/life-os/observations.js');
const { buildDailyTimeSummary } = require('../.test-dist/src/engines/time/summary.js');

function buildBalancedSnapshot() {
  const time = buildDailyTimeSummary({
    date: '2026-03-13',
    blocks: [
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
  const body = buildDailyBodySummary({
    date: '2026-03-13',
    nutrition: buildDailyNutritionSummary({
      date: '2026-03-13',
      totalCalories: 2100,
      totalProteinG: 175,
      totalCarbsG: 200,
      totalFatG: 70,
      calorieTarget: 2200,
    }),
    hydration: buildDailyHydrationSummary({
      date: '2026-03-13',
      totalMl: 2400,
      targetMl: 2500,
    }),
    energy: {
      date: '2026-03-13',
      intake_calories: 2100,
      baseline_expenditure_calories: 1800,
      movement_expenditure_calories: 150,
      workout_expenditure_calories: 300,
      total_expenditure_calories: 2250,
      estimated_balance_calories: -150,
      body_weight_kg: 82,
      steps: 7600,
      note: 'Test fixture',
    },
    recoveryEntry: {
      steps: 7600,
      energy: 4,
      fatigue: 2,
      soreness: 2,
    },
    sleepRecord: {
      duration_minutes: 420,
      quality_rating: 4,
      sleep_score: { value: 76 },
    },
    workouts: [{ id: 'w-1' }],
    latestWeightKg: 82,
    sleepTargetMinutes: 480,
  });
  const mind = {
    date: '2026-03-13',
    hasJournalEntry: true,
    moodScore: 7,
    habitsCompleted: 2,
    habitsTotal: 3,
    wordCount: 180,
  };
  const mindPattern = {
    days: ['2026-03-07', '2026-03-08'],
    priorDays: ['2026-02-28', '2026-03-01'],
    mood: {
      points: [],
      average: 7.1,
      priorAverage: 6.8,
      trend: { change: 0.3, up: true },
      volatility: 0.6,
      stressAverage: 2.3,
      stressTrend: null,
      energyAverage: 6.8,
      energyTrend: null,
      logCount: 5,
    },
    habits: {
      items: [{ habit: { id: 'h-1', name: 'Read' }, completedDays: 5, totalDays: 7, adherencePct: 71 }],
      overallAdherencePct: 71,
      priorOverallAdherencePct: 65,
      adherenceTrend: { change: 6, up: true },
      stableHabitCount: 1,
    },
    journal: {
      totalWords: 900,
      entryCount: 5,
      activeDays: 5,
      averageWordsOnWritingDays: 180,
      frequencyTrend: { change: 1, up: true },
      depthTrend: { change: 15, up: true },
      wroteByDay: {},
    },
    reflection: 'Test fixture',
  };

  return buildLifeOsContextSnapshot({
    date: '2026-03-13',
    time,
    body,
    mind,
    mindPattern,
    goals: {
      goal_type: 'perform',
      daily_calorie_target: 2200,
      daily_water_target_ml: 2500,
      sleep_target_minutes: 480,
    },
  });
}

function buildStrainedSnapshot() {
  return buildLifeOsContextSnapshot({
    date: '2026-03-13',
    time: {
      date: '2026-03-13',
      blockCount: 6,
      plannedMinutes: 540,
      busyMinutes: 510,
      taskMinutes: 420,
      deepWorkMinutes: 240,
      externalCalendarMinutes: 120,
      externalCalendarRatio: 0.24,
      lockedMinutes: 180,
      unlockedMinutes: 330,
      lockedToEngineRatio: 0.35,
      firstBlockStart: '2026-03-13T07:00:00.000Z',
      lastBlockEnd: '2026-03-13T19:30:00.000Z',
      focusLoadScore: 100,
      focusLoadLevel: 'high',
      deadlinePressure: {
        level: 'high',
        score: 90,
        scheduledTaskCount: 5,
        overdueScheduledTaskCount: 2,
        dueTodayTaskCount: 2,
        dueSoonTaskCount: 1,
        limitedToScheduledTasks: true,
      },
      fragmentation: {
        level: 'high',
        score: 82,
        blockCount: 6,
        shortBlockCount: 3,
        focusBlockCount: 1,
        averageBlockMinutes: 90,
        largestFocusWindowMinutes: 55,
      },
      overdueBacklog: { available: false, reason: 'task_feed_unavailable' },
      carryover: { available: false, reason: 'history_unavailable' },
      signalCoverage: {
        confidence: 'low',
        availableSignals: 1,
        totalSignals: 4,
        pct: 20,
        taskMetadataCoveragePct: 25,
        blockers: ['task_feed_unavailable', 'history_unavailable', 'settings_unavailable'],
      },
    },
    body: {
      date: '2026-03-13',
      nutrition: {
        date: '2026-03-13',
        total_calories: 0,
        total_protein_g: 0,
        total_carbs_g: 0,
        total_fat_g: 0,
        calorie_target: 2200,
      },
      hydration: {
        date: '2026-03-13',
        total_ml: 0,
        target_ml: 2500,
      },
      recovery: {
        date: '2026-03-13',
        steps: null,
        energy: 1,
        fatigue: 5,
        soreness: 5,
        recovery_score: 5,
      },
      energy: {
        date: '2026-03-13',
        intake_calories: 0,
        baseline_expenditure_calories: 1800,
        movement_expenditure_calories: null,
        workout_expenditure_calories: 500,
        total_expenditure_calories: 2300,
        estimated_balance_calories: -2300,
        body_weight_kg: 82,
        steps: null,
        note: 'Test fixture',
      },
      sleep_minutes: 0,
      sleep_quality: null,
      workout_count: 0,
      latest_weight_kg: 82,
    },
    mind: {
      date: '2026-03-13',
      hasJournalEntry: false,
      moodScore: null,
      habitsCompleted: 0,
      habitsTotal: 0,
      wordCount: 0,
    },
    mindPattern: {
      days: [],
      priorDays: [],
      mood: {
        points: [],
        average: 3.2,
        priorAverage: 5.5,
        trend: { change: -2.5, up: false },
        volatility: 3,
        stressAverage: 4.2,
        stressTrend: null,
        energyAverage: 2.8,
        energyTrend: null,
        logCount: 4,
      },
      habits: {
        items: [],
        overallAdherencePct: null,
        priorOverallAdherencePct: null,
        adherenceTrend: null,
        stableHabitCount: 0,
      },
      journal: {
        totalWords: 0,
        entryCount: 0,
        activeDays: 0,
        averageWordsOnWritingDays: null,
        frequencyTrend: null,
        depthTrend: null,
        wroteByDay: {},
      },
      reflection: 'Test fixture',
    },
    goals: {
      goal_type: 'perform',
      daily_calorie_target: 2200,
      daily_water_target_ml: 2500,
      sleep_target_minutes: 480,
    },
  });
}

test('buildLifeOsObservations emits positive, deterministic observations on supportive days', () => {
  const snapshot = buildBalancedSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const byCode = Object.fromEntries(observations.map((observation) => [observation.code, observation]));

  assert.ok(byCode.focused_work_protected);
  assert.ok(byCode.recovery_foundation_supportive);
  assert.ok(byCode.habits_support_goal);
  assert.ok(byCode.positive_cross_engine_momentum);
  assert.equal(byCode.habits_support_goal.id, 'habits_support_goal:2026-03-13:recent_7d');
  assert.equal(byCode.habits_support_goal.stance, 'positive');
  assert.deepEqual(byCode.habits_support_goal.sourceDomains, ['mind']);
  assert.equal(byCode.focused_work_protected.stance, 'positive');
  assert.equal(byCode.positive_cross_engine_momentum.confidence, 'high');
});

test('buildLifeOsObservations emits negative collision warnings on strained low-signal days', () => {
  const snapshot = buildStrainedSnapshot();
  const observations = buildLifeOsObservations(snapshot);
  const byCode = Object.fromEntries(observations.map((observation) => [observation.code, observation]));

  assert.ok(byCode.low_signal_coverage);
  assert.ok(byCode.cross_engine_imbalance);
  assert.ok(byCode.high_focus_load_low_recovery);
  assert.ok(byCode.deadline_pressure_recovery_collision);
  assert.ok(byCode.workload_rising_mind_stability_falling);
  assert.ok(byCode.sleep_and_hydration_below_target);
  assert.equal(byCode.low_signal_coverage.id, 'low_signal_coverage:2026-03-13:today');
  assert.equal(byCode.low_signal_coverage.confidence, 'high');
  assert.equal(byCode.cross_engine_imbalance.stance, 'negative');
  assert.equal(byCode.cross_engine_imbalance.severity, 'high');
  assert.equal(byCode.high_focus_load_low_recovery.confidence, 'low');
  assert.equal(byCode.deadline_pressure_recovery_collision.severity, 'high');
  assert.equal(byCode.workload_rising_mind_stability_falling.severity, 'high');
});
