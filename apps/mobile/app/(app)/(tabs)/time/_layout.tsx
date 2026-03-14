import { Stack } from 'expo-router';
import { color } from '@axis/theme';

export default function TimeLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: color.bg },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
