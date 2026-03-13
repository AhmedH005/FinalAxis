import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { authRoutes } from '@/types/navigation';

const SIGNALS = [
  { icon: 'heart-pulse', label: 'Body state' },
  { icon: 'emoticon-outline', label: 'Mood' },
  { icon: 'check-circle-outline', label: 'Habits' },
  { icon: 'notebook-outline', label: 'Reflection' },
] as const;

const PRINCIPLES = [
  'Capture the signals behind progress, not just the outcomes.',
  'See behavior in context instead of across disconnected apps.',
  'Turn daily check-ins into patterns you can actually understand.',
] as const;

function SignalPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.signalPill}>
      <MaterialCommunityIcons name={icon as any} size={14} color={color.success} />
      <Text style={styles.signalPillText}>{label}</Text>
    </View>
  );
}

function PrincipleRow({ copy }: { copy: string }) {
  return (
    <View style={styles.principleRow}>
      <View style={styles.principleDot} />
      <Text style={styles.principleCopy}>{copy}</Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.wordmark}>AXIS</Text>
          <Text style={styles.eyebrow}>Behavioral intelligence for everyday life</Text>
          <Text style={styles.tagline}>
            See how your body, mood, habits, and reflection shape each day.
          </Text>
          <Text style={styles.bodyCopy}>
            AXIS helps you capture the signals behind your behavior, then turns those
            signals into patterns you can understand and adjust.
          </Text>
        </View>

        <View style={styles.signalGrid}>
          {SIGNALS.map((signal) => (
            <SignalPill key={signal.label} icon={signal.icon} label={signal.label} />
          ))}
        </View>

        <View style={styles.storyCard}>
          <View style={styles.storyHeader}>
            <Text style={styles.storyTitle}>Why AXIS feels different</Text>
            <Text style={styles.storySubtitle}>
              It is not another single-purpose tracker. It is one place to interpret how you
              actually operate.
            </Text>
          </View>

          <View style={styles.principles}>
            {PRINCIPLES.map((copy) => (
              <PrincipleRow key={copy} copy={copy} />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push(authRoutes.signup)}
          >
            <Text style={styles.primaryButtonText}>Create account</Text>
          </Pressable>

          <Pressable
            style={styles.ghostButton}
            onPress={() => router.push(authRoutes.login)}
          >
            <Text style={styles.ghostButtonText}>I already have an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  hero: {
    gap: space.md,
  },
  wordmark: {
    fontSize: typography['5xl'],
    fontWeight: '800',
    color: color.text.primary,
    letterSpacing: 8,
  },
  eyebrow: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.success,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
    lineHeight: 40,
    letterSpacing: -0.6,
    maxWidth: 340,
  },
  bodyCopy: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 24,
    maxWidth: 360,
  },
  signalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.outline,
  },
  signalPillText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  storyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.lg,
  },
  storyHeader: {
    gap: space.xs,
  },
  storyTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
  },
  storySubtitle: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  principles: {
    gap: space.md,
  },
  principleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  principleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.success,
    marginTop: 6,
  },
  principleCopy: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.primary,
    lineHeight: 20,
  },
  actions: {
    gap: space.sm,
    marginTop: 'auto' as const,
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
  ghostButton: {
    paddingVertical: space.md,
    borderRadius: radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surface,
  },
  ghostButtonText: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
  },
});
