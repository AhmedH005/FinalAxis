import { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { color, radius } from '@axis/theme';
import { PATTERN_COLORS, useWgerExerciseImage, type ExerciseDefinition } from '@/engines/body';

export function ExerciseThumbnail({
  exercise,
  size = 72,
}: {
  exercise: ExerciseDefinition;
  size?: number;
}) {
  const { data: imageUrl } = useWgerExerciseImage(exercise.name);
  const [imageFailed, setImageFailed] = useState(false);
  const patternColor = PATTERN_COLORS[exercise.movement_pattern];

  if (imageUrl && !imageFailed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: radius.md },
        ]}
        onError={() => setImageFailed(true)}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: patternColor + '22',
        },
      ]}
    >
      <MaterialCommunityIcons
        name={exercise.icon as any}
        size={size * 0.4}
        color={patternColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: color.surface,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
