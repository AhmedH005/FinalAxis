export const color = {
  bg: "#0B0E12",
  surface: "#12161C",
  surfaceAlt: "#161B22",
  text: { primary: "#E7ECF3", muted: "#9AA6B2", inverse: "#0B0E12" },
  success: "#43D9A3",
  warn: "#F9B24E",
  danger: "#FF6B6B",
  outline: "rgba(231,236,243,0.08)",
  glow: "rgba(95, 227, 204, 0.35)"
};

export const rankGradients = {
  seed: ["#59F0C8","#2E5CE6"],
  ember: ["#FFB86C","#FF6EA9"],
  forge: ["#60E6FF","#7A5CFF"],
  ascent:["#7DFF6B","#24D2FF"],
  radiant:["#FFE36E","#FF7EDB"],
  apex:  ["#FFFFFF","#A7F3FF"],
};

export const motion = { fast:120, med:220, slow:420, easing:[0.2,0,0.2,1] as const };

export const radius = { sm:10, md:16, lg:22, pill:999 };
export const space  = { xs:6, sm:10, md:16, lg:24, xl:32 };

export const typography = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;