import { getExerciseCatalog } from './exercise-providers';

export interface ExerciseLesson {
  exercise_id: string;
  title: string;
  category: 'strength' | 'hypertrophy' | 'conditioning' | 'mobility';
  difficulty: 'beginner' | 'intermediate';
  duration_minutes: number;
  summary: string;
  coaching_points: string[];
  lesson_steps: string[];
  mistakes: string[];
  visual: {
    icon: string;
    emphasis: string[];
  };
}

export interface FitnessCourse {
  id: string;
  title: string;
  subtitle: string;
  goal: 'strength' | 'hypertrophy' | 'fat-loss' | 'general';
  level: 'beginner' | 'intermediate';
  duration_weeks: number;
  sessions_per_week: number;
  summary: string;
  focus_points: string[];
  exercise_ids: string[];
  weekly_plan: Array<{
    week: number;
    title: string;
    emphasis: string;
  }>;
}

const LESSONS: ExerciseLesson[] = [
  {
    exercise_id: 'barbell-squat',
    title: 'Squat Foundations',
    category: 'strength',
    difficulty: 'beginner',
    duration_minutes: 8,
    summary: 'Build a stable lower-body strength pattern with better bracing and depth control.',
    coaching_points: ['Brace before each rep', 'Keep pressure through mid-foot', 'Drive up with chest and hips together'],
    lesson_steps: ['Set feet just outside hips', 'Grip the bar and lock your upper back', 'Sit down between the hips', 'Drive up without letting knees cave in'],
    mistakes: ['Relaxing the torso at the bottom', 'Shifting weight into the toes'],
    visual: { icon: 'human-male-board', emphasis: ['quads', 'glutes', 'core'] },
  },
  {
    exercise_id: 'bench-press',
    title: 'Bench Press Setup',
    category: 'strength',
    difficulty: 'beginner',
    duration_minutes: 7,
    summary: 'Learn a safer pressing setup with shoulder positioning and a cleaner bar path.',
    coaching_points: ['Pull shoulders down and back', 'Stack wrists over elbows', 'Press back toward the rack'],
    lesson_steps: ['Plant feet hard', 'Create upper-back tension', 'Lower with control to mid chest', 'Press with full-body tension'],
    mistakes: ['Flaring elbows early', 'Letting the shoulders roll forward'],
    visual: { icon: 'weight-lifter', emphasis: ['chest', 'triceps', 'shoulders'] },
  },
  {
    exercise_id: 'romanian-deadlift',
    title: 'Hip Hinge Mechanics',
    category: 'strength',
    difficulty: 'beginner',
    duration_minutes: 6,
    summary: 'Turn RDLs into a clean hinge instead of a low-back movement.',
    coaching_points: ['Push hips back first', 'Keep lats tight', 'Stop when pelvis starts to tuck'],
    lesson_steps: ['Unlock knees softly', 'Reach hips back', 'Keep the bar close', 'Stand tall by squeezing glutes'],
    mistakes: ['Chasing range with a rounded spine', 'Turning it into a squat'],
    visual: { icon: 'chart-sankey', emphasis: ['hamstrings', 'glutes', 'back'] },
  },
  {
    exercise_id: 'overhead-press',
    title: 'Overhead Press Path',
    category: 'strength',
    difficulty: 'intermediate',
    duration_minutes: 7,
    summary: 'Get the bar overhead efficiently with a straighter path and stronger torso position.',
    coaching_points: ['Squeeze glutes and ribs down', 'Move head out of the way', 'Finish with biceps by ears'],
    lesson_steps: ['Set wrists and forearms vertical', 'Press up and slightly back', 'Bring head through', 'Lock out with stacked joints'],
    mistakes: ['Leaning back too far', 'Starting with elbows flared behind the bar'],
    visual: { icon: 'arm-flex', emphasis: ['shoulders', 'triceps', 'core'] },
  },
  {
    exercise_id: 'pull-up',
    title: 'Pull-Up Progressions',
    category: 'hypertrophy',
    difficulty: 'beginner',
    duration_minutes: 8,
    summary: 'Build better vertical pulling with scapular control and full-range reps.',
    coaching_points: ['Start from a controlled hang', 'Drive elbows down', 'Pause briefly at the top'],
    lesson_steps: ['Practice active hangs', 'Add assisted reps', 'Pull chest toward the bar', 'Lower under control'],
    mistakes: ['Kicking to finish reps', 'Shrugging shoulders at the bottom'],
    visual: { icon: 'human-handsup', emphasis: ['lats', 'biceps', 'mid-back'] },
  },
  {
    exercise_id: 'hip-thrust',
    title: 'Glute Drive Basics',
    category: 'hypertrophy',
    difficulty: 'beginner',
    duration_minutes: 6,
    summary: 'Set up hip thrusts so glutes do the work instead of your lower back.',
    coaching_points: ['Tuck pelvis slightly at lockout', 'Keep chin tucked', 'Pause at the top'],
    lesson_steps: ['Set upper back on the bench', 'Place feet where shins are vertical at the top', 'Drive hips up', 'Hold and lower with control'],
    mistakes: ['Overextending at lockout', 'Feet too far forward'],
    visual: { icon: 'bridge', emphasis: ['glutes', 'hamstrings', 'core'] },
  },
  {
    exercise_id: 'tempo-run',
    title: 'Tempo Run Pacing',
    category: 'conditioning',
    difficulty: 'intermediate',
    duration_minutes: 10,
    summary: 'Use a controlled threshold effort to improve running output without racing every session.',
    coaching_points: ['Hold a controlled discomfort', 'Settle breathing early', 'Keep cadence stable'],
    lesson_steps: ['Warm up easy', 'Build into tempo pace', 'Hold steady for the target block', 'Cool down gradually'],
    mistakes: ['Starting too fast', 'Turning the whole run into a sprint'],
    visual: { icon: 'run-fast', emphasis: ['cardio', 'pace', 'legs'] },
  },
  {
    exercise_id: 'plank',
    title: 'Core Bracing Primer',
    category: 'mobility',
    difficulty: 'beginner',
    duration_minutes: 5,
    summary: 'Teach your trunk to stay stable so pressing, hinging, and squatting all feel stronger.',
    coaching_points: ['Ribs down', 'Glutes on', 'Push the floor away'],
    lesson_steps: ['Set elbows under shoulders', 'Lock the pelvis into neutral', 'Breathe behind the brace', 'Hold without sagging'],
    mistakes: ['Looking too far forward', 'Hips drifting high or low'],
    visual: { icon: 'gesture-tap-hold', emphasis: ['core', 'bracing', 'posture'] },
  },
];

