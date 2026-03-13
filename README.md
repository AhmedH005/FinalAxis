# AXIS Workspace

AXIS is a mobile-first personal operating system organized as a small pnpm workspace.

Structure:
- `apps/mobile`: Expo app with the product surfaces for Time, Body, Mind, and Patterns.
- `packages/theme`: shared design tokens consumed by the mobile app.

Core commands:
- `pnpm dev`: start the Expo dev client for the mobile app.
- `pnpm ios`: run the iOS app locally.
- `pnpm android`: run the Android app locally.
- `pnpm lint`: run the mobile lint pass.
- `pnpm typecheck`: run workspace type checks.

Notes:
- Supabase credentials live in `apps/mobile/.env`.
- Expo-generated `.expo` output and built package artifacts are local-only and should stay out of version control.
