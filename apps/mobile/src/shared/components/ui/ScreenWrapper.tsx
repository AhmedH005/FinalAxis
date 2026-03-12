import { View, ScrollView, StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space } from '@axis/theme';

interface ScreenWrapperProps extends ViewProps {
  scrollable?: boolean;
  padded?: boolean;
}

export function ScreenWrapper({
  children,
  scrollable = false,
  padded = true,
  style,
  ...props
}: ScreenWrapperProps) {
  const content = (
    <View
      style={[padded && styles.padded, style]}
      {...props}
    >
      {children}
    </View>
  );

  if (scrollable) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scroll: {
    flexGrow: 1,
  },
  padded: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
});
