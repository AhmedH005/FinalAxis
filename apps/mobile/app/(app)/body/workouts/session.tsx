import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, Image, Modal, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { color, space, radius, typography } from '@axis/theme';
import {
  useAddWorkoutLog,
  getExerciseCatalog,
  getExerciseById,
  getExercisesByPattern,
  getProgramById,
  getProgramDayById,
  WORKOUT_PROGRAMS,
  PATTERN_COLORS,
  useWgerExerciseImage,
  type ExerciseDefinition,
  type WorkoutProgram,
  type ProgramDay,
} from '@/engines/body';
import type { IntensityLevel } from '@/engines/body';

const LAST_DAY_KEY = '@axis/workout_last_day';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessionSet {
  reps: string;
  weight: string;
  done: boolean;
}

interface SessionExercise {
  exercise: ExerciseDefinition;
  sets: SessionSet[];
}

const DEFAULT_SETS = 3;
const DEFAULT_REPS = '8';

// ─── Exercise Image Component ─────────────────────────────────────────────────

function ExerciseImg({ exercise, size = 72 }: { exercise: ExerciseDefinition; size?: number }) {
  const { data: imageUrl } = useWgerExerciseImage(exercise.name);
  const [imgError, setImgError] = useState(false);
  const patternColor = PATTERN_COLORS[exercise.movement_pattern];

  if (imageUrl && !imgError) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: color.surface }}
        onError={() => setImgError(true)}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[{
      width: size, height: size, borderRadius: radius.md,
      backgroundColor: patternColor + '22',
      alignItems: 'center', justifyContent: 'center',
    }]}>
      <MaterialCommunityIcons name={exercise.icon as any} size={size * 0.4} color={patternColor} />
    </View>
  );
}

// ─── Exercise Picker Modal ────────────────────────────────────────────────────

