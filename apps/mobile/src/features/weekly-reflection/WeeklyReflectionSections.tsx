import type { Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space, typography } from '@axis/theme';
import type { LifeOsDomain, LifeOsWeeklyReflectionModel } from '@/engines/life-os';
import { appRoutes } from '@/types/navigation';

const DOMAIN_META = {
  time: {
    icon: 'calendar-blank-outline',
    accent: '#3B82F6',
  },
  body: {
    icon: 'heart-pulse',
    accent: '#43D9A3',
  },
  mind: {
    icon: 'brain',
    accent: '#7C6CF2',
  },
} as const;

function SectionHeader({
  title,
  detail,
}: {
  title: string;
  detail?: string | null;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

function routeForDomain(domain: LifeOsDomain): Href {
  switch (domain) {
    case 'body':
      return appRoutes.body;
    case 'mind':
      return appRoutes.mind;
    default:
      return appRoutes.time;
  }
}

function SignalRow({
  item,
  onOpenRoute,
}: {
  item: LifeOsWeeklyReflectionModel['recurringBlockers'][number];
  onOpenRoute: (route: Href) => void;
}) {
  const meta = DOMAIN_META[item.domain];

  return (
    <Pressable style={styles.signalRow} onPress={() => onOpenRoute(routeForDomain(item.domain))}>
      <View style={[styles.signalIconWrap, { backgroundColor: meta.accent + '14' }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={16} color={meta.accent} />
      </View>
      <View style={styles.signalCopy}>
        <Text style={styles.signalTitle}>{item.label}</Text>
        <Text style={styles.signalDetail}>{item.detail}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={color.outline} />
    </Pressable>
  );
}

export function WeeklyReflectionUnavailableCard({
  model,
}: {
  model: LifeOsWeeklyReflectionModel;
}) {
  if (model.isAvailable || !model.emptyState) {
    return null;
  }

  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{model.emptyState.title}</Text>
      <Text style={styles.emptySummary}>{model.emptyState.summary}</Text>
    </View>
  );
}

export function WeeklyReflectionContent({
  model,
  onOpenRoute,
}: {
  model: LifeOsWeeklyReflectionModel;
  onOpenRoute: (route: Href) => void;
}) {
  if (!model.isAvailable) {
    return <WeeklyReflectionUnavailableCard model={model} />;
  }

  return (
    <View style={styles.content}>
      <View style={styles.heroCard}>
        {model.weekLabel ? <Text style={styles.heroEyebrow}>{model.weekLabel}</Text> : null}
        {model.header.title ? <Text style={styles.heroTitle}>{model.header.title}</Text> : null}
        {model.header.summary ? <Text style={styles.heroSummary}>{model.header.summary}</Text> : null}
        {model.evidenceNote ? <Text style={styles.heroNote}>{model.evidenceNote}</Text> : null}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recurring blockers"
          detail="These were the points of drag that showed up most often."
        />
        <View style={styles.stack}>
          {model.recurringBlockers.length > 0 ? model.recurringBlockers.map((item) => (
            <SignalRow key={item.id} item={item} onOpenRoute={onOpenRoute} />
          )) : (
            <Text style={styles.placeholderText}>No recurring blocker stood out strongly enough this week.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recurring supports"
          detail="These were the signals that helped the week hold together."
        />
        <View style={styles.stack}>
          {model.recurringSupports.length > 0 ? model.recurringSupports.map((item) => (
            <SignalRow key={item.id} item={item} onOpenRoute={onOpenRoute} />
          )) : (
            <Text style={styles.placeholderText}>No strong support pattern repeated often enough yet.</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Alignment read"
          detail="Whether the week moved toward or away from the active direction."
        />
        <View style={styles.readCard}>
          {model.alignmentRead.title ? <Text style={styles.readTitle}>{model.alignmentRead.title}</Text> : null}
          {model.alignmentRead.summary ? <Text style={styles.readSummary}>{model.alignmentRead.summary}</Text> : null}
        </View>
      </View>

      {model.strongestShift.title ? (
        <View style={styles.section}>
          <SectionHeader
            title="One shift for next week"
            detail="The smallest change that repeated often enough to matter."
          />
          <Pressable
            style={styles.shiftCard}
            onPress={() => {
              if (model.strongestShift.domain) {
                onOpenRoute(routeForDomain(model.strongestShift.domain));
              }
            }}
          >
            <Text style={styles.shiftTitle}>{model.strongestShift.title}</Text>
            {model.strongestShift.summary ? (
              <Text style={styles.shiftSummary}>{model.strongestShift.summary}</Text>
            ) : null}
            {model.strongestShift.domain ? (
              <View style={styles.shiftFooter}>
                <Text style={styles.shiftFooterText}>Open the relevant engine</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={color.text.primary} />
              </View>
            ) : null}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space.lg,
  },
  section: {
    gap: space.sm,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  sectionDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.sm,
  },
  heroEyebrow: {
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: color.text.muted,
  },
  heroTitle: {
    fontSize: typography['2xl'],
    lineHeight: 30,
    fontWeight: '800',
    color: color.text.primary,
    letterSpacing: -0.4,
  },
  heroSummary: {
    fontSize: typography.base,
    lineHeight: 22,
    color: color.text.muted,
  },
  heroNote: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  stack: {
    gap: space.sm,
  },
  signalRow: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  signalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalCopy: {
    flex: 1,
    gap: 2,
  },
  signalTitle: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  signalDetail: {
    fontSize: typography.sm,
    lineHeight: 18,
    color: color.text.muted,
  },
  readCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.xs,
  },
  readTitle: {
    fontSize: typography.lg,
    lineHeight: 24,
    fontWeight: '700',
    color: color.text.primary,
  },
  readSummary: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  shiftCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.sm,
  },
  shiftTitle: {
    fontSize: typography.lg,
    lineHeight: 24,
    fontWeight: '700',
    color: color.text.primary,
  },
  shiftSummary: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  shiftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  shiftFooterText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  placeholderText: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.xl,
    gap: space.sm,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  emptySummary: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
});
