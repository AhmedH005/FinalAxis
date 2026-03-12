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

type Sex = 'male' | 'female' | 'other';

export default function OnboardingProfile() {
  const router = useRouter();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session!.user.id,
        full_name: name.trim(),
        date_of_birth: dob || null,
        biological_sex: sex,
      });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    router.push('/(auth)/onboarding/body');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.progress}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <View style={styles.header}>
          <Text style={styles.step}>Step 1 of 3</Text>
          <Text style={styles.title}>Build your baseline</Text>
          <Text style={styles.subtitle}>
            AXIS starts with a few basics, then learns from the signals you add over time.
          </Text>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            Only your name is required. Everything else just helps AXIS interpret your data more accurately.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              placeholderTextColor={color.text.muted}
              placeholder="Your first name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of birth{' '}
              <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={setDob}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
              placeholderTextColor={color.text.muted}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Biological sex{' '}
              <Text style={styles.optional}>(optional)</Text>
            </Text>
            <View style={styles.pills}>
              {(['male', 'female', 'other'] as Sex[]).map((s) => (
                <Pressable
                  key={s}
                  style={[styles.pill, sex === s && styles.pillActive]}
                  onPress={() => setSex(sex === s ? null : s)}
                >
                  <Text style={[styles.pillText, sex === s && styles.pillTextActive]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.primaryButton, loading && styles.disabled]}
          onPress={handleNext}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={color.text.inverse} />
          ) : (
            <Text style={styles.primaryButtonText}>Continue →</Text>
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
  dot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.outline,
  },
  dotActive: {
    backgroundColor: color.success,
  },
  header: {
    marginBottom: space.xl,
  },
  step: {
    fontSize: typography.sm,
    color: color.text.muted,
    marginBottom: space.xs,
  },
  title: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
    marginBottom: space.xs,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
  },
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
  field: {
    gap: space.xs,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: {
    fontWeight: '400',
    textTransform: 'none',
  },
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
  pills: {
    flexDirection: 'row',
    gap: space.sm,
  },
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
  },
  pillActive: {
    backgroundColor: color.success,
    borderColor: color.success,
  },
  pillText: {
    fontSize: typography.sm,
    color: color.text.muted,
    fontWeight: '600',
  },
  pillTextActive: {
    color: color.text.inverse,
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
