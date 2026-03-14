import { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';

export const TrackerCard = memo(function TrackerCard({
  icon,
  iconColor,
  title,
  value,
  sub,
  pct,
  onPress,
}: {
  icon: string;
  iconColor: string;
  title: string;
  value: string;
  sub: string;
  pct?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color: iconColor }]}>{value}</Text>
      <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
      {pct !== undefined ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: iconColor }]} />
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: 6,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: typography.sm,
    color: color.text.muted,
    fontWeight: '600',
    minHeight: 18,
  },
  value: {
    fontSize: typography.lg,
    fontWeight: '700',
    minHeight: 28,
  },
  sub: {
    fontSize: typography.xs,
    color: color.text.muted,
    lineHeight: 16,
    minHeight: 32,
  },
  track: {
    height: 3,
    backgroundColor: color.outline,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
