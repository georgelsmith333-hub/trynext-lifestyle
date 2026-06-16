import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";

const WHATSAPP_NUMBER = "8801903426915";
const WEBSITE_URL = "https://trynex.shop";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { items, removeItem, updateQuantity, clearCart, subtotal, totalItems } = useCart();

  const shipping = items.length > 0 ? 60 : 0;
  const total = subtotal + shipping;

  const onCheckout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const itemSummary = items
      .map((i) => `• ${i.product.name}${i.size ? ` (${i.size})` : ""}${i.color ? ` - ${i.color}` : ""} x${i.quantity}`)
      .join("\n");

    const message = `Hi! I'd like to place an order:\n\n${itemSummary}\n\nSubtotal: ৳${subtotal.toLocaleString()}\nShipping: ৳${shipping}\nTotal: ৳${total.toLocaleString()}`;

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    const canWhatsApp = await Linking.canOpenURL(waUrl);

    Alert.alert(
      "Complete Your Order",
      "Choose how you'd like to finish your purchase:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "🌐 Website",
          onPress: () => Linking.openURL(WEBSITE_URL),
        },
        ...(canWhatsApp
          ? [{ text: "💬 WhatsApp", onPress: () => Linking.openURL(waUrl) }]
          : []),
      ],
    );
  };

  const onRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeItem(id);
  };

  const onClear = () => {
    Alert.alert("Clear Cart", "Remove all items from your cart?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          clearCart();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: isWeb ? 67 + 16 : insets.top + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Cart {totalItems > 0 ? `(${totalItems})` : ""}
        </Text>
        {items.length > 0 && (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={[styles.clearText, { color: colors.destructive }]}>Clear</Text>
          </Pressable>
        )}
      </View>

      {items.length === 0 ? (
        <ScrollView 
          contentContainerStyle={{flex: 1}}
          refreshControl={<RefreshControl refreshing={false} onRefresh={()=>{}} />}
        >
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="shopping-bag" size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Browse products and add your favorites
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/shop")}
              style={[styles.browseBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.browseBtnText}>Browse Products</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={false} onRefresh={()=>{}} />}
          >
            {items.map((item) => {
              const imgUri = item.product.imageUrl ?? (item.product.images?.[0]) ?? null;
              const itemTotal = (item.product.discountPrice ?? item.product.price) * item.quantity;
              return (
                <View
                  key={item.id}
                  style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.itemImage, { backgroundColor: colors.muted }]}>
                    {imgUri ? (
                      <Image source={{ uri: imgUri }} style={styles.itemImg} contentFit="cover" />
                    ) : (
                      <Feather name="package" size={24} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                      {item.product.name}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                      {[item.color, item.size].filter(Boolean).join(" · ")}
                    </Text>
                    <Text style={[styles.itemPrice, { color: colors.primary }]}>
                      ৳{itemTotal.toLocaleString()}
                    </Text>
                    <View style={styles.qtyRow}>
                      <Pressable
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        style={[styles.qtyBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                      >
                        <Feather name="minus" size={14} color={colors.foreground} />
                      </Pressable>
                      <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</Text>
                      <Pressable
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        style={[styles.qtyBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                      >
                        <Feather name="plus" size={14} color={colors.foreground} />
                      </Pressable>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => onRemove(item.id)}
                    style={[styles.removeBtn, { backgroundColor: "#FEF2F2" }]}
                    hitSlop={8}
                  >
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>

          {/* Order Summary */}
          <View
            style={[
              styles.summary,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: isWeb ? 24 : insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>৳{subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Shipping</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>৳{shipping}</Text>
            </View>
            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>৳{total.toLocaleString()}</Text>
            </View>
            <Pressable
              onPress={onCheckout}
              style={({ pressed }) => [
                styles.checkoutBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
              ]}
            >
              <Feather name="shopping-bag" size={18} color="#fff" />
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  browseBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 8,
  },
  browseBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  cartItem: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  itemImg: {
    width: "100%",
    height: "100%",
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 12,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    minWidth: 20,
    textAlign: "center",
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  summary: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 54,
    borderRadius: 27,
    marginTop: 8,
  },
  checkoutBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
