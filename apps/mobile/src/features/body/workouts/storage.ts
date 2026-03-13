import AsyncStorage from '@react-native-async-storage/async-storage';

const PROGRAM_KEY = '@axis/workout_program';
const LAST_DAY_KEY = '@axis/workout_last_day';

export async function loadWorkoutProgramState() {
  const [programId, lastDayId] = await Promise.all([
    AsyncStorage.getItem(PROGRAM_KEY),
    AsyncStorage.getItem(LAST_DAY_KEY),
  ]);

  return {
    programId,
    lastDayId,
  };
}

export async function saveWorkoutProgramSelection(programId: string | null) {
  if (programId) {
    await AsyncStorage.setItem(PROGRAM_KEY, programId);
    return;
  }

  await AsyncStorage.removeItem(PROGRAM_KEY);
}

export async function markWorkoutProgramDayComplete(dayId: string) {
  await AsyncStorage.setItem(LAST_DAY_KEY, dayId);
}
