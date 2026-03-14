import { memo } from 'react';
import type { Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space, typography } from '@axis/theme';
import type {
  TodayDayReshapingSection,
  TodayLifeOsAction,
  TodayLifeOsCurrentState,
  TodayLifeOsEngineLink,
  TodayGoalAlignmentSection,
  TodayLifeOsInsight,
  TodayLifeOsSignal,
  TodayWeeklyReflectionSection,
} from './life-os-model';

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

function signalToneStyle(tone: TodayLifeOsSignal['tone']) {
  switch (tone) {
    case 'fragile':
      return {
        dotColor: color.warn,
        valueColor: color.warn,
      };
    case 'unknown':
      return {
        dotColor: color.outline,
        valueColor: color.text.muted,
      };
    default:
      return {
        dotColor: color.outline,
        valueColor: color.text.primary,
      };
  }
}

function severityColor(severity: TodayLifeOsInsight['severity']) {
  switch (severity) {
    case 'high':
      return color.danger;
    case 'medium':
      return color.warn;
    default:
      return color.text.muted;
  }
}

function confidenceLabel(confidence: TodayLifeOsInsight['confidence']) {
  return `${confidence} confidence`;
}

function goalBandLabel(section: TodayGoalAlignmentSection) {
  if (!section.band) return null;
  return section.band === 'at_risk'
    ? 'At risk'
    : section.band === 'misaligned'
    ? 'Misaligned'
    : section.band === 'aligned'
    ? 'Aligned'
    : 'Unclear';
}

function SectionHeader({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
    </View>
  );
}

function SupportingSignalRow({ signal }: { signal: TodayLifeOsSignal }) {
  const tone = signalToneStyle(signal.tone);

  return (
    <View style={styles.signalRow}>
      <View style={styles.signalLabelWrap}>
        <View style={[styles.signalDot, { backgroundColor: tone.dotColor }]} />
        <Text style={styles.signalLabel}>{signal.label}</Text>
      </View>
      <Text style={[styles.signalValue, { color: tone.valueColor }]}>{signal.value}</Text>
    </View>
  );
}

export const CurrentStateSection = memo(function CurrentStateSection({
  currentState,
}: {
  currentState: TodayLifeOsCurrentState;
}) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroNarrative}>
        <Text style={styles.heroEyebrow}>Current state</Text>
        <Text style={styles.heroTitle}>{currentState.primaryRead}</Text>
        {currentState.secondaryRead ? (
          <Text style={styles.heroDetail}>{currentState.secondaryRead}</Text>
        ) : null}
      </View>

      <View style={styles.signalPanel}>
        <Text style={styles.signalPanelLabel}>Signals in view</Text>
        <View style={styles.signalStack}>
          {currentState.supportingSignals.map((signal) => (
            <SupportingSignalRow key={signal.key} signal={signal} />
          ))}
        </View>
      </View>
    </View>
  );
});

const InsightCard = memo(function InsightCard({
  insight,
  mode = 'primary',
  onOpenRoute,
}: {
  insight: TodayLifeOsInsight;
  mode?: 'primary' | 'secondary' | 'positive';
  onOpenRoute: (route: Href) => void;
}) {
  const accent = insight.stance === 'positive' ? color.success : severityColor(insight.severity);
  const metaLabel = insight.stance === 'positive' ? 'Working for you' : 'Needs attention';

  return (
    <Pressable
      style={[
        styles.insightCard,
        mode === 'primary' && styles.primaryInsightCard,
        mode === 'positive' && styles.positiveInsightCard,
        { borderColor: accent + '33' },
      ]}
      onPress={() => onOpenRoute(insight.targetRoute)}
    >
      <View style={styles.insightTop}>
        <Text style={[styles.insightEyebrow, { color: accent }]}>{metaLabel}</Text>
        <View style={[styles.badge, { backgroundColor: accent + '16', borderColor: accent + '30' }]}>
          <Text style={[styles.badgeText, { color: accent }]}>{confidenceLabel(insight.confidence)}</Text>
        </View>
      </View>

      <Text style={styles.insightTitle}>{insight.title}</Text>
      <Text style={styles.insightDetail}>{insight.explanation}</Text>

      <View style={styles.insightFooter}>
        <Text style={styles.insightFooterText}>
          {mode === 'primary' ? 'Open the relevant engine' : 'Follow the signal'}
        </Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color={accent} />
      </View>
    </Pressable>
  );
});

