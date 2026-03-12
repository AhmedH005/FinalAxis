import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { color, space, radius, typography } from '@axis/theme';
import {
  MIND_COLOR,
  todayDateStr,
  formatEntryDate,
  formatEntryTime,
  formatMonthHeader,
  wordCountLabel,
} from '@/engines/mind/utils';
import { useJournalEntries } from '@/engines/mind/queries';
import { useCreateJournalEntry } from '@/engines/mind/mutations';
import type { JournalEntry } from '@/engines/mind/types';

const ENTRY_TYPE_COLORS: Record<string, string> = {
  journal:       MIND_COLOR,
  quick_thought: color.warn,
  note:          color.text.muted,
  reflection:    color.success,
};

const ENTRY_TYPE_LABELS: Record<string, string> = {
  journal:       'Journal',
  quick_thought: 'Quick',
  note:          'Note',
  reflection:    'Reflect',
};

function EntryCard({ entry, onPress }: { entry: JournalEntry; onPress: () => void }) {
  const typeColor = ENTRY_TYPE_COLORS[entry.entry_type] ?? color.text.muted;
  const hasTitle  = !!entry.title?.trim();
  const bodyLine  = entry.body.trim().split('\n')[0].slice(0, 100);

  return (
    <Pressable style={styles.entryCard} onPress={onPress}>
      {/* Left accent bar */}
      <View style={[styles.entryAccentBar, { backgroundColor: typeColor }]} />

      <View style={styles.entryCardContent}>
        <View style={styles.entryCardMeta}>
          <Text style={styles.entryDateText}>{formatEntryDate(entry.entry_date)}</Text>
          <Text style={styles.entryDot}>·</Text>
          <Text style={styles.entryTimeText}>{formatEntryTime(entry.created_at)}</Text>
          {entry.word_count > 0 && (
            <>
              <Text style={styles.entryDot}>·</Text>
              <Text style={styles.entryWordCount}>{entry.word_count}w</Text>
            </>
          )}
        </View>

        {hasTitle && (
          <Text style={styles.entryTitle} numberOfLines={1}>{entry.title}</Text>
        )}

        {bodyLine.length > 0 && (
          <Text style={[styles.entryPreview, hasTitle && styles.entryPreviewSmall]} numberOfLines={hasTitle ? 1 : 2}>
            {bodyLine}
          </Text>
        )}

        {entry.tags.length > 0 && (
          <View style={styles.entryTagsRow}>
            {entry.tags.slice(0, 4).map(tag => (
              <Text key={tag} style={styles.entryTag}>#{tag}</Text>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function JournalListScreen() {
  const [search, setSearch] = useState('');
  const today = todayDateStr();

  const { data: entries = [], isLoading } = useJournalEntries(60);
  const createEntry = useCreateJournalEntry();

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      e =>
        e.body.toLowerCase().includes(q) ||
        (e.title?.toLowerCase().includes(q) ?? false) ||
        e.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [entries, search]);

  // Group entries by month
  const grouped = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const entry of filtered) {
      const month = entry.entry_date.slice(0, 7); // YYYY-MM
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(entry);
    }
    return [...map.entries()].map(([month, items]) => ({ month, items }));
  }, [filtered]);

  function handleNewEntry(type: 'journal' | 'quick_thought' | 'note' | 'reflection' = 'journal') {
    createEntry.mutate(
      { entry_type: type, entry_date: today },
      { onSuccess: (entry) => router.push(`/(app)/mind/journal/${entry.id}` as any) }
    );
  }

  function openEntry(entry: JournalEntry) {
    router.push(`/(app)/mind/journal/${entry.id}` as any);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={color.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Journal</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => handleNewEntry('journal')}
          disabled={createEntry.isPending}
        >
          {createEntry.isPending
            ? <ActivityIndicator size="small" color={MIND_COLOR} />
            : <MaterialCommunityIcons name="plus" size={20} color={MIND_COLOR} />
          }
        </Pressable>
      </View>

      {/* Quick capture strip */}
      <View style={styles.quickStrip}>
        {(['quick_thought', 'note', 'reflection'] as const).map(type => (
          <Pressable
            key={type}
            style={styles.quickChip}
            onPress={() => handleNewEntry(type)}
            disabled={createEntry.isPending}
          >
            <Text style={styles.quickChipText}>+ {ENTRY_TYPE_LABELS[type]}</Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={16} color={color.text.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search entries…"
          placeholderTextColor={color.text.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close" size={14} color={color.text.muted} />
          </Pressable>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={MIND_COLOR} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {grouped.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="notebook-outline" size={40} color={color.outline} />
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to write your first entry</Text>
            </View>
          ) : (
            grouped.map(({ month, items }) => (
              <View key={month}>
                <Text style={styles.monthHeader}>
                  {formatMonthHeader(`${month}-01`)}
                </Text>
                {items.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onPress={() => openEntry(entry)}
                  />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.xs,
  },

  // Header
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
  newBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: MIND_COLOR + '18',
    borderWidth: 1,
    borderColor: MIND_COLOR + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick capture
  quickStrip: {
    flexDirection: 'row',
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  quickChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  quickChipText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: color.text.muted,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sm,
    color: color.text.primary,
  },

  // Month header
  monthHeader: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingTop: space.md,
    paddingBottom: space.xs,
  },

  // Entry card
  entryCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.xs,
  },
  entryAccentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  entryCardContent: {
    flex: 1,
    gap: 5,
    padding: space.md,
  },
  entryCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  entryDateText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.primary,
  },
  entryDot: {
    fontSize: typography.xs,
    color: color.outline,
  },
  entryTimeText: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
  entryWordCount: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
  entryTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.2,
  },
  entryPreview: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  entryPreviewSmall: {
    fontSize: typography.xs,
    lineHeight: 18,
  },
  entryTagsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 1,
  },
  entryTag: {
    fontSize: 10,
    color: MIND_COLOR,
    fontWeight: '600',
  },

  // States
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: space.sm,
  },
  emptyTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
    marginTop: space.sm,
  },
  emptySubtitle: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
});
