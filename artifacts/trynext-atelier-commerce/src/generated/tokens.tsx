/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#fbf7f1",
      "foreground": "#241d17",
      "card": "#fffdf9",
      "cardForeground": "#241d17",
      "popover": "#fffdf9",
      "popoverForeground": "#241d17",
      "primary": "#d9652d",
      "primaryForeground": "#fffaf5",
      "secondary": "#f1e5d8",
      "secondaryForeground": "#754128",
      "muted": "#f3ede6",
      "mutedForeground": "#786b61",
      "accent": "#e0ebe2",
      "accentForeground": "#27483a",
      "destructive": "#b54840",
      "destructiveForeground": "#fff8f5",
      "border": "#e6d8ca",
      "input": "#ded0c2",
      "ring": "#d9652d",
      "chart1": "#d9652d",
      "chart2": "#4f7a61",
      "chart3": "#2d425d",
      "chart4": "#c89137",
      "chart5": "#b96678",
      "sidebar": "#211b17",
      "sidebarForeground": "#fff8f1",
      "sidebarBorder": "#40342b",
      "sidebarPrimary": "#ed8a50",
      "sidebarPrimaryForeground": "#2e170d",
      "sidebarAccent": "#322923",
      "sidebarAccentForeground": "#f6d3b9",
      "sidebarRing": "#f4a875"
    },
    "dark": {
      "background": "#171310",
      "foreground": "#fff8f1",
      "card": "#211a16",
      "cardForeground": "#fff8f1",
      "popover": "#211a16",
      "popoverForeground": "#fff8f1",
      "primary": "#ed8a50",
      "primaryForeground": "#35170c",
      "secondary": "#3a2b22",
      "secondaryForeground": "#f7d1b8",
      "muted": "#2b231e",
      "mutedForeground": "#c8b7a9",
      "accent": "#294c3d",
      "accentForeground": "#e7f6ea",
      "destructive": "#db6d63",
      "destructiveForeground": "#34100d",
      "border": "#493a2f",
      "input": "#3a2d24",
      "ring": "#f4a875",
      "chart1": "#ed8a50",
      "chart2": "#79aa88",
      "chart3": "#8ca6cd",
      "chart4": "#e2b65d",
      "chart5": "#db91a1",
      "sidebar": "#100d0b",
      "sidebarForeground": "#fff8f1",
      "sidebarBorder": "#332821",
      "sidebarPrimary": "#ed8a50",
      "sidebarPrimaryForeground": "#35170c",
      "sidebarAccent": "#2b211b",
      "sidebarAccentForeground": "#f6d3b9",
      "sidebarRing": "#f4a875"
    }
  },
  "fontFamily": {
    "sans": [
      "Plus Jakarta Sans",
      "sans-serif"
    ],
    "serif": [
      "Playfair Display",
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
