import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { useColors } from "@/hooks/useColors";
import { api, Product } from "@/lib/api";

const { width } = Dimensions.get("window");

const CATEGORY_STYLE: Record<string, { icon: string; color: string }> = {
  "t-shirts":  { icon: "user",     color: "#F97316" },
  "tshirts":   { icon: "user",     color: "#F97316" },
  "hoodies":   { icon: "wind",     color: "#3B82F6" },
  "caps":      { icon: "sun",      color: "#10B981" },
  "mugs":      { icon: "coffee",   color: "#8B5CF6" },
  "bags":      { icon: "briefcase",color: "#EC4899" },
  "polos":     { icon: "user",     color: "#F59E0B" },
  "jerseys":   { icon: "award",    color: "#06B6D4" },
  "default":   { icon: "tag",      color: "#E85D04" },
};

function getCategoryStyle(name: string) {
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  return CATEGORY_STYLE[key] ?? CATEGORY_STYLE["default"];
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const { data: featuredData, isLoading: isFeaturedLoading, isError: isFeaturedError, refetch: refetchFeatured, isRefetching: isFeaturedRefetching } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => api.getProducts({ featured: true, limit: 10 }),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  const { data: newData, isLoading: isNewLoading, isError: isNewError, refetch: refetchNew } = useQuery({
    queryKey: ["products", "new"],
    queryFn: () => api.getProducts({ limit: 20 }),
    staleTime: 2 * 60 * 1000,
    retry: 3,
  });

  const { data: categoriesData, isLoading: isCatsLoading, isError: isCatsError, refetch: refetchCats } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
    staleTime: 10 * 60 * 1000,
    retry: 3,
  });

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchFeatured(), refetchNew(), refetchCats()]);
  };

  const isLoading = isFeaturedLoading || isNewLoading || isCatsLoading;
  const isError = isFeaturedError || isNewError || isCatsError;
  const isRefetching = isFeaturedRefetching;

  const featured = featuredData?.products ?? [];
  const newProducts = newData?.products ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {isError && !isLoading && (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "10", margin: 20 }]}>
          <Feather name="alert-circle" size={20} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>Failed to load content</Text>
          <Pressable onPress={onRefresh} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}
      {/* Hero Header */}
      <View style={[styles.hero, { paddingTop: topPad + 16, backgroundColor: colors.navy }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>Trynex Lifestyle</Text>
            <Text style={styles.heroSub}>Design. Wear. Express.</Text>
          </View>
          <Pressable
            onPress={() => router.push("/cart")}
            style={[styles.cartBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
          >
            <Feather name="shopping-bag" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <Pressable
          onPress={() => router.push("/(tabs)/shop")}
          style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.12)" }]}
        >
          <Feather name="search" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.searchPlaceholder}>Search products…</Text>
        </Pressable>

        {/* Hero Image */}
        <View style={styles.heroImageWrap}>
          <Image
            source={require("@/assets/images/hero-products.png")}
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroCta}>
            <Text style={styles.heroCtaTitle}>Custom Prints</Text>
            <Text style={styles.heroCtaSub}>Starting from ৳299</Text>
            <Pressable
              style={[styles.heroCtaBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/design");
              }}
            >
              <Text style={styles.heroCtaBtnText}>Design Now</Text>
              <Feather name="arrow-right" size={14} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shop by Category</Text>
          <Pressable onPress={() => router.push("/(tabs)/shop")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>
        <View style={styles.categoryGrid}>
          {isCatsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24, width: "100%" }} />
          ) : (categoriesData?.categories ?? []).length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground, paddingHorizontal: 20 }]}>No categories found</Text>
          ) : (categoriesData?.categories ?? []).slice(0, 8).map((cat) => {
            const style = getCategoryStyle(cat.name);
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/(tabs)/shop", params: { categoryId: cat.id, categoryName: cat.name } });
                }}
                style={({ pressed }) => [
                  styles.categoryCard,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${style.color}18` }]}>
                  <Feather name={style.icon as any} size={22} color={style.color} />
                </View>
                <Text style={[styles.categoryName, { color: colors.foreground }]}>{cat.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Featured Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Featured</Text>
          <Pressable onPress={() => router.push("/(tabs)/shop")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : featured.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="package" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No featured products yet</Text>
          </View>
        ) : (
          <FlatList
            data={featured}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => (
              <ProductCard product={item} style={{ width: 165 }} />
            )}
            scrollEnabled={featured.length > 0}
          />
        )}
      </View>

      {/* All Products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>New Arrivals</Text>
          <Pressable onPress={() => router.push("/(tabs)/shop")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>
        <View style={styles.productsGrid}>
          {isNewLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24, width: "100%" }} />
          ) : (newProducts.slice(0, 6)).map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </View>
        {newProducts.length === 0 && !isNewLoading && (
          <View style={styles.emptyState}>
            <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No products yet</Text>
          </View>
        )}
      </View>

      {/* Design CTA Banner */}
      <Pressable
        onPress={() => router.push("/(tabs)/design")}
        style={[styles.ctaBanner, { backgroundColor: colors.navy }]}
      >
        <View style={styles.ctaContent}>
          <Text style={styles.ctaTitle}>Create Your Own Design</Text>
          <Text style={styles.ctaSub}>Upload your image and see it come to life on any product</Text>
          <View style={[styles.ctaBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.ctaBtnText}>Start Designing</Text>
            <Feather name="arrow-right" size={14} color="#fff" />
          </View>
        </View>
        <Feather name="edit-3" size={60} color="rgba(255,255,255,0.12)" style={styles.ctaBg} />
      </Pressable>

      <View style={{ height: isWeb ? 34 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroGreeting: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  heroSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 2,
  },
  cartBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchPlaceholder: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
  },
  heroImageWrap: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 0,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28,41,81,0.55)",
  },
  heroCta: {
    position: "absolute",
    bottom: 16,
    left: 16,
  },
  heroCtaTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  heroCtaSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginBottom: 10,
  },
  heroCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  heroCtaBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  section: {
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryCard: {
    width: (width - 52) / 4,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  ctaBanner: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    overflow: "hidden",
    position: "relative",
  },
  ctaContent: {
    gap: 6,
  },
  ctaTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  ctaSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: "80%",
    marginBottom: 8,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    alignSelf: "flex-start",
  },
  ctaBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  ctaBg: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
