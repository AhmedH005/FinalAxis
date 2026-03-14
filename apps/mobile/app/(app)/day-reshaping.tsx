import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, radius, space, typography } from '@axis/theme';
import {
  DayReshapingContent,
  DayReshapingUnavailableCard,
} from '@/features/day-reshaping/DayReshapingSections';
import { useDayReshapingScreen } from '@/features/day-reshaping/useDayReshapingScreen';

export default function DayReshapingScreen() {
  const reshape = useDayReshapingScreen();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={reshape.goBack}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={color.text.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Day reshaping</Text>
          <Text style={styles.headerSubtitle}>
            Review a small set of safe schedule changes before AXIS applies anything.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {reshape.isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={color.text.primary} />
            <Text style={styles.loadingTitle}>Building the reshape review</Text>
            <Text style={styles.loadingDetail}>
              AXIS is lining up the proposal against your current schedule.
            </Text>
          </View>
        ) : reshape.model.isAvailable ? (
          <DayReshapingContent
            model={reshape.model}
            message={reshape.message}
            onApply={reshape.applyPlan}
            onKeepDay={reshape.keepDayAsIs}
            onUndo={reshape.undoPlan}
            isApplying={reshape.isApplying}
            isUndoing={reshape.isUndoing}
          />
        ) : (
          <DayReshapingUnavailableCard model={reshape.model} />
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
