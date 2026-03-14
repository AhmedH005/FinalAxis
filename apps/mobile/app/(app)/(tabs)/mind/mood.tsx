import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { color, space, radius, typography } from '@axis/theme';
import {
  MIND_COLOR,
  MOOD_DESCRIPTORS,
  getMoodDescriptor,
  moodColor,
  moodEmoji,
  moodLabel,
} from '@/engines/mind/utils';
import { useRecentMoodLogs, useTodayMood } from '@/engines/mind/queries';
import { useAddMoodLog, useDeleteMoodLog } from '@/engines/mind/mutations';
import type { MoodLog } from '@/engines/mind/types';

// ─── Sub-components ───────────────────────────────────────────────────────────

function MoodScoreSelector({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (score: number) => void;
}) {
  const desc = getMoodDescriptor(selected);
  return (
    <View style={styles.scorePicker}>
      <View style={styles.scoreDisplay}>
        <Text style={styles.scoreEmoji}>{desc.emoji}</Text>
        <View style={styles.scoreDisplayInfo}>
          <Text style={[styles.scoreNum, { color: desc.color }]}>{selected}</Text>
          <Text style={styles.scoreLabel}>{desc.label}</Text>
        </View>
      </View>
      <View style={styles.scoreBars}>
        {MOOD_DESCRIPTORS.map(d => (
          <Pressable
            key={d.score}
            style={styles.scoreBarTap}
            onPress={() => onSelect(d.score)}
            hitSlop={4}
          >
            <View style={[
              styles.scoreBar,
              { backgroundColor: d.score <= selected ? d.color : color.outline },
              d.score === selected && styles.scoreBarActive,
            ]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LevelSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.levelRow}>
      <Text style={styles.levelLabel}>{label}</Text>
      <View style={styles.levelBtns}>
        {[1, 2, 3, 4, 5].map(n => (
          <Pressable
            key={n}
            style={[styles.levelBtn, n <= value && styles.levelBtnActive]}
            onPress={() => onChange(n === value ? 0 : n)}
          >
            <View style={[styles.levelDot, n <= value && { backgroundColor: MIND_COLOR }]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MoodLogRow({ log, onDelete }: { log: MoodLog; onDelete: () => void }) {
  const desc = getMoodDescriptor(log.mood_score);
  return (
    <View style={styles.logRow}>
      <Text style={[styles.logEmoji]}>{moodEmoji(log.mood_score)}</Text>
      <View style={styles.logContent}>
        <View style={styles.logMeta}>
          <Text style={[styles.logScore, { color: desc.color }]}>
            {log.mood_score}/10 · {desc.label}
          </Text>
          <Text style={styles.logTime}>
            {format(new Date(log.logged_at), 'MMM d, h:mm a')}
          </Text>
        </View>
        {log.note ? (
          <Text style={styles.logNote} numberOfLines={2}>{log.note}</Text>
        ) : null}
        {log.energy_level || log.stress_level ? (
          <View style={styles.logSignals}>
            {log.energy_level ? (
              <Text style={styles.logSignal}>Energy {log.energy_level}/5</Text>
            ) : null}
            {log.stress_level ? (
              <Text style={styles.logSignal}>Stress {log.stress_level}/5</Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <Pressable onPress={onDelete} hitSlop={8}>
        <MaterialCommunityIcons name="trash-can-outline" size={16} color={color.text.muted} />
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MoodScreen() {
  const [showLog, setShowLog] = useState(false);

  // Form state
  const [score,  setScore]  = useState(7);
  const [energy, setEnergy] = useState(0);
  const [stress, setStress] = useState(0);
  const [note,   setNote]   = useState('');

  const { data: todayMood } = useTodayMood();
  const { data: logs = [], isLoading } = useRecentMoodLogs(14);
  const addMood    = useAddMoodLog();
  const deleteMood = useDeleteMoodLog();

  function openLogModal() {
    if (todayMood) {
      setScore(todayMood.mood_score);
      setEnergy(todayMood.energy_level ?? 0);
      setStress(todayMood.stress_level ?? 0);
      setNote(todayMood.note ?? '');
    } else {
      setScore(7); setEnergy(0); setStress(0); setNote('');
    }
    setShowLog(true);
  }

  function handleSubmit() {
    addMood.mutate(
      { mood_score: score, energy_level: energy || null, stress_level: stress || null, note: note.trim() || null },
      { onSuccess: () => { setShowLog(false); setNote(''); } }
    );
  }

  const desc = getMoodDescriptor(score);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={color.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Mood</Text>
        <Pressable style={styles.logBtn} onPress={openLogModal}>
          <MaterialCommunityIcons name="plus" size={18} color={MIND_COLOR} />
          <Text style={styles.logBtnText}>Log</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's mood summary */}
        {todayMood ? (
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>TODAY</Text>
            <View style={styles.todayMain}>
              <Text style={styles.todayEmoji}>{moodEmoji(todayMood.mood_score)}</Text>
              <View>
                <Text style={[styles.todayScore, { color: moodColor(todayMood.mood_score) }]}>
                  {todayMood.mood_score}/10
                </Text>
                <Text style={styles.todayMoodLabel}>
                  {moodLabel(todayMood.mood_score)}
                </Text>
              </View>
            </View>
            {todayMood.note ? (
              <Text style={styles.todayNote}>{todayMood.note}</Text>
            ) : null}
            <Pressable style={styles.editMoodBtn} onPress={openLogModal}>
              <Text style={styles.editMoodBtnText}>Log another</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.logPromptCard} onPress={openLogModal}>
            <MaterialCommunityIcons name="emoticon-outline" size={28} color={MIND_COLOR} />
            <View>
              <Text style={styles.logPromptTitle}>How are you feeling?</Text>
              <Text style={styles.logPromptSub}>Tap to log today's mood</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={color.text.muted} />
          </Pressable>
        )}

        {/* History */}
        <Text style={styles.sectionLabel}>Last 14 days</Text>

        {isLoading ? (
          <ActivityIndicator size="small" color={MIND_COLOR} style={{ marginTop: space.lg }} />
        ) : logs.length === 0 ? (
          <Text style={styles.emptyText}>No mood logs yet.</Text>
        ) : (
          logs.map(log => (
            <MoodLogRow
              key={log.id}
              log={log as MoodLog}
              onDelete={() => deleteMood.mutate(log.id)}
            />
          ))
        )}
      </ScrollView>

      {/* Log modal */}
      <Modal
        visible={showLog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLog(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowLog(false)}>
          <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>How are you feeling?</Text>

            {/* Score selector */}
            <MoodScoreSelector selected={score} onSelect={setScore} />

            {/* Secondary signals */}
            <LevelSelector label="Energy"  value={energy} onChange={setEnergy} />
            <LevelSelector label="Stress"  value={stress} onChange={setStress} />

            {/* Note */}
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note (optional)"
              placeholderTextColor={color.text.muted}
              multiline
              maxLength={300}
            />

            <Pressable
              style={[styles.submitBtn, { backgroundColor: desc.color }]}
              onPress={handleSubmit}
              disabled={addMood.isPending}
            >
              {addMood.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>Log feeling</Text>
              }
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.md,
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
    width: 36, height: 36,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderWidth: 1, borderColor: color.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.4,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: MIND_COLOR + '18',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: MIND_COLOR + '40',
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 1,
  },
  logBtnText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: MIND_COLOR,
  },

  // Today card
  todayCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: MIND_COLOR + '28',
    padding: space.lg,
    gap: space.sm,
  },
  todayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: MIND_COLOR,
    letterSpacing: 1.2,
  },
  todayMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  todayEmoji: { fontSize: 40 },
  todayScore: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  todayMoodLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
    textTransform: 'capitalize',
  },
  todayNote: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  editMoodBtn: {
    alignSelf: 'flex-start',
    backgroundColor: color.bg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    marginTop: space.xs,
  },
  editMoodBtnText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: color.text.muted,
  },

  // Log prompt
  logPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: MIND_COLOR + '28',
    padding: space.lg,
  },
  logPromptTitle: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
  },
  logPromptSub: {
    fontSize: typography.xs,
    color: color.text.muted,
    marginTop: 2,
  },

  // Section
  sectionLabel: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingTop: space.xs,
  },

  // Log row
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
  },
  logEmoji: { fontSize: 24, marginTop: 2 },
  logContent: { flex: 1, gap: 4 },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  logScore: {
    fontSize: typography.sm,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  logTime: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
  logNote: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  logSignals: {
    flexDirection: 'row',
    gap: space.sm,
  },
  logSignal: {
    fontSize: typography.xs,
    color: color.text.muted,
    backgroundColor: color.bg,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs + 2,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: color.outline,
  },
  emptyText: {
    fontSize: typography.sm,
    color: color.text.muted,
    textAlign: 'center',
    marginTop: space.xl,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: '#000000AA',
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
    gap: space.md,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.outline,
    alignSelf: 'center',
    marginBottom: space.xs,
  },
  sheetTitle: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.3,
  },
  // Score picker
  scorePicker: {
    gap: space.md,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  scoreEmoji: { fontSize: 48 },
  scoreDisplayInfo: { gap: 2 },
  scoreNum: {
    fontSize: typography['3xl'],
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  scoreLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
    textTransform: 'capitalize',
  },
  scoreBars: {
    flexDirection: 'row',
    gap: 4,
    height: 40,
    alignItems: 'flex-end',
  },
  scoreBarTap: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  scoreBar: {
    width: '100%',
    height: '55%',
    borderRadius: 3,
  },
  scoreBarActive: {
    height: '100%',
  },

  // Level selector
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  levelLabel: {
    width: 52,
    fontSize: typography.sm,
    fontWeight: '500',
    color: color.text.primary,
  },
  levelBtns: {
    flexDirection: 'row',
    gap: space.xs,
  },
  levelBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: color.bg,
    borderWidth: 1,
    borderColor: color.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBtnActive: {
    borderColor: MIND_COLOR + '60',
    backgroundColor: MIND_COLOR + '14',
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.outline,
  },

  // Note
  noteInput: {
    backgroundColor: color.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    fontSize: typography.sm,
    color: color.text.primary,
    minHeight: 72,
    textAlignVertical: 'top',
  },

  // Submit
  submitBtn: {
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: 'center',
    marginTop: space.xs,
  },
  submitBtnText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: '#fff',
  },
});
