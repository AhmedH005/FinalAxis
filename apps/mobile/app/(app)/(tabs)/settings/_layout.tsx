import { Stack } from 'expo-router';
import { color } from '@axis/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: color.bg },
      }}
    />
  );
}