const COURSES: FitnessCourse[] = [
  {
    id: 'strength-starter',
    title: 'Strength Starter',
    subtitle: 'Full-body barbell basics',
    goal: 'strength',
    level: 'beginner',
    duration_weeks: 6,
    sessions_per_week: 3,
    summary: 'A simple full-body progression built around squat, press, hinge, and pull patterns.',
    focus_points: ['Learn stable setup positions', 'Repeat major compounds often', 'Keep accessories minimal'],
    exercise_ids: ['barbell-squat', 'bench-press', 'romanian-deadlift', 'pull-up', 'plank'],
    weekly_plan: [
      { week: 1, title: 'Technique base', emphasis: 'Learn setup and leave reps in reserve' },
      { week: 2, title: 'Repeat positions', emphasis: 'Use the same lifts and clean up bar path' },
      { week: 3, title: 'Add load slowly', emphasis: 'Increase weight only if positions stay clean' },
      { week: 4, title: 'Consolidate', emphasis: 'Keep volume steady and protect recovery' },
      { week: 5, title: 'Build confidence', emphasis: 'Add one top set on compounds' },
      { week: 6, title: 'Strong finish', emphasis: 'Repeat your best technical week with slightly more load' },
    ],
  },
  {
    id: 'hypertrophy-builder',
    title: 'Hypertrophy Builder',
    subtitle: 'Muscle-focused gym split',
    goal: 'hypertrophy',
    level: 'intermediate',
    duration_weeks: 8,
    sessions_per_week: 4,
    summary: 'A higher-volume split for building muscle with better exercise selection and movement balance.',
    focus_points: ['Push and pull volume balance', 'More glute and back work', 'Accessory work after compounds'],
    exercise_ids: ['bench-press', 'overhead-press', 'dumbbell-row', 'hip-thrust', 'walking-lunge'],
    weekly_plan: [
      { week: 1, title: 'Volume entry', emphasis: 'Start with moderate effort and clean reps' },
      { week: 2, title: 'Own the split', emphasis: 'Keep rest times consistent and track pump quality' },
      { week: 3, title: 'Progressive overload', emphasis: 'Add reps before adding load' },
      { week: 4, title: 'Tension focus', emphasis: 'Slow eccentrics and more control on accessories' },
      { week: 5, title: 'Push volume', emphasis: 'Add one accessory set where recovery allows' },
      { week: 6, title: 'Recover and reload', emphasis: 'Reduce intensity slightly and keep technique high' },
      { week: 7, title: 'Heavy hypertrophy', emphasis: 'Return to higher effort compounds' },
      { week: 8, title: 'Finish strong', emphasis: 'Hit your best rep-quality week' },
    ],
  },
  {
    id: 'lean-conditioning',
    title: 'Lean Conditioning',
    subtitle: 'Conditioning without burnout',
    goal: 'fat-loss',
    level: 'beginner',
    duration_weeks: 4,
    sessions_per_week: 3,
    summary: 'Blends repeatable conditioning with low-friction strength support so compliance stays high.',
    focus_points: ['Alternate higher and lower effort days', 'Keep sessions short', 'Use walking as recovery'],
    exercise_ids: ['tempo-run', 'bike-interval', 'walking-lunge', 'plank', 'incline-walk'],
    weekly_plan: [
      { week: 1, title: 'Consistency first', emphasis: 'Short sessions and simple pacing' },
      { week: 2, title: 'Increase density', emphasis: 'Slightly less rest and slightly more output' },
      { week: 3, title: 'Hold effort', emphasis: 'Keep work repeatable instead of chasing exhaustion' },
      { week: 4, title: 'Recovery week', emphasis: 'Walk more and finish feeling fresh' },
    ],
  },
  {
    id: 'general-athletic-base',
    title: 'Athletic Base',
    subtitle: 'General strength and movement quality',
    goal: 'general',
    level: 'beginner',
    duration_weeks: 5,
    sessions_per_week: 3,
    summary: 'A balanced base phase that improves core lifts, trunk stability, and conditioning together.',
    focus_points: ['Cover all main movement patterns', 'Improve posture and core control', 'Build work capacity gradually'],
    exercise_ids: ['barbell-squat', 'farmer-carry', 'dead-bug', 'dumbbell-row', 'tempo-run'],
    weekly_plan: [
      { week: 1, title: 'Movement quality', emphasis: 'Stability and setup over load' },
      { week: 2, title: 'Balance patterns', emphasis: 'Keep push, pull, carry, and hinge evenly trained' },
      { week: 3, title: 'Add capacity', emphasis: 'Slightly longer conditioning finishers' },
      { week: 4, title: 'Control under fatigue', emphasis: 'Keep positions clean later in sessions' },
      { week: 5, title: 'Athletic finish', emphasis: 'Blend strength and conditioning smoothly' },
    ],
  },
];

export function getExerciseLessons() {
  return LESSONS;
}

export function getLessonByExerciseId(exerciseId: string) {
  return LESSONS.find((lesson) => lesson.exercise_id === exerciseId) ?? null;
}

export function getFitnessCourses() {
  return COURSES;
}

export function getCourseById(courseId: string) {
  return COURSES.find((course) => course.id === courseId) ?? null;
}

export function getFeaturedExerciseLibrary() {
  return getExerciseCatalog().map((exercise) => ({
    exercise,
    lesson: getLessonByExerciseId(exercise.id),
  }));
}
