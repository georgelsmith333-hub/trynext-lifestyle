import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { nativeTheme } from "../../lib/native-theme";
import { useColors } from "../../hooks/use-colors";

type BadgeVariant = "primary" | "secondary" | "success" | "outline";

export type BadgeProps = ViewProps & {
  children?: ReactNode;
  variant?: BadgeVariant;
};

export function Badge({ children, variant = "primary", style, ...props }: BadgeProps) {
  const colors = useColors();
  const palette = {
    primary: { backgroundColor: colors.primary, color: colors.primaryForeground },
    secondary: { backgroundColor: colors.secondary, color: colors.secondaryForeground },
    success: { backgroundColor: `${colors.success}20`, color: colors.success },
    outline: { backgroundColor: "transparent", color: colors.foreground },
  }[variant];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: palette.backgroundColor, borderColor: colors.border },
        variant === "outline" && styles.outline,
        style,
      ]}
      {...props}
    >
      <Text style={[styles.label, { color: palette.color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: nativeTheme.radius.xl,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  outline: { borderColor: "transparent" },
  label: {
    fontFamily: nativeTheme.fonts.bodySemibold,
    fontSize: 12,
  },
});
