// Design tokens shared across the app. Colors live in `Colors.ts` (kept
// separate so `useThemeColor`/`Themed` components keep a familiar import);
// everything else (spacing, radius, type scale) lives here.

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 30,
} as const;

export const FontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

// Flat category/status accent colors, same in light & dark mode.
export const Accent = {
  cleaning: "#3DB2A8",
  expenses: "#F2A33C",
  calendar: "#6C7CE0",
  success: "#3BB273",
  danger: "#E0566C",
  google: "#4285F4",
  apple: "#8E8E93",
} as const;
