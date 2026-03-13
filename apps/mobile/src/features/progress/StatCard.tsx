import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import type { TrendDelta } from '@/engines/body';

export function StatCard({
  icon,
  iconColor,
  title,
  value,
  hint,
  trend,
}: {
  icon: string;
  iconColor: string;
  title: string;
  value: string;
  hint: string;
  trend?: TrendDelta | null;
}) {
  return (
    <View style={[styles.card, { borderColor: iconColor + '22' }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: iconColor + '22' }]}>
          <MaterialCommunityIcons name={icon as any} size={14} color={iconColor} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {trend ? (
          <View style={styles.trendRow}>
            <MaterialCommunityIcons
              name={trend.up ? 'trending-up' : 'trending-down'}
              size={12}
              color={trend.up ? color.success : '#FF6B6B'}
            />
            <Text style={[styles.trendText, { color: trend.up ? color.success : '#FF6B6B' }]}>
              {Math.abs(trend.pct)}%
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: 4,
  },
  icon: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  value: {
    fontSize: typography.xl,
    fontWeight: '700',
    color: color.text.primary,
    marginTop: 2,
  },
  hint: {
    fontSize: typography.xs,
    color: color.text.muted,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 2,
  },
  trendText: {
    fontSize: typography.xs,
    fontWeight: '700',
  },
});
