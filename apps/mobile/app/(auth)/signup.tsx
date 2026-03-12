import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space, radius, typography } from '@axis/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email.trim() || !password) return;
    if (password.length < 8) {
      Alert.alert('Password too short', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const { error, needsConfirmation } = await signUp(email.trim().toLowerCase(), password);
    setLoading(false);

    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }

    if (needsConfirmation) {
      Alert.alert(
        'Check your email',
        `We sent a confirmation link to ${email.trim().toLowerCase()}. Open it to activate your account, then sign in.`,
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Create your account</Text>
            <Text style={styles.title}>Start with a simple setup, then keep tracking light.</Text>
            <Text style={styles.subtitle}>You will set your basics in a short onboarding flow right after this.</Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                placeholderTextColor={color.text.muted}
                placeholder="you@example.com"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                placeholderTextColor={color.text.muted}
                placeholder="At least 8 characters"
              />
            </View>

            <View style={styles.notes}>
              <Text style={styles.note}>Takes less than a minute to get started.</Text>
              <Text style={styles.note}>You can refine your targets later in settings.</Text>
            </View>

            <Pressable
              style={[styles.primaryButton, loading && styles.disabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={color.text.inverse} />
              ) : (
                <Text style={styles.primaryButtonText}>Create account</Text>
              )}
            </Pressable>

            <Text style={styles.legal}>
              By creating an account you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already registered?</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  back: {
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  backText: {
    color: color.text.muted,
    fontSize: typography.base,
  },
  header: {
    marginBottom: space.xl,
    gap: space.xs,
  },
  eyebrow: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  title: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 22,
    maxWidth: 320,
  },
  formCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.md,
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
  input: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: typography.base,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.outline,
  },
  notes: {
    gap: 4,
  },
  note: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  primaryButton: {
    backgroundColor: color.success,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: space.xs,
  },
  primaryButtonText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.inverse,
  },
  disabled: {
    opacity: 0.6,
  },
  legal: {
    fontSize: typography.xs,
    color: color.text.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.xs,
    marginTop: space.xl,
  },
  footerText: {
    color: color.text.muted,
    fontSize: typography.base,
  },
  footerLink: {
    color: color.success,
    fontSize: typography.base,
    fontWeight: '600',
  },
});
