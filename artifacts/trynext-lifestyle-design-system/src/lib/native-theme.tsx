import { tokens } from "../generated/tokens";

export type NativeColorScheme = "light" | "dark";

function cssLengthToNumber(value: string): number {
  const amount = Number.parseFloat(value);
  return value.endsWith("rem") ? amount * 16 : amount;
}

const baseRadius = cssLengthToNumber(tokens.radius);
const baseSpacing = cssLengthToNumber(tokens.spacing);

export type NativeColors = {
  background: string;
  foreground: string;
  text: string;
  border: string;
  input: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  ring: string;
  surface: string;
  navy: string;
  orange: string;
  orangeLight: string;
  orangeDark: string;
  success: string;
  warning: string;
  info: string;
};

const colorRoles = [
  "background",
  "foreground",
  "border",
  "input",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "ring",
  "navy",
  "orange",
  "orangeLight",
  "orangeDark",
  "success",
  "warning",
  "info",
] as const;

function colorsForScheme(scheme: NativeColorScheme): NativeColors {
  const source = tokens.color[scheme];
  const colors = Object.fromEntries(
    colorRoles.map((role) => [role, source[role]]),
  ) as Omit<NativeColors, "text" | "surface">;

  return {
    ...colors,
    text: colors.foreground,
    surface: colors.card,
  };
}

export const nativeTheme = {
  colors: {
    light: colorsForScheme("light"),
    dark: colorsForScheme("dark"),
  },
  radius: {
    base: baseRadius,
    sm: Math.max(0, baseRadius - 4),
    md: Math.max(0, baseRadius - 2),
    lg: baseRadius,
    xl: baseRadius + 4,
  },
  spacing: {
    base: baseSpacing,
    xs: baseSpacing,
    sm: baseSpacing * 2,
    md: baseSpacing * 3,
    lg: baseSpacing * 4,
    xl: baseSpacing * 6,
    "2xl": baseSpacing * 8,
  },
  fonts: {
    heading: "Outfit_700Bold",
    body: "PlusJakartaSans_400Regular",
    bodyMedium: "PlusJakartaSans_500Medium",
    bodySemibold: "PlusJakartaSans_600SemiBold",
    bodyBold: "PlusJakartaSans_700Bold",
  },
} as const;

export function getNativeColors(
  scheme: NativeColorScheme = "light",
): NativeColors {
  return nativeTheme.colors[scheme];
}
