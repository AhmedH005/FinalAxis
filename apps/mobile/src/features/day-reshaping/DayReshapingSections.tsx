import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space, typography } from '@axis/theme';
import type { DayReshapingModel, DayReshapingShiftItem } from './model';

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

function confidenceAccent(confidence: DayReshapingModel['header']['confidence']) {
  switch (confidence) {
    case 'high':
      return color.success;
    case 'medium':
      return color.warn;
    default:
      return color.text.muted;
  }
}

function ShiftCard({ item }: { item: DayReshapingShiftItem }) {
  const accent = confidenceAccent(item.confidence);

  return (
    <View style={[styles.shiftCard, { borderColor: accent + '22' }]}>
      <View style={styles.shiftTop}>
        <Text style={styles.shiftTitle}>{item.title}</Text>
        <View style={[styles.shiftBadge, { borderColor: accent + '30', backgroundColor: accent + '12' }]}>
          <Text style={[styles.shiftBadgeText, { color: accent }]}>{item.confidence} confidence</Text>
        </View>
      </View>
      <Text style={styles.shiftDetail}>{item.detail}</Text>
      <Text style={styles.shiftMeta}>{item.affectedLabel}</Text>
    </View>
  );
}

export function DayReshapingUnavailableCard({
  model,
}: {
  model: DayReshapingModel;
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

export function DayReshapingContent({
  model,
  message,
  onApply,
  onKeepDay,
  onUndo,
  isApplying,
  isUndoing,
}: {
  model: DayReshapingModel;
  message: string | null;
  onApply: () => void;
  onKeepDay: () => void;
  onUndo: () => void;
  isApplying: boolean;
  isUndoing: boolean;
}) {
  if (!model.isAvailable) {
    return <DayReshapingUnavailableCard model={model} />;
  }

  return (
    <View style={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroTitle}>{model.header.title}</Text>
          {model.header.confidence ? (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{model.header.confidence} confidence</Text>
            </View>
          ) : null}
        </View>
        {model.header.whyNow ? <Text style={styles.heroDetail}>{model.header.whyNow}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      {model.proposedShifts.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="Proposed shifts"
            detail="These are the schedule changes AXIS can explain concretely today."
          />
          <View style={styles.stack}>
            {model.proposedShifts.map((item) => (
              <ShiftCard key={item.id} item={item} />
            ))}
          </View>
        </View>
      ) : null}

      {model.expectedBenefit.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Expected benefit" />
          <View style={styles.benefitStack}>
            {model.expectedBenefit.map((item) => (
              <View key={item} style={styles.benefitPill}>
                <Text style={styles.benefitText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {model.blockedReasons.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="What AXIS is leaving alone"
            detail="These are the moves it considered but would not make confidently enough yet."
          />
          <View style={styles.noteStack}>
            {model.blockedReasons.map((item) => (
              <Text key={item} style={styles.noteText}>{item}</Text>
            ))}
          </View>
        </View>
      ) : null}

      {model.notes.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Read carefully" />
          <View style={styles.noteStack}>
            {model.notes.map((item) => (
              <Text key={item} style={styles.noteText}>{item}</Text>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.actionBar}>
        {model.status === 'applied' ? (
          <Pressable style={[styles.primaryButton, isUndoing && styles.buttonDisabled]} onPress={onUndo} disabled={isUndoing}>
            <Text style={styles.primaryButtonText}>{isUndoing ? 'Undoing...' : 'Undo reshape'}</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.primaryButton, isApplying && styles.buttonDisabled]} onPress={onApply} disabled={isApplying}>
            <Text style={styles.primaryButtonText}>{isApplying ? 'Applying...' : 'Apply reshape'}</Text>
          </Pressable>
        )}

        <Pressable style={styles.secondaryButton} onPress={onKeepDay}>
          <Text style={styles.secondaryButtonText}>
            {model.status === 'applied' ? 'Back to today' : 'Keep the day as it is'}
          </Text>
        </Pressable>
      </View>
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  heroTitle: {
    flex: 1,
    fontSize: typography['2xl'],
    lineHeight: 30,
    fontWeight: '800',
    color: color.text.primary,
    letterSpacing: -0.4,
  },
  heroBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
  },
  heroBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
  },
  heroDetail: {
    fontSize: typography.base,
    lineHeight: 22,
    color: color.text.muted,
  },
  message: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.primary,
  },
  stack: {
    gap: space.sm,
  },
  shiftCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    gap: space.xs,
  },
  shiftTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  shiftTitle: {
    flex: 1,
    fontSize: typography.base,
    lineHeight: 22,
    fontWeight: '700',
    color: color.text.primary,
  },
  shiftBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  shiftBadgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
  },
  shiftDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  shiftMeta: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  benefitStack: {
    gap: space.xs,
  },
  benefitPill: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  benefitText: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.primary,
  },
  noteStack: {
    gap: space.xs,
  },
  noteText: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  actionBar: {
    gap: space.sm,
  },
  primaryButton: {
    backgroundColor: color.text.primary,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.bg,
  },
  secondaryButton: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  secondaryButtonText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
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
