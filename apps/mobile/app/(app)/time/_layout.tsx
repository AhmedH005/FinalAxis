import { Stack } from 'expo-router';
import { color } from '@axis/theme';

export default function TimeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.bg },
      }}
    />
  );
}
