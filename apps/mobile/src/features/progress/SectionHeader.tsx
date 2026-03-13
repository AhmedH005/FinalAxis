import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import type { TrendDelta } from '@/engines/body';

export function SectionHeader({
  icon,
  iconColor,
  label,
  streak,
  trend,
}: {
  icon: string;
  iconColor: string;
  label: string;
  streak: number;
  trend?: TrendDelta | null;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={14} color={iconColor} />
      </View>
      <Text style={styles.label}>{label}</Text>
      {streak > 0 ? (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>{streak}d streak</Text>
        </View>
      ) : null}
      {trend ? (
        <View style={[styles.trendBadge, { backgroundColor: trend.up ? '#43D9A322' : '#FF6B6B22' }]}>
          <MaterialCommunityIcons
            name={trend.up ? 'arrow-up' : 'arrow-down'}
            size={10}
            color={trend.up ? color.success : '#FF6B6B'}
          />
          <Text style={[styles.trendText, { color: trend.up ? color.success : '#FF6B6B' }]}>
            {Math.abs(trend.pct)}%
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.sm,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  streakBadge: {
    backgroundColor: '#43D9A322',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  streakText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.success,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  trendText: {
    fontSize: typography.xs,
    fontWeight: '700',
  },
});
