export type MovementPattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'carry'
  | 'core'
  | 'conditioning';

export type ExerciseFocus = 'compound' | 'isolation';

export interface ExerciseDefinition {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles?: string[];
  movement_pattern: MovementPattern;
  focus: ExerciseFocus;
  workout_types: string[];
  equipment?: string[];
  provider: 'local' | 'wger';
  environment?: 'gym' | 'home' | 'outdoors';
  icon: string; // MaterialCommunityIcons icon name
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface ExerciseCatalogProvider {
  id: 'local' | 'wger';
  getExercises: () => ExerciseDefinition[];
}

/** Color for each movement pattern — used in UI */
export const PATTERN_COLORS: Record<MovementPattern, string> = {
  push: '#6C9EFF',
  pull: '#43D9A3',
  squat: '#F9B24E',
  hinge: '#FF6B6B',
  carry: '#A855F7',
  core: '#9AA6B2',
  conditioning: '#2DD4BF',
};

/** Short muscle display labels */
export const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  triceps: 'Triceps',
  shoulders: 'Shoulders',
  lats: 'Lats',
  biceps: 'Biceps',
  'mid-back': 'Mid-Back',
  quads: 'Quads',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  'lower-back': 'Lower Back',
  core: 'Core',
  calves: 'Calves',
  grip: 'Grip',
  traps: 'Traps',
  'rear-delts': 'Rear Delts',
  'front-delts': 'Front Delts',
  cardio: 'Cardio',
  legs: 'Legs',
};

