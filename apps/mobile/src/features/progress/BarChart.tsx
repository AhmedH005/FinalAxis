import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { color } from '@axis/theme';
import { daysAgoStr } from '@/engines/body';

function barColor(pct: number) {
  if (pct >= 100) return color.success;
  if (pct >= 70) return '#F9B24E';
  return '#FF6B6B';
}

export function BarChart({
  days,
  valueByDay,
  target,
}: {
  days: string[];
  valueByDay: Record<string, number>;
  target: number;
}) {
  const today = daysAgoStr(0);

  return (
    <View style={styles.chart}>
      {days.map((day) => {
        const value = valueByDay[day] ?? 0;
        const pct = target > 0 ? Math.round((value / target) * 100) : 0;
        const clampedPct = Math.min(100, pct);
        const isToday = day === today;
        const fillColor = value === 0 ? color.outline : barColor(pct);

        return (
          <View key={day} style={styles.column}>
            {value > 0 ? (
              <Text style={[styles.pctLabel, { color: fillColor }]}>
                {pct >= 100 ? '✓' : `${pct}%`}
              </Text>
            ) : null}
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { height: `${clampedPct}%`, backgroundColor: fillColor },
                ]}
              />
            </View>
            <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
              {format(new Date(`${day}T12:00:00`), 'E')[0]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 96,
    gap: 4,
    paddingTop: 18,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    gap: 4,
  },
  track: {
    flex: 1,
    width: '100%',
    backgroundColor: color.outline,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 10,
    color: color.text.muted,
  },
  dayLabelToday: {
    color: color.text.primary,
    fontWeight: '700',
  },
  pctLabel: {
    fontSize: 9,
    fontWeight: '700',
    position: 'absolute',
    top: 0,
  },
});
