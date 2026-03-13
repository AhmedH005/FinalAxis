const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDailyBodySummary,
  buildDailyHydrationSummary,
  buildDailyNutritionSummary,
  buildDailyRecoverySummary,
} = require('../.test-dist/src/engines/body/summary.js');

test('buildDailyBodySummary assembles stable body signals from daily inputs', () => {
  const nutrition = buildDailyNutritionSummary({
    date: '2026-03-13',
    totalCalories: 2104,
    totalProteinG: 180.22,
    totalCarbsG: 195.18,
    totalFatG: 71.11,
    calorieTarget: 2200,
  });
  const hydration = buildDailyHydrationSummary({
    date: '2026-03-13',
    totalMl: 2410,
    targetMl: 2500,
  });

  const summary = buildDailyBodySummary({
    date: '2026-03-13',
    nutrition,
    hydration,
    energy: {
      date: '2026-03-13',
      intake_calories: 2104,
      baseline_expenditure_calories: 1800,
      movement_expenditure_calories: 180,
      workout_expenditure_calories: 300,
      total_expenditure_calories: 2280,
      estimated_balance_calories: -176,
      body_weight_kg: 82,
      steps: 8100,
      note: 'Test fixture',
    },
    recoveryEntry: {
      steps: 8100,
      energy: 4,
      fatigue: 2,
      soreness: 2,
    },
    sleepRecord: {
      duration_minutes: 420,
      quality_rating: 4,
      sleep_score: { value: 76 },
    },
    workouts: [{ id: 'w-1' }, { id: 'w-2' }],
    latestWeightKg: 82,
    sleepTargetMinutes: 480,
  });

  assert.equal(summary.nutrition.total_calories, 2104);
  assert.equal(summary.nutrition.total_protein_g, 180.2);
  assert.equal(summary.hydration.total_ml, 2410);
  assert.equal(summary.recovery.recovery_score, 79);
  assert.equal(summary.sleep_minutes, 420);
  assert.equal(summary.sleep_quality, 76);
  assert.equal(summary.workout_count, 2);
  assert.equal(summary.latest_weight_kg, 82);
});

test('buildDailyRecoverySummary returns null when recovery inputs are absent', () => {
  const recovery = buildDailyRecoverySummary({
    date: '2026-03-13',
    recoveryEntry: null,
    sleepRecord: null,
  });

  assert.equal(recovery, null);
});
