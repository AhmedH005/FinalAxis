import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space, typography } from '@axis/theme';
import { HydrationPickerModal } from '@/features/today/HydrationPickerModal';
import {
  ActionCard,
  ActionSummaryCard,
  AxisReadCard,
  LayerLink,
  MetricChip,
  SignalCoverageCard,
} from '@/features/today/TodayCards';
import { useTodayScreen } from '@/features/today/useTodayScreen';

export default function TodayScreen() {
  const today = useTodayScreen();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.date}>{today.dateLabel}</Text>
          <Text style={styles.greeting}>{today.greeting}</Text>
          <Text style={styles.subtitle}>{today.subtitle}</Text>
        </View>

        <SignalCoverageCard summary={today.signalCoverage} onPress={today.openCoverage}>
          {today.metricChips.map((chip) => (
            <MetricChip
              key={chip.label}
              icon={chip.icon}
              label={chip.label}
              value={chip.value}
              pct={chip.pct}
              accent={chip.accent}
            />
          ))}
        </SignalCoverageCard>

        <AxisReadCard
          read={today.axisRead}
          energyValue={today.energyValue}
          sleepValue={today.sleepValue}
          consistencyValue={today.consistencyValue}
          onPress={today.openAxisRead}
        />

        <Text style={styles.sectionLabel}>Act on the next signal</Text>
        <View style={styles.actionGrid}>
          <View style={styles.actionRow}>
            {today.actionCards.map((action) => (
              <ActionCard
                key={action.eyebrow}
                icon={action.icon}
                iconColor={action.iconColor}
                eyebrow={action.eyebrow}
                title={action.title}
                detail={action.detail}
                cta={action.cta}
                tone={action.tone}
                onPress={action.onPress}
              />
            ))}
          </View>

          <View style={styles.actionRow}>
            <ActionSummaryCard
              action={today.reflectionAction}
              onPress={today.openReflectionAction}
            />
            <ActionSummaryCard
              action={today.supplementalAction}
              onPress={today.openSupplementalAction}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Explore AXIS</Text>
        <View style={styles.layerList}>
          {today.layerLinks.map((link) => (
            <LayerLink
              key={link.label}
              icon={link.icon}
              label={link.label}
              detail={link.detail}
              accent={link.accent}
              onPress={() => today.openLayer(link.route)}
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <HydrationPickerModal
        visible={today.hydrationPickerVisible}
        amountOptions={today.hydrationOptions}
        selectedAmount={today.selectedHydrationAmount}
        isSaving={today.isSavingHydration}
        totalMl={today.totalMl}
        onClose={() => today.setHydrationPickerVisible(false)}
        onSelectAmount={today.setSelectedHydrationAmount}
        onLower={today.lowerWater}
        onAdd={today.quickAddWater}
        onOpenTracker={today.openHydrationTracker}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  container: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
  },
  header: {
    paddingTop: space.lg,
    marginBottom: space.lg,
    gap: space.xs,
  },
  date: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  greeting: {
    fontSize: typography['3xl'],
    fontWeight: '700',
    color: color.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.base,
    color: color.text.muted,
    lineHeight: 22,
    maxWidth: 330,
  },
  sectionLabel: {
    fontSize: typography.sm,
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: space.sm,
    fontWeight: '600',
  },
  actionGrid: {
    gap: space.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'stretch',
  },
  layerList: {
    gap: space.xs,
  },
  bottomSpacer: {
    height: 24,
  },
});
