import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';

export function HydrationPickerModal({
  visible,
  amountOptions,
  selectedAmount,
  isSaving,
  totalMl,
  onClose,
  onSelectAmount,
  onLower,
  onAdd,
  onOpenTracker,
}: {
  visible: boolean;
  amountOptions: number[];
  selectedAmount: number;
  isSaving: boolean;
  totalMl: number;
  onClose: () => void;
  onSelectAmount: (amount: number) => void;
  onLower: () => void;
  onAdd: () => void;
  onOpenTracker: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.copy}>
              <Text style={styles.title}>Log water</Text>
              <Text style={styles.subtitle}>Choose the amount you actually drank.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={20} color={color.text.muted} />
            </Pressable>
          </View>

          <View style={styles.options}>
            {amountOptions.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.option,
                  selectedAmount === option && styles.optionActive,
                ]}
                onPress={() => onSelectAmount(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedAmount === option && styles.optionTextActive,
                  ]}
                >
                  {option}ml
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.secondaryButton, (isSaving || totalMl <= 0) && styles.disabled]}
              onPress={onLower}
              disabled={isSaving || totalMl <= 0}
            >
              <Text style={styles.secondaryButtonText}>
                {isSaving ? 'Lowering...' : `Lower by ${selectedAmount}ml`}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, isSaving && styles.disabled]}
              onPress={onAdd}
              disabled={isSaving}
            >
              <Text style={styles.primaryButtonText}>
                {isSaving ? 'Adding...' : `Add ${selectedAmount}ml`}
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.link} onPress={onOpenTracker}>
            <Text style={styles.linkText}>Open full hydration tracker</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.lg,
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: '700',
    color: color.text.primary,
  },
  subtitle: {
    fontSize: typography.sm,
    color: color.text.muted,
    lineHeight: 20,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  option: {
    minWidth: 88,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
    alignItems: 'center',
  },
  optionActive: {
    borderColor: '#6AADE4',
    backgroundColor: '#6AADE422',
  },
  optionText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  optionTextActive: {
    color: '#6AADE4',
  },
  actions: {
    gap: space.sm,
  },
  secondaryButton: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outline,
    backgroundColor: color.surfaceAlt,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.primary,
  },
  primaryButton: {
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: color.success,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.inverse,
  },
  disabled: {
    opacity: 0.6,
  },
  link: {
    alignSelf: 'center',
  },
  linkText: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.success,
  },
});
