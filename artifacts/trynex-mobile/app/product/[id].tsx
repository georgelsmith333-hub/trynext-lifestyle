import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { api } from "@/lib/api";

const { width } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imageIdx, setImageIdx] = useState(0);

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProduct(id!),
    enabled: !!id,
  });

  const wishlisted = product ? isWishlisted(product.id) : false;

  const images = product
    ? [product.imageUrl, ...(product.images ?? [])].filter(Boolean) as string[]
    : [];

  const currentImg = images[imageIdx] || null;

  const discount =
    product?.discountPrice && product.price > product.discountPrice
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : null;

  const onAddToCart = () => {
    if (!product) return;
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    for (let i = 0; i < quantity; i++) {
      addItem(product, { size: selectedSize ?? undefined, color: selectedColor ?? undefined });
    }
    router.push("/cart");
  };

  const onWhatsAppOrder = async () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const WHATSAPP_NUMBER = "8801903426915";
    const message = `Hi Trynex! I want to order:\n\n*${product.name}*\nPrice: ৳${(product.discountPrice ?? product.price).toLocaleString()}\n${selectedSize ? `Size: ${selectedSize}\n` : ""}${selectedColor ? `Color: ${selectedColor}\n` : ""}Qty: ${quantity}\n\nLink: https://trynex.shop/product/${product.slug}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("WhatsApp Not Found", "Please install WhatsApp to order directly.");
      }
    } catch (err) {
      // On some platforms canOpenURL might throw if the scheme is not registered
      // Fallback to trying to open it anyway or show alert
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not open WhatsApp.");
      });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={48} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.foreground }]}>Product not found</Text>
        <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back + Wishlist */}
      <View style={[styles.navBar, { top: isWeb ? 67 : insets.top }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.navBtn, { backgroundColor: "rgba(28,41,81,0.7)" }]}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggle(product);
          }}
          style={[styles.navBtn, { backgroundColor: "rgba(28,41,81,0.7)" }]}
        >
          <Feather name="heart" size={20} color={wishlisted ? "#F97316" : "#fff"} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {currentImg ? (
            <Image source={{ uri: currentImg }} style={styles.mainImage} contentFit="cover" />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder, { backgroundColor: colors.secondary }]}>
              <Feather name="package" size={64} color={colors.primary} />
            </View>
          )}
          {discount ? (
            <View style={[styles.discBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.discBadgeText}>{discount}% OFF</Text>
            </View>
          ) : null}
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbStrip}
              contentContainerStyle={styles.thumbContent}
            >
              {images.map((uri, idx) => (
                <Pressable key={idx} onPress={() => setImageIdx(idx)}>
                  <Image
                    source={{ uri }}
                    style={[styles.thumb, idx === imageIdx && { borderColor: colors.primary, borderWidth: 2 }]}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          {product.categoryName && (
            <Text style={[styles.categoryTag, { color: colors.primary }]}>{product.categoryName}</Text>
          )}
          <Text style={[styles.productName, { color: colors.foreground }]}>{product.name}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.primary }]}>
              ৳{(product.discountPrice ?? product.price).toLocaleString()}
            </Text>
            {discount && (
              <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                ৳{product.price.toLocaleString()}
              </Text>
            )}
            {product.customizable && (
              <View style={[styles.customBadge, { backgroundColor: colors.secondary }]}>
                <Feather name="edit-3" size={12} color={colors.primary} />
                <Text style={[styles.customBadgeText, { color: colors.primary }]}>Customizable</Text>
              </View>
            )}
          </View>

          {/* Rating */}
          {product.rating > 0 && (
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Feather
                  key={star}
                  name="star"
                  size={14}
                  color={star <= Math.round(product.rating) ? "#FBBF24" : colors.border}
                />
              ))}
              <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                {product.rating.toFixed(1)} ({product.reviewCount} reviews)
              </Text>
            </View>
          )}

          {/* Stock indicator */}
          <View style={styles.stockRow}>
            <View style={[styles.stockDot, { backgroundColor: product.stock > 0 ? "#22C55E" : "#EF4444" }]} />
            <Text style={[styles.stockText, { color: product.stock > 0 ? "#22C55E" : colors.destructive }]}>
              {product.stock > 10 ? "In Stock" : product.stock > 0 ? `Only ${product.stock} left` : "Out of Stock"}
            </Text>
          </View>

          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <View style={styles.optionSection}>
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                Size{selectedSize ? `: ${selectedSize}` : " — select one"}
              </Text>
              <View style={styles.optionRow}>
                {product.sizes.map((size) => (
                  <Pressable
                    key={size}
                    onPress={() => setSelectedSize(size)}
                    style={[
                      styles.sizePill,
                      selectedSize === size
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.muted, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.sizePillText, { color: selectedSize === size ? "#fff" : colors.foreground }]}>
                      {size}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <View style={styles.optionSection}>
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                Color{selectedColor ? `: ${selectedColor}` : ""}
              </Text>
              <View style={styles.optionRow}>
                {product.colors.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setSelectedColor(color)}
                    style={[
                      styles.colorPill,
                      selectedColor === color
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.muted, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.colorPillText, { color: selectedColor === color ? "#fff" : colors.foreground }]}>
                      {color}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Quantity */}
          <View style={styles.optionSection}>
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Quantity</Text>
            <View style={styles.qtyRow}>
              <Pressable
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                style={[styles.qtyBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Feather name="minus" size={16} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.qtyValue, { color: colors.foreground }]}>{quantity}</Text>
              <Pressable
                onPress={() => setQuantity((q) => q + 1)}
                style={[styles.qtyBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              >
                <Feather name="plus" size={16} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.optionSection}>
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>Description</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>
                {product.description}
              </Text>
            </View>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {product.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: isWeb ? 120 : 140 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: isWeb ? 24 : insets.bottom + 16,
          },
        ]}
      >
        {product.customizable && (
          <Pressable
            onPress={() => router.push("/(tabs)/design")}
            style={[styles.designBtn, { borderColor: colors.primary }]}
          >
            <Feather name="edit-3" size={16} color={colors.primary} />
          </Pressable>
        )}
        <Pressable
          onPress={onAddToCart}
          disabled={product.stock === 0}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: product.stock === 0 ? colors.muted : colors.primary,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Feather name="shopping-bag" size={18} color={product.stock === 0 ? colors.mutedForeground : "#fff"} />
          <Text style={[styles.addBtnText, { color: product.stock === 0 ? colors.mutedForeground : "#fff" }]}>
            {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onWhatsAppOrder}
          style={({ pressed }) => [
            styles.whatsappBtn,
            {
              backgroundColor: "#25D366",
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Feather name="message-circle" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  navBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    width,
    height: width * 1.05,
    position: "relative",
    backgroundColor: "#F5F5F3",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  discBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  discBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  thumbStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  thumbContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  infoCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  categoryTag: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  productName: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  price: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  originalPrice: {
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  customBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  customBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    marginLeft: 4,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  optionSection: { gap: 8 },
  optionLabel: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sizePill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  sizePillText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  colorPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  colorPillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    minWidth: 32,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  designBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 26,
  },
  whatsappBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
