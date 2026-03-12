import type { MovementPattern } from './exercise-providers';

export interface ProgramDay {
  id: string;
  name: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
  description: string;
  movement_patterns: MovementPattern[];
  primary_exercise_ids: string[];
  accessory_exercise_ids: string[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  tagline: string;
  description: string;
  level: 'beginner' | 'intermediate';
  frequency: string;
  icon: string;
  color: string;
  days: ProgramDay[];
}

export const WORKOUT_PROGRAMS: WorkoutProgram[] = [
  // PPL - Push Pull Legs
  {
    id: 'ppl',
    name: 'Push Pull Legs',
    tagline: 'Classic 3-way split',
    description: 'Train each muscle group twice per week with clear movement focus. The most proven gym split.',
    level: 'intermediate',
    frequency: '3–6×/week',
    icon: 'swap-horizontal',
    color: '#6C9EFF',
    days: [
      {
        id: 'push',
        name: 'Push',
        icon: 'weight-lifter',
        color: '#6C9EFF',
        description: 'Chest, shoulders, triceps — horizontal and vertical pressing.',
        movement_patterns: ['push'],
        primary_exercise_ids: ['bench-press', 'overhead-press', 'incline-dumbbell-press'],
        accessory_exercise_ids: ['cable-fly', 'lateral-raise', 'tricep-pushdown', 'overhead-tricep-extension'],
      },
      {
        id: 'pull',
        name: 'Pull',
        icon: 'rowing',
        color: '#43D9A3',
        description: 'Back, biceps, rear delts — vertical and horizontal pulling.',
        movement_patterns: ['pull'],
        primary_exercise_ids: ['pull-up', 'barbell-row', 'lat-pulldown'],
        accessory_exercise_ids: ['dumbbell-row', 'face-pull', 'bicep-curl', 'hammer-curl'],
      },
      {
        id: 'legs',
        name: 'Legs',
        icon: 'run',
        color: '#F9B24E',
        description: 'Quads, hamstrings, glutes, calves — squat and hinge patterns.',
        movement_patterns: ['squat', 'hinge'],
        primary_exercise_ids: ['barbell-squat', 'romanian-deadlift', 'leg-press'],
        accessory_exercise_ids: ['hip-thrust', 'walking-lunge', 'leg-curl', 'calf-raise'],
      },
    ],
  },
  // Upper / Lower
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    tagline: '2-way split, great for beginners',
    description: 'Alternate upper and lower body sessions. Hit everything twice per week with less complexity.',
    level: 'beginner',
    frequency: '4×/week',
    icon: 'human',
    color: '#A855F7',
    days: [
      {
        id: 'upper',
        name: 'Upper',
        icon: 'weight-lifter',
        color: '#A855F7',
        description: 'Chest, back, shoulders, arms — push and pull in one session.',
        movement_patterns: ['push', 'pull'],
        primary_exercise_ids: ['bench-press', 'barbell-row', 'overhead-press', 'pull-up'],
        accessory_exercise_ids: ['lateral-raise', 'dumbbell-row', 'bicep-curl', 'tricep-pushdown'],
      },
      {
        id: 'lower',
        name: 'Lower',
        icon: 'run',
        color: '#F9B24E',
        description: 'Quads, hamstrings, glutes, calves — full lower body stimulus.',
        movement_patterns: ['squat', 'hinge'],
        primary_exercise_ids: ['barbell-squat', 'romanian-deadlift', 'leg-press'],
        accessory_exercise_ids: ['hip-thrust', 'leg-curl', 'walking-lunge', 'calf-raise'],
      },
    ],
  },
  // Full Body
  {
    id: 'full-body',
    name: 'Full Body',
    tagline: 'Every muscle, every session',
    description: 'Hit every muscle group in each session. The simplest structure for consistent progress.',
    level: 'beginner',
    frequency: '3×/week',
    icon: 'dumbbell',
    color: '#43D9A3',
    days: [
      {
        id: 'full-a',
        name: 'Session A',
        icon: 'dumbbell',
        color: '#43D9A3',
        description: 'Squat-focused with horizontal push and horizontal pull.',
        movement_patterns: ['squat', 'push', 'pull', 'core'],
        primary_exercise_ids: ['barbell-squat', 'bench-press', 'barbell-row'],
        accessory_exercise_ids: ['overhead-press', 'plank', 'bicep-curl'],
      },
      {
        id: 'full-b',
        name: 'Session B',
        icon: 'dumbbell',
        color: '#43D9A3',
        description: 'Hinge-focused with vertical push and vertical pull.',
        movement_patterns: ['hinge', 'push', 'pull', 'core'],
        primary_exercise_ids: ['romanian-deadlift', 'overhead-press', 'pull-up'],
        accessory_exercise_ids: ['hip-thrust', 'plank', 'tricep-pushdown'],
      },
    ],
  },
];

export function getProgramById(id: string): WorkoutProgram | null {
  return WORKOUT_PROGRAMS.find((p) => p.id === id) ?? null;
}

export function getProgramDayById(program: WorkoutProgram, dayId: string): ProgramDay | null {
  return program.days.find((d) => d.id === dayId) ?? null;
}

export function getNextProgramDay(program: WorkoutProgram, lastDayId: string | null): ProgramDay {
  if (!lastDayId) return program.days[0];
  const idx = program.days.findIndex((d) => d.id === lastDayId);
  return program.days[(idx + 1) % program.days.length];
}
