// Re-export @axis/theme tokens for use in the mobile app.
// This file is the single import point for all design tokens.
// Add any mobile-specific overrides or extensions here.

export {
  color,
  motion,
  radius,
  space,
  typography,
  rankGradients,
} from '@axis/theme';

// Mobile-specific extensions
export const layout = {
  tabBarHeight: 72,
  headerHeight: 56,
  screenPaddingH: 24, // space.lg
  maxContentWidth: 480,
} as const;

export const zIndex = {
  base: 0,
  raised: 1,
  modal: 10,
  overlay: 20,
  toast: 30,
} as const;
