import type { Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space, typography } from '@axis/theme';
import type {
  GoalAlignmentDetailModel,
  GoalAlignmentDetailShiftItem,
  GoalAlignmentDetailSignalItem,
} from './detail-model';

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

function bandAccent(band: GoalAlignmentDetailModel['band']) {
  switch (band) {
    case 'aligned':
      return color.success;
    case 'at_risk':
      return color.warn;
    case 'misaligned':
      return color.danger;
    default:
      return color.text.muted;
  }
}

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

function PathCard({
  eyebrow,
  title,
  summary,
  evidence,
}: {
  eyebrow: string;
  title: string | null;
  summary: string | null;
  evidence?: string[];
}) {
  return (
    <View style={styles.pathCard}>
      <Text style={styles.pathEyebrow}>{eyebrow}</Text>
      {title ? <Text style={styles.pathTitle}>{title}</Text> : null}
      {summary ? <Text style={styles.pathSummary}>{summary}</Text> : null}
      {evidence && evidence.length > 0 ? (
        <View style={styles.evidenceRow}>
          {evidence.slice(0, 3).map((item) => (
            <View key={item} style={styles.evidencePill}>
              <Text style={styles.evidencePillText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SignalRow({
  item,
  onOpenRoute,
}: {
  item: GoalAlignmentDetailSignalItem;
  onOpenRoute: (route: Href) => void;
}) {
  const meta = DOMAIN_META[item.domain];

  return (
    <Pressable style={styles.signalRow} onPress={() => onOpenRoute(item.route)}>
      <View style={[styles.signalIconWrap, { backgroundColor: meta.accent + '16' }]}>
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

function ShiftCard({
  item,
  onOpenRoute,
}: {
  item: GoalAlignmentDetailShiftItem;
  onOpenRoute: (route: Href) => void;
}) {
  const meta = DOMAIN_META[item.domain];

  return (
    <Pressable
      style={[styles.shiftCard, { borderColor: meta.accent + '28' }]}
      onPress={() => onOpenRoute(item.route)}
    >
      <View style={styles.shiftTop}>
        <View style={[styles.shiftIconWrap, { backgroundColor: meta.accent + '16' }]}>
          <MaterialCommunityIcons name={meta.icon as any} size={18} color={meta.accent} />
        </View>
        <View style={styles.shiftCopy}>
          <Text style={styles.shiftTitle}>{item.title}</Text>
          <Text style={styles.shiftDetail}>{item.detail}</Text>
        </View>
      </View>
      <View style={styles.shiftFooter}>
        <Text style={[styles.shiftLink, { color: meta.accent }]}>
          {item.domain === 'body' ? 'Open Body' : item.domain === 'mind' ? 'Open Mind' : 'Open Time'}
        </Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={meta.accent} />
      </View>
    </Pressable>
  );
}

export function GoalAlignmentUnavailableCard({
  model,
}: {
  model: GoalAlignmentDetailModel;
}) {
  if (model.isAvailable || !model.emptyState) {
    return null;
  }

  return (
    <View style={styles.unavailableCard}>
      <Text style={styles.unavailableTitle}>{model.emptyState.title}</Text>
      <Text style={styles.unavailableSummary}>{model.emptyState.summary}</Text>
    </View>
  );
}

export function GoalAlignmentDetailContent({
  model,
  onOpenRoute,
}: {
  model: GoalAlignmentDetailModel;
  onOpenRoute: (route: Href) => void;
}) {
  if (!model.isAvailable) {
    return <GoalAlignmentUnavailableCard model={model} />;
  }

  const accent = bandAccent(model.band);

  return (
    <View style={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>{model.goalLabel}</Text>
          <View style={styles.heroMeta}>
            {model.bandLabel ? (
              <View style={[styles.heroBadge, { borderColor: accent + '30', backgroundColor: accent + '12' }]}>
                <Text style={[styles.heroBadgeText, { color: accent }]}>{model.bandLabel}</Text>
              </View>
            ) : null}
            {model.confidence ? (
              <Text style={styles.heroConfidence}>{model.confidence} confidence</Text>
            ) : null}
          </View>
        </View>

        {model.headerSummary ? <Text style={styles.heroSummary}>{model.headerSummary}</Text> : null}
        {model.evidenceNote ? <Text style={styles.evidenceNote}>{model.evidenceNote}</Text> : null}
      </View>

      <PathCard
        eyebrow="Current path"
        title={model.currentPath.title}
        summary={model.currentPath.summary}
        evidence={model.currentPath.evidence}
      />

      <PathCard
        eyebrow="More aligned path"
        title={model.moreAlignedPath.title}
        summary={model.moreAlignedPath.summary}
      />

      {model.blockers.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="Top blockers"
            detail="These are the signals creating the most drag against the goal today."
          />
          <View style={styles.stack}>
            {model.blockers.map((item) => (
              <SignalRow key={item.id} item={item} onOpenRoute={onOpenRoute} />
            ))}
          </View>
        </View>
      ) : null}

      {model.supports.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="Top supports"
            detail="These are the signals currently helping the goal stay on line."
          />
          <View style={styles.stack}>
            {model.supports.map((item) => (
              <SignalRow key={item.id} item={item} onOpenRoute={onOpenRoute} />
            ))}
          </View>
        </View>
      ) : null}

      {model.recommendedShifts.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="Recommended shifts"
            detail="These are the cleanest changes AXIS sees from here."
          />
          <View style={styles.stack}>
            {model.recommendedShifts.map((item) => (
              <ShiftCard key={item.id} item={item} onOpenRoute={onOpenRoute} />
            ))}
          </View>
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
    gap: space.md,
  },
  heroTop: {
    gap: space.sm,
  },
  heroLabel: {
    fontSize: typography.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    color: color.text.muted,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  heroBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroConfidence: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
  },
  heroSummary: {
    fontSize: typography.xl,
    lineHeight: 30,
    fontWeight: '800',
    color: color.text.primary,
    letterSpacing: -0.3,
  },
  evidenceNote: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  pathCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.sm,
  },
  pathEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pathTitle: {
    fontSize: typography.lg,
    lineHeight: 26,
    fontWeight: '700',
    color: color.text.primary,
  },
  pathSummary: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  evidenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.xs,
  },
  evidencePill: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.outline,
  },
  evidencePillText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.primary,
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
    gap: space.md,
  },
  signalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalCopy: {
    flex: 1,
    gap: 4,
  },
  signalTitle: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  signalDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  shiftCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    gap: space.md,
  },
  shiftTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  shiftIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftCopy: {
    flex: 1,
    gap: 4,
  },
  shiftTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  shiftDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  shiftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftLink: {
    fontSize: typography.sm,
    fontWeight: '700',
  },
  unavailableCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.xl,
    gap: space.sm,
  },
  unavailableTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  unavailableSummary: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
});
