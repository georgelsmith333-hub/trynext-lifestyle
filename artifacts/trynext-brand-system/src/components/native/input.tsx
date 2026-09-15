import { forwardRef } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { nativeTheme } from "../../lib/native-theme";
import { useColors } from "../../hooks/use-colors";

export const Input = forwardRef<TextInput, TextInputProps>(function Input(
  { style, placeholderTextColor, ...props },
  ref,
) {
  const colors = useColors();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
      style={[
        styles.base,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          color: colors.foreground,
        },
        style,
      ]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: nativeTheme.radius.base,
    borderWidth: 1,
    fontFamily: nativeTheme.fonts.body,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: nativeTheme.spacing.md,
    paddingVertical: nativeTheme.spacing.sm,
  },
});