function ExercisePickerModal({
  visible,
  dayPattern,
  existingIds,
  onAdd,
  onClose,
}: {
  visible: boolean;
  dayPattern: string | null;
  existingIds: string[];
  onAdd: (exercise: ExerciseDefinition) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<string>('all');

  const allExercises = getExerciseCatalog();

  const patterns = ['all', 'push', 'pull', 'squat', 'hinge', 'core', 'conditioning'];

  const filtered = allExercises.filter((e) => {
    if (filter === 'all') return true;
    return e.movement_pattern === filter;
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={ps.container}>
        <View style={ps.header}>
          <Text style={ps.title}>Add Exercise</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={22} color={color.text.muted} />
          </Pressable>
        </View>

        {/* Pattern Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ps.filterRow}>
          {patterns.map((p) => {
            const isActive = filter === p;
            const patColor = p === 'all' ? color.text.muted : PATTERN_COLORS[p as keyof typeof PATTERN_COLORS];
            return (
              <Pressable
                key={p}
                style={[ps.filterChip, isActive && { backgroundColor: patColor + '22', borderColor: patColor }]}
                onPress={() => setFilter(p)}
              >
                <Text style={[ps.filterLabel, { color: isActive ? patColor : color.text.muted }]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Exercise List */}
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: space.lg, gap: space.sm }}
          renderItem={({ item }) => {
            const already = existingIds.includes(item.id);
            const patColor = PATTERN_COLORS[item.movement_pattern];
            return (
              <Pressable
                style={[ps.exerciseRow, already && { opacity: 0.5 }]}
                onPress={() => { if (!already) { onAdd(item); onClose(); } }}
                disabled={already}
              >
                <ExerciseImg exercise={item} size={52} />
                <View style={{ flex: 1 }}>
                  <Text style={ps.exerciseName}>{item.name}</Text>
                  <Text style={ps.exerciseMuscles}>
                    {item.primary_muscles.join(', ')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <View style={[ps.badge, { backgroundColor: patColor + '22' }]}>
                      <Text style={[ps.badgeText, { color: patColor }]}>{item.movement_pattern}</Text>
                    </View>
                    <View style={[ps.badge, { backgroundColor: '#ffffff11' }]}>
                      <Text style={ps.badgeText}>{item.difficulty}</Text>
                    </View>
                    {item.equipment?.[0] && (
                      <View style={[ps.badge, { backgroundColor: '#ffffff11' }]}>
                        <Text style={ps.badgeText}>{item.equipment[0]}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {already
                  ? <MaterialCommunityIcons name="check" size={20} color={color.text.muted} />
                  : <MaterialCommunityIcons name="plus-circle-outline" size={22} color={patColor} />
                }
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ─── Set Row ─────────────────────────────────────────────────────────────────

function SetRow({
  setNum,
  set,
  isBodyweight,
  onChange,
}: {
  setNum: number;
  set: SessionSet;
  isBodyweight: boolean;
  onChange: (updated: Partial<SessionSet>) => void;
}) {
  return (
    <View style={ss.setRow}>
      <View style={[ss.setNum, set.done && { backgroundColor: '#43D9A322' }]}>
        <Text style={[ss.setNumText, set.done && { color: '#43D9A3' }]}>{setNum}</Text>
      </View>
      <TextInput
        style={[ss.setInput, ss.repsInput, set.done && ss.inputDone]}
        value={set.reps}
        onChangeText={(v) => onChange({ reps: v })}
        placeholder="—"
        placeholderTextColor={color.text.muted}
        keyboardType="number-pad"
        selectTextOnFocus
      />
      <Text style={ss.setX}>reps</Text>
      {!isBodyweight && (
        <>
          <Text style={ss.setX}>×</Text>
          <TextInput
            style={[ss.setInput, ss.weightInput, set.done && ss.inputDone]}
            value={set.weight}
            onChangeText={(v) => onChange({ weight: v })}
            placeholder="kg"
            placeholderTextColor={color.text.muted}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </>
      )}
      <Pressable
        style={[ss.doneBtn, set.done && ss.doneBtnActive]}
        onPress={() => onChange({ done: !set.done })}
      >
        <MaterialCommunityIcons
          name={set.done ? 'check-circle' : 'circle-outline'}
          size={22}
          color={set.done ? '#43D9A3' : color.text.muted}
        />
      </Pressable>
    </View>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({
  entry,
  index,
  onUpdateSet,
  onAddSet,
  onRemove,
}: {
  entry: SessionExercise;
  index: number;
  onUpdateSet: (exerciseIdx: number, setIdx: number, updates: Partial<SessionSet>) => void;
  onAddSet: (exerciseIdx: number) => void;
  onRemove: (exerciseIdx: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { exercise, sets } = entry;
  const patColor = PATTERN_COLORS[exercise.movement_pattern];
  const isBodyweight = (exercise.equipment ?? []).includes('bodyweight') && !(exercise.equipment ?? []).some((e) => ['barbell', 'dumbbells', 'machine', 'cables'].includes(e));
  const doneCount = sets.filter((s) => s.done).length;

  return (
    <View style={ec.card}>
      {/* Header */}
      <Pressable style={ec.header} onPress={() => setExpanded((v) => !v)}>
        <ExerciseImg exercise={exercise} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={ec.name}>{exercise.name}</Text>
          <Text style={ec.muscles}>
            {exercise.primary_muscles.join(' · ')}
            {exercise.secondary_muscles?.length ? ` + ${exercise.secondary_muscles[0]}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
            <View style={[ec.badge, { backgroundColor: patColor + '22' }]}>
              <Text style={[ec.badgeText, { color: patColor }]}>{exercise.movement_pattern}</Text>
            </View>
            {isBodyweight && (
              <View style={[ec.badge, { backgroundColor: '#ffffff11' }]}>
                <Text style={ec.badgeText}>bodyweight</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Pressable hitSlop={12} onPress={() => onRemove(index)}>
            <MaterialCommunityIcons name="close" size={18} color={color.text.muted} />
          </Pressable>
          <Text style={[ec.progress, { color: doneCount === sets.length && doneCount > 0 ? '#43D9A3' : color.text.muted }]}>
            {doneCount}/{sets.length} sets
          </Text>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={color.text.muted}
          />
        </View>
      </Pressable>

      {/* Sets */}
      {expanded && (
        <View style={ec.setsContainer}>
          <View style={ec.setsHeader}>
            <Text style={ec.setsHeaderText}>Set</Text>
            <Text style={[ec.setsHeaderText, { flex: 1 }]}>Reps{!isBodyweight ? ' × Weight' : ''}</Text>
            <Text style={ec.setsHeaderText}>Done</Text>
          </View>
          {sets.map((set, si) => (
            <SetRow
              key={si}
              setNum={si + 1}
              set={set}
              isBodyweight={isBodyweight}
              onChange={(updates) => onUpdateSet(index, si, updates)}
            />
          ))}
          <Pressable style={ec.addSetBtn} onPress={() => onAddSet(index)}>
            <MaterialCommunityIcons name="plus" size={16} color={color.text.muted} />
            <Text style={ec.addSetText}>Add set</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Timer ───────────────────────────────────────────────────────────────────

function useSessionTimer() {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  const display = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return { seconds, display };
}

// ─── Intensity Picker ─────────────────────────────────────────────────────────

const INTENSITIES: { value: IntensityLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#43D9A3' },
  { value: 'moderate', label: 'Moderate', color: '#F9B24E' },
  { value: 'high', label: 'High', color: '#FF6B6B' },
];

// ─── Main Session Screen ──────────────────────────────────────────────────────

export default function SessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    programId?: string;
    dayId?: string;
    dayLabel?: string;
    mode?: string;
    exerciseIds?: string;
    intensity?: string;
    workoutType?: string;
  }>();
  const addWorkout = useAddWorkoutLog();

  const { display: timerDisplay, seconds } = useSessionTimer();

  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [intensity, setIntensity] = useState<IntensityLevel>('moderate');

  // Derive day context
  const program = params.programId ? getProgramById(params.programId) : null;
  const programDay = program && params.dayId ? getProgramDayById(program, params.dayId) : null;

  // Derive day label and workout type
  const dayLabel = params.dayLabel ?? programDay?.name ?? 'Workout';
  const workoutType = (() => {
    if (params.workoutType) return params.workoutType;
    const dayId = params.dayId ?? '';
    if (programDay?.movement_patterns.includes('conditioning')) return 'Running';
    if (programDay?.movement_patterns.includes('core') && programDay.movement_patterns.length === 1) return 'HIIT';
    if (['cardio', 'conditioning'].includes(dayId)) return 'Running';
    if (dayId === 'core') return 'HIIT';
    return 'Strength';
  })();

  // Pre-populate exercises from program day or quick day
  useEffect(() => {
    let initialExerciseIds: string[] = [];
    const presetExerciseIds = typeof params.exerciseIds === 'string'
      ? params.exerciseIds.split(',').map((id) => id.trim()).filter(Boolean)
      : [];

    if (presetExerciseIds.length > 0) {
      initialExerciseIds = presetExerciseIds;
    } else if (programDay) {
      initialExerciseIds = [...programDay.primary_exercise_ids, ...programDay.accessory_exercise_ids.slice(0, 2)];
    } else if (params.dayId) {
      // Quick day: use dayId as movement pattern
      if (params.dayId === 'upper') {
        const pushEx = getExercisesByPattern('push').filter((e) => e.focus === 'compound').slice(0, 2);
        const pullEx = getExercisesByPattern('pull').filter((e) => e.focus === 'compound').slice(0, 2);
        initialExerciseIds = [...pushEx.map((e) => e.id), ...pullEx.map((e) => e.id)];
      } else if (params.dayId === 'lower') {
        const sq = getExercisesByPattern('squat').filter((e) => e.focus === 'compound').slice(0, 2);
        const hi = getExercisesByPattern('hinge').filter((e) => e.focus === 'compound').slice(0, 2);
        initialExerciseIds = [...sq.map((e) => e.id), ...hi.map((e) => e.id)];
      } else {
        const patternMap: Record<string, string> = {
          push: 'push', pull: 'pull', legs: 'squat',
          cardio: 'conditioning', core: 'core',
        };
        const pattern = patternMap[params.dayId];
        if (pattern) {
          const byPattern = getExercisesByPattern(pattern as any);
          initialExerciseIds = byPattern.filter((e) => e.focus === 'compound').slice(0, 3).map((e) => e.id);
        }
      }
    }

    const initial = initialExerciseIds
      .map((id) => getExerciseById(id))
      .filter((e): e is ExerciseDefinition => e !== null)
      .map((exercise) => ({
        exercise,
        sets: Array.from({ length: DEFAULT_SETS }, () => ({
          reps: DEFAULT_REPS,
          weight: '',
          done: false,
        })),
      }));

    setExercises(initial);
    setIntensity(
      params.intensity === 'low' || params.intensity === 'moderate' || params.intensity === 'high'
        ? params.intensity
        : 'moderate'
    );
  }, [programDay?.id, params.dayId, params.exerciseIds, params.intensity]);

  const handleUpdateSet = useCallback((exerciseIdx: number, setIdx: number, updates: Partial<SessionSet>) => {
    setExercises((prev) =>
      prev.map((entry, ei) =>
        ei !== exerciseIdx
          ? entry
          : {
              ...entry,
              sets: entry.sets.map((s, si) => (si === setIdx ? { ...s, ...updates } : s)),
            }
      )
    );
  }, []);

  const handleAddSet = useCallback((exerciseIdx: number) => {
    setExercises((prev) =>
      prev.map((entry, ei) =>
        ei !== exerciseIdx
          ? entry
          : { ...entry, sets: [...entry.sets, { reps: DEFAULT_REPS, weight: '', done: false }] }
      )
    );
  }, []);

  const handleRemoveExercise = useCallback((exerciseIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exerciseIdx));
  }, []);

  const handleAddExercise = useCallback((exercise: ExerciseDefinition) => {
    setExercises((prev) => [
      ...prev,
      {
        exercise,
        sets: Array.from({ length: DEFAULT_SETS }, () => ({ reps: DEFAULT_REPS, weight: '', done: false })),
      },
    ]);
  }, []);

  const handleComplete = async () => {
    if (exercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise before completing.');
      return;
    }

    const exerciseLog = exercises
      .filter((e) => e.sets.some((s) => s.done))
      .map((entry) => {
        const doneSets = entry.sets.filter((s) => s.done);
        const avgReps = Math.round(doneSets.reduce((sum, s) => sum + (parseInt(s.reps) || 0), 0) / doneSets.length);
        const avgWeight = doneSets.some((s) => parseFloat(s.weight) > 0)
          ? doneSets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0), 0) / doneSets.length
          : undefined;
        return {
          exercise_id: entry.exercise.id,
          name: entry.exercise.name,
          sets: doneSets.length,
          reps: avgReps || null,
          weight_kg: avgWeight ? Math.round(avgWeight * 10) / 10 : null,
          duration_seconds: null,
          notes: null,
        };
      });

    const durationMinutes = Math.max(1, Math.round(seconds / 60));

    try {
      await addWorkout.mutateAsync({
        workout_type: workoutType,
        duration_minutes: durationMinutes,
        intensity,
        exercises: exerciseLog,
      });
      // Save last completed day
      if (programDay) {
        await AsyncStorage.setItem(LAST_DAY_KEY, programDay.id);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save workout. Please try again.');
    }
  };

  const existingIds = exercises.map((e) => e.exercise.id);

  return (
    <SafeAreaView style={ms.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={ms.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={22} color={color.text.primary} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={ms.headerTitle}>{dayLabel} Day</Text>
            <Text style={ms.timer}>{timerDisplay}</Text>
          </View>
          <Pressable style={ms.completeBtn} onPress={handleComplete} disabled={addWorkout.isPending}>
            <Text style={ms.completeBtnText}>{addWorkout.isPending ? '...' : 'Done'}</Text>
          </Pressable>
        </View>

        {/* Intensity */}
        <View style={ms.intensityRow}>
          <Text style={ms.intensityLabel}>Intensity</Text>
          {INTENSITIES.map((i) => (
            <Pressable
              key={i.value}
              style={[ms.intensityChip, intensity === i.value && { backgroundColor: i.color + '22', borderColor: i.color }]}
              onPress={() => setIntensity(i.value)}
            >
              <Text style={[ms.intensityChipText, { color: intensity === i.value ? i.color : color.text.muted }]}>
                {i.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Exercise list */}
        <ScrollView contentContainerStyle={ms.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {exercises.length === 0 && (
            <View style={ms.emptyState}>
              <MaterialCommunityIcons name="dumbbell" size={40} color={color.text.muted} />
              <Text style={ms.emptyText}>No exercises yet</Text>
              <Text style={ms.emptySub}>Tap the button below to add exercises</Text>
            </View>
          )}

          {exercises.map((entry, idx) => (
            <ExerciseCard
              key={`${entry.exercise.id}-${idx}`}
              entry={entry}
              index={idx}
              onUpdateSet={handleUpdateSet}
              onAddSet={handleAddSet}
              onRemove={handleRemoveExercise}
            />
          ))}

          {/* Add exercise */}
          <Pressable style={ms.addExBtn} onPress={() => setPickerVisible(true)}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={color.success} />
            <Text style={ms.addExText}>Add Exercise</Text>
          </Pressable>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Complete bar */}
        <View style={ms.bottomBar}>
          <Text style={ms.exerciseCount}>{exercises.length} exercises · {timerDisplay}</Text>
          <Pressable style={ms.completeBarBtn} onPress={handleComplete} disabled={addWorkout.isPending}>
            <Text style={ms.completeBarText}>{addWorkout.isPending ? 'Saving...' : 'Complete Workout'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ExercisePickerModal
        visible={pickerVisible}
        dayPattern={params.dayId ?? null}
        existingIds={existingIds}
        onAdd={handleAddExercise}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: color.surface, gap: space.md },
  headerTitle: { fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  timer: { fontSize: typography.sm, color: color.text.muted, fontVariant: ['tabular-nums'] },
  completeBtn: { backgroundColor: color.success + '22', borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm },
  completeBtnText: { fontSize: typography.sm, fontWeight: '700', color: color.success },
  intensityRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.sm, borderBottomWidth: 1, borderBottomColor: color.surface },
  intensityLabel: { fontSize: typography.sm, color: color.text.muted, marginRight: space.xs },
  intensityChip: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4, borderWidth: 1, borderColor: 'transparent' },
  intensityChipText: { fontSize: typography.sm, fontWeight: '600' },
  scroll: { padding: space.lg, gap: space.md },
  emptyState: { alignItems: 'center', paddingVertical: space.xl, gap: space.md },
  emptyText: { fontSize: typography.base, fontWeight: '600', color: color.text.primary },
  emptySub: { fontSize: typography.sm, color: color.text.muted },
  addExBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radius.lg, borderWidth: 1.5, borderColor: color.success + '44', borderStyle: 'dashed', padding: space.lg },
  addExText: { fontSize: typography.base, fontWeight: '600', color: color.success },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: color.surface, gap: space.md },
  exerciseCount: { flex: 1, fontSize: typography.sm, color: color.text.muted },
  completeBarBtn: { backgroundColor: color.success, borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.md },
  completeBarText: { fontSize: typography.base, fontWeight: '700', color: '#0B0E12' },
});

const ec = StyleSheet.create({
  card: { backgroundColor: color.surface, borderRadius: radius.lg, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: space.lg, gap: space.md },
  name: { fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  muscles: { fontSize: typography.sm, color: color.text.muted, marginTop: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '600', color: color.text.muted, textTransform: 'capitalize' },
  progress: { fontSize: typography.sm, fontWeight: '600' },
  setsContainer: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: '#ffffff08' },
  setsHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: space.md, paddingBottom: space.xs, gap: space.sm },
  setsHeaderText: { fontSize: 11, color: color.text.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, justifyContent: 'center' },
  addSetText: { fontSize: typography.sm, color: color.text.muted },
});

const ss = StyleSheet.create({
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  setNum: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: '#ffffff11', alignItems: 'center', justifyContent: 'center' },
  setNumText: { fontSize: typography.sm, fontWeight: '700', color: color.text.muted },
  setInput: { backgroundColor: '#ffffff0D', borderRadius: radius.sm, padding: space.sm, color: color.text.primary, fontSize: typography.base, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: 'transparent' },
  repsInput: { width: 52 },
  weightInput: { width: 68 },
  inputDone: { borderColor: '#43D9A333', backgroundColor: '#43D9A311' },
  setX: { fontSize: typography.sm, color: color.text.muted },
  doneBtn: { marginLeft: 'auto' as any },
  doneBtnActive: {},
});

const ps = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, paddingTop: space.xl, borderBottomWidth: 1, borderBottomColor: color.surface },
  title: { fontSize: typography.xl, fontWeight: '700', color: color.text.primary },
  filterRow: { padding: space.lg, gap: space.sm },
  filterChip: { borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6, borderWidth: 1, borderColor: '#ffffff22' },
  filterLabel: { fontSize: typography.sm, fontWeight: '600' },
  exerciseRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: color.surface, borderRadius: radius.lg, padding: space.md, gap: space.md },
  exerciseName: { fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  exerciseMuscles: { fontSize: typography.sm, color: color.text.muted, marginTop: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '600', color: color.text.muted, textTransform: 'capitalize' },
});
