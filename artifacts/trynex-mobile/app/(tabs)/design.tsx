import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api";

const { width } = Dimensions.get("window");
const PREVIEW_SIZE = width - 40;

const getBaseUrl = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
};

function mockupUrl(file: string) {
  return `${getBaseUrl()}/mockups/${file}`;
}

const isLightHex = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
};

interface PrintZone { left: number; top: number; w: number; h: number; }

const MOCKUP_CONFIG: Record<string, {
  lightMockup: string;
  darkMockup: string;
  printZone: PrintZone;
  zones: string[];
  colors: { name: string; hex: string }[];
}> = {
  tshirt: {
    lightMockup: "white-tshirt-front.png",
    darkMockup: "black-tshirt-front.png",
    printZone: { left: 0.31, top: 0.27, w: 0.38, h: 0.33 },
    zones: ["Front", "Back"],
    colors: [
      { name: "White", hex: "#F5F5F3" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Orange", hex: "#F97316" },
      { name: "Red", hex: "#dc2626" },
      { name: "Sky", hex: "#0ea5e9" },
      { name: "Forest", hex: "#166534" },
      { name: "Maroon", hex: "#7f1d1d" },
    ],
  },
  hoodie: {
    lightMockup: "white-hoodie-front.png",
    darkMockup: "black-hoodie-front.png",
    printZone: { left: 0.31, top: 0.29, w: 0.38, h: 0.28 },
    zones: ["Front", "Back"],
    colors: [
      { name: "White", hex: "#F5F5F3" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Grey", hex: "#6b7280" },
      { name: "Maroon", hex: "#7f1d1d" },
      { name: "Forest", hex: "#166534" },
    ],
  },
  mug: {
    lightMockup: "white-mug-front.png",
    darkMockup: "black-mug-front.png",
    printZone: { left: 0.21, top: 0.24, w: 0.58, h: 0.52 },
    zones: ["Front"],
    colors: [
      { name: "White", hex: "#F5F5F3" },
      { name: "Black", hex: "#1a1a1a" },
    ],
  },
  cap: {
    lightMockup: "white-cap-front.png",
    darkMockup: "black-cap-front.png",
    printZone: { left: 0.27, top: 0.36, w: 0.46, h: 0.34 },
    zones: ["Front"],
    colors: [
      { name: "White", hex: "#F5F5F3" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Red", hex: "#dc2626" },
      { name: "Forest", hex: "#166534" },
      { name: "Sky", hex: "#0ea5e9" },
    ],
  },
};

function getMockupConfig(slug: string) {
  for (const key of Object.keys(MOCKUP_CONFIG)) {
    if (slug.includes(key)) return MOCKUP_CONFIG[key];
  }
  return MOCKUP_CONFIG.tshirt;
}

const FALLBACK_PRODUCTS = [
  { id: 1, name: "Custom T-Shirt", slug: "tshirt", price: 799, customizable: true, stock: 99, featured: false, rating: 0, reviewCount: 0, imageUrl: undefined },
  { id: 2, name: "Custom Hoodie",  slug: "hoodie", price: 1499, customizable: true, stock: 99, featured: false, rating: 0, reviewCount: 0, imageUrl: undefined },
  { id: 3, name: "Custom Mug",     slug: "mug",    price: 599,  customizable: true, stock: 99, featured: false, rating: 0, reviewCount: 0, imageUrl: undefined },
  { id: 4, name: "Custom Cap",     slug: "cap",    price: 699,  customizable: true, stock: 99, featured: false, rating: 0, reviewCount: 0, imageUrl: undefined },
];

export default function DesignScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const { addItem } = useCart();

  const { data: productsData, isLoading: loadingProducts, isError, refetch, isRefetching } = useQuery({
    queryKey: ["products", "customizable"],
    queryFn: () => api.getProducts({ customizable: true, limit: 20 }),
    staleTime: 5 * 60 * 1000,
  });

  const products = useMemo(() => {
    const list = productsData?.products ?? [];
    return list.length > 0 ? list : FALLBACK_PRODUCTS;
  }, [productsData]);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState({ name: "White", hex: "#F5F5F3" });
  const [selectedZone, setSelectedZone] = useState("Front");
  const [designImage, setDesignImage] = useState<string | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? products[0],
    [products, selectedProductId],
  );

  const mockupCfg = useMemo(
    () => getMockupConfig(selectedProduct?.slug ?? "tshirt"),
    [selectedProduct],
  );

  const useDarkMockup = !isLightHex(selectedColor.hex);
  const mockupSrc = useDarkMockup
    ? mockupUrl(mockupCfg.darkMockup)
    : mockupUrl(mockupCfg.lightMockup);

  const pz = mockupCfg.printZone;
  const printLeft   = PREVIEW_SIZE * pz.left;
  const printTop    = PREVIEW_SIZE * pz.top;
  const printWidth  = PREVIEW_SIZE * pz.w;
  const printHeight = PREVIEW_SIZE * pz.h;

  const onSelectProduct = (p: typeof products[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProductId(p.id);
    const cfg = getMockupConfig(p.slug);
    setSelectedColor(cfg.colors[0]);
    setSelectedZone(cfg.zones[0]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setDesignImage(result.assets[0].uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const addToCart = () => {
    if (!selectedProduct) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem(
      {
        ...selectedProduct,
        name: selectedProduct.name.startsWith("Custom") ? selectedProduct.name : `Custom ${selectedProduct.name}`,
        customizable: true,
        imageUrl: designImage ?? selectedProduct.imageUrl ?? undefined,
      },
      {
        color: selectedColor.name,
        customNote: JSON.stringify({
          zone: selectedZone,
          color: selectedColor.hex,
          hasCustomDesign: !!designImage,
        }),
      },
    );
    Alert.alert(
      "Added to Cart! 🎉",
      `${selectedColor.name} ${selectedProduct.name} (${selectedZone}) added.`,
      [
        { text: "Keep Designing", style: "cancel" },
        { text: "View Cart", onPress: () => router.push("/cart") },
      ],
    );
  };

  if (loadingProducts && products.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {isError && (
          <View style={[styles.errorBox, { backgroundColor: colors.destructive + "10", margin: 16 }]}>
            <Feather name="alert-circle" size={20} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>Failed to load customizable products</Text>
            <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.navy }]}>
          <Text style={styles.headerTitle}>Design Studio</Text>
          <Text style={styles.headerSub}>Pick a product, choose a color, upload your art</Text>
        </View>

        {/* ── Product selector ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Choose Product</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {products.map((p) => {
              const active = (selectedProduct?.id ?? products[0]?.id) === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => onSelectProduct(p)}
                  style={[
                    styles.pill,
                    { backgroundColor: active ? colors.primary : colors.muted, borderColor: active ? colors.primary : colors.border },
                  ]}
                >
                  <Text style={[styles.pillText, { color: active ? "#fff" : colors.foreground }]}>
                    {p.name.replace(/^Custom\s+/i, "")}
                  </Text>
                  <Text style={[styles.pillPrice, { color: active ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
                    ৳{p.price.toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Mockup preview ───────────────────────────────── */}
        <View style={styles.previewSection}>
          <View style={[styles.mockupWrap, { backgroundColor: colors.muted }]}>

            {/* Real product mockup image */}
            <Image
              source={{ uri: mockupSrc }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
            />

            {/* Color tint overlay for light-base mockups */}
            {!useDarkMockup && selectedColor.hex !== "#F5F5F3" && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: selectedColor.hex, opacity: 0.45 },
                ]}
              />
            )}

            {/* Print zone overlay */}
            <View
              style={[
                styles.printZone,
                {
                  left: printLeft,
                  top: printTop,
                  width: printWidth,
                  height: printHeight,
                  borderColor: colors.primary,
                },
              ]}
            >
              {designImage ? (
                <Image
                  source={{ uri: designImage }}
                  style={styles.designImg}
                  contentFit="contain"
                />
              ) : (
                <Pressable style={styles.uploadHit} onPress={pickImage}>
                  <View style={[styles.uploadBubble, { backgroundColor: `${colors.primary}22` }]}>
                    <Feather name="upload" size={22} color={colors.primary} />
                    <Text style={[styles.uploadTxt, { color: colors.primary }]}>Tap to upload</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Zone badge */}
            <View style={[styles.zoneBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.zoneBadgeTxt}>{selectedZone}</Text>
            </View>

            {/* Color chip */}
            <View style={[styles.colorChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.colorDot, { backgroundColor: selectedColor.hex, borderWidth: selectedColor.hex === "#F5F5F3" ? 1 : 0, borderColor: colors.border }]} />
              <Text style={[styles.colorChipTxt, { color: colors.foreground }]}>{selectedColor.name}</Text>
            </View>
          </View>
        </View>

        {/* ── Color picker ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.foreground }]}>Color</Text>
          <View style={styles.swatchRow}>
            {mockupCfg.colors.map((c) => {
              const active = selectedColor.hex === c.hex;
              return (
                <Pressable
                  key={c.hex}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedColor(c);
                  }}
                  style={[
                    styles.swatch,
                    { backgroundColor: c.hex },
                    c.hex === "#F5F5F3" && { borderWidth: 1, borderColor: colors.border },
                    active && styles.swatchActive,
                  ]}
                >
                  {active && (
                    <Feather
                      name="check"
                      size={14}
                      color={isLightHex(c.hex) ? "#333" : "#fff"}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Print zone selector ──────────────────────────── */}
        {mockupCfg.zones.length > 1 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>Print Zone</Text>
            <View style={styles.pillRow}>
              {mockupCfg.zones.map((z) => {
                const active = selectedZone === z;
                return (
                  <Pressable
                    key={z}
                    onPress={() => setSelectedZone(z)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? colors.secondary : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.pillText, { color: active ? colors.primary : colors.mutedForeground }]}>{z}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Upload section ───────────────────────────────── */}
        <View style={[styles.section, { paddingHorizontal: 20 }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Your Artwork</Text>
          <Pressable
            onPress={pickImage}
            style={[styles.uploadBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Feather name={designImage ? "refresh-cw" : "image"} size={20} color={colors.primary} />
            <Text style={[styles.uploadBtnTxt, { color: colors.foreground }]}>
              {designImage ? "Change Image" : "Upload from Gallery"}
            </Text>
          </Pressable>
          {designImage && (
            <Pressable onPress={() => setDesignImage(null)} style={styles.removeBtn}>
              <Feather name="trash-2" size={14} color={colors.destructive} />
              <Text style={[styles.removeBtnTxt, { color: colors.destructive }]}>Remove Image</Text>
            </Pressable>
          )}
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            PNG or JPG · Recommended: 2400×2400px · Max 20MB
          </Text>
        </View>

        {/* ── Add to cart ──────────────────────────────────── */}
        <View style={[styles.cta, { borderTopColor: colors.border }]}>
          <View>
            <Text style={[styles.ctaPrice, { color: colors.primary }]}>
              ৳{(selectedProduct?.price ?? 0).toLocaleString()}
            </Text>
            <Text style={[styles.ctaName, { color: colors.mutedForeground }]}>
              {selectedColor.name} {selectedProduct?.name?.replace(/^Custom\s+/i, "") ?? ""} · {selectedZone}
            </Text>
          </View>
          <Pressable
            onPress={addToCart}
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Feather name="shopping-bag" size={18} color="#fff" />
            <Text style={styles.ctaBtnTxt}>Add to Cart</Text>
          </Pressable>
        </View>

        <View style={{ height: isWeb ? 34 : 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 4,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerSub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  pillRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  pillPrice: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  previewSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  mockupWrap: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  printZone: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 6,
    overflow: "hidden",
  },
  designImg: {
    width: "100%",
    height: "100%",
  },
  uploadHit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBubble: {
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  uploadTxt: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  zoneBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  zoneBadgeTxt: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  colorChip: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  colorChipTxt: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  swatchRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: "#F97316",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  uploadBtnTxt: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingVertical: 4,
  },
  removeBtnTxt: {
    fontSize: 13,
    fontWeight: "500",
  },
  hint: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
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
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 20,
    borderTopWidth: 1,
  },
  ctaPrice: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  ctaName: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
  },
  ctaBtnTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
