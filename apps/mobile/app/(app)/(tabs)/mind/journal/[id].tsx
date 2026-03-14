import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Pressable, ActivityIndicator, KeyboardAvoidingView, Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { color, space, radius, typography } from '@axis/theme';
import {
  MIND_COLOR,
  getDailyPrompt,
  countWords,
  wordCountLabel,
} from '@/engines/mind/utils';
import { useJournalEntry } from '@/engines/mind/queries';
import { useUpdateJournalEntry, useDeleteJournalEntry } from '@/engines/mind/mutations';

type SaveStatus = 'idle' | 'saving' | 'saved';

const PROMPT = getDailyPrompt();
const AUTOSAVE_DELAY = 1400;

function TagChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={styles.tagChip}>
      <Text style={styles.tagChipText}>{label}</Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <MaterialCommunityIcons name="close" size={10} color={MIND_COLOR} />
      </Pressable>
    </View>
  );
}

export default function JournalEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry, isLoading } = useJournalEntry(id ?? null);

  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();

  const [title,      setTitle]      = useState('');
  const [body,       setBody]       = useState('');
  const [tags,       setTags]       = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hydrated,   setHydrated]   = useState(false);

  const [showTagModal,    setShowTagModal]    = useState(false);
  const [newTag,          setNewTag]          = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (entry && !hydrated) {
      setTitle(entry.title ?? '');
      setBody(entry.body);
      setTags(entry.tags ?? []);
      setHydrated(true);
    }
  }, [entry, hydrated]);

  const scheduleSave = useCallback(
    (nextTitle: string, nextBody: string, nextTags: string[]) => {
      if (!id) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      setSaveStatus('saving');
      saveTimeout.current = setTimeout(() => {
        updateEntry.mutate(
          { id, title: nextTitle.trim() || null, body: nextBody, tags: nextTags },
          {
            onSuccess: () => setSaveStatus('saved'),
            onError:   () => setSaveStatus('idle'),
          }
        );
      }, AUTOSAVE_DELAY);
    },
    [id, updateEntry]
  );

  function handleTitleChange(text: string) {
    setTitle(text);
    scheduleSave(text, body, tags);
  }

  function handleBodyChange(text: string) {
    setBody(text);
    scheduleSave(title, text, tags);
  }

  function handleAddTag() {
    const t = newTag.trim().toLowerCase();
    if (!t || tags.includes(t)) { setNewTag(''); return; }
    const next = [...tags, t];
    setTags(next);
    setNewTag('');
    scheduleSave(title, body, next);
  }

  function handleRemoveTag(tag: string) {
    const next = tags.filter(t => t !== tag);
    setTags(next);
    scheduleSave(title, body, next);
  }

  function handleDelete() {
    if (!id) return;
    deleteEntry.mutate(id, { onSuccess: () => router.back() });
  }

  const wordCount = countWords(body);

  if (isLoading || !hydrated) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={MIND_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  const entryDate = entry?.entry_date
    ? format(new Date(`${entry.entry_date}T12:00:00`), 'EEEE, MMMM d')
    : format(new Date(), 'EEEE, MMMM d');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={color.text.muted} />
          </Pressable>

          <View style={styles.saveIndicator}>
            {saveStatus === 'saving' && (
              <Text style={styles.saveTextSaving}>saving…</Text>
            )}
            {saveStatus === 'saved' && (
              <Text style={styles.saveTextSaved}>saved</Text>
            )}
          </View>

          <Pressable style={styles.moreBtn} onPress={() => setShowDeleteModal(true)} hitSlop={8}>
            <MaterialCommunityIcons name="dots-horizontal" size={22} color={color.text.muted} />
          </Pressable>
        </View>

        {/* ── Writing area ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.dateLabel}>{entryDate}</Text>

          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={handleTitleChange}
            placeholder="Untitled"
            placeholderTextColor={color.text.muted + '40'}
            multiline={false}
            returnKeyType="next"
            maxLength={200}
          />

          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={handleBodyChange}
            placeholder={PROMPT}
            placeholderTextColor={color.text.muted + '45'}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            autoFocus={!body && !title}
          />

          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map(tag => (
                <TagChip key={tag} label={tag} onRemove={() => handleRemoveTag(tag)} />
              ))}
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* ── Bottom bar ── */}
        <View style={styles.bottomBar}>
          <Pressable style={styles.tagAction} onPress={() => setShowTagModal(true)}>
            <MaterialCommunityIcons name="tag-outline" size={15} color={color.text.muted} />
            <Text style={styles.tagActionText}>
              {tags.length > 0 ? tags.map(t => `#${t}`).join(' ') : 'Add tags'}
            </Text>
          </Pressable>
          <Text style={styles.wordCount}>{wordCountLabel(wordCount)}</Text>
        </View>
      </KeyboardAvoidingView>

      {/* ── Tag modal ── */}
      <Modal visible={showTagModal} transparent animationType="slide" onRequestClose={() => setShowTagModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowTagModal(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Tags</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={styles.tagInput}
                value={newTag}
                onChangeText={setNewTag}
                placeholder="gratitude, work, reflection…"
                placeholderTextColor={color.text.muted}
                autoFocus
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
                autoCapitalize="none"
              />
              <Pressable style={[styles.tagAddBtn, !newTag.trim() && { opacity: 0.4 }]} onPress={handleAddTag}>
                <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              </Pressable>
            </View>
            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map(tag => (
                  <TagChip key={tag} label={tag} onRemove={() => handleRemoveTag(tag)} />
                ))}
              </View>
            )}
            <Pressable style={styles.sheetDoneBtn} onPress={() => setShowTagModal(false)}>
              <Text style={styles.sheetDoneBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Delete this entry?</Text>
            <Text style={styles.sheetSubtitle}>
              This can't be undone. Your words will be gone permanently.
            </Text>
            <Pressable style={styles.deleteBtn} onPress={handleDelete} disabled={deleteEntry.isPending}>
              {deleteEntry.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.deleteBtnText}>Delete entry</Text>
              }
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setShowDeleteModal(false)}>
              <Text style={styles.cancelBtnText}>Keep it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Top bar — intentionally minimal, no border
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIndicator: {
    flex: 1,
    alignItems: 'center',
  },
  saveTextSaving: {
    fontSize: typography.xs,
    color: color.text.muted,
    letterSpacing: 0.2,
    fontStyle: 'italic',
  },
  saveTextSaved: {
    fontSize: typography.xs,
    color: color.success,
    letterSpacing: 0.2,
  },
  moreBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Writing area
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: space.xl,
    paddingTop: space.xs,
    paddingBottom: space.md,
  },
  dateLabel: {
    fontSize: typography.sm,
    fontWeight: '500',
    color: MIND_COLOR,
    marginBottom: space.lg,
    letterSpacing: 0.1,
  },
  titleInput: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.6,
    paddingVertical: 0,
    marginBottom: space.lg,
    lineHeight: 38,
  },
  bodyInput: {
    fontSize: 17,
    color: color.text.primary,
    lineHeight: 30,
    paddingVertical: 0,
    minHeight: 260,
    letterSpacing: 0.1,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.lg,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: MIND_COLOR + '18',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: MIND_COLOR + '35',
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: MIND_COLOR,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.sm + 2,
    borderTopWidth: 1,
    borderTopColor: color.outline,
    backgroundColor: color.bg,
    gap: space.md,
  },
  tagAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tagActionText: {
    fontSize: typography.xs,
    color: color.text.muted,
    fontWeight: '500',
    flex: 1,
  },
  wordCount: {
    fontSize: typography.xs,
    color: color.text.muted,
  },

  // Sheets / modals
  overlay: {
    flex: 1,
    backgroundColor: '#000000B0',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: color.outline,
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
  },
  sheetHandle: {
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: color.outline,
    alignSelf: 'center',
    marginBottom: space.xs,
  },
  sheetTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 21,
    marginTop: -space.xs,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  tagInput: {
    flex: 1,
    backgroundColor: color.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typography.sm,
    color: color.text.primary,
  },
  tagAddBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: MIND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDoneBtn: {
    backgroundColor: color.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingVertical: space.sm + 2,
    alignItems: 'center',
    marginTop: space.xs,
  },
  sheetDoneBtnText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  deleteBtn: {
    backgroundColor: color.danger,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: '#fff',
  },
  cancelBtn: {
    backgroundColor: color.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingVertical: space.sm + 2,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
  },
});
