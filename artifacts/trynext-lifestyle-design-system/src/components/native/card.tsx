import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { nativeTheme } from "../../lib/native-theme";
import { useColors } from "../../hooks/use-colors";

export type CardProps = ViewProps & {
  children?: ReactNode;
  elevated?: boolean;
};

export function Card({ children, elevated = false, style, ...props }: CardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.foreground,
        },
        elevated && styles.elevated,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: nativeTheme.radius.base,
    borderWidth: 1,
    padding: nativeTheme.spacing.lg,
  },
  elevated: {
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
});
