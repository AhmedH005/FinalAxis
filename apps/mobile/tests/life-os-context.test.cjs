const test = require('node:test');
const assert = require('node:assert/strict');

const { buildLifeOsContextSnapshot } = require('../.test-dist/src/engines/life-os/context.js');
const {
  buildDailyBodySummary,
  buildDailyHydrationSummary,
  buildDailyNutritionSummary,
} = require('../.test-dist/src/engines/body/summary.js');
const { buildDailyTimeSummary } = require('../.test-dist/src/engines/time/summary.js');

test('buildLifeOsContextSnapshot keeps balanced days structured and low-imbalance', () => {
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

  const snapshot = buildLifeOsContextSnapshot({
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

  assert.equal(snapshot.signalCoverage.pct, 100);
  assert.equal(snapshot.bodyReadinessScore, 82.6);
  assert.equal(snapshot.mindStabilityScore, 86);
  assert.equal(snapshot.recoveryRiskScore, 30.8);
  assert.equal(snapshot.recoveryRiskLevel, 'low');
  assert.equal(snapshot.imbalanceLevel, 'low');
  assert.ok(snapshot.imbalanceScore < 15);
  assert.equal(snapshot.currentState.body.state, 'strong');
  assert.equal(snapshot.currentState.mind.state, 'strong');
  assert.equal(snapshot.goalAlignment.goalType, 'perform');
  assert.equal(snapshot.goalAlignment.hydrationOnTarget, true);
  assert.equal(snapshot.mindPattern.habits.overallAdherencePct, 71);
  assert.equal('mindPattern' in snapshot.summaries, false);
  assert.ok(snapshot.keyStrengths.length >= 2);
});

test('buildLifeOsContextSnapshot surfaces imbalance and recovery risk on strained days', () => {
  const snapshot = buildLifeOsContextSnapshot({
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
        trend: { change: -5, up: false },
        volatility: 3,
        stressAverage: 4.2,
        stressTrend: null,
        energyAverage: 2.8,
        energyTrend: null,
        logCount: 2,
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

  assert.equal(snapshot.bodyReadinessScore, 3);
  assert.equal(snapshot.mindStabilityScore, 0);
  assert.equal(snapshot.recoveryRiskLevel, 'high');
  assert.ok(snapshot.recoveryRiskScore >= 70);
  assert.equal(snapshot.imbalanceLevel, 'high');
  assert.ok(snapshot.imbalanceScore >= 80);
  assert.equal(snapshot.currentState.time.state, 'fragile');
  assert.equal(snapshot.currentState.body.state, 'fragile');
  assert.equal(snapshot.currentState.mind.state, 'fragile');
  assert.ok(snapshot.warnings.some((item) => item.code === 'cross-engine-imbalance'));
  assert.ok(snapshot.warnings.some((item) => item.code === 'recovery-risk-high'));
});
