import { Stack } from 'expo-router';
import { color } from '@axis/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      <Stack.Screen name="goal-alignment" />
      <Stack.Screen name="day-reshaping" />
      <Stack.Screen name="weekly-reflection" />
      <Stack.Screen name="progress" />
    </Stack>
  );
}
