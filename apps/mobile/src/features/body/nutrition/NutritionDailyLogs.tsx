import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { MEAL_META, MEAL_ORDER, MEAL_TYPES, MACRO_COLORS } from './model';
import type { MealType } from '@/engines/body';
import type { NutritionLog } from '@/lib/supabase/database.types';

export function NutritionDailyLogs({
  grouped,
  isLoading,
  onLoadTemplate,
  onDeleteLog,
}: {
  grouped: Record<MealType, NutritionLog[]>;
  isLoading: boolean;
  onLoadTemplate: (log: NutritionLog) => void;
  onDeleteLog: (id: string) => void;
}) {
  const totalLogs = MEAL_ORDER.reduce((sum, type) => sum + grouped[type].length, 0);

  return (
    <View style={styles.section}>
      <View style={styles.sectionLabelRow}>
        <MaterialCommunityIcons name={'calendar-today' as any} size={14} color={color.text.muted} />
        <Text style={styles.sectionLabel}>Today</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color={color.success} />
      ) : totalLogs === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No meals logged yet</Text>
          <Text style={styles.emptyText}>Start with the first meal or reuse something you eat often.</Text>
        </View>
      ) : (
        MEAL_ORDER.map((type) => {
          const group = grouped[type];
          if (group.length === 0) return null;
          const groupCalories = group.reduce((sum, log) => sum + (log.total_calories ?? 0), 0);
          const meta = MEAL_META[type];

          return (
            <View key={type} style={styles.mealGroup}>
              <View style={styles.mealGroupHeader}>
                <View style={styles.mealGroupTitleRow}>
                  <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
                  <Text style={styles.mealGroupTitle}>
                    {MEAL_TYPES.find((item) => item.value === type)?.label}
                  </Text>
                </View>
                <View style={[styles.mealGroupCalsBadge, { backgroundColor: meta.color + '22' }]}>
                  <Text style={[styles.mealGroupCals, { color: meta.color }]}>{Math.round(groupCalories)} kcal</Text>
                </View>
              </View>
              <View style={[styles.logList, { borderLeftColor: meta.color }]}>
                {group.map((log, index) => (
                  <View key={log.id} style={[styles.logRow, index === group.length - 1 && styles.logRowLast]}>
                    <View style={styles.logLeft}>
                      <Text style={styles.logName}>{log.notes ?? 'Meal'}</Text>
                      <View style={styles.logMetaRow}>
                        <Text style={[styles.logMetaCal, { color: color.success }]}>
                          {Math.round(log.total_calories ?? 0)} kcal
                        </Text>
                        {log.total_protein_g ? (
                          <Text style={[styles.logMetaMacro, { color: MACRO_COLORS.protein }]}>
                            {Math.round(log.total_protein_g)}g P
                          </Text>
                        ) : null}
                        {log.total_carbs_g ? (
                          <Text style={[styles.logMetaMacro, { color: MACRO_COLORS.carbs }]}>
                            {Math.round(log.total_carbs_g)}g C
                          </Text>
                        ) : null}
                        {log.total_fat_g ? (
                          <Text style={[styles.logMetaMacro, { color: MACRO_COLORS.fat }]}>
                            {Math.round(log.total_fat_g)}g F
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.logTime}>{format(new Date(log.logged_at), 'h:mm a')}</Text>
                    </View>
                    <View style={styles.logRight}>
                      <Pressable style={styles.inlineAction} onPress={() => onLoadTemplate(log)}>
                        <Text style={styles.inlineActionText}>Reuse</Text>
                      </Pressable>
                      <Pressable onPress={() => onDeleteLog(log.id)} style={styles.deleteBtn}>
                        <MaterialCommunityIcons name={'close' as any} size={16} color={color.text.muted} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: space.xl,
  },
  sectionLabelRow: {
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
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.xs,
  },
  emptyTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  emptyText: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  mealGroup: {
    marginBottom: space.lg,
    gap: space.sm,
  },
  mealGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  mealGroupTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  mealGroupCalsBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  mealGroupCals: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
  },
  logList: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.outline,
  },
  logRowLast: {
    borderBottomWidth: 0,
  },
  logLeft: {
    flex: 1,
    gap: 2,
  },
  logName: {
    fontSize: typography.base,
    fontWeight: '600',
    color: color.text.primary,
  },
  logMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    alignItems: 'center',
  },
  logMetaCal: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
  logMetaMacro: {
    fontSize: typography.sm,
  },
  logTime: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  logRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  inlineAction: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  inlineActionText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.primary,
  },
  deleteBtn: {
    padding: space.xs,
  },
});
