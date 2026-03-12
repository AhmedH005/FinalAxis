import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { format, isToday, isThisWeek } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { color, space, radius, typography } from '@axis/theme';
import {
  useRecentWorkouts,
  useGoals,
  useLastNightSleep,
  useTodayRecoveryCheckIn,
  useDailyEnergySummary,
  formatDuration,
  getRecommendedWorkout,
  computeRecoveryScore,
  WORKOUT_PROGRAMS,
  getProgramById,
  getNextProgramDay,
  type WorkoutProgram,
  type ProgramDay,
} from '@/engines/body';

const PROGRAM_KEY = '@axis/workout_program';
const LAST_DAY_KEY = '@axis/workout_last_day';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWeekStats(workouts: ReturnType<typeof useRecentWorkouts>['data']) {
  const thisWeek = (workouts ?? []).filter((w) => isThisWeek(new Date(w.started_at)));
  const avgDuration = thisWeek.length
    ? Math.round(thisWeek.reduce((s, w) => s + (w.duration_minutes ?? 0), 0) / thisWeek.length)
    : 0;
  return { count: thisWeek.length, avgDuration };
}

function getIntensityColor(intensity: 'low' | 'moderate' | 'high') {
  if (intensity === 'high') return '#FF6B6B';
  if (intensity === 'moderate') return '#F9B24E';
  return '#43D9A3';
}

// ─── ProgramPicker Modal ────────────────────────────────────────────────────

