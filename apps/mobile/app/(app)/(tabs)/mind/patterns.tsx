import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { color, space, radius, typography } from '@axis/theme';
import {
  HabitConsistencyCard,
  JournalActivityCard,
  MindInsightRow,
  MoodPatternCard,
  ReflectionCard,
} from '@/features/mind/MindPatternSections';
import { useMindPatternsScreen } from '@/features/mind/useMindPatternsScreen';

export default function PatternsScreen() {
  const mind = useMindPatternsScreen();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={color.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Patterns</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MindInsightRow insights={mind.insights} />
        <MoodPatternCard mood={mind.snapshot.mood} />
        {mind.hasHabitData ? <HabitConsistencyCard items={mind.snapshot.habits.items} /> : null}
        <JournalActivityCard
          days={mind.snapshot.days}
          journal={mind.snapshot.journal}
          streak={mind.journalStreak}
        />
        <ReflectionCard text={mind.snapshot.reflection} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
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
  headerTitle: {
    flex: 1,
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.4,
  },
});
