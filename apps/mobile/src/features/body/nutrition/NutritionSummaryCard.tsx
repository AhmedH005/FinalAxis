import { View, Text, StyleSheet } from 'react-native';
import { color, space, radius, typography } from '@axis/theme';
import { calColor, MACRO_COLORS } from './model';

export function NutritionSummaryCard({
  totalCalories,
  calTarget,
  calPct,
  logsCount,
  totalProtein,
  totalCarbs,
  totalFat,
}: {
  totalCalories: number;
  calTarget: number | null;
  calPct: number | null;
  logsCount: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}) {
  const proteinCals = totalProtein * 4;
  const carbsCals = totalCarbs * 4;
  const fatCals = totalFat * 9;
  const totalMacroCals = proteinCals + carbsCals + fatCals;
  const showMacroBar = totalMacroCals > 0;
  const proteinPct = showMacroBar ? (proteinCals / totalMacroCals) * 100 : 0;
  const carbsPct = showMacroBar ? (carbsCals / totalMacroCals) * 100 : 0;
  const fatPct = showMacroBar ? (fatCals / totalMacroCals) * 100 : 0;
  const heroColor = calPct !== null ? calColor(calPct) : color.success;

  return (
    <View style={[styles.summaryCard, { borderColor: heroColor + '33' }]}>
      {calPct !== null ? (
        <View style={[styles.calPctBadge, { borderColor: heroColor, backgroundColor: heroColor + '22' }]}>
          <Text style={[styles.calPctBadgeText, { color: heroColor }]}>{calPct}%</Text>
        </View>
      ) : null}
      <View style={styles.summaryMain}>
        <View style={styles.summaryPrimary}>
          <Text style={[styles.summaryValue, { color: heroColor }]}>{Math.round(totalCalories)}</Text>
          <Text style={styles.summaryLabel}>kcal today{calTarget ? ` / ${calTarget}` : ''}</Text>
        </View>
        <View style={styles.summaryMeta}>
          <Text style={styles.summaryMetaValue}>{logsCount}</Text>
          <Text style={styles.summaryMetaLabel}>meal{logsCount === 1 ? '' : 's'}</Text>
        </View>
      </View>
      {calPct !== null ? (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${calPct}%` as any, backgroundColor: heroColor }]} />
          </View>
          <Text style={styles.progressCaption}>{calPct}% of calorie target</Text>
        </>
      ) : null}
      {showMacroBar ? (
        <View style={styles.macroSection}>
          <View style={styles.macroStackBar}>
            <View style={[styles.macroStackSegment, { width: `${proteinPct}%` as any, backgroundColor: MACRO_COLORS.protein }]} />
            <View style={[styles.macroStackSegment, { width: `${carbsPct}%` as any, backgroundColor: MACRO_COLORS.carbs }]} />
            <View style={[styles.macroStackSegment, { width: `${fatPct}%` as any, backgroundColor: MACRO_COLORS.fat, borderTopRightRadius: radius.pill, borderBottomRightRadius: radius.pill }]} />
          </View>
          <View style={styles.macroChipRow}>
            <View style={[styles.macroChip, { backgroundColor: MACRO_COLORS.protein + '22', borderColor: MACRO_COLORS.protein + '44' }]}>
              <Text style={[styles.macroChipText, { color: MACRO_COLORS.protein }]}>P {Math.round(totalProtein)}g</Text>
            </View>
            <View style={[styles.macroChip, { backgroundColor: MACRO_COLORS.carbs + '22', borderColor: MACRO_COLORS.carbs + '44' }]}>
              <Text style={[styles.macroChipText, { color: MACRO_COLORS.carbs }]}>C {Math.round(totalCarbs)}g</Text>
            </View>
            <View style={[styles.macroChip, { backgroundColor: MACRO_COLORS.fat + '22', borderColor: MACRO_COLORS.fat + '44' }]}>
              <Text style={[styles.macroChipText, { color: MACRO_COLORS.fat }]}>F {Math.round(totalFat)}g</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.md,
    marginBottom: space.lg,
  },
  calPctBadge: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 3,
    marginBottom: -space.xs,
  },
  calPctBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  summaryMain: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
  },
  summaryPrimary: {
    flex: 1,
    gap: 2,
  },
  summaryValue: {
    fontSize: typography['4xl'],
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 48,
  },
  summaryLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  summaryMeta: {
    alignItems: 'flex-end',
    gap: 2,
    paddingBottom: 4,
  },
  summaryMetaValue: {
    fontSize: typography['2xl'],
    fontWeight: '700',
    color: color.text.primary,
  },
  summaryMetaLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  progressTrack: {
    height: 8,
    backgroundColor: color.outline,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: color.success,
    borderRadius: radius.pill,
  },
  progressCaption: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  macroSection: {
    gap: space.sm,
  },
  macroStackBar: {
    height: 6,
    borderRadius: radius.pill,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: color.outline,
  },
  macroStackSegment: {
    height: '100%',
  },
  macroChipRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  macroChip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  macroChipText: {
    fontSize: typography.sm,
    fontWeight: '600',
  },
});
