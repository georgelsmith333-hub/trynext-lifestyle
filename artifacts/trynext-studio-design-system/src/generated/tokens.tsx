/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#fffdfb",
      "foreground": "#21170f",
      "border": "#eadfd6",
      "card": "#ffffff",
      "cardForeground": "#21170f",
      "popover": "#ffffff",
      "popoverForeground": "#21170f",
      "primary": "#e85d04",
      "primaryForeground": "#ffffff",
      "secondary": "#fff3e8",
      "secondaryForeground": "#9a3412",
      "muted": "#f6f0eb",
      "mutedForeground": "#75685f",
      "accent": "#eaf7f2",
      "accentForeground": "#00523c",
      "destructive": "#dc3c35",
      "destructiveForeground": "#ffffff",
      "input": "#f1e8e1",
      "ring": "#e85d04",
      "chart1": "#e85d04",
      "chart2": "#006a4e",
      "chart3": "#1c2951",
      "chart4": "#f59e0b",
      "chart5": "#db2777",
      "sidebar": "#171411",
      "sidebarForeground": "#fff7f0",
      "sidebarBorder": "#3b3029",
      "sidebarPrimary": "#fb8500",
      "sidebarPrimaryForeground": "#ffffff",
      "sidebarAccent": "#2b211b",
      "sidebarAccentForeground": "#ffcfaa",
      "sidebarRing": "#ffb066"
    },
    "dark": {
      "background": "#171411",
      "foreground": "#fff7f0",
      "border": "#49382e",
      "card": "#211a15",
      "cardForeground": "#fff7f0",
      "popover": "#211a15",
      "popoverForeground": "#fff7f0",
      "primary": "#fb8500",
      "primaryForeground": "#321400",
      "secondary": "#3a281e",
      "secondaryForeground": "#ffe4cf",
      "muted": "#2b211b",
      "mutedForeground": "#cbb5a6",
      "accent": "#174f41",
      "accentForeground": "#e5fff6",
      "destructive": "#f06a5f",
      "destructiveForeground": "#2b0b08",
      "input": "#3a2b22",
      "ring": "#ffb066",
      "chart1": "#fb8500",
      "chart2": "#33b58b",
      "chart3": "#8195d8",
      "chart4": "#fbbf24",
      "chart5": "#f472b6",
      "sidebar": "#100e0c",
      "sidebarForeground": "#fff7f0",
      "sidebarBorder": "#30251e",
      "sidebarPrimary": "#fb8500",
      "sidebarPrimaryForeground": "#321400",
      "sidebarAccent": "#2b211b",
      "sidebarAccentForeground": "#ffcfaa",
      "sidebarRing": "#ffb066"
    }
  },
  "fontFamily": {
    "sans": [
      "Plus Jakarta Sans",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "JetBrains Mono",
      "Menlo",
      "monospace"
    ]
  },
  "radius": "0.75rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
