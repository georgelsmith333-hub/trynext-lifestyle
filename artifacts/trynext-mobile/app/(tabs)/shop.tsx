import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import { api } from "@/lib/api";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "featured", label: "Featured" },
];

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;

  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();

  const [selectedCategory, setSelectedCategory] = useState<number>(
    params.categoryId ? parseInt(params.categoryId) : 0,
  );
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const categories = [
    { id: 0, name: "All" },
    ...(categoriesData?.categories ?? []),
  ];

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["products", "list", selectedCategory, search, sort, page],
    queryFn: () =>
      api.getProducts({
        categoryId: selectedCategory || undefined,
        search: search || undefined,
        limit: 20,
        page,
      }),
    staleTime: 30000,
    retry: 2,
  });

  const products = data?.products ?? [];
  const totalPages = data?.totalPages ?? 1;

  const onCategory = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(id);
    setPage(1);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Shop</Text>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search products…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1); }}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => onCategory(cat.id)}
              style={[
                styles.catPill,
                selectedCategory === cat.id
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: colors.muted, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text
                style={[
                  styles.catPillText,
                  { color: selectedCategory === cat.id ? "#fff" : colors.mutedForeground },
                ]}
              >
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Sort */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {SORT_OPTIONS.map((s) => (
            <Pressable
              key={s.value}
              onPress={() => setSort(s.value)}
              style={[
                styles.sortPill,
                sort === s.value
                  ? { backgroundColor: colors.secondary, borderColor: colors.primary, borderWidth: 1 }
                  : { borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.sortPillText, { color: sort === s.value ? colors.primary : colors.mutedForeground }]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Products */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={{ width: "48%", marginBottom: 12 }}>
                <ProductCardSkeleton />
              </View>
            ))}
          </View>
        </View>
      ) : isError ? (
        <View style={styles.emptyWrap}>
          <Feather name="alert-circle" size={52} color={colors.destructive} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Oops! Something went wrong</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Feather name="package" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products found</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {search ? "Try a different search" : "Check back soon"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.list, { paddingBottom: isWeb ? 34 : 100 }]}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          scrollEnabled={!!products.length}
          renderItem={({ item }) => <ProductCard product={item} />}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={[styles.pageBtn, { backgroundColor: colors.muted, opacity: page === 1 ? 0.4 : 1 }]}
                >
                  <Feather name="chevron-left" size={18} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.pageText, { color: colors.mutedForeground }]}>
                  {page} / {totalPages}
                </Text>
                <Pressable
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={[styles.pageBtn, { backgroundColor: colors.muted, opacity: page === totalPages ? 0.4 : 1 }]}
                >
                  <Feather name="chevron-right" size={18} color={colors.foreground} />
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  categories: {
    gap: 8,
    paddingRight: 4,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  catPillText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  sortRow: {
    gap: 8,
  },
  sortPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sortPillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
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
  },
  list: {
    padding: 16,
  },
  row: {
    gap: 12,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 20,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pageText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
