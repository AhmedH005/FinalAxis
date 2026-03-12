import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space, radius, typography } from '@axis/theme';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';

type Goal = 'lose' | 'maintain' | 'gain' | 'perform';

const GOAL_OPTIONS: { value: Goal; label: string; description: string }[] = [
  { value: 'lose', label: 'Lean out', description: 'Create a lighter baseline and reduce excess body fat' },
  { value: 'maintain', label: 'Stay steady', description: 'Protect consistency, recovery, and current body composition' },
  { value: 'gain', label: 'Build up', description: 'Support muscle gain, growth, and a stronger physical baseline' },
  { value: 'perform', label: 'Perform better', description: 'Prioritise energy, output, and athletic capacity' },
];

export default function OnboardingGoals() {
  const { session, refreshProfile } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFinish() {
    setLoading(true);

    // Save goal and mark onboarding complete
    const { error: goalError } = await supabase.from('user_goals').upsert({
      user_id: session!.user.id,
      goal_type: selected ?? 'maintain',
      daily_water_target_ml: 2500,
      sleep_target_minutes: 480,
    });

    if (goalError) {
      setLoading(false);
      Alert.alert('Error', goalError.message);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ onboarding_done: true })
      .eq('id', session!.user.id);

    setLoading(false);

    if (profileError) {
      Alert.alert('Error', profileError.message);
      return;
    }

    // Refresh profile in AuthProvider so route guard picks up onboarding_done = true
    await refreshProfile();
    router.replace('/(app)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotDone]} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        <View style={styles.header}>
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text style={styles.title}>What should AXIS calibrate first?</Text>
          <Text style={styles.subtitle}>
            This sets the first version of your daily targets. You can change it later as your patterns become clearer.
          </Text>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            Targets are just a starting point. AXIS becomes more useful as it learns from your real behavior over time.
          </Text>
        </View>

        <View style={styles.options}>
          {GOAL_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.option, selected === option.value && styles.optionActive]}
              onPress={() => setSelected(option.value)}
            >
              <View style={styles.optionContent}>
                <Text style={[styles.optionLabel, selected === option.value && styles.optionLabelActive]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <View style={[styles.radio, selected === option.value && styles.radioActive]}>
                {selected === option.value && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.primaryButton, loading && styles.disabled]}
          onPress={handleFinish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={color.text.inverse} />
          ) : (
            <Text style={styles.primaryButtonText}>Let's go →</Text>
          )}
        </Pressable>
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
  dot: { width: 24, height: 4, borderRadius: 2, backgroundColor: color.outline },
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
  options: {
    flex: 1,
    gap: space.sm,
    marginBottom: space.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surface,
  },
  optionActive: {
    borderColor: color.success,
    backgroundColor: color.surfaceAlt,
  },
  optionContent: { flex: 1 },
  optionLabel: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
    marginBottom: 2,
  },
  optionLabelActive: { color: color.success },
  optionDescription: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: color.success },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: color.success,
  },
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