function ProgramPickerModal({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.modalContainer}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>Choose a Program</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={22} color={color.text.muted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
          {WORKOUT_PROGRAMS.map((prog) => (
            <Pressable
              key={prog.id}
              style={[s.programCard, current === prog.id && { borderColor: prog.color, borderWidth: 1.5 }]}
              onPress={() => { onSelect(prog.id); onClose(); }}
            >
              <View style={[s.programIcon, { backgroundColor: prog.color + '22' }]}>
                <MaterialCommunityIcons name={prog.icon as any} size={24} color={prog.color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Text style={s.programName}>{prog.name}</Text>
                  <View style={[s.levelBadge, { backgroundColor: prog.level === 'beginner' ? '#43D9A322' : '#F9B24E22' }]}>
                    <Text style={[s.levelText, { color: prog.level === 'beginner' ? '#43D9A3' : '#F9B24E' }]}>
                      {prog.level}
                    </Text>
                  </View>
                </View>
                <Text style={s.programTagline}>{prog.tagline}</Text>
                <Text style={s.programFreq}>{prog.frequency} · {prog.days.length} days</Text>
              </View>
              {current === prog.id && (
                <MaterialCommunityIcons name="check-circle" size={20} color={prog.color} />
              )}
            </Pressable>
          ))}
          <Pressable
            style={[s.programCard, !current && { borderColor: color.text.muted, borderWidth: 1.5 }]}
            onPress={() => { onSelect(''); onClose(); }}
          >
            <View style={[s.programIcon, { backgroundColor: '#9AA6B222' }]}>
              <MaterialCommunityIcons name="flash" size={24} color={color.text.muted} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.programName}>No Program</Text>
              <Text style={s.programTagline}>Smart recommendations based on your goals</Text>
            </View>
            {!current && <MaterialCommunityIcons name="check-circle" size={20} color={color.text.muted} />}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Day Card ───────────────────────────────────────────────────────────────

function DayCard({ day, program, onStart }: { day: ProgramDay; program: WorkoutProgram; onStart: () => void }) {
  return (
    <Pressable style={[s.todayCard, { borderColor: day.color + '44' }]} onPress={onStart}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={[s.dayIcon, { backgroundColor: day.color + '22' }]}>
          <MaterialCommunityIcons name={day.icon as any} size={28} color={day.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.todayLabel}>{program.name}</Text>
          <Text style={[s.todayDay, { color: day.color }]}>{day.name} Day</Text>
          <Text style={s.todayDesc}>{day.description}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={day.color} />
      </View>
      <View style={s.startBtn}>
        <Text style={[s.startBtnText, { color: day.color }]}>Start Session</Text>
      </View>
    </Pressable>
  );
}

function SmartRecommendationCard({
  recommendation,
  recoveryScore,
  energyBalance,
  onStart,
}: {
  recommendation: ReturnType<typeof getRecommendedWorkout>;
  recoveryScore: number | null;
  energyBalance: number | null;
  onStart: () => void;
}) {
  const intensityColor = getIntensityColor(recommendation.intensity);
  const recoveryLabel = recoveryScore === null ? 'No recovery score yet' : `${recoveryScore}/100 recovery`;
  const energyLabel = energyBalance === null
    ? 'Energy still estimating'
    : `${energyBalance > 0 ? '+' : ''}${energyBalance} kcal today`;

  return (
    <View style={[s.smartCard, { borderColor: intensityColor + '55' }]}>
      <View style={s.smartHeader}>
        <View style={[s.smartIcon, { backgroundColor: intensityColor + '22' }]}>
          <MaterialCommunityIcons name="flash-outline" size={22} color={intensityColor} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.smartEyebrow}>Smart recommendation</Text>
          <Text style={s.smartTitle}>{recommendation.title}</Text>
          <Text style={s.smartSummary}>{recommendation.summary}</Text>
        </View>
      </View>

      <View style={s.smartMetaRow}>
        <View style={s.smartMetaPill}>
          <Text style={s.smartMetaLabel}>Duration</Text>
          <Text style={s.smartMetaValue}>{recommendation.duration_minutes}m</Text>
        </View>
        <View style={s.smartMetaPill}>
          <Text style={s.smartMetaLabel}>Intensity</Text>
          <Text style={[s.smartMetaValue, { color: intensityColor }]}>{recommendation.intensity}</Text>
        </View>
        <View style={s.smartMetaPill}>
          <Text style={s.smartMetaLabel}>Estimated burn</Text>
          <Text style={s.smartMetaValue}>
            {recommendation.estimated_expenditure_calories !== null ? `${recommendation.estimated_expenditure_calories} kcal` : '—'}
          </Text>
        </View>
      </View>

      <View style={s.smartSignalRow}>
        <View style={s.smartSignalPill}>
          <Text style={s.smartSignalText}>{recoveryLabel}</Text>
        </View>
        <View style={s.smartSignalPill}>
          <Text style={s.smartSignalText}>{energyLabel}</Text>
        </View>
      </View>

      <View style={s.smartNoteBlock}>
        <Text style={s.smartNoteTitle}>Why this fits</Text>
        <Text style={s.smartNoteText}>{recommendation.reason}</Text>
        <Text style={s.smartNoteText}>{recommendation.readiness_note}</Text>
        <Text style={s.smartNoteText}>{recommendation.energy_note}</Text>
      </View>

      <View style={s.smartFooter}>
        <Text style={s.smartAltText}>Alternatives: {recommendation.alternatives.join(' · ')}</Text>
        <Pressable style={[s.smartStartBtn, { backgroundColor: intensityColor + '22' }]} onPress={onStart}>
          <Text style={[s.smartStartBtnText, { color: intensityColor }]}>Start smart session</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Quick Day Buttons ───────────────────────────────────────────────────────

const QUICK_DAYS = [
  { id: 'push',  label: 'Push',      icon: 'weight-lifter', color: '#6C9EFF' },
  { id: 'pull',  label: 'Pull',      icon: 'rowing',        color: '#43D9A3' },
  { id: 'legs',  label: 'Legs',      icon: 'run',           color: '#F9B24E' },
  { id: 'upper', label: 'Upper',     icon: 'dumbbell',      color: '#A855F7' },
  { id: 'lower', label: 'Lower',     icon: 'run',           color: '#FF6B6B' },
  { id: 'cardio',label: 'Cardio',    icon: 'run-fast',      color: '#2DD4BF' },
  { id: 'core',  label: 'Core',      icon: 'human',         color: '#9AA6B2' },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function WorkoutsScreen() {
  const router = useRouter();
  const { data: workouts } = useRecentWorkouts(30);
  const { data: goals } = useGoals();
  const { log: sleepLog } = useLastNightSleep();
  const { data: recoveryEntry } = useTodayRecoveryCheckIn();
  const { summary: energySummary } = useDailyEnergySummary();

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [lastDayId, setLastDayId] = useState<string | null>(null);
  const [programPickerVisible, setProgramPickerVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const [prog, day] = await Promise.all([
          AsyncStorage.getItem(PROGRAM_KEY),
          AsyncStorage.getItem(LAST_DAY_KEY),
        ]);
        if (active) {
          setSelectedProgramId(prog);
          setLastDayId(day);
          setLoaded(true);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  const handleSelectProgram = useCallback(async (id: string) => {
    const value = id || null;
    if (value) {
      await AsyncStorage.setItem(PROGRAM_KEY, value);
    } else {
      await AsyncStorage.removeItem(PROGRAM_KEY);
    }
    setSelectedProgramId(value);
  }, []);

  const selectedProgram = selectedProgramId ? getProgramById(selectedProgramId) : null;
  const todayDay = selectedProgram ? getNextProgramDay(selectedProgram, lastDayId) : null;

  const { count: weekCount, avgDuration } = getWeekStats(workouts);
  const recentFive = (workouts ?? []).slice(0, 5);
  const recoveryScore = computeRecoveryScore({
    sleepMinutes: sleepLog?.duration_minutes ?? null,
    energy: recoveryEntry?.energy ?? null,
    fatigue: recoveryEntry?.fatigue ?? null,
    soreness: recoveryEntry?.soreness ?? null,
    sleepTargetMinutes: goals?.sleep_target_minutes ?? 480,
  });
  const smartRecommendation = getRecommendedWorkout({
    goalType: goals?.goal_type,
    recoveryScore,
    energyBalanceCalories: energySummary.estimated_balance_calories,
    bodyWeightKg: energySummary.body_weight_kg,
    workoutsThisWeek: weekCount,
    latestWorkoutType: workouts?.[0]?.workout_type ?? null,
    recentWorkouts: workouts ?? [],
  });

  const handleStartSession = (quickDayId?: string, quickDayLabel?: string) => {
    const params: Record<string, string> = {};
    if (selectedProgram && todayDay && !quickDayId) {
      params.programId = selectedProgram.id;
      params.dayId = todayDay.id;
      params.dayLabel = todayDay.name;
    } else if (quickDayId) {
      params.dayId = quickDayId;
      params.dayLabel = quickDayLabel ?? quickDayId;
    }
    router.push({ pathname: '/(app)/body/workouts/session', params });
  };

  const handleStartSmartSession = () => {
    router.push({
      pathname: '/(app)/body/workouts/session',
      params: {
        dayLabel: smartRecommendation.title,
        workoutType: smartRecommendation.workout_type,
        intensity: smartRecommendation.intensity,
        exerciseIds: smartRecommendation.exercise_ids.join(','),
      },
    });
  };

  if (!loaded) return (
    <SafeAreaView style={s.root}>
      <ActivityIndicator color={color.success} style={{ flex: 1 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={color.text.primary} />
          </Pressable>
          <Text style={s.headerTitle}>Workouts</Text>
          <Pressable
            style={s.logBtn}
            onPress={() => router.push({ pathname: '/(app)/body/workouts/session', params: { mode: 'log' } })}
          >
            <MaterialCommunityIcons name="plus" size={18} color={color.text.primary} />
            <Text style={s.logBtnText}>Log</Text>
          </Pressable>
        </View>

        {/* Week Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{weekCount}</Text>
            <Text style={s.statLabel}>Sessions this week</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{avgDuration > 0 ? `${avgDuration}m` : '—'}</Text>
            <Text style={s.statLabel}>Avg duration</Text>
          </View>
        </View>

        <SmartRecommendationCard
          recommendation={smartRecommendation}
          recoveryScore={recoveryScore}
          energyBalance={energySummary.estimated_balance_calories}
          onStart={handleStartSmartSession}
        />

        {/* Today's Program Card */}
        {selectedProgram && todayDay ? (
          <DayCard day={todayDay} program={selectedProgram} onStart={() => handleStartSession()} />
        ) : (
          <View style={s.noProgramCard}>
            <MaterialCommunityIcons name="calendar-check" size={32} color={color.text.muted} />
            <Text style={s.noProgramText}>No program selected</Text>
            <Text style={s.noProgramSub}>Pick a structured program for guided sessions</Text>
            <Pressable style={s.pickProgramBtn} onPress={() => setProgramPickerVisible(true)}>
              <Text style={s.pickProgramText}>Choose Program</Text>
            </Pressable>
          </View>
        )}

        {/* Program selector link */}
        {selectedProgram && (
          <Pressable style={s.changeProgramRow} onPress={() => setProgramPickerVisible(true)}>
            <MaterialCommunityIcons name="swap-horizontal" size={16} color={color.text.muted} />
            <Text style={s.changeProgramText}>
              {selectedProgram.name} · {selectedProgram.frequency}
            </Text>
            <MaterialCommunityIcons name="pencil-outline" size={14} color={color.text.muted} />
          </Pressable>
        )}

        {/* Quick Start */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick Start</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
          {QUICK_DAYS.map((d) => (
            <Pressable key={d.id} style={s.quickCard} onPress={() => handleStartSession(d.id, d.label)}>
              <View style={[s.quickIcon, { backgroundColor: d.color + '22' }]}>
                <MaterialCommunityIcons name={d.icon as any} size={22} color={d.color} />
              </View>
              <Text style={[s.quickLabel, { color: d.color }]}>{d.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Programs */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Programs</Text>
        </View>
        {WORKOUT_PROGRAMS.map((prog) => (
          <Pressable
            key={prog.id}
            style={[s.programListCard, selectedProgramId === prog.id && { borderColor: prog.color + '66', borderWidth: 1 }]}
            onPress={() => handleSelectProgram(prog.id)}
          >
            <View style={[s.programIcon, { backgroundColor: prog.color + '22' }]}>
              <MaterialCommunityIcons name={prog.icon as any} size={22} color={prog.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.programName}>{prog.name}</Text>
              <Text style={s.programFreq}>{prog.frequency} · {prog.days.map((d) => d.name).join(' / ')}</Text>
            </View>
            {selectedProgramId === prog.id
              ? <MaterialCommunityIcons name="check-circle" size={20} color={prog.color} />
              : <MaterialCommunityIcons name="chevron-right" size={18} color={color.text.muted} />
            }
          </Pressable>
        ))}

        {/* Recent Workouts */}
        {recentFive.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recent</Text>
            </View>
            {recentFive.map((w) => (
              <View key={w.id} style={s.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.historyType}>{w.workout_type}</Text>
                  <Text style={s.historyMeta}>
                    {format(new Date(w.started_at), isToday(new Date(w.started_at)) ? "'Today'" : 'EEE, MMM d')}
                    {w.duration_minutes ? ` · ${formatDuration(w.duration_minutes)}` : ''}
                    {(w.exercises ?? []).length > 0 ? ` · ${(w.exercises ?? []).length} exercises` : ''}
                  </Text>
                </View>
                <View style={[s.intensityDot, {
                  backgroundColor:
                    w.intensity === 'high' ? '#FF6B6B' :
                    w.intensity === 'moderate' ? '#F9B24E' : '#43D9A3',
                }]} />
              </View>
            ))}
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      <ProgramPickerModal
        visible={programPickerVisible}
        current={selectedProgramId}
        onSelect={handleSelectProgram}
        onClose={() => setProgramPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  scroll: { padding: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  headerTitle: { flex: 1, fontSize: typography['2xl'], fontWeight: '700', color: color.text.primary },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.surface, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm },
  logBtnText: { fontSize: typography.sm, color: color.text.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: space.md },
  statCard: { flex: 1, backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, alignItems: 'center' },
  statValue: { fontSize: typography.xl, fontWeight: '700', color: color.text.primary },
  statLabel: { fontSize: typography.sm, color: color.text.muted, marginTop: 2, textAlign: 'center' },
  smartCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    gap: space.md,
  },
  smartHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  smartIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  smartTitle: { fontSize: typography.xl, fontWeight: '700', color: color.text.primary },
  smartSummary: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
  smartMetaRow: { flexDirection: 'row', gap: space.xs },
  smartMetaPill: {
    flex: 1,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: color.outline,
    gap: 2,
  },
  smartMetaLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  smartMetaValue: { fontSize: typography.sm, fontWeight: '700', color: color.text.primary },
  smartSignalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  smartSignalPill: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
  },
  smartSignalText: { fontSize: typography.xs, color: color.text.muted, fontWeight: '600' },
  smartNoteBlock: { gap: 6 },
  smartNoteTitle: { fontSize: typography.sm, fontWeight: '700', color: color.text.primary },
  smartNoteText: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
  smartFooter: { gap: space.sm },
  smartAltText: { fontSize: typography.xs, color: color.text.muted, lineHeight: 18 },
  smartStartBtn: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  smartStartBtnText: { fontSize: typography.sm, fontWeight: '700' },
  todayCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, gap: space.md },
  dayIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  todayLabel: { fontSize: typography.sm, color: color.text.muted, fontWeight: '500' },
  todayDay: { fontSize: typography.xl, fontWeight: '700', marginTop: 2 },
  todayDesc: { fontSize: typography.sm, color: color.text.muted, marginTop: 2 },
  startBtn: { borderRadius: radius.md, paddingVertical: space.md, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff22' },
  startBtnText: { fontSize: typography.base, fontWeight: '700' },
  noProgramCard: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.sm },
  noProgramText: { fontSize: typography.base, fontWeight: '600', color: color.text.primary },
  noProgramSub: { fontSize: typography.sm, color: color.text.muted, textAlign: 'center' },
  pickProgramBtn: { marginTop: space.sm, backgroundColor: color.success + '22', borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.sm },
  pickProgramText: { fontSize: typography.base, fontWeight: '700', color: color.success },
  changeProgramRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center', marginTop: -space.sm },
  changeProgramText: { fontSize: typography.sm, color: color.text.muted },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  sectionTitle: { fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  quickRow: { gap: space.md, paddingBottom: space.xs },
  quickCard: { alignItems: 'center', gap: space.sm },
  quickIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: typography.sm, fontWeight: '600' },
  programListCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: 'transparent' },
  programIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  programName: { fontSize: typography.base, fontWeight: '700', color: color.text.primary },
  programTagline: { fontSize: typography.sm, color: color.text.muted, marginTop: 2 },
  programFreq: { fontSize: typography.sm, color: color.text.muted, marginTop: 2 },
  levelBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  levelText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  historyType: { fontSize: typography.base, fontWeight: '600', color: color.text.primary },
  historyMeta: { fontSize: typography.sm, color: color.text.muted, marginTop: 2 },
  intensityDot: { width: 8, height: 8, borderRadius: radius.pill },
  // Modal
  modalContainer: { flex: 1, backgroundColor: color.bg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, paddingTop: space.xl, borderBottomWidth: 1, borderBottomColor: color.surface },
  modalTitle: { fontSize: typography.xl, fontWeight: '700', color: color.text.primary },
  programCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: 'transparent' },
});
