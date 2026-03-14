import { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { useAuth } from '@/providers/AuthProvider';
import {
  useGoals,
  useUpdateGoals,
  useUpdateProfile,
  toStorageHeight,
  formatDuration,
} from '@/engines/body';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Sep() {
  return <View style={styles.separator} />;
}

function PresetChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.presetChip, active && styles.presetChipActive]} onPress={onPress}>
      <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

export default function SettingsScreen() {
  const { profile, signOut, session } = useAuth();
  const { data: goals } = useGoals();
  const updateGoals = useUpdateGoals();
  const updateProfile = useUpdateProfile();

  const units = profile?.units ?? 'metric';

  const [editingProfile, setEditingProfile] = useState(false);
  const [nameStr, setNameStr] = useState('');
  const [heightStr, setHeightStr] = useState('');

  const [editingGoals, setEditingGoals] = useState(false);
  const [calorieStr, setCalorieStr] = useState('');
  const [waterStr, setWaterStr] = useState('');
  const [sleepStr, setSleepStr] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  function startEditProfile() {
    setNameStr(profile?.full_name ?? '');
    const ht = profile?.height_cm;
    setHeightStr(ht ? (units === 'imperial' ? (ht / 2.54).toFixed(0) : String(ht)) : '');
    setEditingProfile(true);
    setFeedback(null);
  }

  function startEditGoals() {
    setCalorieStr(goals?.daily_calorie_target ? String(goals.daily_calorie_target) : '');
    setWaterStr(goals?.daily_water_target_ml ? String(goals.daily_water_target_ml) : '2500');
    setSleepStr(goals?.sleep_target_minutes ? String(goals.sleep_target_minutes) : '480');
    setEditingGoals(true);
    setFeedback(null);
  }

  function saveProfile() {
    const updates: { full_name?: string; height_cm?: number | null } = {};
    if (nameStr.trim()) updates.full_name = nameStr.trim();
    if (heightStr) {
      const h = parseFloat(heightStr);
      if (!isNaN(h) && h > 0) updates.height_cm = toStorageHeight(h, units);
    }
    updateProfile.mutate(updates, {
      onSuccess: () => {
        setEditingProfile(false);
        setFeedback('Profile updated.');
      },
      onError: (e) => Alert.alert('Error', e.message),
    });
  }

  function saveGoals() {
    const calorie = calorieStr ? parseInt(calorieStr, 10) : null;
    const water = parseInt(waterStr, 10);
    const sleep = parseInt(sleepStr, 10);
    if (isNaN(water) || water <= 0) { Alert.alert('Invalid', 'Enter a valid water target.'); return; }
    if (isNaN(sleep) || sleep <= 0) { Alert.alert('Invalid', 'Enter a valid sleep target.'); return; }
    updateGoals.mutate(
      {
        daily_calorie_target: calorie && !isNaN(calorie) && calorie > 0 ? calorie : null,
        daily_water_target_ml: water,
        sleep_target_minutes: sleep,
      },
      {
        onSuccess: () => {
          setEditingGoals(false);
          setFeedback('Daily targets updated.');
        },
        onError: (e) => Alert.alert('Error', e.message),
      },
    );
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  const heightDisplay = profile?.height_cm
    ? units === 'imperial' ? `${(profile.height_cm / 2.54).toFixed(0)} in` : `${profile.height_cm} cm`
    : '—';
  const calDisplay = goals?.daily_calorie_target ? `${goals.daily_calorie_target} kcal` : 'Not set';
  const waterDisplay = goals?.daily_water_target_ml ? `${goals.daily_water_target_ml} ml` : '2500 ml';
  const sleepDisplay = goals?.sleep_target_minutes ? formatDuration(goals.sleep_target_minutes) : '8h';

  const initials = getInitials(profile?.full_name);
  const emailDisplay = session?.user?.email ?? '—';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Adjust the baselines AXIS uses to interpret your data.</Text>
        </View>

        {feedback ? (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackText}>{feedback}</Text>
            <Pressable onPress={() => setFeedback(null)}>
              <Text style={styles.feedbackDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Hero card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarCircle}>
            {initials ? (
              <Text style={styles.avatarInitials}>{initials}</Text>
            ) : (
              <MaterialCommunityIcons name={'account' as any} size={32} color={color.text.inverse} />
            )}
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>{profile?.full_name || 'Your AXIS profile'}</Text>
            <Text style={styles.heroMeta}>
              {units === 'imperial' ? 'Imperial units' : 'Metric units'} · Water {waterDisplay} · Sleep {sleepDisplay}
            </Text>
          </View>
        </View>

        {/* Profile section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLabelRow}>
              <MaterialCommunityIcons name={'account-circle-outline' as any} size={16} color={color.text.muted} />
              <Text style={styles.sectionLabel}>Profile</Text>
            </View>
            {!editingProfile
              ? <Pressable onPress={startEditProfile}><Text style={styles.editBtn}>Edit</Text></Pressable>
              : null}
          </View>
          {editingProfile ? (
            <View style={styles.formCard}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput style={styles.input} value={nameStr} onChangeText={setNameStr} autoCapitalize="words" placeholder="Your name" placeholderTextColor={color.text.muted} autoFocus />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Height ({units === 'imperial' ? 'inches' : 'cm'}) <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput style={styles.input} value={heightStr} onChangeText={setHeightStr} keyboardType="decimal-pad" placeholder={units === 'metric' ? '175' : '69'} placeholderTextColor={color.text.muted} />
              </View>
              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setEditingProfile(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.saveBtn, updateProfile.isPending && styles.disabled]} onPress={saveProfile} disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? <ActivityIndicator color={color.text.inverse} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.group}>
              <InfoRow label="Name" value={profile?.full_name ?? '—'} />
              <Sep />
              <InfoRow label="Height" value={heightDisplay} />
              <Sep />
              {/* Units toggle — immediate save, no edit mode needed */}
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Units</Text>
                <View style={styles.unitsToggle}>
                  {(['metric', 'imperial'] as const).map((u) => (
                    <Pressable
                      key={u}
                      style={[
                        styles.unitsPill,
                        units === u && styles.unitsPillActive,
                        updateProfile.isPending && styles.disabled,
                      ]}
                      onPress={() => {
                        if (units !== u) updateProfile.mutate({ units: u });
                      }}
                      disabled={updateProfile.isPending}
                    >
                      <Text style={[styles.unitsPillText, units === u && styles.unitsPillTextActive]}>
                        {u === 'metric' ? 'Metric' : 'Imperial'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Daily Goals section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLabelRow}>
              <MaterialCommunityIcons name={'target' as any} size={16} color={color.text.muted} />
              <Text style={styles.sectionLabel}>Daily Goals</Text>
            </View>
            {!editingGoals
              ? <Pressable onPress={startEditGoals}><Text style={styles.editBtn}>Adjust</Text></Pressable>
              : null}
          </View>
          {editingGoals ? (
            <View style={styles.formCard}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Calorie target <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput style={styles.input} value={calorieStr} onChangeText={setCalorieStr} keyboardType="number-pad" placeholder="2000" placeholderTextColor={color.text.muted} autoFocus />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Water target</Text>
                <View style={styles.presetRow}>
                  {[2000, 2500, 3000].map((value) => (
                    <PresetChip
                      key={value}
                      label={`${value} ml`}
                      active={waterStr === String(value)}
                      onPress={() => setWaterStr(String(value))}
                    />
                  ))}
                </View>
                <TextInput style={styles.input} value={waterStr} onChangeText={setWaterStr} keyboardType="number-pad" placeholder="2500" placeholderTextColor={color.text.muted} />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Sleep target</Text>
                <View style={styles.presetRow}>
                  {[420, 480, 540].map((value) => (
                    <PresetChip
                      key={value}
                      label={formatDuration(value)}
                      active={sleepStr === String(value)}
                      onPress={() => setSleepStr(String(value))}
                    />
                  ))}
                </View>
                <TextInput style={styles.input} value={sleepStr} onChangeText={setSleepStr} keyboardType="number-pad" placeholder="480" placeholderTextColor={color.text.muted} />
              </View>

              <View style={styles.formActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setEditingGoals(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.saveBtn, updateGoals.isPending && styles.disabled]} onPress={saveGoals} disabled={updateGoals.isPending}>
                  {updateGoals.isPending ? <ActivityIndicator color={color.text.inverse} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.group}>
              <InfoRow label="Calories" value={calDisplay} />
              <Sep />
              <InfoRow label="Water" value={waterDisplay} />
              <Sep />
              <InfoRow label="Sleep" value={sleepDisplay} />
            </View>
          )}
        </View>

        {/* Appearance & Preferences section */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRowStandalone}>
            <MaterialCommunityIcons name={'palette-outline' as any} size={16} color={color.text.muted} />
            <Text style={styles.sectionLabel}>Appearance &amp; Preferences</Text>
          </View>
          <View style={styles.group}>
            <InfoRow label="Dark Mode" value="Always on" />
          </View>
        </View>

        {/* Notifications section */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRowStandalone}>
            <MaterialCommunityIcons name={'bell-outline' as any} size={16} color={color.text.muted} />
            <Text style={styles.sectionLabel}>Notifications</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming soon</Text>
            </View>
          </View>
          <View style={styles.group}>
            <InfoRow label="Daily check-in reminder" value="Off" />
            <Sep />
            <InfoRow label="Hydration reminders" value="Off" />
          </View>
        </View>

        {/* Account section */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRowStandalone}>
            <MaterialCommunityIcons name={'information-outline' as any} size={16} color={color.text.muted} />
            <Text style={styles.sectionLabel}>Account</Text>
          </View>
          <View style={styles.group}>
            <InfoRow label="Email" value={emailDisplay} />
            <Sep />
            <InfoRow label="Version" value="0.1.0" />
            <Sep />
            <InfoRow label="Feedback" value="Send feedback →" />
          </View>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <Pressable style={styles.dangerButton} onPress={handleSignOut}>
            <MaterialCommunityIcons name={'logout' as any} size={18} color={color.danger} />
            <Text style={styles.dangerButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.bg },
  container: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  header: {
    paddingTop: space.lg,
    marginBottom: space.lg,
    gap: space.xs,
  },
  title: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
  },
  feedbackCard: {
    marginBottom: space.lg,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.success,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
  },
  feedbackText: { flex: 1, fontSize: typography.sm, color: color.text.primary },
  feedbackDismiss: { fontSize: typography.sm, fontWeight: '600', color: color.success },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    marginBottom: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: typography['2xl'],
    fontWeight: '800',
    color: color.text.inverse,
    letterSpacing: -0.5,
  },
  heroInfo: {
    flex: 1,
    gap: 4,
  },
  heroTitle: { fontSize: typography.xl, fontWeight: '700', color: color.text.primary },
  heroMeta: { fontSize: typography.sm, color: color.text.muted, lineHeight: 20 },
  section: {
    marginBottom: space.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  sectionLabelRowStandalone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.sm,
  },
  sectionLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editBtn: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.success,
  },
  group: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  separator: {
    height: 1,
    backgroundColor: color.outline,
    marginHorizontal: space.md,
  },
  rowLabel: {
    fontSize: typography.base,
    color: color.text.primary,
    flexShrink: 1,
    marginRight: space.sm,
  },
  rowValue: {
    fontSize: typography.base,
    color: color.text.muted,
  },
  formCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.lg,
  },
  field: {
    gap: space.xs,
  },
  fieldLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optional: {
    fontWeight: '400',
    textTransform: 'none',
    fontSize: typography.xs,
  },
  input: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: typography.base,
    color: color.text.primary,
    borderWidth: 1,
    borderColor: color.outline,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginBottom: space.xs,
  },
  presetChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  presetChipActive: {
    borderColor: color.success,
    backgroundColor: color.success,
  },
  presetChipText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  presetChipTextActive: {
    color: color.text.inverse,
  },
  formActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.outline,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: color.text.primary,
    fontSize: typography.base,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: color.success,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: color.text.inverse,
    fontSize: typography.base,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
  dangerButton: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.danger,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
    paddingVertical: space.md,
    backgroundColor: color.surface,
  },
  dangerButtonText: {
    color: color.danger,
    fontSize: typography.base,
    fontWeight: '700',
  },
  // Units toggle
  unitsToggle: {
    flexDirection: 'row',
    gap: 6,
  },
  unitsPill: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  unitsPillActive: {
    borderColor: color.success,
    backgroundColor: color.success + '18',
  },
  unitsPillText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: color.text.muted,
  },
  unitsPillTextActive: {
    color: color.success,
  },
  // Coming soon badge
  comingSoonBadge: {
    marginLeft: space.xs,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: color.warn + '22',
    borderWidth: 1,
    borderColor: color.warn + '55',
  },
  comingSoonText: {
    fontSize: typography.xs,
    fontWeight: '600',
    color: color.warn,
  },
});
