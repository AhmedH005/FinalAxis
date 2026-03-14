import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, radius, space, typography } from '@axis/theme';
import {
  GoalAlignmentDetailContent,
  GoalAlignmentUnavailableCard,
} from '@/features/goal-alignment/GoalAlignmentDetailSections';
import { useGoalAlignmentScreen } from '@/features/goal-alignment/useGoalAlignmentScreen';

export default function GoalAlignmentScreen() {
  const goal = useGoalAlignmentScreen();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={goal.goBack}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={color.text.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Goal alignment</Text>
          <Text style={styles.headerSubtitle}>
            A fuller read on how today is lining up against the active direction.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {goal.isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={color.text.primary} />
            <Text style={styles.loadingTitle}>Building the goal read</Text>
            <Text style={styles.loadingDetail}>
              AXIS is pulling together the signals behind today&apos;s alignment call.
            </Text>
          </View>
        ) : goal.model.isAvailable ? (
          <GoalAlignmentDetailContent model={goal.model} onOpenRoute={goal.openRoute} />
        ) : (
          <GoalAlignmentUnavailableCard model={goal.model} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
    maxWidth: 320,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  loadingCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.xl,
    gap: space.sm,
  },
  loadingTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  loadingDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
    maxWidth: 280,
  },
});
