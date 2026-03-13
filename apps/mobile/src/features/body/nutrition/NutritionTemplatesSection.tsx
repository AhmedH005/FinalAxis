import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, space, radius, typography } from '@axis/theme';
import { MEAL_TYPES } from './model';
import type { NutritionLog } from '@/lib/supabase/database.types';

export function NutritionTemplatesSection({
  templates,
  onLoadTemplate,
  onLogTemplate,
}: {
  templates: NutritionLog[];
  onLoadTemplate: (template: NutritionLog) => void;
  onLogTemplate: (template: NutritionLog) => void;
}) {
  if (templates.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionLabelRow}>
        <MaterialCommunityIcons name={'history' as any} size={14} color={color.text.muted} />
        <Text style={styles.sectionLabel}>Quick reuse</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.templateCarousel}
      >
        {templates.map((template) => (
          <View key={template.id} style={styles.templateCard}>
            <Pressable style={styles.templateCopy} onPress={() => onLoadTemplate(template)}>
              <Text style={styles.templateTitle} numberOfLines={1}>
                {template.notes ?? 'Meal'}
              </Text>
              <Text style={styles.templateMeta}>
                {MEAL_TYPES.find((item) => item.value === template.meal_type)?.label ?? 'Meal'} · {Math.round(template.total_calories ?? 0)} kcal
              </Text>
            </Pressable>
            <Pressable style={styles.templateAction} onPress={() => onLogTemplate(template)}>
              <Text style={styles.templateActionText}>Log again</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: space.xl,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.sm,
  },
  sectionLabel: {
    fontSize: typography.sm,
    fontWeight: '600',
    color: color.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  templateCarousel: {
    gap: space.sm,
    paddingBottom: space.xs,
  },
  templateCard: {
    width: 200,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.outline,
    padding: space.md,
    gap: space.md,
  },
  templateCopy: {
    gap: 4,
  },
  templateTitle: {
    fontSize: typography.base,
    fontWeight: '700',
    color: color.text.primary,
  },
  templateMeta: {
    fontSize: typography.sm,
    color: color.text.muted,
  },
  templateAction: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: color.success,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  templateActionText: {
    fontSize: typography.sm,
    fontWeight: '700',
    color: color.text.inverse,
  },
});
