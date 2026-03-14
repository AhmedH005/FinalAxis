import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { color, radius, space, typography } from '@axis/theme';
import { useQuickCapture } from './useQuickCapture';

const EXAMPLES = [
  'drank 500ml',
  'mood 6 stressed',
  'note: felt slow after lunch',
  'remind me to call Sam',
] as const;

export function QuickCaptureSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const capture = useQuickCapture({ visible, onClose });
  const canConfirm = capture.result.status === 'accepted' && !capture.isSubmitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={capture.closeSheet}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={capture.closeSheet} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Quick capture</Text>
            <Text style={styles.subtitle}>
              One clear input at a time. AXIS will only save what it can place safely.
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                value={capture.input}
                onChangeText={capture.setInput}
                placeholder="Try “drank 500ml” or “note: felt slow after lunch”"
                placeholderTextColor={color.text.muted}
                autoFocus={visible}
                multiline
              />
            </View>

            <View style={styles.exampleWrap}>
              {EXAMPLES.map((example) => (
                <Pressable
                  key={example}
                  style={styles.exampleChip}
                  onPress={() => capture.setInput(example)}
                >
                  <Text style={styles.exampleChipText}>{example}</Text>
                </Pressable>
              ))}
            </View>

            {capture.outcome ? (
              <View style={[
                styles.outcomeCard,
                capture.outcome.kind === 'success' ? styles.successCard : styles.errorCard,
              ]}>
                <Text style={styles.outcomeTitle}>{capture.outcome.title}</Text>
                <Text style={styles.outcomeDetail}>{capture.outcome.detail}</Text>
                <View style={styles.outcomeActions}>
                  <Pressable style={styles.secondaryBtn} onPress={capture.dismissOutcome}>
                    <Text style={styles.secondaryBtnText}>Done</Text>
                  </Pressable>
                  {capture.outcome.route ? (
                    <Pressable style={styles.primaryBtn} onPress={capture.openOutcomeRoute}>
                      <Text style={styles.primaryBtnText}>Open destination</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={[
                styles.previewCard,
                capture.result.status === 'accepted' ? styles.previewAccepted : styles.previewRejected,
              ]}>
                {capture.result.preview.eyebrow ? (
                  <Text style={styles.previewEyebrow}>{capture.result.preview.eyebrow}</Text>
                ) : null}
                <Text style={styles.previewTitle}>{capture.result.preview.title}</Text>
                <Text style={styles.previewSummary}>{capture.result.preview.summary}</Text>
                {capture.result.preview.detail ? (
                  <Text style={styles.previewDetail}>{capture.result.preview.detail}</Text>
                ) : null}

                <View style={styles.previewMeta}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{capture.result.confidence} confidence</Text>
                  </View>
                  {capture.result.preview.destinationLabel ? (
                    <Text style={styles.destinationText}>{capture.result.preview.destinationLabel}</Text>
                  ) : null}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.secondaryBtn} onPress={capture.closeSheet}>
              <Text style={styles.secondaryBtnText}>Close</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, !canConfirm && styles.primaryBtnDisabled]}
              onPress={() => {
                void capture.confirmCapture();
              }}
              disabled={!canConfirm}
            >
              {capture.isSubmitting ? (
                <MaterialCommunityIcons name="loading" size={16} color={color.bg} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {capture.result.status === 'accepted' && capture.result.preview.confirmLabel
                    ? capture.result.preview.confirmLabel
                    : 'Not ready'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#07111BCC',
  },
  scrim: {
    flex: 1,
  },
  sheet: {
    backgroundColor: color.bg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    gap: space.md,
    maxHeight: '86%',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.outline,
  },
  header: {
    gap: space.xs,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: '800',
    color: color.text.primary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
    maxWidth: 320,
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    gap: space.md,
    paddingBottom: space.xs,
  },
  inputCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    minHeight: 108,
    padding: space.md,
  },
  input: {
    fontSize: typography.base,
    lineHeight: 22,
    color: color.text.primary,
    minHeight: 84,
    textAlignVertical: 'top',
  },
  exampleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  exampleChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    backgroundColor: color.surface,
  },
  exampleChipText: {
    fontSize: typography.xs,
    color: color.text.muted,
    fontWeight: '600',
  },
  previewCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    gap: space.xs,
  },
  previewAccepted: {
    backgroundColor: color.surface,
    borderColor: color.outline,
  },
  previewRejected: {
    backgroundColor: color.surface,
    borderColor: color.warn + '44',
  },
  previewEyebrow: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
    lineHeight: 24,
  },
  previewSummary: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  previewDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  previewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xs,
  },
  badge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    backgroundColor: color.bg,
  },
  badgeText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
  },
  destinationText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: color.text.muted,
  },
  footer: {
    flexDirection: 'row',
    gap: space.sm,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: color.success,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: space.md,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: typography.sm,
    fontWeight: '800',
    color: color.bg,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: space.md,
  },
  secondaryBtnText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  outcomeCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    gap: space.sm,
  },
  successCard: {
    backgroundColor: color.success + '12',
    borderColor: color.success + '33',
  },
  errorCard: {
    backgroundColor: color.warn + '10',
    borderColor: color.warn + '33',
  },
  outcomeTitle: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  outcomeDetail: {
    fontSize: typography.sm,
    lineHeight: 20,
    color: color.text.muted,
  },
  outcomeActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
