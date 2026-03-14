import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, typography } from '@axis/theme';
import { QuickCaptureSheet } from '@/features/capture/QuickCaptureSheet';
import {
  CourseCorrectionSection,
  CurrentStateSection,
  DayReshapingSection,
  EngineLinksSection,
  GoalAlignmentSection,
  InsightsSection,
  WeeklyReflectionSection,
} from '@/features/today/LifeOsSections';
import { useTodayScreen } from '@/features/today/useTodayScreen';

export default function TodayScreen() {
  const today = useTodayScreen();
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const openCapture = useCallback(() => setShowQuickCapture(true), []);
  const closeCapture = useCallback(() => setShowQuickCapture(false), []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerCopy}>
              <Text style={styles.date}>{today.dateLabel}</Text>
              <Text style={styles.greeting}>{today.greeting}</Text>
              <Text style={styles.subtitle}>A single read across time, body, and mind.</Text>
            </View>

            <Pressable style={styles.captureBtn} onPress={openCapture}>
              <MaterialCommunityIcons name="pencil-plus-outline" size={18} color={color.text.primary} />
              <Text style={styles.captureBtnText}>Capture</Text>
            </Pressable>
          </View>
        </View>

        {today.isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={color.text.primary} />
            <Text style={styles.loadingTitle}>Building today&apos;s read</Text>
            <Text style={styles.loadingDetail}>
              AXIS is pulling together your time, body, and mind signals.
            </Text>
          </View>
        ) : (
          <View style={styles.sectionStack}>
            <CurrentStateSection currentState={today.model.currentState} />

            <InsightsSection
              primaryInsight={today.model.primaryInsight}
              supportingInsights={today.model.supportingInsights}
              positiveInsight={today.model.positiveInsight}
              onOpenRoute={today.openRoute}
            />

            <GoalAlignmentSection
              goalAlignment={today.model.goalAlignment}
              onOpenRoute={today.openRoute}
            />

            <DayReshapingSection
              section={today.model.dayReshaping}
              onOpenRoute={today.openRoute}
            />

            <CourseCorrectionSection
              primaryAction={today.model.courseCorrections.primaryAction}
              secondaryAction={today.model.courseCorrections.secondaryAction}
              onOpenRoute={today.openRoute}
            />

            <EngineLinksSection
              links={today.model.engineLinks}
              onOpenRoute={today.openRoute}
            />

            <WeeklyReflectionSection
              section={today.model.weeklyReflection}
              onOpenRoute={today.openRoute}
            />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {showQuickCapture ? (
        <QuickCaptureSheet visible={showQuickCapture} onClose={closeCapture} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  container: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  header: {
    paddingTop: space.lg,
    marginBottom: space.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
  },
  headerCopy: {
    flex: 1,
    gap: space.xs,
  },
  date: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  greeting: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 22,
    maxWidth: 320,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surface,
  },
  captureBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  loadingCard: {
    backgroundColor: color.surface,
    borderRadius: 20,
    padding: space.xl,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'flex-start',
    gap: space.sm,
  },
  loadingTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  loadingDetail: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
    maxWidth: 280,
  },
  sectionStack: {
    gap: space.xl,
  },
  bottomSpacer: {
    height: 24,
  },
});
