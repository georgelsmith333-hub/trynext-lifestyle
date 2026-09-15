import type { ReactNode } from "react";
import { StyleSheet, Text as NativeText, type TextProps } from "react-native";
import { nativeTheme } from "../../lib/native-theme";
import { useColors } from "../../hooks/use-colors";

type TextVariant = "display" | "heading" | "body" | "bodyMedium" | "caption" | "label";

export type TypographyProps = TextProps & {
  children?: ReactNode;
  variant?: TextVariant;
};

export function Text({ children, variant = "body", style, ...props }: TypographyProps) {
  const colors = useColors();
  return (
    <NativeText
      style={[
        styles.base,
        variants[variant],
        { color: colors.foreground },
        style,
      ]}
      {...props}
    >
      {children}
    </NativeText>
  );
}

const variants = StyleSheet.create({
  display: { fontFamily: nativeTheme.fonts.heading, fontSize: 34, lineHeight: 40 },
  heading: { fontFamily: nativeTheme.fonts.heading, fontSize: 24, lineHeight: 30 },
  body: { fontFamily: nativeTheme.fonts.body, fontSize: 15, lineHeight: 23 },
  bodyMedium: { fontFamily: nativeTheme.fonts.bodyMedium, fontSize: 15, lineHeight: 23 },
  caption: { color: "#75685f", fontFamily: nativeTheme.fonts.body, fontSize: 12, lineHeight: 18 },
  label: { fontFamily: nativeTheme.fonts.bodySemibold, fontSize: 13, lineHeight: 19 },
});

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});