const LOCAL_EXERCISE_LIBRARY: ExerciseDefinition[] = [
  // ── PUSH ────────────────────────────────────────────────────────────
  {
    id: 'bench-press',
    name: 'Bench Press',
    primary_muscles: ['chest'],
    secondary_muscles: ['triceps', 'front-delts'],
    movement_pattern: 'push',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['barbell', 'bench'],
    provider: 'local',
    environment: 'gym',
    icon: 'weight-lifter',
    difficulty: 'beginner',
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    primary_muscles: ['shoulders'],
    secondary_muscles: ['triceps', 'core'],
    movement_pattern: 'push',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['barbell', 'dumbbells'],
    provider: 'local',
    environment: 'gym',
    icon: 'weight-lifter',
    difficulty: 'intermediate',
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    primary_muscles: ['chest'],
    secondary_muscles: ['front-delts', 'triceps'],
    movement_pattern: 'push',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['dumbbells', 'bench'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'dip',
    name: 'Dip',
    primary_muscles: ['chest', 'triceps'],
    secondary_muscles: ['shoulders'],
    movement_pattern: 'push',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['bodyweight', 'dip-bars'],
    provider: 'local',
    environment: 'gym',
    icon: 'weight-lifter',
    difficulty: 'intermediate',
  },
  {
    id: 'cable-fly',
    name: 'Cable Fly',
    primary_muscles: ['chest'],
    secondary_muscles: ['front-delts'],
    movement_pattern: 'push',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['cables'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    primary_muscles: ['shoulders'],
    secondary_muscles: [],
    movement_pattern: 'push',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['dumbbells', 'cables'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    primary_muscles: ['triceps'],
    secondary_muscles: [],
    movement_pattern: 'push',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['cables'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Overhead Tricep Extension',
    primary_muscles: ['triceps'],
    secondary_muscles: [],
    movement_pattern: 'push',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['dumbbells', 'cables'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  // ── PULL ────────────────────────────────────────────────────────────
  {
    id: 'pull-up',
    name: 'Pull-Up',
    primary_muscles: ['lats'],
    secondary_muscles: ['biceps', 'mid-back'],
    movement_pattern: 'pull',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['bodyweight', 'bar'],
    provider: 'local',
    environment: 'gym',
    icon: 'weight-lifter',
    difficulty: 'intermediate',
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    primary_muscles: ['mid-back', 'lats'],
    secondary_muscles: ['biceps', 'rear-delts'],
    movement_pattern: 'pull',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['barbell'],
    provider: 'local',
    environment: 'gym',
    icon: 'weight-lifter',
    difficulty: 'intermediate',
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    primary_muscles: ['lats'],
    secondary_muscles: ['biceps', 'mid-back'],
    movement_pattern: 'pull',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['cables'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    primary_muscles: ['lats', 'mid-back'],
    secondary_muscles: ['biceps'],
    movement_pattern: 'pull',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['dumbbells', 'bench'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'cable-row',
    name: 'Seated Cable Row',
    primary_muscles: ['mid-back', 'lats'],
    secondary_muscles: ['biceps', 'rear-delts'],
    movement_pattern: 'pull',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['cables'],
    provider: 'local',
    environment: 'gym',
    icon: 'rowing',
    difficulty: 'beginner',
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    primary_muscles: ['rear-delts'],
    secondary_muscles: ['mid-back', 'biceps'],
    movement_pattern: 'pull',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['cables'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'bicep-curl',
    name: 'Bicep Curl',
    primary_muscles: ['biceps'],
    secondary_muscles: [],
    movement_pattern: 'pull',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['dumbbells', 'barbell', 'cables'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    primary_muscles: ['biceps'],
    secondary_muscles: ['forearms'],
    movement_pattern: 'pull',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['dumbbells'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  // ── SQUAT / LEGS ────────────────────────────────────────────────────
  {
    id: 'barbell-squat',
    name: 'Barbell Squat',
    primary_muscles: ['quads', 'glutes'],
    secondary_muscles: ['hamstrings', 'core'],
    movement_pattern: 'squat',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['barbell', 'rack'],
    provider: 'local',
    environment: 'gym',
    icon: 'weight-lifter',
    difficulty: 'intermediate',
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    primary_muscles: ['quads', 'glutes'],
    secondary_muscles: ['core'],
    movement_pattern: 'squat',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['dumbbells', 'kettlebells'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    primary_muscles: ['quads', 'glutes'],
    secondary_muscles: ['hamstrings'],
    movement_pattern: 'squat',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['machine'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'walking-lunge',
    name: 'Walking Lunge',
    primary_muscles: ['quads', 'glutes'],
    secondary_muscles: ['hamstrings', 'core'],
    movement_pattern: 'squat',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['bodyweight', 'dumbbells'],
    provider: 'local',
    environment: 'gym',
    icon: 'walk',
    difficulty: 'beginner',
  },
  {
    id: 'calf-raise',
    name: 'Calf Raise',
    primary_muscles: ['calves'],
    secondary_muscles: [],
    movement_pattern: 'squat',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['bodyweight', 'machine'],
    provider: 'local',
    environment: 'gym',
    icon: 'walk',
    difficulty: 'beginner',
  },
  // ── HINGE ────────────────────────────────────────────────────────────
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    primary_muscles: ['hamstrings', 'glutes'],
    secondary_muscles: ['lower-back'],
    movement_pattern: 'hinge',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['barbell', 'dumbbells'],
    provider: 'local',
    environment: 'gym',
    icon: 'weight-lifter',
    difficulty: 'intermediate',
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    primary_muscles: ['hamstrings', 'glutes', 'lower-back'],
    secondary_muscles: ['quads', 'traps', 'core'],
    movement_pattern: 'hinge',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['barbell'],
    provider: 'local',
    environment: 'gym',
    icon: 'weight-lifter',
    difficulty: 'advanced',
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    primary_muscles: ['glutes'],
    secondary_muscles: ['hamstrings', 'core'],
    movement_pattern: 'hinge',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['barbell', 'bench'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl',
    primary_muscles: ['hamstrings'],
    secondary_muscles: [],
    movement_pattern: 'hinge',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['machine'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  // ── CARRY ────────────────────────────────────────────────────────────
  {
    id: 'farmer-carry',
    name: 'Farmer Carry',
    primary_muscles: ['grip', 'core', 'traps'],
    secondary_muscles: ['quads', 'glutes'],
    movement_pattern: 'carry',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['dumbbells', 'kettlebells'],
    provider: 'local',
    environment: 'gym',
    icon: 'dumbbell',
    difficulty: 'beginner',
  },
  // ── CORE ─────────────────────────────────────────────────────────────
  {
    id: 'plank',
    name: 'Plank',
    primary_muscles: ['core'],
    secondary_muscles: ['shoulders', 'glutes'],
    movement_pattern: 'core',
    focus: 'isolation',
    workout_types: ['HIIT', 'Pilates', 'Yoga', 'Strength'],
    equipment: ['bodyweight'],
    provider: 'local',
    environment: 'home',
    icon: 'human',
    difficulty: 'beginner',
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    primary_muscles: ['core'],
    secondary_muscles: [],
    movement_pattern: 'core',
    focus: 'isolation',
    workout_types: ['Pilates', 'Yoga', 'Strength'],
    equipment: ['bodyweight'],
    provider: 'local',
    environment: 'home',
    icon: 'human',
    difficulty: 'beginner',
  },
  {
    id: 'ab-wheel',
    name: 'Ab Wheel Rollout',
    primary_muscles: ['core'],
    secondary_muscles: ['lats', 'shoulders'],
    movement_pattern: 'core',
    focus: 'compound',
    workout_types: ['Strength'],
    equipment: ['ab-wheel'],
    provider: 'local',
    environment: 'gym',
    icon: 'circle-outline',
    difficulty: 'intermediate',
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    primary_muscles: ['core'],
    secondary_muscles: ['hip-flexors'],
    movement_pattern: 'core',
    focus: 'isolation',
    workout_types: ['Strength'],
    equipment: ['bodyweight', 'bar'],
    provider: 'local',
    environment: 'gym',
    icon: 'weight-lifter',
    difficulty: 'intermediate',
  },
  // ── CONDITIONING ─────────────────────────────────────────────────────
  {
    id: 'incline-walk',
    name: 'Incline Walk',
    primary_muscles: ['legs', 'cardio'],
    secondary_muscles: [],
    movement_pattern: 'conditioning',
    focus: 'compound',
    workout_types: ['Walking'],
    equipment: ['treadmill'],
    provider: 'local',
    environment: 'gym',
    icon: 'walk',
    difficulty: 'beginner',
  },
  {
    id: 'tempo-run',
    name: 'Tempo Run',
    primary_muscles: ['legs', 'cardio'],
    secondary_muscles: [],
    movement_pattern: 'conditioning',
    focus: 'compound',
    workout_types: ['Running'],
    equipment: ['bodyweight'],
    provider: 'local',
    environment: 'outdoors',
    icon: 'run',
    difficulty: 'intermediate',
  },
  {
    id: 'bike-interval',
    name: 'Bike Intervals',
    primary_muscles: ['legs', 'cardio'],
    secondary_muscles: [],
    movement_pattern: 'conditioning',
    focus: 'compound',
    workout_types: ['Cycling', 'HIIT'],
    equipment: ['bike'],
    provider: 'local',
    environment: 'gym',
    icon: 'bike',
    difficulty: 'beginner',
  },
  {
    id: 'rowing-machine',
    name: 'Rowing Machine',
    primary_muscles: ['cardio', 'mid-back'],
    secondary_muscles: ['lats', 'legs'],
    movement_pattern: 'conditioning',
    focus: 'compound',
    workout_types: ['Rowing', 'HIIT'],
    equipment: ['rowing-machine'],
    provider: 'local',
    environment: 'gym',
    icon: 'rowing',
    difficulty: 'beginner',
  },
  {
    id: 'jump-rope',
    name: 'Jump Rope',
    primary_muscles: ['cardio'],
    secondary_muscles: ['calves', 'core'],
    movement_pattern: 'conditioning',
    focus: 'compound',
    workout_types: ['HIIT', 'Running'],
    equipment: ['jump-rope'],
    provider: 'local',
    environment: 'gym',
    icon: 'run',
    difficulty: 'beginner',
  },
];

export const localExerciseProvider: ExerciseCatalogProvider = {
  id: 'local',
  getExercises: () => LOCAL_EXERCISE_LIBRARY,
};

export const wgerExerciseProvider: ExerciseCatalogProvider = {
  id: 'wger',
  getExercises: () => [],
};

export function getExerciseCatalog(): ExerciseDefinition[] {
  return localExerciseProvider.getExercises();
}

export function getExerciseById(exerciseId: string): ExerciseDefinition | null {
  return getExerciseCatalog().find((e) => e.id === exerciseId) ?? null;
}

export function getExercisesByPattern(pattern: MovementPattern): ExerciseDefinition[] {
  return getExerciseCatalog().filter((e) => e.movement_pattern === pattern);
}

export function getExerciseAlternatives(exerciseId: string, limit = 3): ExerciseDefinition[] {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) return [];
  return getExerciseCatalog()
    .filter((c) => c.id !== exercise.id)
    .map((c) => {
      let score = 0;
      if (c.movement_pattern === exercise.movement_pattern) score += 50;
      if (c.focus === exercise.focus) score += 20;
      if (c.workout_types.some((t) => exercise.workout_types.includes(t))) score += 15;
      if (c.environment === exercise.environment) score += 10;
      if ((c.equipment ?? []).some((i) => (exercise.equipment ?? []).includes(i))) score += 5;
      return { candidate: c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.candidate);
}
