import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet, type ViewStyle, type DimensionValue } from "react-native";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }, { skewX: "-20deg" }],
          },
        ]}
      />
    </View>
  );
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={165} height={165} borderRadius={12} style={{ marginBottom: 10 }} />
      <Skeleton width={120} height={14} borderRadius={6} style={{ marginBottom: 6 }} />
      <Skeleton width={80} height={14} borderRadius={6} />
    </View>
  );
}

export function CategorySkeleton() {
  return (
    <View style={styles.category}>
      <Skeleton width={60} height={60} borderRadius={30} />
      <Skeleton width={60} height={10} borderRadius={4} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  shimmer: {
    width: 300,
    height: 400,
    opacity: 0.35,
    backgroundColor: "#f3f4f6",
  },
  card: {
    width: 165,
  },
  category: {
    alignItems: "center",
  },
});
