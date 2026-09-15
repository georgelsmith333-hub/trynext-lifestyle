import React, { createContext, useCallback, useContext, useState } from "react";
import { Animated, Text, View, StyleSheet, type ColorValue } from "react-native";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return { showToast: ctx.showToast };
}

const COLORS: Record<ToastType, { bg: ColorValue; text: ColorValue }> = {
  success: { bg: "#10B981", text: "#FFFFFF" },
  error: { bg: "#EF4444", text: "#FFFFFF" },
  info: { bg: "#1C1C1E", text: "#FFFFFF" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToast({ id, message, type });
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity]);

  const colors = toast ? COLORS[toast.type] : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && colors && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            { opacity, backgroundColor: colors.bg },
          ]}
        >
          <Text style={[styles.text, { color: colors.text }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 9999,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
