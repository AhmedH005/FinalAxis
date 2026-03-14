import type { UserGoal } from '@/lib/supabase/database.types';
import { STRICTNESS_PROFILE } from './score-helpers';
import type {
  GoalArchetype,
  GoalDefinition,
  GoalHorizon,
  GoalObject,
  GoalPriority,
  GoalStrictness,
} from './types';

export interface GoalDefinitionAdapterOptions {
  strictness?: GoalStrictness;
  priority?: GoalPriority;
  horizon?: GoalHorizon;
  title?: string;
  supportingHabitIds?: string[];
}

function goalObjectForArchetype(archetype: GoalArchetype): GoalObject {
  return archetype === 'perform' ? 'cognitive_output' : 'body_composition';
}

function defaultTitleForArchetype(archetype: GoalArchetype) {
  switch (archetype) {
    case 'lose':
      return 'Reduce body composition strain';
    case 'gain':
      return 'Support body composition growth';
    case 'perform':
      return 'Improve cognitive output';
    default:
      return 'Maintain a stable baseline';
  }
}

export function adaptUserGoalToDefinition(
  row: UserGoal | null | undefined,
  options: GoalDefinitionAdapterOptions = {},
): GoalDefinition | null {
  if (!row) return null;

  const strictness = options.strictness ?? 'standard';
  const inferredTargets: GoalDefinition['assumptions']['inferredTargets'] = [];
  const deepWorkTargetMinutes = row.goal_type === 'perform'
    ? STRICTNESS_PROFILE[strictness].defaultDeepWorkTargetMinutes
    : null;

  if (row.goal_type === 'perform') {
    inferredTargets.push('deepWorkTargetMinutes');
  }

  return {
    id: row.id,
    archetype: row.goal_type,
    object: goalObjectForArchetype(row.goal_type),
    title: options.title ?? defaultTitleForArchetype(row.goal_type),
    priority: options.priority ?? 1,
    strictness,
    horizon: options.horizon ?? '30d',
    state: 'active',
    activatedAt: row.updated_at ?? row.created_at,
    pausedAt: null,
    constraints: [
      { code: 'protect_sleep', enabled: true },
      { code: 'prefer_sustainable_path', enabled: true },
    ],
    supportingHabitIds: options.supportingHabitIds ?? [],
    targets: {
      dailyCalorieTarget: row.daily_calorie_target,
      dailyWaterTargetMl: row.daily_water_target_ml,
      sleepTargetMinutes: row.sleep_target_minutes,
      deepWorkTargetMinutes,
    },
    assumptions: {
      inferredTargets,
    },
  };
}
