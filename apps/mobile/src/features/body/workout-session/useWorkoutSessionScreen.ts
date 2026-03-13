import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  buildWorkoutExpenditureBreakdown,
  getProgramById,
  getProgramDayById,
  useAddWorkoutLog,
  useLatestWeight,
  type ExerciseDefinition,
  type IntensityLevel,
} from '@/engines/body';
import type { WorkoutSessionRouteParams } from '@/types/navigation';
import { markWorkoutProgramDayComplete } from '../workouts/storage';
import {
  DEFAULT_REPS,
  buildSessionExercises,
  createSessionExercise,
  getInitialIntensity,
  getWorkoutSessionDayLabel,
  getWorkoutSessionType,
  toCompletedWorkoutExercises,
  type SessionExercise,
  type SessionSet,
} from './model';

type RawWorkoutSessionRouteParams = {
  [K in keyof WorkoutSessionRouteParams]?: string | string[];
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function useSessionTimer() {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    seconds,
    display: `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
  };
}

export function useWorkoutSessionScreen() {
  const router = useRouter();
  const rawParams = useLocalSearchParams() as RawWorkoutSessionRouteParams;
  const addWorkout = useAddWorkoutLog();
  const { data: latestWeight } = useLatestWeight();
  const { seconds, display: timerDisplay } = useSessionTimer();

  const programId = readParam(rawParams.programId);
  const dayId = readParam(rawParams.dayId);
  const dayLabelParam = readParam(rawParams.dayLabel);
  const exerciseIds = readParam(rawParams.exerciseIds);
  const intensityParam = readParam(rawParams.intensity);
  const workoutTypeParam = readParam(rawParams.workoutType);

  const initialParams = useMemo(
    () => ({
      programId,
      dayId,
      dayLabel: dayLabelParam,
      exerciseIds,
      intensity: getInitialIntensity(intensityParam),
      workoutType: workoutTypeParam,
    }),
    [dayId, dayLabelParam, exerciseIds, intensityParam, programId, workoutTypeParam],
  );

  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [intensity, setIntensity] = useState<IntensityLevel>('moderate');

  const program = programId ? getProgramById(programId) : null;
  const programDay = program && dayId ? getProgramDayById(program, dayId) : null;
  const dayLabel = getWorkoutSessionDayLabel(initialParams, programDay);
  const workoutType = getWorkoutSessionType(initialParams, programDay);

  useEffect(() => {
    setExercises(buildSessionExercises(initialParams, programDay));
    setIntensity(getInitialIntensity(intensityParam));
  }, [initialParams, intensityParam, programDay]);

  const completedExerciseLog = useMemo(
    () => toCompletedWorkoutExercises(exercises),
    [exercises],
  );

  const workoutBreakdown = useMemo(
    () => buildWorkoutExpenditureBreakdown({
      workoutType,
      durationMinutes: Math.max(1, Math.round(seconds / 60)),
      intensity,
      bodyWeightKg: latestWeight?.value ?? null,
      exercises: completedExerciseLog,
    }),
    [completedExerciseLog, intensity, latestWeight?.value, seconds, workoutType],
  );

  const exerciseCaloriesByIndex = useMemo(() => {
    let completedIndex = 0;

    return exercises.map((entry) => {
      const completedSetCount = entry.sets.filter((set) => set.done).length;
      if (completedSetCount === 0) return 0;

      const calories = workoutBreakdown.exercises[completedIndex]?.estimated_calories ?? 0;
      completedIndex += 1;
      return calories;
    });
  }, [exercises, workoutBreakdown.exercises]);

  const completedSetCount = useMemo(
    () => exercises.reduce((sum, entry) => sum + entry.sets.filter((set) => set.done).length, 0),
    [exercises],
  );

  const existingIds = useMemo(
    () => exercises.map((entry) => entry.exercise.id),
    [exercises],
  );

  const handleUpdateSet = useCallback((
    exerciseIndex: number,
    setIndex: number,
    updates: Partial<SessionSet>,
  ) => {
    setExercises((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== exerciseIndex) return entry;
        return {
          ...entry,
          sets: entry.sets.map((set, currentSetIndex) => (
            currentSetIndex === setIndex ? { ...set, ...updates } : set
          )),
        };
      }),
    );
  }, []);

  const handleAddSet = useCallback((exerciseIndex: number) => {
    setExercises((previous) =>
      previous.map((entry, entryIndex) => {
        if (entryIndex !== exerciseIndex) return entry;
        return {
          ...entry,
          sets: [...entry.sets, { reps: DEFAULT_REPS, weight: '', done: false }],
        };
      }),
    );
  }, []);

  const handleRemoveExercise = useCallback((exerciseIndex: number) => {
    setExercises((previous) => previous.filter((_, index) => index !== exerciseIndex));
  }, []);

  const handleAddExercise = useCallback((exercise: ExerciseDefinition) => {
    setExercises((previous) => [
      ...previous,
      createSessionExercise(exercise),
    ]);
  }, []);

  const handleComplete = useCallback(async () => {
    if (exercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise before completing.');
      return;
    }

    const durationMinutes = Math.max(
      1,
      Math.round(seconds / 60),
      Math.round(workoutBreakdown.total_estimated_minutes || 0),
    );

    try {
      await addWorkout.mutateAsync({
        workout_type: workoutType,
        name: dayLabel !== 'Workout' ? dayLabel : undefined,
        duration_minutes: durationMinutes,
        intensity,
        exercises: completedExerciseLog,
      });

      if (programDay) {
        await markWorkoutProgramDayComplete(programDay.id);
      }

      router.back();
    } catch {
      Alert.alert('Error', 'Could not save workout. Please try again.');
    }
  }, [
    addWorkout,
    completedExerciseLog,
    dayLabel,
    exercises.length,
    intensity,
    programDay,
    router,
    seconds,
    workoutBreakdown.total_estimated_minutes,
    workoutType,
  ]);

  return {
    exercises,
    existingIds,
    pickerVisible,
    setPickerVisible,
    intensity,
    setIntensity,
    dayLabel,
    timerDisplay,
    latestWeight,
    completedSetCount,
    workoutBreakdown,
    exerciseCaloriesByIndex,
    isSaving: addWorkout.isPending,
    goBack: () => router.back(),
    handleUpdateSet,
    handleAddSet,
    handleRemoveExercise,
    handleAddExercise,
    handleComplete,
  };
}
