import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { nativeTheme } from "../../lib/native-theme";
import { useColors } from "../../hooks/use-colors";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export type ButtonProps = Omit<PressableProps, "children"> & {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;
  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.secondary
        : variant === "outline"
          ? "transparent"
          : "transparent";
  const foregroundColor =
    variant === "primary"
      ? colors.primaryForeground
      : variant === "secondary"
        ? colors.secondaryForeground
        : colors.foreground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor: variant === "outline" ? colors.border : backgroundColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.84 : 1,
        },
        sizeStyles[size],
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={foregroundColor} />
      ) : (
        <Text style={[styles.label, { color: foregroundColor }]}>{children}</Text>
      )}
    </Pressable>
  );
}

const sizeStyles = StyleSheet.create({
  sm: { minHeight: 36, paddingHorizontal: 12 },
  md: { minHeight: 44, paddingHorizontal: 16 },
  lg: { minHeight: 52, paddingHorizontal: 20 },
  icon: { height: 44, width: 44, paddingHorizontal: 0 },
});

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: nativeTheme.radius.base,
    borderWidth: 1,
    justifyContent: "center",
  },
  label: {
    fontFamily: nativeTheme.fonts.bodySemibold,
    fontSize: 14,
    textAlign: "center",
  },
});
