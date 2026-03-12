import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { color, space, radius, typography } from '@axis/theme';

type Variant = 'primary' | 'subtle' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyle: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: color.success },
  subtle: { backgroundColor: color.surfaceAlt, borderWidth: 1, borderColor: color.outline },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: color.danger },
};

const textColor: Record<Variant, string> = {
  primary: color.text.inverse,
  subtle: color.text.primary,
  ghost: color.text.primary,
  danger: color.danger,
};

const sizeStyle: Record<Size, ViewStyle> = {
  sm: { paddingHorizontal: space.sm, paddingVertical: space.xs },
  md: { paddingHorizontal: space.md, paddingVertical: space.sm },
  lg: { paddingHorizontal: space.md, paddingVertical: space.md },
};

export function Button({
  title,
  variant = 'primary',
  size = 'lg',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[
        styles.base,
        variantStyle[variant],
        sizeStyle[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style as ViewStyle,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? color.text.inverse : color.success}
          size="small"
        />
      ) : (
        <Text style={[styles.text, { color: textColor[variant] }, size === 'sm' && styles.textSm]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontSize: typography.base,
    fontWeight: '700',
  },
  textSm: {
    fontSize: typography.sm,
  },
  disabled: {
    opacity: 0.6,
  },
});
