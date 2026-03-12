import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space, radius, typography } from '@axis/theme';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

type UnitSystem = 'metric' | 'imperial';

export default function OnboardingBody() {
  const router = useRouter();
  const { session } = useAuth();
  const [units, setUnits] = useState<UnitSystem>('metric');
  const [heightStr, setHeightStr] = useState('');
  const [weightStr, setWeightStr] = useState('');
  const [loading, setLoading] = useState(false);

  // Convert to metric for storage
  function toMetric(value: number, unit: UnitSystem, type: 'height' | 'weight'): number {
    if (unit === 'metric') return value;
    if (type === 'height') return Math.round(value * 2.54); // inches → cm
    return Math.round(value * 0.453592 * 10) / 10; // lbs → kg
  }

  async function handleNext() {
    const height = heightStr ? parseFloat(heightStr) : null;
    const weight = weightStr ? parseFloat(weightStr) : null;

    if (height !== null && isNaN(height)) {
      Alert.alert('Invalid height', 'Please enter a valid number.');
      return;
    }
    if (weight !== null && isNaN(weight)) {
      Alert.alert('Invalid weight', 'Please enter a valid number.');
      return;
    }

    setLoading(true);

    const updates: Record<string, unknown> = { id: session!.user.id, units };
    if (height !== null) updates.height_cm = toMetric(height, units, 'height');

    const { error: profileError } = await supabase.from('profiles').upsert(updates);

    if (!profileError && weight !== null) {
      await supabase.from('body_metrics').insert({
        user_id: session!.user.id,
        metric_type: 'weight_kg',
        value: toMetric(weight, units, 'weight'),
        recorded_at: new Date().toISOString(),
        source: 'onboarding',
      });
    }

    setLoading(false);

    if (profileError) {
      Alert.alert('Error', profileError.message);
      return;
    }

    router.push('/(auth)/onboarding/goals');
  }

  const heightLabel = units === 'metric' ? 'Height (cm)' : 'Height (inches)';
  const weightLabel = units === 'metric' ? 'Weight (kg)' : 'Weight (lbs)';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>

        <View style={styles.header}>
          <Text style={styles.step}>Step 2 of 3</Text>
          <Text style={styles.title}>Set your physical baseline</Text>
          <Text style={styles.subtitle}>
            Height, weight, and units help AXIS estimate hydration, sleep, recovery, and energy.
          </Text>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            This is only the starting layer. Mood, habits, and reflection will add the rest of the picture later.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Units</Text>
            <View style={styles.pills}>
              {(['metric', 'imperial'] as UnitSystem[]).map((u) => (
                <Pressable
                  key={u}
                  style={[styles.pill, units === u && styles.pillActive]}
                  onPress={() => setUnits(u)}
                >
                  <Text style={[styles.pillText, units === u && styles.pillTextActive]}>
                    {u.charAt(0).toUpperCase() + u.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>
                {heightLabel}{' '}
                <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={heightStr}
                onChangeText={setHeightStr}
                keyboardType="decimal-pad"
                placeholderTextColor={color.text.muted}
                placeholder={units === 'metric' ? '175' : '69'}
              />
            </View>

            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>
                {weightLabel}{' '}
                <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={weightStr}
                onChangeText={setWeightStr}
                keyboardType="decimal-pad"
                placeholderTextColor={color.text.muted}
                placeholder={units === 'metric' ? '70' : '155'}
              />
            </View>
          </View>
        </View>

        <View style={styles.buttons}>
          <Pressable style={styles.skipButton} onPress={() => router.push('/(auth)/onboarding/goals')}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, styles.flex, loading && styles.disabled]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={color.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Continue →</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  progress: {
    flexDirection: 'row',
    gap: space.xs,
    paddingTop: space.lg,
    marginBottom: space.xl,
  },
  dot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.outline,
  },
  dotActive: { backgroundColor: color.success },
  dotDone: { backgroundColor: color.success },
  header: { marginBottom: space.xl },
  step: { fontSize: typography.sm, color: color.text.muted, marginBottom: space.xs },
  title: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
    marginBottom: space.xs,
  },
  subtitle: { fontSize: typography.base, color: color.text.muted },
  noteCard: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    marginBottom: space.xl,
  },
  noteText: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  form: {
    flex: 1,
    gap: space.lg,
    marginBottom: space.xl,
  },
  field: { gap: space.xs },
  flex: { flex: 1 },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: { fontWeight: '400', textTransform: 'none' },
  input: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: typography.base,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.outline,
  },
  row: { flexDirection: 'row', gap: space.md },
  pills: { flexDirection: 'row', gap: space.sm },
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
  },
  pillActive: { backgroundColor: color.success, borderColor: color.success },
  pillText: { fontSize: typography.sm, color: color.text.muted, fontWeight: '600' },
  pillTextActive: { color: color.text.inverse },
  buttons: { flexDirection: 'row', gap: space.sm },
  skipButton: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.outline,
  },
  skipButtonText: { fontSize: typography.base, color: color.text.muted, fontWeight: '600' },
  primaryButton: {
    backgroundColor: color.success,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.inverse,
  },
  disabled: { opacity: 0.6 },
});
