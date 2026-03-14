const { buildDailyBodySummary, buildDailyHydrationSummary, buildDailyNutritionSummary } = require('../.test-dist/src/engines/body/summary.js');
const { buildLifeOsContextSnapshot } = require('../.test-dist/src/engines/life-os/context.js');
const { adaptUserGoalToDefinition } = require('../.test-dist/src/engines/life-os/goal-alignment/goal-adapter.js');
const { buildDailyTimeSummary } = require('../.test-dist/src/engines/time/summary.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildBalancedPerformSnapshot() {
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
      note: 'Fixture',
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
    reflection: 'Fixture',
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

function buildPerformGoal(overrides = {}) {
  const goal = adaptUserGoalToDefinition({
    id: 'goal-perform',
    user_id: 'user-1',
    goal_type: 'perform',
    daily_calorie_target: 2200,
    daily_water_target_ml: 2500,
    sleep_target_minutes: 480,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-13T00:00:00Z',
  }, overrides);

  return goal;
}

function buildGoal(archetype, overrides = {}) {
  return adaptUserGoalToDefinition({
    id: `goal-${archetype}`,
    user_id: 'user-1',
    goal_type: archetype,
    daily_calorie_target: 2200,
    daily_water_target_ml: 2500,
    sleep_target_minutes: 480,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-13T00:00:00Z',
  }, overrides);
}

function buildBalancedGoalSnapshot(archetype) {
  const snapshot = clone(buildBalancedPerformSnapshot());
  if (snapshot.goalAlignment) {
    snapshot.goalAlignment.goalType = archetype;
  }
  if (archetype === 'gain') {
    snapshot.summaries.body.nutrition.total_calories = 2300;
    snapshot.summaries.body.energy.intake_calories = 2300;
    snapshot.currentState.body.estimatedBalanceCalories = 50;
  }
  return snapshot;
}

function softenMindDomain(snapshot, adherencePct, stabilityScore) {
  snapshot.mindPattern.habits.overallAdherencePct = adherencePct;
  snapshot.mindPattern.habits.stableHabitCount = adherencePct >= 70 ? 1 : 0;
  snapshot.mindPattern.habits.items = snapshot.mindPattern.habits.items.map((item) => ({
    ...item,
    adherencePct,
    completedDays: Math.max(0, Math.round((item.totalDays * adherencePct) / 100)),
  }));
  snapshot.mindStabilityScore = stabilityScore;
  snapshot.currentState.mind.moodVolatility = stabilityScore <= 35 ? 2.8 : 1.6;
  snapshot.currentState.mind.moodTrend = stabilityScore <= 35 ? -1.4 : -0.4;
  snapshot.currentState.mind.moodScore = stabilityScore <= 35 ? 4 : 5;
  snapshot.currentState.mind.state = stabilityScore < 35 ? 'fragile' : 'steady';
  snapshot.summaries.mind.moodScore = snapshot.currentState.mind.moodScore;
  snapshot.summaries.mind.habitsCompleted = adherencePct <= 25 ? 0 : 1;
  snapshot.summaries.mind.habitsTotal = 3;
}

function strainTimeDomain(snapshot, args) {
  snapshot.summaries.time.deepWorkMinutes = args.deepWorkMinutes;
  snapshot.summaries.time.fragmentation.score = args.fragmentationScore;
  snapshot.summaries.time.fragmentation.level = args.fragmentationScore >= 70 ? 'high' : 'moderate';
  snapshot.summaries.time.deadlinePressure.score = args.deadlineScore;
  snapshot.summaries.time.deadlinePressure.level = args.deadlineScore >= 70 ? 'high' : 'medium';
  snapshot.summaries.time.focusLoadScore = args.focusLoadScore;
  snapshot.summaries.time.focusLoadLevel = args.focusLoadScore >= 70 ? 'high' : 'moderate';
  snapshot.currentState.time.deepWorkMinutes = args.deepWorkMinutes;
  snapshot.currentState.time.focusLoadScore = args.focusLoadScore;
  snapshot.currentState.time.focusLoadLevel = snapshot.summaries.time.focusLoadLevel;
  snapshot.currentState.time.deadlinePressure = snapshot.summaries.time.deadlinePressure.level;
  snapshot.currentState.time.state = args.focusLoadScore >= 70 || args.fragmentationScore >= 70 ? 'fragile' : 'steady';
}

function collapseRecovery(snapshot, args) {
  snapshot.summaries.body.sleep_minutes = args.sleepMinutes;
  snapshot.summaries.body.hydration.total_ml = args.hydrationMl;
  snapshot.summaries.body.nutrition.total_calories = args.calories;
  snapshot.summaries.body.energy.intake_calories = args.calories;
  snapshot.recoveryRiskScore = args.recoveryRiskScore;
  snapshot.recoveryRiskLevel = args.recoveryRiskScore >= 70 ? 'high' : 'moderate';
  snapshot.bodyReadinessScore = args.bodyReadinessScore;
  snapshot.currentState.body.sleepMinutes = args.sleepMinutes;
  snapshot.currentState.body.state = args.bodyReadinessScore < 35 ? 'fragile' : 'steady';
  snapshot.currentState.body.recoveryScore = args.recoveryScore;
}

function buildAtRiskPerformSnapshot() {
  const snapshot = clone(buildBalancedPerformSnapshot());
  snapshot.summaries.body.sleep_minutes = 180;
  snapshot.summaries.body.hydration.total_ml = 900;
  snapshot.recoveryRiskScore = 62;
  snapshot.recoveryRiskLevel = 'moderate';
  snapshot.bodyReadinessScore = 44;
  snapshot.currentState.body.sleepMinutes = 180;
  snapshot.currentState.body.state = 'fragile';
  return snapshot;
}

function buildRecoveryCollapsePerformSnapshot() {
  const snapshot = clone(buildBalancedPerformSnapshot());
  snapshot.summaries.body.sleep_minutes = 120;
  snapshot.summaries.body.hydration.total_ml = 400;
  snapshot.summaries.time.deepWorkMinutes = 30;
  snapshot.summaries.time.fragmentation.score = 78;
  snapshot.summaries.time.fragmentation.level = 'high';
  snapshot.summaries.time.deadlinePressure.score = 82;
  snapshot.summaries.time.deadlinePressure.level = 'high';
  snapshot.summaries.time.focusLoadScore = 88;
  snapshot.summaries.time.focusLoadLevel = 'high';
  snapshot.recoveryRiskScore = 88;
  snapshot.recoveryRiskLevel = 'high';
  snapshot.bodyReadinessScore = 18;
  snapshot.currentState.body.sleepMinutes = 120;
  snapshot.currentState.body.state = 'fragile';
  snapshot.currentState.body.recoveryScore = 8;
  snapshot.currentState.time.deepWorkMinutes = 30;
  snapshot.currentState.time.focusLoadScore = 88;
  snapshot.currentState.time.focusLoadLevel = 'high';
  snapshot.currentState.time.deadlinePressure = 'high';
  return snapshot;
}

function buildLowCoveragePerformSnapshot() {
  const snapshot = clone(buildBalancedPerformSnapshot());
  snapshot.summaries.time = null;
  snapshot.signalCoverage.availableDomains = 2;
  snapshot.signalCoverage.pct = 40;
  snapshot.signalCoverage.confidence = 'low';
  snapshot.signalCoverage.missingDomains = ['time'];
  return snapshot;
}

function buildBorderlinePerformSnapshot() {
  const snapshot = clone(buildBalancedPerformSnapshot());
  snapshot.summaries.time.deepWorkMinutes = 70;
  snapshot.summaries.time.fragmentation.score = 42;
  snapshot.summaries.time.deadlinePressure.score = 38;
  snapshot.summaries.time.focusLoadScore = 58;
  snapshot.currentState.time.deepWorkMinutes = 70;
  snapshot.currentState.time.focusLoadScore = 58;
  snapshot.currentState.time.focusLoadLevel = 'moderate';
  snapshot.recoveryRiskScore = 38;
  snapshot.recoveryRiskLevel = 'moderate';
  snapshot.bodyReadinessScore = 65;
  snapshot.currentState.body.state = 'steady';
  snapshot.mindStabilityScore = 72;
  snapshot.currentState.mind.state = 'strong';
  return snapshot;
}

function buildLoseGoal(overrides = {}) {
  return buildGoal('lose', overrides);
}

function buildMaintainGoal(overrides = {}) {
  return buildGoal('maintain', overrides);
}

function buildGainGoal(overrides = {}) {
  return buildGoal('gain', overrides);
}

function buildBalancedLoseSnapshot() {
  return buildBalancedGoalSnapshot('lose');
}

function buildBalancedMaintainSnapshot() {
  return buildBalancedGoalSnapshot('maintain');
}

function buildBalancedGainSnapshot() {
  return buildBalancedGoalSnapshot('gain');
}

function buildAtRiskBodyGoalSnapshot(archetype) {
  const snapshot = buildBalancedGoalSnapshot(archetype);
  softenMindDomain(snapshot, 20, 20);
  return snapshot;
}

function buildRecoveryCollapseBodyGoalSnapshot(archetype) {
  const snapshot = buildBalancedGoalSnapshot(archetype);
  collapseRecovery(snapshot, {
    sleepMinutes: 120,
    hydrationMl: 400,
    calories: archetype === 'gain' ? 1200 : 3600,
    recoveryRiskScore: 88,
    bodyReadinessScore: 18,
    recoveryScore: 8,
  });
  strainTimeDomain(snapshot, {
    deepWorkMinutes: 30,
    fragmentationScore: 78,
    deadlineScore: 82,
    focusLoadScore: 88,
  });
  return snapshot;
}

function buildLowCoverageBodyGoalSnapshot(archetype) {
  const snapshot = buildBalancedGoalSnapshot(archetype);
  snapshot.summaries.time = null;
  snapshot.signalCoverage.availableDomains = 2;
  snapshot.signalCoverage.pct = 40;
  snapshot.signalCoverage.confidence = 'low';
  snapshot.signalCoverage.missingDomains = ['time'];
  return snapshot;
}

function buildConflictingBodyGoalSnapshot(archetype) {
  const snapshot = buildBalancedGoalSnapshot(archetype);
  strainTimeDomain(snapshot, {
    deepWorkMinutes: 45,
    fragmentationScore: 82,
    deadlineScore: archetype === 'gain' ? 72 : 65,
    focusLoadScore: 84,
  });
  return snapshot;
}

function buildBorderlineBodyGoalSnapshot(archetype) {
  const snapshot = buildBalancedGoalSnapshot(archetype);
  softenMindDomain(snapshot, 45, 45);
  return snapshot;
}

module.exports = {
  buildBalancedPerformSnapshot,
  buildPerformGoal,
  buildAtRiskPerformSnapshot,
  buildRecoveryCollapsePerformSnapshot,
  buildLowCoveragePerformSnapshot,
  buildBorderlinePerformSnapshot,
  buildGoal,
  buildLoseGoal,
  buildMaintainGoal,
  buildGainGoal,
  buildBalancedLoseSnapshot,
  buildBalancedMaintainSnapshot,
  buildBalancedGainSnapshot,
  buildAtRiskBodyGoalSnapshot,
  buildRecoveryCollapseBodyGoalSnapshot,
  buildLowCoverageBodyGoalSnapshot,
  buildConflictingBodyGoalSnapshot,
  buildBorderlineBodyGoalSnapshot,
};
