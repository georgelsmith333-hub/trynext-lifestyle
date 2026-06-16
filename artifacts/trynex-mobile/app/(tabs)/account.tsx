import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const WHATSAPP_NUMBER = "8801903426915";
const WEBSITE_URL = "https://trynex.shop";

async function handleShareApp() {
  try {
    await Share.share({
      message: "Shop custom fashion at Trynex Lifestyle! T-shirts, hoodies, caps & more — designed by you. 👕✨\n\nhttps://trynex.shop",
      title: "Trynex Lifestyle",
    });
  } catch (_) {}
}

async function handleCustomerSupport() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I need help with my Trynex order.")}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    Alert.alert("WhatsApp Not Found", "Please visit trynex.shop or email us for support.", [
      { text: "Open Website", onPress: () => Linking.openURL(WEBSITE_URL) },
      { text: "Cancel", style: "cancel" },
    ]);
  }
}

async function handleAboutTrynex() {
  await Linking.openURL(WEBSITE_URL);
}

const MENU_ITEMS = [
  { icon: "shopping-bag", label: "My Orders", onPress: () => router.push("/(tabs)/orders") },
  { icon: "edit-3", label: "Design Studio", onPress: () => router.push("/(tabs)/design") },
  { icon: "share-2", label: "Share App", onPress: handleShareApp },
  { icon: "headphones", label: "Customer Support", onPress: handleCustomerSupport },
  { icon: "info", label: "About Trynex", onPress: handleAboutTrynex },
];

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const { items: wishlistItems } = useWishlist();
  const { totalItems } = useCart();

  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => {}} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.navy }]}>
        <View style={styles.avatar}>
          <Feather name="user" size={32} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>{isLoggedIn ? "Welcome Back!" : "My Account"}</Text>
        <Text style={styles.headerSub}>{isLoggedIn ? "John Doe" : "Trynex Lifestyle Member"}</Text>
      </View>

      {!isLoggedIn && (
        <View style={styles.loginSection}>
          <Pressable 
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={() => setIsLoggedIn(true)}
          >
            <Text style={styles.loginBtnText}>Login / Register</Text>
          </Pressable>
        </View>
      )}

      {/* Stats */}
      <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable style={styles.stat} onPress={() => router.push("/cart")}>
          <View style={[styles.statIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="shopping-bag" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{totalItems}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>In Cart</Text>
        </Pressable>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <View style={[styles.statIcon, { backgroundColor: "#FFF7ED" }]}>
            <Feather name="heart" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>{wishlistItems.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Wishlisted</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <Pressable style={styles.stat} onPress={() => router.push("/(tabs)/orders")}>
          <View style={[styles.statIcon, { backgroundColor: "#F0FDF4" }]}>
            <Feather name="package" size={18} color="#22C55E" />
          </View>
          <Text style={[styles.statValue, { color: colors.foreground }]}>Track</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Orders</Text>
        </Pressable>
      </View>

      {/* Wishlist */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Wishlist</Text>
          <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
            {wishlistItems.length} items
          </Text>
        </View>
        {wishlistItems.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="heart" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your wishlist is empty</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Tap the heart icon on any product to save it
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/shop");
              }}
              style={[styles.browseBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.browseBtnText}>Browse Products</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.wishlistGrid}>
            {wishlistItems.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </View>
        )}
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 20 }]}>
          Quick Links
        </Text>
        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {MENU_ITEMS.map((item, idx) => (
            <Pressable
              key={item.label}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                item.onPress();
              }}
              style={({ pressed }) => [
                styles.menuItem,
                idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
                <Feather name={item.icon as any} size={18} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          ))}
          {isLoggedIn && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setIsLoggedIn(false);
              }}
              style={({ pressed }) => [
                styles.menuItem,
                { borderTopWidth: 1, borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.destructive + "10" }]}>
                <Feather name="log-out" size={18} color={colors.destructive} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.destructive }]}>Logout</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Brand Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerBrand, { color: colors.primary }]}>Trynex Lifestyle</Text>
        <Text style={[styles.footerSub, { color: colors.mutedForeground }]}>
          Design. Wear. Express.
        </Text>
        <Text style={[styles.footerCopy, { color: colors.mutedForeground }]}>
          © 2025 Trynex Shop · All rights reserved
        </Text>
      </View>

      <View style={{ height: isWeb ? 34 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  loginSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  loginBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  statDivider: {
    width: 1,
    alignSelf: "stretch",
    marginVertical: 12,
  },
  section: {
    paddingTop: 24,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  sectionCount: {
    fontSize: 13,
  },
  emptyState: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  browseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  browseBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  wishlistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  menuCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 4,
  },
  footerBrand: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  footerSub: {
    fontSize: 13,
  },
  footerCopy: {
    fontSize: 11,
    marginTop: 4,
  },
});
