import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { ReactNode } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import type { AxisReadSummary, SignalCoverageSummary, TodayActionSummary } from './model';
import { MIND_COLOR } from '@/engines/mind';

export function MetricChip({
  icon,
  label,
  value,
  pct,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  pct: number | null;
  accent: string;
}) {
  return (
    <View style={[styles.metricChip, { borderColor: accent + '33' }]}>
      <View style={[styles.metricIconWrap, { backgroundColor: accent + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={14} color={accent} />
      </View>
      <View style={styles.metricCopy}>
        <Text style={[styles.metricLabel, { color: accent }]} numberOfLines={1}>{label}</Text>
        <Text style={styles.metricValue} numberOfLines={2}>{value}</Text>
        {pct !== null ? (
          <View style={styles.metricTrack}>
            <View style={[styles.metricFill, { width: `${Math.min(100, pct)}%`, backgroundColor: accent }]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function SignalCoverageCard({
  summary,
  onPress,
  children,
}: {
  summary: SignalCoverageSummary;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      style={[styles.heroCard, { borderColor: summary.color + '33' }]}
      onPress={onPress}
    >
      <View style={styles.heroTop}>
        <View>
          <Text style={styles.heroEyebrow}>Signal coverage</Text>
          <Text style={[styles.heroScore, { color: summary.color }]}>
            {summary.pct}
            <Text style={styles.heroScoreSuffix}>%</Text>
          </Text>
        </View>
        <View style={styles.heroSummary}>
          <Text style={styles.heroSummaryLabel}>Logged</Text>
          <Text style={styles.heroSummaryValue}>{summary.count}/{summary.total}</Text>
        </View>
      </View>

      <View style={styles.heroTrack}>
        <View style={[styles.heroFill, { width: `${summary.pct}%`, backgroundColor: summary.color }]} />
      </View>

      <Text style={styles.heroHint}>
        AXIS gets stronger when your physical, emotional, and reflective signals are all in view.
      </Text>

      <View style={styles.chipsRow}>{children}</View>
    </Pressable>
  );
}

export function AxisReadCard({
  read,
  energyValue,
  sleepValue,
  consistencyValue,
  onPress,
}: {
  read: AxisReadSummary;
  energyValue: string;
  sleepValue: string;
  consistencyValue: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.readCard} onPress={onPress}>
      <View style={styles.readHeader}>
        <View style={styles.readCopy}>
          <Text style={styles.readEyebrow}>AXIS read</Text>
          <Text style={[styles.readHeadline, { color: read.accent }]}>{read.headline}</Text>
        </View>
        <View style={[styles.readIconWrap, { backgroundColor: read.accent + '18' }]}>
          <MaterialCommunityIcons name={read.icon as any} size={20} color={read.accent} />
        </View>
      </View>

      <Text style={styles.readDetail}>{read.detail}</Text>

      <View style={styles.readStats}>
        <View style={styles.readPill}>
          <Text style={styles.readPillLabel}>Energy</Text>
          <Text style={styles.readPillValue}>{energyValue}</Text>
        </View>
        <View style={styles.readPill}>
          <Text style={styles.readPillLabel}>Sleep</Text>
          <Text style={styles.readPillValue}>{sleepValue}</Text>
        </View>
        <View style={styles.readPill}>
          <Text style={styles.readPillLabel}>Consistency</Text>
          <Text style={styles.readPillValue}>{consistencyValue}</Text>
        </View>
      </View>

      <View style={styles.readAction}>
        <Text style={[styles.readActionText, { color: read.accent }]}>{read.cta}</Text>
        <MaterialCommunityIcons name="arrow-right" size={14} color={read.accent} />
      </View>
    </Pressable>
  );
}

export function ActionCard({
  icon,
  iconColor,
  eyebrow,
  title,
  detail,
  cta,
  tone = 'default',
  onPress,
}: {
  icon: string;
  iconColor: string;
  eyebrow: string;
  title: string;
  detail: string;
  cta: string;
  tone?: 'default' | 'highlight';
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.actionCard, tone === 'highlight' && { borderColor: color.success }]}
      onPress={onPress}
    >
      <View style={[styles.actionIconCircle, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.actionEyebrow}>{eyebrow}</Text>
      <Text style={styles.actionTitle} numberOfLines={2}>{title}</Text>
      <Text style={styles.actionDetail} numberOfLines={3}>{detail}</Text>
      <View style={[styles.actionCtaBtn, tone === 'highlight' && { backgroundColor: color.success }]}>
        <Text style={[styles.actionCtaText, tone === 'highlight' && { color: color.text.inverse }]}>{cta}</Text>
      </View>
    </Pressable>
  );
}

export function ActionSummaryCard({
  action,
  onPress,
}: {
  action: TodayActionSummary;
  onPress: () => void;
}) {
  return (
    <ActionCard
      icon={action.icon ?? 'brain'}
      iconColor={action.iconColor ?? MIND_COLOR}
      eyebrow={action.eyebrow ?? 'Reflection'}
      title={action.title}
      detail={action.detail}
      cta={action.cta}
      onPress={onPress}
    />
  );
}

export function LayerLink({
  icon,
  label,
  detail,
  accent,
  onPress,
}: {
  icon: string;
  label: string;
  detail: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.layerCard} onPress={onPress}>
      <View style={[styles.layerIconWrap, { backgroundColor: accent + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={accent} />
      </View>
      <View style={styles.layerCopy}>
        <Text style={styles.layerLabel}>{label}</Text>
        <Text style={styles.layerDetail}>{detail}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={16} color={color.outline} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  metricChip: {
    width: '48%',
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.sm,
    gap: space.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 88,
  },
  metricIconWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: typography.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
    lineHeight: 18,
    minHeight: 36,
  },
  metricTrack: {
    height: 3,
    backgroundColor: color.outline,
    borderRadius: 2,
    overflow: 'hidden',
    width: 48,
    marginTop: 2,
  },
  metricFill: {
    height: '100%',
    borderRadius: 2,
  },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.xl,
    gap: space.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroEyebrow: {
    fontSize: typography.sm,
    color: color.text.muted,
    marginBottom: 4,
  },
  heroScore: {
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: -2,
  },
  heroScoreSuffix: {
    fontSize: typography['2xl'],
    color: color.text.muted,
    fontWeight: '500',
  },
  heroSummary: {
    alignItems: 'flex-end',
    gap: 4,
  },
  heroSummaryLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroSummaryValue: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
  },
  heroTrack: {
    height: 6,
    backgroundColor: color.outline,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  heroHint: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  readCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    marginBottom: space.xl,
    gap: space.md,
  },
  readHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  readCopy: {
    flex: 1,
    gap: 4,
  },
  readEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  readHeadline: {
    fontSize: typography.lg,
    color: color.text.primary,
    fontWeight: '700',
    lineHeight: 24,
  },
  readIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readDetail: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  readStats: {
    flexDirection: 'row',
    gap: space.xs,
  },
  readPill: {
    flex: 1,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: color.outline,
    gap: 2,
  },
  readPillLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  readPillValue: {
    fontSize: typography.sm,
    color: color.text.primary,
    fontWeight: '700',
  },
  readAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readActionText: {
    fontSize: typography.sm,
    fontWeight: '700',
  },
  actionCard: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: color.outline,
    gap: 6,
    minHeight: 172,
    justifyContent: 'space-between',
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  actionEyebrow: {
    fontSize: typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: color.text.muted,
    fontWeight: '600',
  },
  actionTitle: {
    fontSize: typography.base,
    color: color.text.primary,
    fontWeight: '700',
    lineHeight: 20,
    minHeight: 40,
  },
  actionDetail: {
    fontSize: typography.xs,
    color: color.text.muted,
    lineHeight: 16,
    minHeight: 46,
  },
  actionCtaBtn: {
    alignSelf: 'flex-start',
    marginTop: 'auto',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.outline,
  },
  actionCtaText: {
    fontSize: typography.xs,
    color: color.text.primary,
    fontWeight: '700',
  },
  layerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  layerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layerCopy: {
    flex: 1,
    gap: 2,
  },
  layerLabel: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  layerDetail: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
});
