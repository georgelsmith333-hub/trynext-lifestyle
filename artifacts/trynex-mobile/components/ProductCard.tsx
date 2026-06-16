import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Product } from "@/lib/api";
import { useWishlist } from "@/context/WishlistContext";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface ProductCardProps {
  product: Product;
  style?: object;
  horizontal?: boolean;
}

export function ProductCard({ product, style, horizontal }: ProductCardProps) {
  const colors = useColors();
  const { toggle, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const onWishlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle(product);
  };

  const onPress = () => {
    router.push(`/product/${product.id}`);
  };

  const imageUri =
    product.imageUrl ||
    (product.images && product.images[0]) ||
    null;

  const discount =
    product.discountPrice && product.price > product.discountPrice
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : null;

  if (horizontal) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.horizontal,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          style,
        ]}
      >
        <View style={styles.hImageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.hImage} resizeMode="cover" />
          ) : (
            <View style={[styles.hImage, styles.placeholder, { backgroundColor: colors.secondary }]}>
              <Feather name="package" size={28} color={colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.hInfo}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
            {product.name}
          </Text>
          {product.categoryName ? (
            <Text style={[styles.category, { color: colors.mutedForeground }]}>
              {product.categoryName}
            </Text>
          ) : null}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>
              ৳{(product.discountPrice ?? product.price).toLocaleString()}
            </Text>
            {discount ? (
              <View style={[styles.discBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.discText}>{discount}% OFF</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.ratingRow}>
            <Feather name="star" size={12} color="#FBBF24" />
            <Text style={[styles.rating, { color: colors.mutedForeground }]}>
              {product.rating.toFixed(1)} ({product.reviewCount})
            </Text>
          </View>
        </View>
        <Pressable onPress={onWishlist} style={styles.hWishBtn} hitSlop={12}>
          <Feather
            name="heart"
            size={20}
            color={wishlisted ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width: CARD_WIDTH,
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      <View style={styles.imageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder, { backgroundColor: colors.secondary }]}>
            <Feather name="package" size={32} color={colors.primary} />
          </View>
        )}
        {product.featured && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>Featured</Text>
          </View>
        )}
        <Pressable onPress={onWishlist} style={[styles.wishBtn, { backgroundColor: colors.card }]} hitSlop={8}>
          <Feather
            name="heart"
            size={16}
            color={wishlisted ? colors.primary : colors.mutedForeground}
          />
        </Pressable>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.primary }]}>
            ৳{(product.discountPrice ?? product.price).toLocaleString()}
          </Text>
          {discount ? (
            <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
              ৳{product.price.toLocaleString()}
            </Text>
          ) : null}
        </View>
        {product.rating > 0 ? (
          <View style={styles.ratingRow}>
            <Feather name="star" size={11} color="#FBBF24" />
            <Text style={[styles.rating, { color: colors.mutedForeground }]}>
              {product.rating.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    width: "100%",
    height: CARD_WIDTH * 1.1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  wishBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  info: {
    padding: 10,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  discBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  rating: {
    fontSize: 11,
  },
  // Horizontal card
  horizontal: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  hImageWrap: {
    width: 100,
    height: 100,
  },
  hImage: {
    width: 100,
    height: 100,
  },
  hInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  category: {
    fontSize: 11,
  },
  hWishBtn: {
    padding: 12,
    justifyContent: "center",
  },
});
