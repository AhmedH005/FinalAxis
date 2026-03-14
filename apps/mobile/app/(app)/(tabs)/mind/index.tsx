import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space, typography } from '@axis/theme';
import {
  HabitsSection,
  MoodSection,
  PillarLinks,
  PromptHero,
} from '@/features/mind/MindHubSections';
import { useMindHubScreen } from '@/features/mind/useMindHubScreen';

export default function MindHubScreen() {
  const mind = useMindHubScreen();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greeting}>
          <Text style={styles.greetingLine}>{mind.greeting}</Text>
          <Text style={styles.dateLine}>{mind.dateLabel}</Text>
          <Text style={styles.subtitleLine}>
            Mood, habits, and reflection explain the forces behind your day.
          </Text>
        </View>

        <PromptHero
          prompt={mind.prompt}
          wordCount={mind.dailySummary.wordCount}
          isLoading={mind.entryLoading}
          isPending={mind.isCreatingEntry}
          hasEntry={mind.dailySummary.hasJournalEntry}
          onPress={mind.handleBeginWriting}
        />

        <MoodSection
          moodScore={mind.dailySummary.moodScore}
          isSaving={mind.isSavingMood}
          onQuickMood={mind.handleQuickMood}
          onEdit={mind.openMood}
        />

        <HabitsSection
          isLoading={mind.habitsLoading}
          habits={mind.todayHabits}
          completedCount={mind.completedCount}
          onToggle={mind.handleToggleHabit}
          onOpen={mind.openHabits}
        />

        <PillarLinks onOpen={mind.openRoute} />
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
    paddingTop: space.lg,
    paddingBottom: 40,
    gap: space.lg,
  },
  greeting: {
    gap: 3,
  },
  greetingLine: {
    fontSize: typography.sm,
    color: color.text.muted,
    letterSpacing: 0.1,
  },
  dateLine: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.5,
  },
  subtitleLine: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
    maxWidth: 320,
    marginTop: 2,
  },
});
