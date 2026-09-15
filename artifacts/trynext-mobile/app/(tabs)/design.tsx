import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { Skeleton } from "@/components/Skeleton";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
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
  backLightMockup?: string;
  backDarkMockup?: string;
  /** Reviewed exact-colour photo pair. These bypass the tint overlay. */
  colorPhotos?: Record<string, { front: string; back?: string }>;
  printZone: PrintZone;
  backPrintZone?: PrintZone;
  wrapPrintZone?: PrintZone;
  zones: string[];
  mugModes?: { value: string; label: string; }[];
  colors: { name: string; hex: string }[];
}> = {
  tshirt: {
    lightMockup: "normalized/tshirt-white-front.png",
    darkMockup: "normalized/tshirt-black-front.png",
    backLightMockup: "normalized/tshirt-white-back.png",
    backDarkMockup: "normalized/tshirt-black-back.png",
    colorPhotos: {
      "#f8f7f4": { front: "normalized/tshirt-white-front.png",    back: "normalized/tshirt-white-back.png"    },
      "#1a1a1a": { front: "normalized/tshirt-black-front.png",    back: "normalized/tshirt-black-back.png"    },
      "#1e3a5f": { front: "normalized/tshirt-navy-front.png",     back: "normalized/tshirt-navy-back.png"     },
      "#dc2626": { front: "normalized/tshirt-red-front.png",      back: "normalized/tshirt-red-back.png"      },
      "#6b7280": { front: "normalized/tshirt-grey-front.png",     back: "normalized/tshirt-grey-back.png"     },
      "#7f1d1d": { front: "normalized/tshirt-maroon-front.png",   back: "normalized/tshirt-maroon-back.png"   },
      "#4a5240": { front: "normalized/tshirt-olive-front.png",    back: "normalized/tshirt-olive-back.png"    },
      "#0ea5e9": { front: "normalized/tshirt-sky-blue-front.png", back: "normalized/tshirt-sky-blue-back.png" },
    },
    printZone: { left: 0.31, top: 0.27, w: 0.38, h: 0.33 },
    backPrintZone: { left: 0.31, top: 0.27, w: 0.38, h: 0.33 },
    zones: ["Front", "Back"],
    colors: [
      { name: "White",    hex: "#F8F7F4" },
      { name: "Black",    hex: "#1a1a1a" },
      { name: "Navy",     hex: "#1e3a5f" },
      { name: "Red",      hex: "#dc2626" },
      { name: "Sky Blue", hex: "#0ea5e9" },
      { name: "Grey",     hex: "#6b7280" },
      { name: "Maroon",   hex: "#7f1d1d" },
      { name: "Olive",    hex: "#4a5240" },
    ],
  },
  longsleeve: {
    lightMockup: "normalized/longsleeve-white-front.png",
    darkMockup: "normalized/longsleeve-black-front.png",
    backLightMockup: "normalized/longsleeve-white-back.png",
    backDarkMockup: "normalized/longsleeve-black-back.png",
    colorPhotos: {
      "#f5f5f3": { front: "normalized/longsleeve-white-front.png",    back: "normalized/longsleeve-white-back.png"    },
      "#1a1a1a": { front: "normalized/longsleeve-black-front.png",    back: "normalized/longsleeve-black-back.png"    },
      "#1e3a5f": { front: "normalized/longsleeve-navy-front.png",     back: "normalized/longsleeve-navy-back.png"     },
      "#7f1d1d": { front: "normalized/longsleeve-maroon-front.png",   back: "normalized/longsleeve-maroon-back.png"   },
      "#4a5240": { front: "normalized/longsleeve-olive-front.png",    back: "normalized/longsleeve-olive-back.png"    },
      "#6b7280": { front: "normalized/longsleeve-grey-front.png",     back: "normalized/longsleeve-grey-back.png"     },
      "#dc2626": { front: "normalized/longsleeve-red-front.png",      back: "normalized/longsleeve-red-back.png"      },
      "#0ea5e9": { front: "normalized/longsleeve-sky-blue-front.png", back: "normalized/longsleeve-sky-blue-back.png" },
      "#6b1a2c": { front: "normalized/longsleeve-burgundy-front.png", back: "normalized/longsleeve-burgundy-back.png" },
      "#166534": { front: "normalized/longsleeve-forest-front.png",   back: "normalized/longsleeve-forest-back.png"   },
    },
    printZone: { left: 0.31, top: 0.29, w: 0.36, h: 0.30 },
    backPrintZone: { left: 0.30, top: 0.26, w: 0.40, h: 0.34 },
    zones: ["Front", "Back"],
    colors: [
      { name: "White",    hex: "#F5F5F3" },
      { name: "Black",    hex: "#1a1a1a" },
      { name: "Navy",     hex: "#1e3a5f" },
      { name: "Maroon",   hex: "#7f1d1d" },
      { name: "Olive",    hex: "#4a5240" },
      { name: "Grey",     hex: "#6b7280" },
      { name: "Red",      hex: "#dc2626" },
      { name: "Sky Blue", hex: "#0ea5e9" },
      { name: "Burgundy", hex: "#6b1a2c" },
      { name: "Forest",   hex: "#166534" },
    ],
  },
  hoodie: {
    lightMockup: "normalized/hoodie-white-front.png",
    darkMockup: "normalized/hoodie-black-front.png",
    backLightMockup: "normalized/hoodie-white-back.png",
    backDarkMockup: "normalized/hoodie-black-back.png",
    colorPhotos: {
      "#f2efe9": { front: "normalized/hoodie-white-front.png",    back: "normalized/hoodie-white-back.png"    },
      "#1a1a1a": { front: "normalized/hoodie-black-front.png",    back: "normalized/hoodie-black-back.png"    },
      "#1e3a5f": { front: "normalized/hoodie-navy-front.png",     back: "normalized/hoodie-navy-back.png"     },
      "#6b7280": { front: "normalized/hoodie-grey-front.png",     back: "normalized/hoodie-grey-back.png"     },
      "#7f1d1d": { front: "normalized/hoodie-maroon-front.png",   back: "normalized/hoodie-maroon-back.png"   },
      "#4a5240": { front: "normalized/hoodie-olive-front.png",    back: "normalized/hoodie-olive-back.png"    },
      "#dc2626": { front: "normalized/hoodie-red-front.png",      back: "normalized/hoodie-red-back.png"      },
      "#0ea5e9": { front: "normalized/hoodie-sky-blue-front.png", back: "normalized/hoodie-sky-blue-back.png" },
      "#166534": { front: "normalized/hoodie-forest-front.png",   back: "normalized/hoodie-forest-back.png"   },
      "#6b1a2c": { front: "normalized/hoodie-burgundy-front.png", back: "normalized/hoodie-burgundy-back.png" },
    },
    printZone: { left: 0.31, top: 0.29, w: 0.38, h: 0.28 },
    backPrintZone: { left: 0.29, top: 0.26, w: 0.42, h: 0.33 },
    zones: ["Front", "Back"],
    colors: [
      { name: "White",    hex: "#F2EFE9" },
      { name: "Black",    hex: "#1a1a1a" },
      { name: "Navy",     hex: "#1e3a5f" },
      { name: "Grey",     hex: "#6b7280" },
      { name: "Maroon",   hex: "#7f1d1d" },
      { name: "Olive",    hex: "#4a5240" },
      { name: "Red",      hex: "#dc2626" },
      { name: "Sky Blue", hex: "#0ea5e9" },
      { name: "Forest",   hex: "#166534" },
      { name: "Burgundy", hex: "#6b1a2c" },
    ],
  },
  mug: {
    lightMockup: "normalized/mug-white-front.png",
    darkMockup: "normalized/mug-black-front.png",
    backLightMockup: "normalized/mug-white-back.png",
    backDarkMockup: "normalized/mug-black-back.png",
    colorPhotos: {
      "#f5f5f5": { front: "normalized/mug-white-front.png", back: "normalized/mug-white-back.png" },
      "#1c1917": { front: "normalized/mug-black-front.png", back: "normalized/mug-black-back.png" },
      "#1e3a5f": { front: "normalized/mug-navy-front.png", back: "normalized/mug-navy-back.png" },
      "#dc2626": { front: "normalized/mug-red-front.png", back: "normalized/mug-red-back.png" },
      "#16a34a": { front: "normalized/mug-green-front.png", back: "normalized/mug-green-back.png" },
      "#7c3aed": { front: "normalized/mug-purple-front.png", back: "normalized/mug-purple-back.png" },
      "#0ea5e9": { front: "normalized/mug-sky-blue-front.png", back: "normalized/mug-sky-blue-back.png" },
      "#ec4899": { front: "normalized/mug-pink-front.png", back: "normalized/mug-pink-back.png" },
      "#7f1d1d": { front: "normalized/mug-maroon-front.png", back: "normalized/mug-maroon-back.png" },
      "#ea580c": { front: "normalized/mug-orange-front.png", back: "normalized/mug-orange-back.png" },
    },
    // 1000px coordinates scaled from the reviewed 1024px photos.
    printZone: { left: 0.225, top: 0.22, w: 0.49, h: 0.58 },
    backPrintZone: { left: 0.285, top: 0.22, w: 0.49, h: 0.58 },
    // A mobile wrap preview stays inside the visible ceramic body. The
    // storefront's two-face editor is authoritative for continuous wraps.
    wrapPrintZone: { left: 0.225, top: 0.22, w: 0.49, h: 0.58 },
    zones: ["Front"],
    mugModes: [
      { value: "side1", label: "Side 1" },
      { value: "side2", label: "Side 2" },
      { value: "wrap", label: "Full Wrap" },
    ],
    colors: [
      { name: "White", hex: "#F5F5F5" },
      { name: "Black", hex: "#1C1917" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Red", hex: "#dc2626" },
      { name: "Green", hex: "#16a34a" },
      { name: "Purple", hex: "#7c3aed" },
      { name: "Sky Blue", hex: "#0ea5e9" },
      { name: "Pink", hex: "#ec4899" },
      { name: "Maroon", hex: "#7f1d1d" },
      { name: "Orange", hex: "#ea580c" },
    ],
  },
  cap: {
    lightMockup: "normalized/cap-white-front.png",
    darkMockup: "normalized/cap-black-front.png",
    backLightMockup: "normalized/cap-white-back.png",
    backDarkMockup: "normalized/cap-black-back.png",
    colorPhotos: {
      "#f5f2ec": { front: "normalized/cap-white-front.png", back: "normalized/cap-white-back.png" },
      "#1a1a1a": { front: "normalized/cap-black-front.png", back: "normalized/cap-black-back.png" },
      "#1e3a5f": { front: "normalized/cap-navy-front.png", back: "normalized/cap-navy-back.png" },
      "#7f1d1d": { front: "normalized/cap-maroon-front.png", back: "normalized/cap-maroon-back.png" },
      "#4a5240": { front: "normalized/cap-olive-front.png", back: "normalized/cap-olive-back.png" },
      "#dc2626": { front: "normalized/cap-red-front.png", back: "normalized/cap-red-back.png" },
      "#6b7280": { front: "normalized/cap-grey-front.png", back: "normalized/cap-grey-back.png" },
      "#166534": { front: "normalized/cap-forest-front.png", back: "normalized/cap-forest-back.png" },
    },
    printZone: { left: 0.24, top: 0.26, w: 0.54, h: 0.32 },
    // Keep the rear artwork on the crown and above the adjustment opening/strap.
    backPrintZone: { left: 0.285, top: 0.27, w: 0.43, h: 0.23 },
    zones: ["Front", "Back"],
    colors: [
      { name: "White", hex: "#F5F2EC" },
      { name: "Black", hex: "#1a1a1a" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Maroon", hex: "#7f1d1d" },
      { name: "Olive", hex: "#4a5240" },
      { name: "Red", hex: "#dc2626" },
      { name: "Grey", hex: "#6b7280" },
      { name: "Forest", hex: "#166534" },
    ],
  },
  waterbottle: {
    lightMockup: "normalized/waterbottle-white-front.png",
    darkMockup: "normalized/waterbottle-black-front.png",
    backLightMockup: "normalized/waterbottle-white-back.png",
    backDarkMockup: "normalized/waterbottle-black-back.png",
    colorPhotos: {
      "#f4f3f1": { front: "normalized/waterbottle-white-front.png", back: "normalized/waterbottle-white-back.png" },
      "#1c1917": { front: "normalized/waterbottle-black-front.png", back: "normalized/waterbottle-black-back.png" },
      "#1e3a5f": { front: "normalized/waterbottle-navy-front.png", back: "normalized/waterbottle-navy-back.png" },
      "#166534": { front: "normalized/waterbottle-forest-front.png", back: "normalized/waterbottle-forest-back.png" },
      "#0ea5e9": { front: "normalized/waterbottle-sky-blue-front.png", back: "normalized/waterbottle-sky-blue-back.png" },
      "#dc2626": { front: "normalized/waterbottle-red-front.png", back: "normalized/waterbottle-red-back.png" },
      "#f472b6": { front: "normalized/waterbottle-pink-front.png", back: "normalized/waterbottle-pink-back.png" },
      "#0f766e": { front: "normalized/waterbottle-teal-front.png", back: "normalized/waterbottle-teal-back.png" },
    },
    // Only the straight bottle body is printable; exclude lid, shoulder,
    // carabiner and rounded base.
    printZone: { left: 0.39, top: 0.34, w: 0.245, h: 0.555 },
    backPrintZone: { left: 0.39, top: 0.34, w: 0.245, h: 0.555 },
    zones: ["Front", "Back"],
    colors: [
      { name: "White", hex: "#F4F3F1" },
      { name: "Black", hex: "#1C1917" },
      { name: "Navy", hex: "#1e3a5f" },
      { name: "Forest", hex: "#166534" },
      { name: "Sky Blue", hex: "#0ea5e9" },
      { name: "Red", hex: "#dc2626" },
      { name: "Pink", hex: "#f472b6" },
      { name: "Teal", hex: "#0f766e" },
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
  { id: 1, name: "Custom T-Shirt", slug: "tshirt", price: 799, customizable: true, stock: 99, featured: false, rating: 0, reviewCount: 0, imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80" },
  { id: 2, name: "Custom Hoodie",  slug: "hoodie", price: 1499, customizable: true, stock: 99, featured: false, rating: 0, reviewCount: 0, imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80" },
  { id: 3, name: "Custom Mug",     slug: "mug",    price: 599,  customizable: true, stock: 99, featured: false, rating: 0, reviewCount: 0, imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&q=80" },
  { id: 4, name: "Custom Cap",     slug: "cap",    price: 699,  customizable: true, stock: 99, featured: false, rating: 0, reviewCount: 0, imageUrl: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&q=80" },
  { id: 5, name: "Custom Water Bottle", slug: "waterbottle", price: 899, customizable: true, stock: 99, featured: false, rating: 0, reviewCount: 0, imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80" },
];

export default function DesignScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [loadingState, setLoadingState] = useState<"idle" | "picking" | "uploading" | "saving">("idle");

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
  const [mugMode, setMugMode] = useState<"side1" | "side2" | "wrap">("side1");
  const [designImage, setDesignImage] = useState<{ uri: string; base64: string } | null>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? products[0],
    [products, selectedProductId],
  );

  const mockupCfg = useMemo(
    () => getMockupConfig(selectedProduct?.slug ?? "tshirt"),
    [selectedProduct],
  );

  const isMug = selectedProduct?.slug?.includes("mug") ?? false;
  const useDarkMockup = !isLightHex(selectedColor.hex);
  const isBackFace = (isMug && mugMode === "side2") || (!isMug && selectedZone === "Back");
  const colorPhoto = mockupCfg.colorPhotos?.[selectedColor.hex.toLowerCase()];
  const exactPhotoSrc = isBackFace ? colorPhoto?.back : colorPhoto?.front;
  const mockupSrc = mockupUrl(exactPhotoSrc ?? (
    isBackFace
      ? (useDarkMockup ? (mockupCfg.backDarkMockup ?? mockupCfg.darkMockup) : (mockupCfg.backLightMockup ?? mockupCfg.lightMockup))
      : (useDarkMockup ? mockupCfg.darkMockup : mockupCfg.lightMockup)
  ));

  const pz = isMug && mugMode === "wrap" && mockupCfg.wrapPrintZone
    ? mockupCfg.wrapPrintZone
    : isBackFace
      ? (mockupCfg.backPrintZone ?? mockupCfg.printZone)
      : mockupCfg.printZone;
  const printLeft   = PREVIEW_SIZE * pz.left;
  const printTop    = PREVIEW_SIZE * pz.top;
  const printWidth  = PREVIEW_SIZE * pz.w;
  const printHeight = PREVIEW_SIZE * pz.h;

  const onSelectProduct = (p: typeof products[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProductId(p.id);
    const cfg = getMockupConfig(p.slug);
    setMugMode("side1");
    setSelectedColor(cfg.colors[0]);
    setSelectedZone(cfg.zones[0]);
  };

  const pickImage = async () => {
    setLoadingState("picking");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setDesignImage({ uri: asset.uri, base64: asset.base64 ?? "" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setLoadingState("idle");
  };

  const addToCart = async () => {
    if (!selectedProduct) return;
    setLoadingState("saving");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Upload the custom design to object storage so the admin can download it later.
    // Failures are non-fatal: the order is still created, but admin may need to follow up.
    let customImages: string[] | undefined;
    if (designImage?.base64) {
      try {
        setLoadingState("uploading");
        const base64 = designImage.base64;
        const mime = designImage.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
        const ext = mime === "image/png" ? "png" : "jpg";
        const safeName = `mobile-design-${Date.now()}.${ext}`;
        // Exact base64 byte count accounting for padding
        const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
        const size = Math.floor((base64.length * 3) / 4) - padding;
        const { uploadURL, objectPath } = await api.requestUploadUrl(safeName, size, mime);
        const blob = api.base64ToBlob(base64, mime);
        await api.uploadFile(uploadURL, blob, mime);
        customImages = [objectPath];
      } catch (err) {
        console.warn("[mobile-design-upload]", err);
      }
      setLoadingState("saving");
    }

    addItem(
      {
        ...selectedProduct,
        name: selectedProduct.name.startsWith("Custom") ? selectedProduct.name : `Custom ${selectedProduct.name}`,
        customizable: true,
        imageUrl: designImage?.uri ?? selectedProduct.imageUrl ?? undefined,
      },
      {
        color: selectedColor.name,
        customNote: JSON.stringify({
          studioDesign: true,
          product: selectedProduct.name,
          ...(isMug ? { mugMode } : {}),
          zone: selectedZone,
          color: selectedColor.hex,
          hasCustomDesign: !!designImage?.base64,
          originalAssets: (customImages ?? []).map((objectPath) => ({
            objectPath,
            filename: objectPath.split("/").pop() || "mobile-design",
            source: "mobile-design-studio",
          })),
        }),
        customImages,
      },
    );
    showToast(`${selectedColor.name} ${selectedProduct.name} added to cart`, "success");
    // Brief delay so the user sees the success toast before navigating to cart
    setTimeout(() => router.push("/cart"), 900);
    setLoadingState("idle");
  };

  if (loadingProducts && products.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <View style={{ gap: 12, width: PREVIEW_SIZE }}>
          <Skeleton width={PREVIEW_SIZE} height={PREVIEW_SIZE} borderRadius={16} />
          <Skeleton width={200} height={24} borderRadius={8} />
          <Skeleton width={PREVIEW_SIZE} height={48} borderRadius={8} />
          <Skeleton width={PREVIEW_SIZE} height={56} borderRadius={12} />
        </View>
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
                  accessibilityRole="button"
                  accessibilityLabel={`Select product ${p.name.replace(/^Custom\s+/i, "")}`}
                  accessibilityState={{ selected: active }}
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
            {!exactPhotoSrc && !useDarkMockup && selectedColor.hex !== "#F5F5F3" && (
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
                  source={{ uri: designImage.uri }}
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
                  accessibilityRole="button"
                  accessibilityLabel={`Select color ${c.name}`}
                  accessibilityState={{ selected: active }}
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
                    accessibilityRole="button"
                    accessibilityLabel={`Select print zone ${z}`}
                    accessibilityState={{ selected: active }}
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

        {/* ── Mug mode selector ──────────────────────────── */}
        {isMug && mockupCfg.mugModes && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>Mug Side</Text>
            <View style={styles.pillRow}>
              {mockupCfg.mugModes.map((m) => {
                const active = mugMode === m.value;
                return (
                  <Pressable
                    key={m.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMugMode(m.value as typeof mugMode);
                      setSelectedZone(m.value === "wrap" ? "Full Wrap" : m.label);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select mug side ${m.label}`}
                    accessibilityState={{ selected: active }}
                    style={[styles.pill, { backgroundColor: active ? colors.secondary : colors.muted, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.pillText, { color: active ? colors.primary : colors.mutedForeground }]}>{m.label}</Text>
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
            accessibilityRole="button"
            accessibilityLabel={designImage ? "Change artwork image" : "Upload artwork image"}
            style={[styles.uploadBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Feather name={designImage ? "refresh-cw" : "image"} size={20} color={colors.primary} />
            <Text style={[styles.uploadBtnTxt, { color: colors.foreground }]}>
              {designImage ? "Change Image" : "Upload from Gallery"}
            </Text>
          </Pressable>
          {designImage && (
            <Pressable onPress={() => setDesignImage(null)} style={styles.removeBtn} accessibilityRole="button" accessibilityLabel="Remove artwork image">
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
            accessibilityRole="button"
            accessibilityLabel={`Add ${selectedColor.name} ${selectedProduct?.name?.replace(/^Custom\s+/i, "") ?? ""} to cart`}
            accessibilityState={{ disabled: loadingState !== "idle" }}
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
            ]}
          >
            {loadingState === "saving" || loadingState === "uploading" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Feather name="shopping-bag" size={18} color="#fff" />
            )}
            <Text style={styles.ctaBtnTxt}>{loadingState === "uploading" ? "Uploading..." : loadingState === "saving" ? "Adding..." : "Add to Cart"}</Text>
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