export const InsightsSection = memo(function InsightsSection({
  primaryInsight,
  supportingInsights,
  positiveInsight,
  onOpenRoute,
}: {
  primaryInsight: TodayLifeOsInsight | null;
  supportingInsights: TodayLifeOsInsight[];
  positiveInsight: TodayLifeOsInsight | null;
  onOpenRoute: (route: Href) => void;
}) {
  if (!primaryInsight && !positiveInsight && supportingInsights.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Top observations" />

      {primaryInsight ? (
        <InsightCard insight={primaryInsight} mode="primary" onOpenRoute={onOpenRoute} />
      ) : null}

      {supportingInsights.length > 0 ? (
        <View style={styles.supportingStack}>
          {supportingInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              mode="secondary"
              onOpenRoute={onOpenRoute}
            />
          ))}
        </View>
      ) : null}

      {positiveInsight ? (
        <InsightCard insight={positiveInsight} mode="positive" onOpenRoute={onOpenRoute} />
      ) : null}
    </View>
  );
});

export const GoalAlignmentSection = memo(function GoalAlignmentSection({
  goalAlignment,
  onOpenRoute,
}: {
  goalAlignment: TodayGoalAlignmentSection;
  onOpenRoute: (route: Href) => void;
}) {
  if (!goalAlignment.isVisible) {
    return null;
  }

  const bandLabel = goalBandLabel(goalAlignment);

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Goal alignment"
        detail="How today is lining up against the active direction."
      />

      <View style={styles.goalCard}>
        <View style={styles.goalTop}>
          <Text style={styles.goalLabel}>{goalAlignment.goalLabel}</Text>
          <View style={styles.goalMetaRow}>
            {bandLabel ? (
              <View style={styles.goalBadge}>
                <Text style={styles.goalBadgeText}>{bandLabel}</Text>
              </View>
            ) : null}
            {goalAlignment.confidence ? (
              <Text style={styles.goalConfidence}>{goalAlignment.confidence} confidence</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.goalCopyBlock}>
          <Text style={styles.goalTitle}>{goalAlignment.currentPathTitle}</Text>
          {goalAlignment.currentPathSummary ? (
            <Text style={styles.goalDetail}>{goalAlignment.currentPathSummary}</Text>
          ) : null}
        </View>

        <View style={styles.goalDivider} />

        <View style={styles.goalCopyBlock}>
          <Text style={styles.goalShiftEyebrow}>{goalAlignment.moreAlignedPathTitle}</Text>
          {goalAlignment.moreAlignedPathSummary ? (
            <Text style={styles.goalDetail}>{goalAlignment.moreAlignedPathSummary}</Text>
          ) : null}
        </View>

        {goalAlignment.shifts.length > 0 ? (
          <View style={styles.goalShiftStack}>
            {goalAlignment.shifts.map((shift) => (
              <Pressable
                key={`${shift.domain}:${shift.label}`}
                style={styles.goalShiftRow}
                onPress={() => onOpenRoute(shift.route)}
              >
                <Text style={styles.goalShiftLabel}>{shift.label}</Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={color.text.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {goalAlignment.detailRoute ? (
          <Pressable
            style={styles.goalReadLink}
            onPress={() => {
              if (goalAlignment.detailRoute) {
                onOpenRoute(goalAlignment.detailRoute);
              }
            }}
          >
            <Text style={styles.goalReadLinkText}>Open the full goal read</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color={color.text.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

export const DayReshapingSection = memo(function DayReshapingSection({
  section,
  onOpenRoute,
}: {
  section: TodayDayReshapingSection;
  onOpenRoute: (route: Href) => void;
}) {
  if (!section.isVisible || !section.detailRoute) {
    return null;
  }

  const detailRoute = section.detailRoute;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Day reshaping"
        detail="A review-first read on small schedule changes AXIS can make safely."
      />

      <Pressable style={styles.reshapeCard} onPress={() => onOpenRoute(detailRoute)}>
        <View style={styles.reshapeTop}>
          <Text style={styles.reshapeTitle}>{section.title}</Text>
          {section.confidence ? (
            <View style={styles.reshapeBadge}>
              <Text style={styles.reshapeBadgeText}>{section.confidence} confidence</Text>
            </View>
          ) : null}
        </View>

        {section.summary ? <Text style={styles.reshapeDetail}>{section.summary}</Text> : null}

        <View style={styles.reshapeFooter}>
          <Text style={styles.reshapeFooterText}>
            {section.status === 'applied'
              ? 'Review the applied shifts or undo them'
              : `${section.actionCount} proposed shift${section.actionCount === 1 ? '' : 's'} in view`}
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={color.text.primary} />
        </View>
      </Pressable>
    </View>
  );
});

export const WeeklyReflectionSection = memo(function WeeklyReflectionSection({
  section,
  onOpenRoute,
}: {
  section: TodayWeeklyReflectionSection;
  onOpenRoute: (route: Href) => void;
}) {
  if (!section.isVisible || !section.detailRoute) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Weekly reflection"
        detail="A compact read on what kept repeating across the week."
      />

      <Pressable style={styles.weeklyCard} onPress={() => onOpenRoute(section.detailRoute!)}>
        <View style={styles.weeklyTop}>
          <Text style={styles.weeklyTitle}>{section.title}</Text>
          {section.confidence ? (
            <View style={styles.weeklyBadge}>
              <Text style={styles.weeklyBadgeText}>{section.confidence} confidence</Text>
            </View>
          ) : null}
        </View>

        {section.summary ? <Text style={styles.weeklyDetail}>{section.summary}</Text> : null}

        <View style={styles.weeklyFooter}>
          <Text style={styles.weeklyFooterText}>Open the weekly read</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={color.text.primary} />
        </View>
      </Pressable>
    </View>
  );
});

const ActionCard = memo(function ActionCard({
  action,
  onOpenRoute,
}: {
  action: TodayLifeOsAction;
  onOpenRoute: (route: Href) => void;
}) {
  const accent = DOMAIN_META[action.domain].accent;

  return (
    <Pressable
      style={[
        styles.actionCard,
        action.emphasis === 'primary' && styles.primaryActionCard,
        { borderColor: accent + '33' },
      ]}
      onPress={() => onOpenRoute(action.route)}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: accent + '18' }]}>
        <MaterialCommunityIcons
          name={DOMAIN_META[action.domain].icon as any}
          size={18}
          color={accent}
        />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionDetail}>{action.detail}</Text>
        <View style={styles.actionFooter}>
          <Text style={[styles.actionCta, { color: accent }]}>{action.cta}</Text>
          <MaterialCommunityIcons name="arrow-right" size={16} color={accent} />
        </View>
      </View>
    </Pressable>
  );
});

export const CourseCorrectionSection = memo(function CourseCorrectionSection({
  primaryAction,
  secondaryAction,
  onOpenRoute,
}: {
  primaryAction: TodayLifeOsAction | null;
  secondaryAction: TodayLifeOsAction | null;
  onOpenRoute: (route: Href) => void;
}) {
  if (!primaryAction && !secondaryAction) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Course correction" />
      <View style={styles.actionStack}>
        {primaryAction ? <ActionCard action={primaryAction} onOpenRoute={onOpenRoute} /> : null}
        {secondaryAction ? <ActionCard action={secondaryAction} onOpenRoute={onOpenRoute} /> : null}
      </View>
    </View>
  );
});

const EngineLinkCard = memo(function EngineLinkCard({
  link,
  onOpenRoute,
}: {
  link: TodayLifeOsEngineLink;
  onOpenRoute: (route: Href) => void;
}) {
  const meta = DOMAIN_META[link.domain];

  return (
    <Pressable
      style={[
        styles.engineLink,
        link.emphasized && { borderColor: meta.accent + '30' },
      ]}
      onPress={() => onOpenRoute(link.route)}
    >
      <View style={[styles.engineIconWrap, { backgroundColor: meta.accent + '12' }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={18} color={meta.accent} />
      </View>
      <View style={styles.engineCopy}>
        <Text style={styles.engineLabel}>{link.label}</Text>
        <Text style={styles.engineDetail}>{link.detail}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={color.outline} />
    </Pressable>
  );
});

export const EngineLinksSection = memo(function EngineLinksSection({
  links,
  onOpenRoute,
}: {
  links: TodayLifeOsEngineLink[];
  onOpenRoute: (route: Href) => void;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader title="Next focus" detail="Open the engine that deserves attention next." />
      <View style={styles.engineStack}>
        {links.map((link) => (
          <EngineLinkCard key={link.domain} link={link} onOpenRoute={onOpenRoute} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
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
    color: color.text.muted,
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: color.outline,
    gap: space.lg,
  },
  heroNarrative: {
    gap: space.sm,
  },
  heroEyebrow: {
    fontSize: typography.sm,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: typography['2xl'],
    lineHeight: 34,
    fontWeight: '800',
    color: color.text.primary,
    letterSpacing: -0.5,
  },
  heroDetail: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 22,
    maxWidth: 320,
  },
  signalPanel: {
    borderTopWidth: 1,
    borderTopColor: color.outline,
    paddingTop: space.md,
    gap: space.sm,
  },
  signalPanelLabel: {
    fontSize: typography.xs,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  signalStack: {
    gap: space.xs,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.outline,
  },
  signalLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  signalDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  signalLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
    fontWeight: '600',
  },
  signalValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: typography.sm,
    fontWeight: '700',
  },
  primaryInsightCard: {
    paddingVertical: space.lg,
  },
  positiveInsightCard: {
    backgroundColor: color.success + '08',
  },
  insightCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    gap: space.sm,
  },
  supportingStack: {
    gap: space.sm,
  },
  insightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
    alignItems: 'center',
  },
  insightEyebrow: {
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  insightTitle: {
    fontSize: typography.lg,
    lineHeight: 26,
    fontWeight: '700',
    color: color.text.primary,
  },
  insightDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  insightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  insightFooterText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  actionStack: {
    gap: space.sm,
  },
  goalCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.md,
  },
  goalTop: {
    gap: space.xs,
  },
  goalLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  goalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  goalBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  goalBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  goalConfidence: {
    fontSize: typography.xs,
    color: color.text.muted,
    fontWeight: '700',
  },
  goalCopyBlock: {
    gap: space.xs,
  },
  goalTitle: {
    fontSize: typography.lg,
    lineHeight: 26,
    fontWeight: '700',
    color: color.text.primary,
  },
  goalDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  goalDivider: {
    height: 1,
    backgroundColor: color.outline,
  },
  goalShiftEyebrow: {
    fontSize: typography.xs,
    color: color.text.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  goalShiftStack: {
    gap: space.xs,
  },
  goalReadLink: {
    marginTop: space.xs,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  goalReadLinkText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  reshapeCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.sm,
  },
  reshapeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  reshapeTitle: {
    flex: 1,
    fontSize: typography.lg,
    lineHeight: 24,
    fontWeight: '700',
    color: color.text.primary,
  },
  reshapeBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  reshapeBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
  },
  reshapeDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  reshapeFooter: {
    marginTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  reshapeFooterText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  weeklyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.sm,
  },
  weeklyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  weeklyTitle: {
    flex: 1,
    fontSize: typography.lg,
    lineHeight: 24,
    fontWeight: '700',
    color: color.text.primary,
  },
  weeklyBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  weeklyBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
  },
  weeklyDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  weeklyFooter: {
    marginTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  weeklyFooterText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  goalShiftRow: {
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.outline,
  },
  goalShiftLabel: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  actionCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'flex-start',
  },
  primaryActionCard: {
    paddingVertical: space.lg,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: space.xs,
  },
  actionTitle: {
    fontSize: typography.base,
    lineHeight: 22,
    fontWeight: '700',
    color: color.text.primary,
  },
  actionDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  actionFooter: {
    marginTop: space.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  actionCta: {
    fontSize: typography.sm,
    fontWeight: '700',
  },
  engineStack: {
    gap: space.sm,
  },
  engineLink: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  engineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineCopy: {
    flex: 1,
    gap: 2,
  },
  engineLabel: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  engineDetail: {
    fontSize: typography.sm,
    lineHeight: 18,
    color: color.text.muted,
  },
});
