// USDA FoodData Central
// Docs: https://fdc.nal.usda.gov/api-guide.html
// Get a free API key at https://fdc.nal.usda.gov/api-key-signup.html
// DEMO_KEY works but is rate-limited to 30 req/hour — register for a real key!
export const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';
export const USDA_API_KEY = process.env.EXPO_PUBLIC_USDA_API_KEY ?? 'DEMO_KEY';

// Edamam Food Database — 615k+ UPC-linked branded foods, 900k total
// Optional upgrade: $14/month with 30-day free trial at https://developer.edamam.com/
// When blank, the app falls back to Open Food Facts + USDA only.
export const EDAMAM_APP_ID = process.env.EXPO_PUBLIC_EDAMAM_APP_ID ?? '';
export const EDAMAM_APP_KEY = process.env.EXPO_PUBLIC_EDAMAM_APP_KEY ?? '';

// Default daily targets (before user sets their own)
export const DEFAULTS = {
  dailyWaterMl: 2500,
  sleepMinutes: 480, // 8 hours
  caloricDeficit: 500,
  caloricSurplus: 300,
} as const;

// Time Engine API
// The current mobile MVP uses the existing read API surface for calendar blocks.
// On simulator, localhost works. On device, point this to a reachable dev/staging API.
export const TIME_ENGINE_API_URL = process.env.EXPO_PUBLIC_TIME_API_URL ?? 'http://localhost:4000';

// Workout types available in the app
export const WORKOUT_TYPES = [
  'Strength training',
  'Running',
  'Cycling',
  'Swimming',
  'Walking',
  'HIIT',
  'Yoga',
  'Pilates',
  'Sports',
  'Other',
] as const;

export type WorkoutType = typeof WORKOUT_TYPES[number];

// Quick-add water presets (ml)
export const WATER_PRESETS = [150, 250, 350, 500, 750] as const;
