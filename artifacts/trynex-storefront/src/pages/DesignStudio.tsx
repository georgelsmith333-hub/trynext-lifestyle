import { useRef, useState, useCallback, useEffect, useMemo, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { useCartActions, type OriginalAsset } from "@/context/CartContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiUrl } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useGesture } from "@use-gesture/react";
import {
  Upload, RotateCcw, Trash2, ShoppingCart,
  ZoomIn, ZoomOut, RotateCw, Move, Ruler,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Scissors, Info, Eye, EyeOff, Loader2, Wand2,
  Type, Layers as LayersIcon, Sparkles,
  Undo2, Redo2, Lock, Unlock, ChevronUp, ChevronDown,
  Image as ImageIcon, Plus, Check, CloudUpload,
  Box, Image as Image2D, Search, X, ChevronRight,
  Palette, Package, FlipHorizontal, Copy, Crosshair,
  Download, AlignLeft, AlignCenter, AlignRight,
} from "lucide-react";
import {
  PRODUCTS, type DesignProduct, GarmentSVG, FlatZoneSVG,
  STICKERS, BASE_BY_CATEGORY, MUG_SIDE_PZ,
  getApparelZones, getZonePZ, type ApparelZone,
} from "./design-studio/mockups";
import { composeLayers, composeGarmentMockup, composeDesignTexture, hasWebGL2, type ComposerLayer } from "./design-studio/composer";

// Lazy-load the 3D bundle so first-paint stays light.
const ProductViewer3D = lazy(() => import("./design-studio/ProductViewer3D"));

/* ═══════════════════════════════════════════════════════
   LAYER MODEL
════════════════════════════════════════════════════════ */

interface Transform { x: number; y: number; scale: number; rotation: number; opacity: number; scaleX?: number; scaleY?: number }
const ZERO_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };

type Face = "front" | "back" | "left-sleeve" | "right-sleeve" | "neck-label";
interface BaseLayer { id: string; name: string; visible: boolean; locked: boolean; transform: Transform; face?: Face }
interface ImageLayer extends BaseLayer {
  type: "image"; src: string; naturalW: number; naturalH: number;
  flipH?: boolean; flipV?: boolean;
  brightness?: number; contrast?: number; saturation?: number;
}
interface TextLayer extends BaseLayer {
  type: "text"; text: string; fontFamily: string; fontWeight: number;
  fontStyle: "normal" | "italic"; fontSize: number; color: string;
  textAlign?: "left" | "center" | "right";
  strokeColor?: string; strokeWidth?: number;
  shadowOffsetX?: number; shadowOffsetY?: number; shadowBlur?: number; shadowColor?: string;
  letterSpacing?: number;
}
type Layer = ImageLayer | TextLayer;

const SIZE_CHART = [
  { size: "XS", chest: "36", length: "26" },
  { size: "S",  chest: "38", length: "27" },
  { size: "M",  chest: "40", length: "28" },
  { size: "L",  chest: "42", length: "29" },
  { size: "XL", chest: "44", length: "30" },
  { size: "XXL",  chest: "46", length: "31" },
  { size: "XXXL", chest: "48", length: "32" },
];

const FONT_FAMILIES = [
  { label: "Sans",           value: "Inter, system-ui, sans-serif" },
  { label: "Bold Display",   value: "'Helvetica Neue', Arial, sans-serif" },
  { label: "Space Grotesk",  value: "'Space Grotesk', sans-serif" },
  { label: "Bebas Neue",     value: "'Bebas Neue', Impact, sans-serif" },
  { label: "Barlow Cond.",   value: "'Barlow Condensed', 'Arial Narrow', sans-serif" },
  { label: "Nunito",         value: "'Nunito', 'Comic Sans MS', sans-serif" },
  { label: "Playfair",       value: "'Playfair Display', Georgia, serif" },
  { label: "Pacifico",       value: "'Pacifico', cursive" },
  { label: "Marker",         value: "'Permanent Marker', 'Brush Script MT', cursive" },
  { label: "বাংলা (Bangla)", value: "'Hind Siliguri', sans-serif" },
  { label: "Mono",           value: "'JetBrains Mono', ui-monospace, monospace" },
  { label: "Script",         value: "'Brush Script MT', cursive" },
];

interface Template { id: string; name: string; preview: string; create: () => Layer[] }
function uid() { return Math.random().toString(36).slice(2, 10); }
const TEMPLATES: Template[] = [
  {
    id: "tpl-bigword", name: "Big Word", preview: "DREAM",
    create: () => [{
      id: uid(), name: "DREAM", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM, scale: 1.4 },
      text: "DREAM", fontFamily: FONT_FAMILIES[1].value, fontWeight: 900,
      fontStyle: "normal", fontSize: 64, color: "#111111",
    }],
  },
  {
    id: "tpl-namaste", name: "Namaste", preview: "নমস্কার",
    create: () => [{
      id: uid(), name: "নমস্কার", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM },
      text: "নমস্কার", fontFamily: FONT_FAMILIES[2].value, fontWeight: 700,
      fontStyle: "italic", fontSize: 48, color: "#7c2d12",
    }],
  },
  {
    id: "tpl-stack", name: "Stacked", preview: "GOOD\nVIBES",
    create: () => [
      {
        id: uid(), name: "GOOD", type: "text", visible: true, locked: false,
        transform: { ...ZERO_TRANSFORM, y: -22 },
        text: "GOOD", fontFamily: FONT_FAMILIES[1].value, fontWeight: 900,
        fontStyle: "normal", fontSize: 50, color: "#E85D04",
      },
      {
        id: uid(), name: "VIBES", type: "text", visible: true, locked: false,
        transform: { ...ZERO_TRANSFORM, y: 22 },
        text: "VIBES", fontFamily: FONT_FAMILIES[1].value, fontWeight: 900,
        fontStyle: "normal", fontSize: 50, color: "#111111",
      },
    ],
  },
  {
    id: "tpl-mono", name: "Mono Tag", preview: "// trynex",
    create: () => [{
      id: uid(), name: "// trynex", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM },
      text: "// trynex", fontFamily: FONT_FAMILIES[3].value, fontWeight: 600,
      fontStyle: "normal", fontSize: 38, color: "#111111",
    }],
  },
  {
    id: "tpl-script", name: "Script", preview: "Cheers",
    create: () => [{
      id: uid(), name: "Cheers", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM, rotation: -8 },
      text: "Cheers", fontFamily: FONT_FAMILIES[4].value, fontWeight: 700,
      fontStyle: "italic", fontSize: 60, color: "#1e3a5f",
    }],
  },
  {
    id: "tpl-emoji", name: "Heart Stack", preview: "♥ DHAKA",
    create: () => [{
      id: uid(), name: "♥ DHAKA", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM },
      text: "♥ DHAKA", fontFamily: FONT_FAMILIES[1].value, fontWeight: 800,
      fontStyle: "normal", fontSize: 44, color: "#dc2626",
    }],
  },
  {
    id: "tpl-bebas", name: "Impact", preview: "LEGEND",
    create: () => [{
      id: uid(), name: "LEGEND", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM, scale: 1.5 },
      text: "LEGEND", fontFamily: FONT_FAMILIES[3].value, fontWeight: 900,
      fontStyle: "normal", fontSize: 72, color: "#111111",
    }],
  },
  {
    id: "tpl-bangla", name: "বাংলা", preview: "বাংলাদেশ",
    create: () => [{
      id: uid(), name: "বাংলাদেশ", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM },
      text: "বাংলাদেশ", fontFamily: FONT_FAMILIES[9].value, fontWeight: 700,
      fontStyle: "normal", fontSize: 46, color: "#006a4e",
    }],
  },
  {
    id: "tpl-pacifico", name: "Chill Vibes", preview: "Chill",
    create: () => [{
      id: uid(), name: "Chill", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM },
      text: "Chill Vibes", fontFamily: FONT_FAMILIES[7].value, fontWeight: 700,
      fontStyle: "normal", fontSize: 52, color: "#7c3aed",
    }],
  },
  {
    id: "tpl-marker", name: "Marker Art", preview: "✏ CUSTOM",
    create: () => [{
      id: uid(), name: "CUSTOM", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM, rotation: -5 },
      text: "CUSTOM", fontFamily: FONT_FAMILIES[8].value, fontWeight: 700,
      fontStyle: "normal", fontSize: 54, color: "#1a1a1a",
    }],
  },
  {
    id: "tpl-twoline", name: "BD Pride", preview: "🇧🇩 PRIDE",
    create: () => [
      {
        id: uid(), name: "MADE IN", type: "text", visible: true, locked: false,
        transform: { ...ZERO_TRANSFORM, y: -28, scale: 0.9 },
        text: "MADE IN", fontFamily: FONT_FAMILIES[4].value, fontWeight: 700,
        fontStyle: "normal", fontSize: 36, color: "#6b7280",
      },
      {
        id: uid(), name: "BANGLADESH", type: "text", visible: true, locked: false,
        transform: { ...ZERO_TRANSFORM, y: 16 },
        text: "BANGLADESH", fontFamily: FONT_FAMILIES[3].value, fontWeight: 900,
        fontStyle: "normal", fontSize: 44, color: "#006a4e",
      },
    ],
  },
  {
    id: "tpl-minimal", name: "Minimal Line", preview: "——— name ———",
    create: () => [{
      id: uid(), name: "name", type: "text", visible: true, locked: false,
      transform: { ...ZERO_TRANSFORM },
      text: "——— your name ———", fontFamily: FONT_FAMILIES[0].value, fontWeight: 400,
      fontStyle: "normal", fontSize: 28, color: "#374151",
    }],
  },
];

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════ */

type RightTab = "upload" | "text" | "layers" | "templates" | "ai";

const DRAFT_STORAGE_KEY = "trynex-design-draft-v1";
// Bumped to v2 when garment coordinate space changed from per-product viewBoxes
// to a unified 1000x1000 space (photographic mockups). Old drafts are dropped.
const DRAFT_VERSION = 2;

/** Custom hex/colour picker in the Design Studio — disabled to keep
 *  colours consistent with available stock. Use the curated swatches only. */
const STUDIO_CUSTOM_COLOR_ENABLED = false;

/** Inline SVG product icons for the quick-switch tab row.
 *  Uses currentColor so stroke changes automatically with isActive state. */
const PRODUCT_TAB_ICONS: Record<string, React.ReactNode> = {
  tshirt: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
      <path d="M12 4c0 0 1.6 3 4 3s4-3 4-3l6.5 5-4 4-1.5-1.5V27H11V11.5l-1.5 1.5-4-4Z"/>
    </svg>
  ),
  hoodie: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
      <path d="M11 4.5C10.5 6 10 8 10 10H4v6h4.5V27h15V16H28v-6h-6c0-2-.5-4-1-5.5"/>
      <path d="M11 4.5C11 4.5 12.5 7 16 7s5-2.5 5-2.5"/>
    </svg>
  ),
  longsleeve: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
      <path d="M12 4c0 0 1.5 3 4 3s4-3 4-3l3 2.5v5.5H22V27H10V12h-1V6.5Z"/>
      <path d="M11 6.5L5 9.5v13h5"/>
      <path d="M21 6.5L27 9.5v13h-5"/>
    </svg>
  ),
  mug: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
      <rect x="5" y="9" width="16" height="15" rx="2.5"/>
      <path d="M21 14h4.5a2 2 0 0 1 0 4H21"/>
      <line x1="9" y1="14" x2="9" y2="20"/>
      <line x1="13" y1="14" x2="13" y2="20"/>
      <line x1="17" y1="14" x2="17" y2="20"/>
    </svg>
  ),
  cap: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
      <path d="M4 21C6 12 10 8 16 8s10 4 12 13"/>
      <path d="M5 21h22"/>
      <line x1="16" y1="8" x2="16" y2="5"/>
    </svg>
  ),
  waterbottle: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{width:"100%",height:"100%"}}>
      <path d="M13 3.5h6v3h1.5C21.5 6.5 22.5 7.5 22.5 9v18c0 1.2-1 2-2 2H11.5c-1 0-2-.8-2-2V9c0-1.5 1-2.5 2-2.5H13Z"/>
      <line x1="9.5" y1="13" x2="22.5" y2="13"/>
    </svg>
  ),
};

/** Image filter presets for one-click style changes on image layers. */
const FILTER_PRESETS = [
  { name: "Original", brightness: 100, contrast: 100, saturation: 100 },
  { name: "Vintage",  brightness: 88,  contrast: 82,  saturation: 60  },
  { name: "B&W",      brightness: 100, contrast: 110, saturation: 0   },
  { name: "Sepia",    brightness: 95,  contrast: 90,  saturation: 25  },
  { name: "Bold",     brightness: 100, contrast: 130, saturation: 150 },
  { name: "Warm",     brightness: 108, contrast: 100, saturation: 115 },
  { name: "Cold",     brightness: 100, contrast: 108, saturation: 75  },
  { name: "Faded",    brightness: 115, contrast: 80,  saturation: 55  },
];

/** The 3 most popular products shown as quick-switch tabs. */
const QUICK_PRODUCT_IDS = ["tshirt", "hoodie", "longsleeve", "mug"] as const;

/** Map legacy colour-prefixed product IDs (e.g. "white-tshirt") to new simple IDs. */
const LEGACY_ID_MAP: Record<string, string> = {
  "white-tshirt": "tshirt", "black-tshirt": "tshirt",
  "white-hoodie": "hoodie", "black-hoodie": "hoodie",
  "white-longsleeve": "longsleeve", "black-longsleeve": "longsleeve",
  "white-mug": "mug", "black-mug": "mug",
  "white-cap": "cap", "black-cap": "cap",
  "white-waterbottle": "waterbottle",
};
type SaveStatus = "idle" | "saving" | "saved";
interface DraftPayload {
  version: number;
  layers: Layer[];
  productId: string;
  color: { name: string; hex: string };
  size: string;
  savedAt: number;
  mugMode?: string;
  linkedStoreProductId?: number;
  linkedStoreProductName?: string;
  linkedStoreProductPrice?: number;
}

interface LinkedStoreProduct {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
}

function detectCategoryFromProduct(prod: any): DesignProduct["category"] {
  const text = [
    prod.name ?? "",
    prod.category?.name ?? "",
    prod.categoryName ?? "",
    ...(Array.isArray(prod.tags) ? prod.tags : []),
  ].join(" ").toLowerCase();
  if (text.includes("mug") || text.includes("cup")) return "mug";
  if (text.includes("hoodie") || text.includes("sweatshirt")) return "hoodie";
  if (text.includes("cap") || text.includes("hat")) return "cap";
  if (text.includes("long sleeve") || text.includes("longsleeve") || text.includes("long-sleeve")) return "longsleeve";
  if (text.includes("bottle") || text.includes("tumbler") || text.includes("flask")) return "waterbottle";
  return "tshirt";
}

function detectColorFromProduct(prod: any): string {
  const name = (prod.name ?? "").toLowerCase();
  if (name.includes("black")) return "#1a1a1a";
  if (name.includes("navy")) return "#1e3a5f";
  if (name.includes("maroon")) return "#7f1d1d";
  if (name.includes("grey") || name.includes("gray")) return "#6b7280";
  if (name.includes("olive")) return "#4a5240";
  if (Array.isArray(prod.colors) && prod.colors.length > 0) {
    const first = prod.colors[0];
    if (typeof first === "string" && first.startsWith("#")) return first;
    if (typeof first === "object" && first?.hex) return first.hex;
  }
  return "#F5F5F3";
}

/* ── 3D ErrorBoundary — catches R3F / WebGL runtime crashes gracefully ── */
class Viewer3DErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error?.message ?? "Unknown 3D error" };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[3D Viewer Error]", error, info.componentStack?.slice(0, 200));
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 bg-gray-50 rounded-2xl">
          <Box className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-600">3D preview unavailable</p>
          <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">{this.state.error.slice(0, 100)}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: "" }); this.props.onReset(); }}
            className="px-3 py-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 border border-orange-200 hover:border-orange-300 rounded-lg transition-colors"
          >
            Switch to 2D view
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DesignStudio() {
  const [, navigate] = useLocation();
  const { addToCart } = useCartActions();
  const settings = useSiteSettings();
  const { toast } = useToast();

  /* Linked real store product for this design session */
  const [linkedStoreProduct, setLinkedStoreProduct] = useState<LinkedStoreProduct | null>(null);
  const pendingStoreProductIdRef = useRef<number | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<DesignProduct>(PRODUCTS[0]);
  const [selectedColor, setSelectedColor] = useState<{ name: string; hex: string }>(
    PRODUCTS[0].colors[0]
  );
  const [activeTab, setActiveTab] = useState<RightTab>("upload");

  /* Product catalog picker */
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productPickerCategory, setProductPickerCategory] = useState<"all" | DesignProduct["category"]>("all");

  const [mobileToolOpen, setMobileToolOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"product" | "color" | "edit">("product");

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [activeFace, setActiveFace] = useState<Face>("front");
  const supports3D = useMemo(() => hasWebGL2(), []);

  const effectiveViewMode = isMobile ? "2d" : viewMode;

  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);

  // Mug-only: 2D editor exposes a 3-way print-mode selector
  // (Side 1 / Side 2 / Wrap) instead of the apparel "Front / Back" tabs.
  // Side 1 → existing front face data, Side 2 → existing back face data,
  // Wrap   → a virtual "back" face used as a continuous 360° body design.
  type MugMode = "side1" | "side2";
  const [mugMode, setMugMode] = useState<MugMode>("side1");

  const isMugProduct = selectedProduct.category === "mug";

  // Tee/longsleeve/hoodie support a back face. Mug also gets back face data
  // for Side 2 / Wrap, but the *apparel* Front/Back UI must stay hidden for it.
  const supportsBack = useMemo(
    () => ["tshirt", "longsleeve", "hoodie", "mug"].includes(selectedProduct.category),
    [selectedProduct.category]
  );

  // Sync mugMode → activeFace so the existing face-aware layer system works.
  // Mapping:
  //   side1 → "front"  (front print panel)
  //   side2 → "back"   (back print panel)
  //   wrap  → "back"   (uses the back face slot too, but the renderer treats
  //                     wrap differently: when mugMode === "wrap" the design
  //                     spans the full 360° body via UV-repeat in MugBody).
  // Distinguishing Side 2 vs Wrap is handled below via `isWrapMode` so the
  // 3D preview can switch between a localized panel and a continuous body wrap.
  useEffect(() => {
    if (!isMugProduct) return;
    setActiveFace(mugMode === "side1" ? "front" : "back");
  }, [mugMode, isMugProduct]);

  // isWrapMode is now auto-detected from layers (computed after layers state is declared).
  // Reset face to "front" when switching to a single-face product
  useEffect(() => { if (!supportsBack) setActiveFace("front"); }, [supportsBack]);

  /* Layers + history */
  const [layers, setLayers] = useState<Layer[]>([]);
  const layersRef = useRef<Layer[]>([]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const selectedLayerIdRef = useRef<string | null>(null);
  useEffect(() => { selectedLayerIdRef.current = selectedLayerId; }, [selectedLayerId]);
  const historyRef = useRef<{ stack: Layer[][]; index: number }>({ stack: [[]], index: 0 });
  const [, forceHistoryTick] = useState(0);

  const commitLayers = useCallback((next: Layer[]) => {
    const h = historyRef.current;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(next);
    if (h.stack.length > 50) h.stack.shift();
    h.index = h.stack.length - 1;
    setLayers(next);
    forceHistoryTick(t => t + 1);
  }, []);
  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.index > 0) { h.index -= 1; setLayers(h.stack[h.index]); forceHistoryTick(t => t + 1); }
  }, []);
  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.index < h.stack.length - 1) { h.index += 1; setLayers(h.stack[h.index]); forceHistoryTick(t => t + 1); }
  }, []);
  const canUndo = historyRef.current.index > 0;
  const canRedo = historyRef.current.index < historyRef.current.stack.length - 1;

  // Auto-detected full-wrap: true when both faces have design layers on a mug.
  const isWrapMode = useMemo(
    () => isMugProduct
      && layers.filter(l => (l.face ?? "front") === "front").length > 0
      && layers.filter(l => (l.face ?? "front") === "back").length > 0,
    [isMugProduct, layers]
  );

  // Crop state
  const [cropLayerId, setCropLayerId] = useState<string | null>(null);
  const [cropPct, setCropPct] = useState({ x: 0, y: 0, w: 100, h: 100 });

  /* Snap guides */
  const [snapGuides, setSnapGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });

  /* Canvas-level zoom/pan (mobile pinch-to-zoom) */
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const canvasZoomRef = useRef(1);
  const canvasPanRef = useRef({ x: 0, y: 0 });
  const isCanvasZoomed = canvasZoom !== 1 || canvasPan.x !== 0 || canvasPan.y !== 0;

  /* ── UI state ──────────────────────────────────────────────── */
  const [showPrintZone, setShowPrintZone] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeBgPhase, setRemoveBgPhase] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [removeBgServerConfigured, setRemoveBgServerConfigured] = useState<boolean | undefined>(undefined);

  /* ── Draft persistence (localStorage + cloud) ──────────────── */
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasDraft, setHasDraft] = useState(false);
  const [legacyDraftFound, setLegacyDraftFound] = useState<{ version: number } | null>(null);
  const draftRestoredRef = useRef(false);
  const urlInitRef = useRef(false);

  function getCustomerToken(): string | null {
    return localStorage.getItem("trynex_customer_token");
  }

  function getCustomerHeaders(): Record<string, string> {
    const token = getCustomerToken();
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" }
      : { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };
  }

  const isValidLayer = (l: any): l is Layer =>
    l && typeof l === "object"
    && typeof l.id === "string"
    && (l.type === "image" || l.type === "text")
    && l.transform && typeof l.transform.x === "number" && typeof l.transform.y === "number"
    && typeof l.transform.scale === "number" && typeof l.transform.rotation === "number"
    && typeof l.transform.opacity === "number"
    && (l.type === "text"
      ? typeof l.text === "string" && typeof l.fontSize === "number"
      : typeof l.src === "string" && typeof l.naturalW === "number" && typeof l.naturalH === "number");

  function applyDraftPayload(data: Partial<DraftPayload>, isEdit: boolean, source: "cloud" | "local") {
    const validLayers = Array.isArray(data?.layers) ? (data!.layers as any[]).filter(isValidLayer) as Layer[] : [];
    if (data && typeof data.version === "number" && data.version !== DRAFT_VERSION) {
      setLegacyDraftFound({ version: data.version });
      return false;
    }
    if (data && data.version === DRAFT_VERSION) {
      if (typeof data.productId === "string") {
        const resolvedId = LEGACY_ID_MAP[data.productId] ?? data.productId;
        const p = PRODUCTS.find(x => x.id === resolvedId);
        if (p) setSelectedProduct(p);
      }
      if (data.color && typeof (data.color as any).hex === "string" && typeof (data.color as any).name === "string") {
        setSelectedColor(data.color as { name: string; hex: string });
      }
      if (typeof data.size === "string") setSelectedSize(data.size);
      if (data.mugMode && ["side1", "side2"].includes(data.mugMode as string)) {
        setMugMode(data.mugMode as "side1" | "side2");
      }
      if (data.linkedStoreProductId && data.linkedStoreProductName && data.linkedStoreProductPrice) {
        setLinkedStoreProduct({
          id: data.linkedStoreProductId,
          name: data.linkedStoreProductName,
          price: data.linkedStoreProductPrice,
        });
      }
      if (validLayers.length > 0) {
        setLayers(validLayers);
        historyRef.current = { stack: [validLayers], index: 0 };
        forceHistoryTick(t => t + 1);
        setHasDraft(true);
        setSaveStatus("saved");
        if (isEdit) {
          toast({ title: "Design Restored", description: "Your design has been restored for editing." });
        } else if (source === "cloud") {
          toast({ title: "Draft restored", description: "Your saved design has been loaded from the cloud." });
        } else {
          toast({ title: "Draft restored", description: "We brought back your last design." });
        }
        return true;
      }
    }
    return false;
  }

  // Restore draft on mount (runs once) — checks cloud first for authenticated users
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isEdit = searchParams.get("edit") === "1";
    const token = getCustomerToken();

    async function restore() {
      // 1. Try cloud draft first (authenticated users only).
      //    Hard 3-second timeout prevents a slow/hung API from causing a white blank page.
      if (token) {
        try {
          const controller = new AbortController();
          const cloudTimeout = setTimeout(() => controller.abort(), 3000);
          try {
            const res = await fetch(getApiUrl("/api/drafts"), {
              headers: { Authorization: `Bearer ${token}` },
              signal: controller.signal,
            });
            clearTimeout(cloudTimeout);
            if (res.ok) {
              const json = await res.json();
              if (json.draft?.payload) {
                const applied = applyDraftPayload(json.draft.payload as Partial<DraftPayload>, isEdit, "cloud");
                if (applied) {
                  draftRestoredRef.current = true;
                  urlInitRef.current = true;
                  return;
                }
              }
            }
          } catch {
            clearTimeout(cloudTimeout);
            // Cloud unavailable or timed out — fall through to localStorage
          }
        } catch {
          // Outer safety net — fall through to localStorage
        }
      }

      // 2. Fall back to localStorage (always fast — no network)
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw) as Partial<DraftPayload>;
          applyDraftPayload(data, isEdit, "local");
        }
      } catch {
        // Corrupt JSON or storage access failure — ignore and start fresh.
      }
    }

    restore().finally(() => {
      // URL params override draft settings (URL is the source of truth when shared)
      try {
        const sp = new URLSearchParams(window.location.search);
        const urlProduct = sp.get("product");
        if (urlProduct) {
          const resolvedUrl = LEGACY_ID_MAP[urlProduct] ?? urlProduct;
          const found = PRODUCTS.find(p => p.id === resolvedUrl || p.category === resolvedUrl);
          if (found) {
            setSelectedProduct(found);
            setSelectedColor(found.colors[0]);
          }
        }
        const urlStoreProductId = sp.get("storeProductId");
        if (urlStoreProductId) {
          const numId = parseInt(urlStoreProductId, 10);
          if (!isNaN(numId)) pendingStoreProductIdRef.current = numId;
        }
        const urlTab = sp.get("tab");
        if (urlTab && ["upload", "text", "layers", "templates", "ai"].includes(urlTab)) {
          setActiveTab(urlTab as typeof activeTab);
        }
        if (sp.get("view") === "back") setActiveFace("back");
        const urlSize = sp.get("size");
        if (urlSize && ["XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(urlSize)) {
          setSelectedSize(urlSize);
        }
      } catch {
        // Ignore URL parsing errors
      }
      draftRestoredRef.current = true;
      urlInitRef.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply pending store product by fetching its details from the API
  useEffect(() => {
    if (!pendingStoreProductIdRef.current) return;
    const targetId = pendingStoreProductIdRef.current;
    pendingStoreProductIdRef.current = null;
    fetch(getApiUrl(`/api/products/${targetId}`))
      .then(r => r.ok ? r.json() : null)
      .then((found: any) => {
        if (!found) return;
        const category = detectCategoryFromProduct(found);
        const template = PRODUCTS.find(p => p.category === category) ?? PRODUCTS[0];
        const garmentColor = detectColorFromProduct(found);
        const price = parseFloat(String(found.discountPrice || found.price)) || 0;
        setSelectedProduct(template);
        const colorMatch = template.colors.find(c => c.hex.toLowerCase() === garmentColor.toLowerCase()) ?? { name: "White", hex: garmentColor };
        setSelectedColor(colorMatch);
        setLinkedStoreProduct({ id: found.id, name: found.name, price, imageUrl: found.imageUrl ?? undefined });
        toast({
          title: `Designing: ${found.name}`,
          description: "Upload your artwork or add text to customise this product.",
        });
      })
      .catch(() => {});
  }, [toast]);

  // Auto-save draft when layers / product / color / size change (debounced)
  // Authenticated users: saves to cloud + localStorage. Guests: localStorage only.
  useEffect(() => {
    if (!draftRestoredRef.current) return;

    if (layers.length === 0) {
      // Nothing meaningful to save. We DO NOT touch the persisted draft key
      // when there is an unresolved legacy draft awaiting the user's
      // decision — otherwise the saved work would be deleted silently
      // before the confirm dialog is answered.
      if (legacyDraftFound) {
        setSaveStatus("idle");
        return;
      }
      try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
      // Also clear cloud draft for authenticated users so next restore starts fresh.
      const token = getCustomerToken();
      if (token) {
        fetch(getApiUrl("/api/drafts"), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "X-Requested-With": "XMLHttpRequest" },
        }).catch(() => {});
      }
      setHasDraft(false);
      setSaveStatus("idle");
      return;
    }
    setSaveStatus("saving");
    const handle = window.setTimeout(async () => {
      const payload: DraftPayload = {
        version: DRAFT_VERSION,
        layers,
        productId: selectedProduct.id,
        color: selectedColor,
        size: selectedSize,
        mugMode,
        savedAt: Date.now(),
        ...(linkedStoreProduct ? {
          linkedStoreProductId: linkedStoreProduct.id,
          linkedStoreProductName: linkedStoreProduct.name,
          linkedStoreProductPrice: linkedStoreProduct.price,
        } : {}),
      };

      // Always save to localStorage as a fast local backup
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Quota exceeded — continue silently
      }

      // Additionally save to cloud for authenticated users
      const token = getCustomerToken();
      if (token) {
        try {
          const cloudRes = await fetch(getApiUrl("/api/drafts"), {
            method: "PUT",
            headers: getCustomerHeaders(),
            body: JSON.stringify({ payload }),
          });
          if (!cloudRes.ok) {
            // Log but don't surface to user — localStorage backup still available
            console.warn("[draft] cloud save returned", cloudRes.status);
          }
        } catch {
          // Network error — localStorage backup still available
        }
      }

      setHasDraft(true);
      setSaveStatus("saved");
    }, 500);
    return () => window.clearTimeout(handle);
  }, [layers, selectedProduct, selectedColor, selectedSize, legacyDraftFound, linkedStoreProduct]);

  // Sync shareable URL params whenever key state changes (after init)
  useEffect(() => {
    if (!urlInitRef.current) return;
    const params = new URLSearchParams();
    if (linkedStoreProduct) {
      params.set("storeProductId", String(linkedStoreProduct.id));
    } else if (selectedProduct.id !== PRODUCTS[0].id) {
      params.set("product", selectedProduct.id);
    }
    if (activeTab !== "upload") params.set("tab", activeTab);
    if (activeFace !== "front") params.set("view", activeFace);
    if (selectedSize !== "M") params.set("size", selectedSize);
    const q = params.toString();
    const newUrl = window.location.pathname + (q ? "?" + q : "");
    if (newUrl !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [selectedProduct.id, activeTab, activeFace, selectedSize, linkedStoreProduct]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
    // Delete cloud draft for authenticated users
    const token = getCustomerToken();
    if (token) {
      fetch(getApiUrl("/api/drafts"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "X-Requested-With": "XMLHttpRequest" },
      }).catch(() => {});
    }
    setLayers([]);
    setSelectedLayerId(null);
    historyRef.current = { stack: [[]], index: 0 };
    forceHistoryTick(t => t + 1);
    setHasDraft(false);
    setSaveStatus("idle");
    toast({ title: "Draft cleared", description: "Your saved design has been removed." });
  }, [toast]);

  /** Switch to one of the quick-tab products (T-Shirt / Mug / Bottle). */
  const handleQuickProductSwitch = useCallback((prod: DesignProduct) => {
    if (prod.id === selectedProduct.id) return;
    perProductLayersRef.current[selectedProduct.id] = {
      layers: layersRef.current,
      stack: historyRef.current.stack,
      index: historyRef.current.index,
    };
    const saved = perProductLayersRef.current[prod.id];
    const newLayers = saved?.layers ?? [];
    const newStack = saved?.stack ?? [[]];
    const newHistIdx = saved?.index ?? 0;
    historyRef.current = { stack: newStack, index: newHistIdx };
    const matchingColor = prod.colors.find(c => c.hex.toLowerCase() === selectedColor.hex.toLowerCase()) ?? prod.colors[0];
    flushSync(() => {
      setLayers(newLayers);
      setSelectedLayerId(null);
      setSelectedProduct(prod);
      setSelectedColor(matchingColor);
      setLinkedStoreProduct(null);
      setQuantity(1);
      setActiveFace("front");
      if (prod.category !== "mug") setMugMode("side1");
    });
    forceHistoryTick(t => t + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct.id]);

  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputAddRef = useRef<HTMLInputElement>(null);

  // Print zone is face/zone-aware.
  // Mug: MUG_PZ in wrap mode, MUG_SIDE_PZ for sides.
  // Apparel sleeve/neck zones: use getZonePZ which returns SLEEVE_PZ or NECK_LABEL_PZ.
  // Apparel front/back: product's own printZone.
  const pz = useMemo(() => {
    if (isMugProduct) return MUG_SIDE_PZ;
    return getZonePZ(activeFace, selectedProduct);
  }, [isMugProduct, activeFace, selectedProduct]);
  const pzRef = useRef(pz);
  useEffect(() => { pzRef.current = pz; }, [pz]);

  const activeFaceRef = useRef(activeFace);
  useEffect(() => { activeFaceRef.current = activeFace; }, [activeFace]);

  const isMugProductRef = useRef(isMugProduct);
  useEffect(() => { isMugProductRef.current = isMugProduct; }, [isMugProduct]);

  /* Per-product design isolation — layers/history are stored separately for
     each product so switching between T-Shirt and Hoodie doesn't mix them up. */
  const perProductLayersRef = useRef<Record<string, { layers: Layer[]; stack: Layer[][]; index: number }>>({});

  const isMug = selectedProduct.category === "mug";
  const isCap = selectedProduct.category === "cap";
  const isWaterBottle = selectedProduct.category === "waterbottle";

  /** Zones list for apparel (tshirt/longsleeve/hoodie) — 5 tabs. */
  const apparelZones = useMemo(
    () => getApparelZones(selectedProduct.category, selectedProduct.printZone, selectedProduct.printZoneBack ?? undefined),
    [selectedProduct.category, selectedProduct.printZone, selectedProduct.printZoneBack]
  );
  /** True when the product supports the multi-zone tab bar. */
  const isZoneTabs = useMemo(
    () => ["tshirt", "longsleeve", "hoodie"].includes(selectedProduct.category),
    [selectedProduct.category]
  );
  /** True when the active zone is a flat template (sleeve / neck-label). */
  const isFlatZone = activeFace === "left-sleeve" || activeFace === "right-sleeve" || activeFace === "neck-label";
  /** Config of the currently active apparel zone. */
  const activeZoneConfig = useMemo(
    () => apparelZones.find(z => z.face === activeFace) ?? apparelZones[0],
    [apparelZones, activeFace]
  );

  // All products now support 3D preview:
  //   tshirt      → real scanned GLB with design overlay
  //   mug         → generated GLB with cylindrical wrap texture
  //   waterbottle → procedural tumbler shape with wrap texture
  //   hoodie / longsleeve / cap → real product PHOTO as 3D billboard (photorealistic)
  // Only flat template zones (sleeve/neck) have no 3D equivalent.
  const effectiveSupports3D = supports3D && !isFlatZone && !isMobile;

  /* ── Cap dark-color mockup override ─────────────────
     Cap images are full-photo (no transparent cutout), so SVG
     tinting can't be applied. Swap frontSrc to the black photo
     directly when a dark colour is selected. */
  const displayProduct = useMemo(() => {
    if (selectedProduct.category === "cap") {
      const h = selectedColor.hex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16) || 0;
      const g = parseInt(h.slice(2, 4), 16) || 0;
      const b = parseInt(h.slice(4, 6), 16) || 0;
      if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55) {
        return { ...selectedProduct, frontSrc: "/mockups/black-cap-front.png" };
      }
    }
    return selectedProduct;
  }, [selectedProduct, selectedColor.hex]);

  /* ── Per-product price (used in UI + cart serialisation) ── */
  const studioPrice = useMemo(() => {
    // If a real store product is linked, use its price
    if (linkedStoreProduct?.price) return linkedStoreProduct.price;
    return isMug || isWaterBottle
      ? (settings.studioMugPrice || 799)
      : (settings.studioTshirtPrice || 1099);
  }, [linkedStoreProduct, isMug, isWaterBottle, settings.studioMugPrice, settings.studioTshirtPrice]);

  const selectedLayer = useMemo(
    () => layers.find(l => l.id === selectedLayerId) ?? null,
    [layers, selectedLayerId]
  );

  // Layers belonging to the current face (other-face layers stay in state, just hidden in this view).
  const currentFaceLayers = useMemo(
    () => layers.filter(l => (l.face ?? "front") === activeFace),
    [layers, activeFace]
  );
  const otherFaceCount = layers.length - currentFaceLayers.length;

  // Show print-zone outline ONLY when the canvas is empty (no layers on this face).
  // Once any design is added the zone indicator hides permanently, giving a clean preview.
  // The zone hint disappears even while a layer is selected so there's no visual clutter.
  const effectiveShowPrintZone = showPrintZone && currentFaceLayers.length === 0;

  // Print-safe warning: true when any layer on the current face extends outside the print zone.
  const anyLayerOutsidePZ = useMemo(() => {
    if (!pz || currentFaceLayers.length === 0) return false;
    return currentFaceLayers.some(l => {
      if (!l.visible) return false;
      const { x, y, scale, scaleX = 1, scaleY = 1 } = l.transform;
      let hw: number, hh: number;
      if (l.type === "image") {
        const imgL = l as ImageLayer;
        const aspect = imgL.naturalH / Math.max(imgL.naturalW, 1);
        hw = (pz.w * scale * scaleX) / 2;
        hh = (pz.w * scale * scaleY * aspect) / 2;
      } else {
        const txtL = l as TextLayer;
        hw = txtL.fontSize * scale * scaleX * 3;
        hh = txtL.fontSize * scale * scaleY * 1.5;
      }
      return (
        x - hw < pz.x ||
        x + hw > pz.x + pz.w ||
        y - hh < pz.y ||
        y + hh > pz.y + pz.h
      );
    });
  }, [currentFaceLayers, pz]);

  /* ── Coord helpers ─────────────────────────────────── */
  const clientToSVG = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM()?.inverse();
    if (!ctm) return { x: 0, y: 0 };
    const r = pt.matrixTransform(ctm);
    return { x: r.x, y: r.y };
  }, []);

  /* ── Layer mutation helpers ────────────────────────── */
  const updateLayer = useCallback((id: string, mut: (l: Layer) => Layer, commit: boolean) => {
    const next = layers.map(l => (l.id === id ? mut(l) : l));
    if (commit) commitLayers(next); else setLayers(next);
  }, [layers, commitLayers]);

  const addLayer = useCallback((layer: Layer) => {
    // Stamp the layer with the face the user is currently viewing.
    const stamped: Layer = { ...layer, face: layer.face ?? activeFace };
    const next = [...layers, stamped];
    commitLayers(next);
    setSelectedLayerId(stamped.id);
  }, [layers, commitLayers, activeFace]);

  const removeLayer = useCallback((id: string) => {
    const next = layers.filter(l => l.id !== id);
    commitLayers(next);
    if (selectedLayerId === id) setSelectedLayerId(next[next.length - 1]?.id ?? null);
  }, [layers, selectedLayerId, commitLayers]);

  const applyCrop = useCallback(() => {
    const layer = layers.find(l => l.id === cropLayerId);
    if (!layer || layer.type !== "image") return;
    const src = (layer as ImageLayer).src;
    const img = new Image();
    img.onload = () => {
      const sx = (cropPct.x / 100) * img.naturalWidth;
      const sy = (cropPct.y / 100) * img.naturalHeight;
      const sw = Math.max(1, (cropPct.w / 100) * img.naturalWidth);
      const sh = Math.max(1, (cropPct.h / 100) * img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const newSrc = canvas.toDataURL("image/png");
      updateLayer(cropLayerId!, l => l.type === "image"
        ? { ...l, src: newSrc, naturalW: canvas.width, naturalH: canvas.height }
        : l, true);
      setCropLayerId(null);
    };
    img.src = src;
  }, [cropLayerId, cropPct, layers, updateLayer]);

  const moveLayer = useCallback((id: string, dir: -1 | 1) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= layers.length) return;
    const next = layers.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    commitLayers(next);
  }, [layers, commitLayers]);

  const duplicateLayer = useCallback((id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    const newLayer = {
      ...layer,
      id: uid(),
      name: `${layer.name} (Copy)`,
      transform: { ...layer.transform, x: layer.transform.x + 20, y: layer.transform.y + 20 }
    };
    const next = [...layers, newLayer];
    commitLayers(next);
    setSelectedLayerId(newLayer.id);
  }, [layers, commitLayers]);

  /* ── File upload — bulletproof: handles same-file re-pick, decode failures,
        oversized images (>10MB), unreadable files, and races. ───────────── */
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 10MB. Please compress or resize the image first.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast({ title: "Couldn't read file", description: "The file may be corrupted. Try another image.", variant: "destructive" });
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      if (!src || typeof src !== "string") {
        toast({ title: "Upload failed", description: "Couldn't read the image. Please try again.", variant: "destructive" });
        return;
      }
      const img = new Image();
      const ok = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
      });
      try { await img.decode?.(); } catch {}
      if (!ok || !img.naturalWidth || !img.naturalHeight) {
        toast({ title: "Image unreadable", description: "Try a different file (JPG/PNG/WebP).", variant: "destructive" });
        return;
      }

      // Smart auto-placement: scale the image to fit within the print zone
      // respecting both width and height, with a comfortable 85% fill.
      const currentPz = pzRef.current;
      const aspect = img.naturalWidth / Math.max(img.naturalHeight, 1);
      // At scale=1 the image fills the print zone WIDTH. Clamp so it also
      // fits within the print zone HEIGHT (tall images get scaled down).
      const maxScaleForHeight = (currentPz.h * aspect) / currentPz.w;
      const initialScale = Math.min(0.85, maxScaleForHeight);

      const layer: ImageLayer = {
        id: uid(), name: file.name.replace(/\.[^.]+$/, "") || "Image",
        type: "image", src, naturalW: img.naturalWidth, naturalH: img.naturalHeight,
        visible: true, locked: false,
        transform: { x: 0, y: 0, scale: initialScale, rotation: 0, opacity: 1 },
        face: activeFaceRef.current,
      };

      // flushSync forces React to flush state updates synchronously so the
      // image appears immediately — critical on mobile where async callbacks
      // may otherwise defer rendering until the next user interaction.

      // For mug: also stamp the same image on the OTHER side (front→back or
      // back→front) so switching between Side 1 / Side 2 shows the design.
      const layersToAdd: Layer[] = [layer];
      if (isMugProductRef.current) {
        const otherMugFace: Face = activeFaceRef.current === "front" ? "back" : "front";
        layersToAdd.push({ ...layer, id: uid(), face: otherMugFace });
      }

      flushSync(() => {
        commitLayers([...layersRef.current, ...layersToAdd]);
        // Do NOT auto-select — placed image stays in "rest" state so print-zone
        // border auto-hides and the client sees a clean design immediately.
        // User deliberately taps the image on the canvas to enter edit mode.
        setActiveTab("layers");
      });

      // Propagate a scaled copy of this image to every OTHER product so
      // switching products shows the design pre-placed and centred in their
      // print zone. Same-category products get the same face/zone; others get front.
      const currentPZ = pzRef.current;
      const currentFace = activeFaceRef.current;
      PRODUCTS.forEach(prod => {
        if (prod.id === selectedProduct.id) return;
        const targetFace: Face = prod.category === selectedProduct.category ? currentFace : "front";
        const targetPZ = getZonePZ(targetFace, prod);
        const scaleRatio = Math.min(targetPZ.w / currentPZ.w, targetPZ.h / currentPZ.h);
        const propagated: ImageLayer = {
          ...layer,
          id: uid(),
          face: targetFace,
          transform: { x: 0, y: 0, scale: layer.transform.scale * scaleRatio, rotation: 0, opacity: 1 },
        };
        const existing = perProductLayersRef.current[prod.id] ?? { layers: [], stack: [[]], index: 0 };
        const newLayers = [...existing.layers, propagated];
        perProductLayersRef.current[prod.id] = {
          layers: newLayers,
          stack: [...existing.stack, newLayers],
          index: existing.stack.length,
        };
      });

      toast({ title: "✓ Design placed!", description: "Tap your design to move, resize or adjust it." });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  /* ── Background removal ────────────────────────────────────────────
   * Strategy (server-first, browser-fallback):
   *   1. POST to /api/remove-bg (uses remove.bg API key from admin settings).
   *      Fast, high quality.  Returns structured error codes.
   *   2. If server returns 503 "no_api_key" → fall back to in-browser ONNX
   *      model (@imgly/background-removal, ~30 MB, cached in IndexedDB).
   *      Free, runs locally, slower on first run.
   * Distinct toasts for: no key, quota, rate-limit, too large, success.
   ─────────────────────────────────────────────────────────────────── */
  const handleRemoveBg = async () => {
    if (!selectedLayer || selectedLayer.type !== "image") return;
    setIsRemoving(true);

    /* Helper — apply a new data-URL to the selected image layer and propagate to all products */
    const oldSrc = selectedLayer.src;
    const applyResult = async (dataUrl: string) => {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = dataUrl; });
      updateLayer(selectedLayer.id, l => l.type === "image"
        ? { ...l, src: dataUrl, naturalW: img.naturalWidth, naturalH: img.naturalHeight }
        : l, true);
      // Propagate updated image to all other products that had the same original src
      Object.keys(perProductLayersRef.current).forEach(prodId => {
        if (prodId === selectedProduct.id) return;
        const entry = perProductLayersRef.current[prodId];
        if (!entry) return;
        const updatedLayers = entry.layers.map(l =>
          l.type === "image" && l.src === oldSrc
            ? { ...l, src: dataUrl, naturalW: img.naturalWidth, naturalH: img.naturalHeight }
            : l
        );
        perProductLayersRef.current[prodId] = { ...entry, layers: updatedLayers };
      });
    };

    /* ── Step 1: Try server (remove.bg API) ── */
    try {
      setRemoveBgPhase("server");
      toast({ title: "Removing background…", description: "Processing via server…" });
      const r = await fetch(getApiUrl("/api/remove-bg"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: selectedLayer.src }),
      });
      const json = await r.json().catch(() => ({}));

      if (r.ok) {
        await applyResult(json.result);
        toast({ title: "✨ Background removed", description: "Clean cutout ready." });
        setIsRemoving(false);
        return;
      }

      /* Specific error codes — decide whether to fall through to browser or stop */
      if (json.error === "rate_limited") {
        toast({ title: "Too many requests", description: "You've reached the removal limit. Please wait an hour and try again.", variant: "destructive" });
        setIsRemoving(false);
        return;
      }
      if (json.error === "image_too_large") {
        toast({ title: "Image too large", description: "Please reduce the image below 10 MB. Try HD-Upscale after resizing.", variant: "destructive" });
        setIsRemoving(false);
        return;
      }
      if (json.error === "no_api_key") {
        toast({
          title: "Background removal isn't configured",
          description: "Admin needs to add a remove.bg API key in Settings → Design Studio. Trying in-browser AI as fallback…",
        });
        /* Fall through to browser fallback */
      } else if (json.error === "quota_exceeded") {
        toast({ title: "Remove.bg quota exceeded", description: "The monthly quota is exhausted. Switching to in-browser processing…" });
        /* Fall through to browser fallback */
      } else {
        /* Unexpected server error — still try browser as a courtesy */
        console.warn("[bg-removal] server error, trying browser fallback", r.status, json);
      }
      /* All handled or unexpected errors → fall through to browser below */
    } catch (networkErr) {
      /* Network-level failure (server unreachable) — try browser */
      console.warn("[bg-removal] server unreachable, trying browser", networkErr);
    }

    /* ── Step 2: In-browser ONNX fallback (@imgly/background-removal) ── */
    try {
      setRemoveBgPhase("model-download");
      toast({
        title: "Switching to in-browser AI…",
        description: "First run downloads a ~30 MB model — stays cached after.",
      });
      const { removeBackground } = await import("@imgly/background-removal");
      setRemoveBgPhase("processing");
      const blob = await removeBackground(selectedLayer.src, {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        output: { format: "image/png", quality: 0.9 },
      });
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await applyResult(dataUrl);
      toast({ title: "✨ Background removed", description: "Processed in-browser — transparent PNG ready." });
    } catch (browserErr) {
      console.error("[bg-removal] browser fallback failed", browserErr);
      const isNetworkErr = browserErr instanceof TypeError && browserErr.message.includes("fetch");
      toast({
        title: "Background removal unavailable",
        description: isNetworkErr
          ? "The AI model couldn't be downloaded. Ask your admin to add a remove.bg API key in Settings."
          : "Both server and in-browser removal failed. Try a different image.",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(false);
      setRemoveBgPhase(null);
    }
  };

  /* ── HD Upscale — 2× resolution with bicubic + unsharp-mask sharpening.
        Runs in-browser using canvas; no server cost. Helps low-res photos
        print sharper at large sizes. */
  const [isUpscaling, setIsUpscaling] = useState(false);

  /* ── AI Image Generation — free, no API key, multiple models ── */
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPhase, setAiPhase] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<{ url: string; prompt: string; model: string }[]>([]);
  const [aiModel, setAiModel] = useState("flux-realism");
  const [aiModelUsed, setAiModelUsed] = useState<string | null>(null);

  const AI_MODELS = [
    { id: "flux-realism", label: "Flux Realism", desc: "Photorealistic, ultra-detailed" },
    { id: "flux",         label: "Flux",         desc: "Balanced quality & speed" },
    { id: "flux-kontext", label: "Flux Kontext", desc: "Best for image editing (img2img)" },
    { id: "flux-3d",      label: "Flux 3D",      desc: "3D / product render style" },
    { id: "any-dark",     label: "Dark Art",      desc: "Dark dramatic illustrations" },
    { id: "turbo",        label: "Turbo ⚡",      desc: "Fastest — great for quick ideas" },
  ] as const;

  const AI_STYLE_CATEGORIES = [
    {
      label: "🇧🇩 Bangladeshi",
      prompts: [
        "Rickshaw art Bangladesh colorful folk pattern",
        "Bengali tiger streetwear bold graphic",
        "Dhaka city skyline geometric art",
        "Muslin fabric pattern traditional Bangladesh",
        "Sundarbans jungle wildlife illustration",
        "Bangladesh flag creative minimal design",
        "Pohela Boishakh new year celebration art",
        "Royal Bengal tiger portrait watercolor",
      ],
    },
    {
      label: "🏙️ Streetwear",
      prompts: [
        "Skull with roses streetwear gothic",
        "Graffiti wildstyle letter art",
        "Skateboard culture bold graphic tee",
        "Urban dragon tattoo flash style",
        "Vintage varsity letterman graphic",
        "Hip hop culture boom box retro",
        "Spray paint drip street art",
        "Y2K metallic cyber aesthetic logo",
      ],
    },
    {
      label: "🌿 Nature",
      prompts: [
        "Minimalist mountain ridge line art",
        "Lotus flower mandala watercolor",
        "Forest pine trees geometric low-poly",
        "Ocean wave Japanese woodblock style",
        "Tropical palm leaf botanical print",
        "Sun moon celestial boho design",
        "Wolf howling moon tattoo style",
        "Butterfly garden delicate illustration",
      ],
    },
    {
      label: "🎨 Abstract",
      prompts: [
        "Geometric mandala sacred symmetry",
        "Fluid paint pour abstract art",
        "Vaporwave retro grid sunset",
        "Glitch art digital corruption",
        "Abstract brush stroke expressionist",
        "Neon glow geometric pattern dark",
        "Psychedelic spiral trippy art",
        "Bauhaus color block minimal",
      ],
    },
    {
      label: "✨ Cute / Pop",
      prompts: [
        "Kawaii cat ramen bowl cute",
        "Cartoon astronaut space adventure",
        "Retro 80s cartoon robot pixel",
        "Anime girl cherry blossom",
        "Chibi bear with coffee mug",
        "Cute monster happy colorful",
        "Pop art comic book hero halftone",
        "Pastel rainbow cloud dreamy",
      ],
    },
    {
      label: "🖤 Dark Art",
      prompts: [
        "Gothic skull floral dark Victorian",
        "Dragon dark fantasy epic illustration",
        "Dark angel fallen wings dramatic",
        "Skeleton band rock music vintage",
        "Occult mystical eye geometric",
        "Black metal band logo style",
        "Horror vintage movie poster",
        "Dark forest creature lurking",
      ],
    },
  ] as const;

  const [aiStyleTab, setAiStyleTab] = useState(0);
  const [aiNegativePrompt, setAiNegativePrompt] = useState("");

  /* Reference image for img2img editing */
  const [aiRefFile, setAiRefFile] = useState<File | null>(null);
  const [aiRefPreviewUrl, setAiRefPreviewUrl] = useState<string | null>(null);
  const aiRefInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aiRefFile) { setAiRefPreviewUrl(null); return; }
    const url = URL.createObjectURL(aiRefFile);
    setAiRefPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [aiRefFile]);

  const handleGenerateAI = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;
    setAiGenerating(true);
    setAiError(null);
    setAiModelUsed(null);
    setAiPhase("Preparing your prompt…");
    setAiProgress(5);
    try {
      const seed = Math.floor(Math.random() * 999999);
      let dataUrl: string;
      let usedModel = aiModel;

      if (aiRefFile) {
        // img2img — upload reference image, then generate via server proxy
        setAiPhase("Reading reference image…");
        setAiProgress(15);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(aiRefFile);
        });
        setAiPhase("Uploading reference to TryNex AI…");
        setAiProgress(30);
        const uploadRes = await fetch(getApiUrl("/api/ai/reference"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error || "Reference upload failed");
        }
        const { url: refUrl } = await uploadRes.json() as { url: string };

        setAiPhase("Sending to AI image engine…");
        setAiProgress(45);
        const editModel = aiModel === "flux-realism" ? "flux-kontext" : aiModel;
        const params = new URLSearchParams({ prompt, seed: String(seed), model: editModel, imageUrl: refUrl, width: "1024", height: "1024" });
        // Animate progress while waiting
        const progressInterval = setInterval(() => {
          setAiProgress(prev => prev < 85 ? prev + 2 : prev);
          setAiPhase(p => p?.includes("engine") ? "Editing with AI (this can take 15-30s)…" : p);
        }, 1200);
        const genRes = await fetch(getApiUrl(`/api/ai/generate?${params.toString()}`));
        clearInterval(progressInterval);
        if (!genRes.ok) {
          const err = await genRes.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error || `Generation failed (${genRes.status})`);
        }
        setAiPhase("Finalizing image…");
        setAiProgress(90);
        const result = await genRes.json() as { dataUrl: string; model?: string };
        dataUrl = result.dataUrl;
        usedModel = result.model ?? editModel;
      } else {
        // text-to-image — parallel generation: fire primary model + turbo simultaneously
        // Whichever finishes first wins (turbo typically 3-8s, primary 15-30s)
        setAiPhase("Enhancing your prompt for print design…");
        setAiProgress(15);
        const isRealism = aiModel === "flux-realism";
        const suffix = isRealism
          ? ", product design artwork, high detail, clean composition"
          : ", t-shirt print design, white background, high contrast, vector style, clean edges";
        const negSuffix = aiNegativePrompt.trim() ? `, avoid: ${aiNegativePrompt.trim()}` : "";
        const fullPrompt = prompt + suffix + negSuffix;

        setAiPhase("Launching parallel AI engines…");
        setAiProgress(28);

        const primaryCtrl = new AbortController();
        const turboCtrl = new AbortController();
        const primaryParams = new URLSearchParams({ prompt: fullPrompt, seed: String(seed), model: aiModel, width: "1024", height: "1024" });
        const turboParams = new URLSearchParams({ prompt: fullPrompt, seed: String(seed), model: "turbo", width: "1024", height: "1024" });

        // Animate progress while both models race
        const progressInterval = setInterval(() => {
          setAiProgress(prev => prev < 85 ? prev + 1.2 : prev);
        }, 800);

        const fetchModel = async (url: string, ctrl: AbortController, label: string) => {
          setAiPhase(`Racing: ${label} vs Turbo ⚡…`);
          const r = await fetch(getApiUrl(url), { signal: ctrl.signal });
          if (!r.ok) {
            const err = await r.json().catch(() => ({})) as { error?: string };
            throw new Error(err.error || `${label} returned ${r.status}`);
          }
          const data = await r.json() as { dataUrl: string; model?: string };
          if (!data.dataUrl) throw new Error(`${label} returned no image`);
          return data;
        };

        // Browser-side direct Pollinations fallback — used when server proxy is rate-limited
        const tryDirectPollinations = async (directCtrl: AbortController) => {
          const chain = aiModel === "turbo" ? ["turbo"] : [aiModel, "turbo", "flux"];
          for (const m of chain) {
            try {
              const u = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true&model=${m}`;
              setAiPhase(`Direct AI (${AI_MODELS.find(x => x.id === m)?.label ?? m})…`);
              const r = await fetch(u, { signal: directCtrl.signal });
              if (!r.ok) continue;
              const ct = r.headers.get("content-type") || "";
              if (!ct.startsWith("image/")) continue;
              const blob = await r.blob();
              if (blob.size < 1024) continue;
              const du = await new Promise<string>((res2, rej2) => { const rd = new FileReader(); rd.onload = () => res2(rd.result as string); rd.onerror = rej2; rd.readAsDataURL(blob); });
              return { dataUrl: du, model: m };
            } catch { continue; }
          }
          throw new Error("All AI engines busy — please try again in a moment.");
        };

        // If selected model is already turbo, just run one request
        let genResult: { dataUrl: string; model?: string };
        if (aiModel === "turbo") {
          try {
            genResult = await fetchModel(`/api/ai/generate?${primaryParams}`, primaryCtrl, "Turbo");
          } catch {
            clearInterval(progressInterval);
            setAiPhase("Server busy — trying direct AI…"); setAiProgress(40);
            genResult = await tryDirectPollinations(new AbortController());
          }
        } else {
          // Fire both simultaneously — cancel the loser when winner responds
          try {
            genResult = await Promise.any([
              fetchModel(`/api/ai/generate?${primaryParams}`, primaryCtrl, AI_MODELS.find(m => m.id === aiModel)?.label ?? "Primary").then(r => { turboCtrl.abort(); return r; }),
              fetchModel(`/api/ai/generate?${turboParams}`, turboCtrl, "Turbo").then(r => { primaryCtrl.abort(); return r; }),
            ]);
          } catch {
            clearInterval(progressInterval);
            setAiPhase("Server busy — trying direct AI…"); setAiProgress(40);
            try {
              genResult = await tryDirectPollinations(new AbortController());
            } catch {
              throw new Error("All AI models failed — please try again in a moment.");
            }
          }
        }

        clearInterval(progressInterval);
        setAiPhase("Finalizing your design…");
        setAiProgress(90);
        dataUrl = genResult.dataUrl;
        usedModel = genResult.model ?? aiModel;
      }

      // Load data URL to get natural dimensions for the layer
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = dataUrl; });

      const layer: ImageLayer = {
        id: uid(), name: prompt.slice(0, 30),
        type: "image", src: dataUrl,
        naturalW: img.naturalWidth || 1024, naturalH: img.naturalHeight || 1024,
        visible: true, locked: false,
        transform: { x: 0, y: 0, scale: 0.85, rotation: 0, opacity: 1 },
        face: activeFaceRef.current,
      };

      setAiPhase("Placing on canvas…");
      setAiProgress(97);
      setAiProgress(100);
      flushSync(() => {
        commitLayers([...layersRef.current, layer]);
        setActiveTab("layers");
      });
      setAiModelUsed(usedModel);
      setAiHistory(h => [{ url: dataUrl, prompt, model: usedModel }, ...h].slice(0, 12));
      toast({ title: "✨ AI design placed!", description: "Tap it on the canvas to adjust or resize." });
    } catch (err) {
      console.error("[ai-gen]", err);
      const msg = err instanceof Error ? err.message : String(err);
      setAiError(msg.includes("timed out") ? msg : "Generation failed — try a different model or simpler prompt.");
    } finally {
      setAiGenerating(false);
      setAiPhase(null);
      setAiProgress(0);
    }
  };

  const handleUpscale = async () => {
    if (!selectedLayer || selectedLayer.type !== "image") return;
    setIsUpscaling(true);
    try {
      const img = new Image();
      // data: URLs are same-origin — setting crossOrigin="anonymous" on them
      // causes some browsers to reject the load. Only set it for external URLs.
      if (!selectedLayer.src.startsWith("data:")) img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = selectedLayer.src; });
      try { await img.decode?.(); } catch {}

      // Cap output at 4096 to stay browser-safe
      const maxOut = 4096;
      const scale = Math.min(2, maxOut / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      // Two-pass bicubic-ish upscale via intermediate canvas (browser implementation
      // varies, but enabling imageSmoothingQuality:"high" gives bicubic on most engines)
      const c1 = document.createElement("canvas");
      c1.width = w; c1.height = h;
      const ctx1 = c1.getContext("2d")!;
      ctx1.imageSmoothingEnabled = true;
      ctx1.imageSmoothingQuality = "high";
      ctx1.drawImage(img, 0, 0, w, h);

      // Unsharp mask: blur copy, subtract from original to find edges, add back to sharpen
      const c2 = document.createElement("canvas");
      c2.width = w; c2.height = h;
      const ctx2 = c2.getContext("2d")!;
      (ctx2 as any).filter = "blur(1.2px)";
      ctx2.drawImage(c1, 0, 0);
      (ctx2 as any).filter = "none";

      const orig = ctx1.getImageData(0, 0, w, h);
      const blur = ctx2.getImageData(0, 0, w, h);
      const amount = 0.6; // sharpening strength
      for (let i = 0; i < orig.data.length; i += 4) {
        for (let k = 0; k < 3; k++) {
          const o = orig.data[i + k], b = blur.data[i + k];
          const v = o + amount * (o - b);
          orig.data[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
      }
      ctx1.putImageData(orig, 0, 0);
      const dataUrl = c1.toDataURL("image/png");
      const newImg = new Image();
      await new Promise<void>((res, rej) => { newImg.onload = () => res(); newImg.onerror = rej; newImg.src = dataUrl; });
      updateLayer(selectedLayer.id, l => l.type === "image"
        ? { ...l, src: dataUrl, naturalW: newImg.naturalWidth, naturalH: newImg.naturalHeight }
        : l, true);
      toast({ title: "✨ Upscaled to HD", description: `Now ${w}×${h}px — sharper for large prints.` });
    } catch (err) {
      console.error("[upscale]", err);
      toast({ title: "Upscale failed", description: "Try a smaller image or different format.", variant: "destructive" });
    } finally {
      setIsUpscaling(false);
    }
  };

  /* ── Multi-pointer interaction (drag + pinch + rotate) ──
   *
   * Built on @use-gesture/react. The library handles the cross-browser
   * mess (pointer capture, touch-cancel, stylus/finger combos, lifted
   * fingers mid-pinch, fast double-taps, mouse wheel as pinch on
   * desktop) so we only have to express the intent: "drag moves the
   * layer; pinch scales+rotates+pans it."
   *
   * The one piece of bespoke logic kept is the per-pointer-down hit
   * test on `event.target` — that's how we know which layer the user
   * grabbed. Without it, dragging the white background would grab
   * whatever layer was selected last, which feels broken.
   */
  const gestureRef = useRef<
    | { mode: "drag"; layerId: string; startSvg: { x: number; y: number }; startT: Transform }
    | { mode: "pinch"; layerId: string; startMid: { x: number; y: number }; startT: Transform }
    | { mode: "canvas-pinch"; startZoom: number; startPan: { x: number; y: number }; startOrigin: { x: number; y: number } }
    | null
  >(null);

  const SNAP_THRESHOLD = 6; // svg units

  const bindCanvasGestures = useGesture(
    {
      onDragStart: ({ event, xy: [cx, cy] }) => {
        const target = event.target as Element;
        const layerId = target.getAttribute?.("data-layer-id");
        if (layerId) {
          const layer = layersRef.current.find(l => l.id === layerId);
          if (!layer || layer.locked) { gestureRef.current = null; return; }
          setSelectedLayerId(layerId);
          selectedLayerIdRef.current = layerId;
          gestureRef.current = {
            mode: "drag",
            layerId,
            startSvg: clientToSVG(cx, cy),
            startT: { ...layer.transform },
          };
        } else {
          // Tapped empty canvas → deselect
          setSelectedLayerId(null);
          selectedLayerIdRef.current = null;
          gestureRef.current = null;
        }
      },
      onDrag: ({ xy: [cx, cy], pinching, cancel }) => {
        if (pinching) { cancel(); return; }
        const g = gestureRef.current;
        if (!g || g.mode !== "drag") return;
        const cur = clientToSVG(cx, cy);
        let nx = g.startT.x + (cur.x - g.startSvg.x);
        let ny = g.startT.y + (cur.y - g.startSvg.y);
        const showV = Math.abs(nx) < SNAP_THRESHOLD;
        const showH = Math.abs(ny) < SNAP_THRESHOLD;
        if (showV) nx = 0;
        if (showH) ny = 0;
        setSnapGuides({ v: showV, h: showH });
        setLayers(prev => prev.map(l => l.id === g.layerId ? { ...l, transform: { ...l.transform, x: nx, y: ny } } : l));
      },
      onDragEnd: () => {
        if (gestureRef.current?.mode === "drag") {
          commitLayers(layersRef.current);
        }
        if (gestureRef.current?.mode === "drag") gestureRef.current = null;
        setSnapGuides({ v: false, h: false });
      },
      onPinchStart: ({ event, origin: [ox, oy] }) => {
        const target = event.target as Element;
        // Only check the actual hit element — never fall back to the selected layer.
        // This ensures pinching on empty canvas always zooms the canvas, even when
        // a layer is selected.
        const hitId = target.getAttribute?.("data-layer-id") ?? null;
        if (!hitId) {
          // Pinch started on empty canvas → canvas-level zoom/pan
          gestureRef.current = {
            mode: "canvas-pinch",
            startZoom: canvasZoomRef.current,
            startPan: { ...canvasPanRef.current },
            startOrigin: { x: ox, y: oy },
          };
          return;
        }
        // Pinch started on a specific layer → layer scale/rotate/pan
        const layer = layersRef.current.find(l => l.id === hitId);
        if (!layer || layer.locked) return;
        if (selectedLayerIdRef.current !== hitId) {
          setSelectedLayerId(hitId);
          selectedLayerIdRef.current = hitId;
        }
        gestureRef.current = {
          mode: "pinch",
          layerId: hitId,
          startMid: clientToSVG(ox, oy),
          startT: { ...layer.transform },
        };
      },
      onPinch: ({ origin: [ox, oy], offset: [scaleOffset, angleOffset] }) => {
        const g = gestureRef.current;
        if (!g) return;
        if (g.mode === "canvas-pinch") {
          const newZoom = Math.max(1, Math.min(4, g.startZoom * scaleOffset));
          // Track origin movement for pan — movement is in screen pixels
          const dx = ox - g.startOrigin.x;
          const dy = oy - g.startOrigin.y;
          const rawPanX = g.startPan.x + dx;
          const rawPanY = g.startPan.y + dy;
          // Clamp pan based on rendered canvas size so canvas stays in view.
          // Allow panning by at most half the canvas dimension times the extra zoom.
          const rect = svgRef.current?.getBoundingClientRect();
          const halfW = rect ? rect.width / 2 : 160;
          const halfH = rect ? rect.height / 2 : 160;
          const maxPanX = halfW * (newZoom - 1);
          const maxPanY = halfH * (newZoom - 1);
          const newPanX = Math.max(-maxPanX, Math.min(maxPanX, rawPanX));
          const newPanY = Math.max(-maxPanY, Math.min(maxPanY, rawPanY));
          canvasZoomRef.current = newZoom;
          canvasPanRef.current = { x: newPanX, y: newPanY };
          setCanvasZoom(newZoom);
          setCanvasPan({ x: newPanX, y: newPanY });
          return;
        }
        if (g.mode !== "pinch") return;
        const mid = clientToSVG(ox, oy);
        const scale = Math.max(0.1, Math.min(5, g.startT.scale * scaleOffset));
        const rotation = g.startT.rotation + angleOffset;
        const x = g.startT.x + (mid.x - g.startMid.x);
        const y = g.startT.y + (mid.y - g.startMid.y);
        setLayers(prev => prev.map(l => l.id === g.layerId ? { ...l, transform: { ...l.transform, scale, rotation, x, y } } : l));
      },
      onPinchEnd: () => {
        if (gestureRef.current?.mode === "canvas-pinch") {
          // If zoom snapped back to 1, also reset pan
          if (canvasZoomRef.current <= 1) {
            canvasZoomRef.current = 1;
            canvasPanRef.current = { x: 0, y: 0 };
            setCanvasZoom(1);
            setCanvasPan({ x: 0, y: 0 });
          }
          gestureRef.current = null;
          return;
        }
        if (gestureRef.current?.mode === "pinch") {
          commitLayers(layersRef.current);
          gestureRef.current = null;
        }
      },
    },
    {
      drag: { filterTaps: true, pointer: { touch: true }, threshold: 1 },
      // offset is multiplicative for scale (starts at 1) and additive degrees for angle (starts at 0)
      pinch: { scaleBounds: { min: 0.1, max: 5 }, rubberband: true, from: () => [1, 0] },
      eventOptions: { passive: false },
    }
  );

  /* ── Immediate pointer-down layer selection ─────────────────
   * Fires before the gesture library's drag-threshold window so the
   * bounding box + handles appear the instant the user touches/clicks
   * a layer — no drag required.  We do NOT call stopPropagation() so
   * the gesture library still receives the event for drag/pinch.
   *
   * Deselection (tap on empty canvas) is handled by handleCanvasClick
   * below (after pointer-up) to avoid false deselects during gestures.
   */
  const handleSvgPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    // Handle elements (resize/delete circles) have no data-layer-id — skip.
    const layerId =
      target.getAttribute?.("data-layer-id") ??
      target.closest?.("[data-layer-id]")?.getAttribute("data-layer-id");
    if (!layerId) return;
    const layer = layersRef.current.find(l => l.id === layerId);
    if (!layer || layer.locked) return;
    setSelectedLayerId(layerId);
    selectedLayerIdRef.current = layerId;
  }, []);

  /* ── Click/tap on empty canvas deselects ────────────────────
   * filterTaps:true on the gesture means onDragStart only fires on
   * real drags. This onClick handles deselection for pure taps on
   * the canvas background.  Layer selection is already handled above
   * on pointer-down (instant feedback), so we only need to deselect
   * here when the user taps empty space.
   */
  const handleCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as Element;
    const layerId =
      target.getAttribute?.("data-layer-id") ??
      target.closest?.("[data-layer-id]")?.getAttribute("data-layer-id");
    if (!layerId) {
      // Tapped empty canvas — deselect
      setSelectedLayerId(null);
      selectedLayerIdRef.current = null;
    }
    // Layer selection was already done on pointer-down — no need to repeat.
  }, []);

  /* ── Keyboard shortcuts: undo/redo, delete ─────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (meta && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedLayerId
        && document.activeElement?.tagName !== "INPUT"
        && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault(); removeLayer(selectedLayerId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selectedLayerId, removeLayer]);

  /* ── Reset canvas zoom/pan when product, face, or view-mode changes ── */
  useEffect(() => {
    canvasZoomRef.current = 1;
    canvasPanRef.current = { x: 0, y: 0 };
    setCanvasZoom(1);
    setCanvasPan({ x: 0, y: 0 });
  }, [selectedProduct.id, activeFace, viewMode]);

  /* ── Compute layer SVG geometry ────────────────────── */
  const layerGeom = (l: Layer) => {
    const cx = pz.x + pz.w / 2 + l.transform.x;
    const cy = pz.y + pz.h / 2 + l.transform.y;
    if (l.type === "image") {
      const aspect = l.naturalW / Math.max(l.naturalH, 1);
      const baseW = pz.w * l.transform.scale;
      const w = baseW * (l.transform.scaleX ?? 1);
      const h = (baseW / aspect) * (l.transform.scaleY ?? 1);
      return { cx, cy, w, h, x: cx - w / 2, y: cy - h / 2 };
    }
    // text — approximate bounding box from font metrics
    const w = (l.text.length * l.fontSize * 0.55) * l.transform.scale * (l.transform.scaleX ?? 1);
    const h = l.fontSize * 1.2 * l.transform.scale * (l.transform.scaleY ?? 1);
    return { cx, cy, w, h, x: cx - w / 2, y: cy - h / 2 };
  };

  /* ── Export design as PNG ──────────────────────────── */
  const handleExportPNG = useCallback(async () => {
    if (layers.length === 0) {
      toast({ title: "Nothing to export", description: "Add at least one layer first.", variant: "destructive" });
      return;
    }
    const activeLayers = layers.filter(l => (l.face ?? "front") === activeFace) as unknown as ComposerLayer[];
    if (activeLayers.length === 0) {
      toast({ title: "No layers on this face", description: "Switch to the face with your design.", variant: "destructive" });
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      const garmentBase = BASE_BY_CATEGORY[selectedProduct.category];
      const garmentSrc = garmentBase?.front ?? selectedProduct.frontSrc;
      await composeGarmentMockup({
        canvas,
        garmentSrc,
        garmentColor: selectedColor.hex,
        printZone: isMugProduct ? MUG_SIDE_PZ : selectedProduct.printZone,
        layers: activeLayers,
        outSize: 1200,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `trynex-${selectedProduct.id}-${activeFace}-design.png`;
      a.click();
      toast({ title: "PNG exported!", description: "High-res PNG saved to your downloads." });
    } catch {
      toast({ title: "Export failed", description: "Could not generate image. Please try again.", variant: "destructive" });
    }
  }, [layers, selectedProduct, selectedColor, activeFace, isMugProduct, toast]);

  /* ── Export design as JPG ──────────────────────────── */
  const handleExportJPG = useCallback(async () => {
    if (layers.length === 0) {
      toast({ title: "Nothing to export", description: "Add at least one layer first.", variant: "destructive" });
      return;
    }
    const activeLayers = layers.filter(l => (l.face ?? "front") === activeFace) as unknown as ComposerLayer[];
    if (activeLayers.length === 0) {
      toast({ title: "No layers on this face", description: "Switch to the face with your design.", variant: "destructive" });
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      const garmentBase = BASE_BY_CATEGORY[selectedProduct.category];
      const garmentSrc = garmentBase?.front ?? selectedProduct.frontSrc;
      await composeGarmentMockup({
        canvas,
        garmentSrc,
        garmentColor: selectedColor.hex,
        printZone: isMugProduct ? MUG_SIDE_PZ : selectedProduct.printZone,
        layers: activeLayers,
        outSize: 1200,
      });
      const url = canvas.toDataURL("image/jpeg", 0.93);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trynex-${selectedProduct.id}-${activeFace}-design.jpg`;
      a.click();
      toast({ title: "JPG exported!", description: "Compressed JPG saved to your downloads." });
    } catch {
      toast({ title: "Export failed", description: "Could not generate image. Please try again.", variant: "destructive" });
    }
  }, [layers, selectedProduct, selectedColor, activeFace, isMugProduct, toast]);

  /* ── Add to cart ───────────────────────────────────── */
  const handleAddToCart = useCallback(async () => {
    if (layers.length === 0) {
      toast({ title: "No design", description: "Add an image or text layer first.", variant: "destructive" });
      return;
    }
    setIsAddingToCart(true);
    try {
      const frontPZ         = isMugProduct ? MUG_SIDE_PZ : selectedProduct.printZone;
      const backPZ          = isMugProduct ? MUG_SIDE_PZ : (selectedProduct.printZoneBack ?? selectedProduct.printZone);
      const frontLayers     = layers.filter(l => (l.face ?? "front") === "front")        as unknown as ComposerLayer[];
      const backLayers      = layers.filter(l => (l.face ?? "front") === "back")         as unknown as ComposerLayer[];
      const leftSleeveLayers = layers.filter(l => l.face === "left-sleeve")              as unknown as ComposerLayer[];
      const rightSleeveLayers = layers.filter(l => l.face === "right-sleeve")            as unknown as ComposerLayer[];
      const neckLabelLayers  = layers.filter(l => l.face === "neck-label")               as unknown as ComposerLayer[];
      const imageCache  = new Map<string, HTMLImageElement>();

      // 0. Upload ORIGINAL full-resolution image layers to object storage
      //    so the admin can download print-ready files later. We do this
      //    BEFORE compositing so the admin gets the customer's actual
      //    uploaded photos at full resolution, not the downscaled mockup.
      //    Failures here are non-fatal: cart still works without uploads.
      const originalAssets: OriginalAsset[] = [];
      const originalAssetUrls: string[] = [];
      const imageLayers = layers.filter(l => l.type === "image" && l.visible);
      for (const layer of imageLayers) {
        try {
          const imgLayer = layer as ImageLayer;
          const src = imgLayer.src;
          if (!src.startsWith("data:")) continue; // skip already-uploaded
          const blob = await (await fetch(src)).blob();
          const mime = blob.type || "image/png";
          const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
          // Sanitize layer name for use as a filename
          const safeName = (imgLayer.name || "design").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
          const filename = `${safeName}-${Date.now()}.${ext}`;
          const reqRes = await fetch(getApiUrl("/api/storage/uploads/request-url"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: filename,
              size: blob.size,
              contentType: mime,
            }),
          });
          if (!reqRes.ok) continue;
          const { uploadURL, objectPath } = await reqRes.json();
          const putRes = await fetch(uploadURL, {
            method: "PUT",
            headers: { "Content-Type": mime },
            body: blob,
          });
          if (putRes.ok && objectPath) {
            const asset: OriginalAsset = {
              objectPath,
              filename,
              mime,
              bytes: blob.size,
              width: imgLayer.naturalW,
              height: imgLayer.naturalH,
            };
            originalAssets.push(asset);
            originalAssetUrls.push(objectPath);
          }
        } catch (uploadErr) {
          console.warn("[upload-original]", uploadErr);
          /* swallow — cart should still work even if cloud upload is down */
        }
      }

      // 1. Full garment + design composite → cart thumbnail (imageUrl)
      //    Uses the white-cutout PNG (or cap dark PNG override) so tinting
      //    matches the 2D editor exactly.
      const garmentBase = BASE_BY_CATEGORY[selectedProduct.category];
      const garmentSrc  = garmentBase?.front ?? displayProduct.frontSrc;
      const mockupCanvas = document.createElement("canvas");
      await composeGarmentMockup({
        canvas: mockupCanvas,
        garmentSrc,
        garmentColor: selectedColor.hex,
        printZone: frontPZ,
        layers: frontLayers,
        outSize: 400,
        imageCache,
      });
      const mockupUrl = mockupCanvas.toDataURL("image/webp", 0.8);

      // 2. Design-only UV texture (transparent bg) — used by CartViewer3D.
      //    Mug uses wide 2048×768 to match the studio live preview (full 360° wrap band).
      //    Garments use square 1024×1024 for front/back panel UVs.
      const frontTexCanvas = document.createElement("canvas");
      if (isMug) {
        await composeLayers({
          canvas: frontTexCanvas,
          baseHeight: selectedProduct.baseHeight,
          printZone: frontPZ,
          layers: frontLayers,
          garmentColor: null,
          outW: 2048,
          outH: 768,
          imageCache,
          clipToPrintZone: true,
          blendMode: "multiply",
        });
      } else {
        await composeDesignTexture({
          canvas: frontTexCanvas,
          printZone: frontPZ,
          layers: frontLayers,
          outSize: 1024,
          imageCache,
        });
      }
      const frontTexUrl = frontTexCanvas.toDataURL("image/webp", 0.85);

      // 3. Back-face design texture (garments only — mug has no back face)
      let backTexUrl: string | undefined;
      if (!isMug && backLayers.length > 0) {
        const backTexCanvas = document.createElement("canvas");
        await composeDesignTexture({
          canvas: backTexCanvas,
          printZone: backPZ,
          layers: backLayers,
          outSize: 1024,
          imageCache,
        });
        backTexUrl = backTexCanvas.toDataURL("image/webp", 0.85);
      }

      // 4. Sleeve & neck-label design textures (apparel with flat zones)
      let leftSleeveTexUrl: string | undefined;
      let rightSleeveTexUrl: string | undefined;
      let neckLabelTexUrl: string | undefined;
      if (isZoneTabs) {
        const { SLEEVE_PZ, NECK_LABEL_PZ } = await import("./design-studio/mockups");
        if (leftSleeveLayers.length > 0) {
          const c = document.createElement("canvas");
          await composeDesignTexture({ canvas: c, printZone: SLEEVE_PZ, layers: leftSleeveLayers, outSize: 1024, imageCache });
          leftSleeveTexUrl = c.toDataURL("image/webp", 0.85);
        }
        if (rightSleeveLayers.length > 0) {
          const c = document.createElement("canvas");
          await composeDesignTexture({ canvas: c, printZone: SLEEVE_PZ, layers: rightSleeveLayers, outSize: 1024, imageCache });
          rightSleeveTexUrl = c.toDataURL("image/webp", 0.85);
        }
        if (neckLabelLayers.length > 0) {
          const c = document.createElement("canvas");
          await composeDesignTexture({ canvas: c, printZone: NECK_LABEL_PZ, layers: neckLabelLayers, outSize: 1024, imageCache });
          neckLabelTexUrl = c.toDataURL("image/webp", 0.85);
        }
      }

      const displayPrice = studioPrice;

      // Save full session for cart re-edit — MUST match the studio's
      // DraftPayload format exactly (version, color (not selectedColor),
      // size (not selectedSize)) so the restore effect accepts it.
      const sessionId = Date.now().toString(36);
      try {
        localStorage.setItem(`studio_session_${sessionId}`, JSON.stringify({
          version: DRAFT_VERSION,
          layers,
          productId: selectedProduct.id,
          color: selectedColor,
          size: selectedSize,
          savedAt: Date.now(),
          ...(linkedStoreProduct ? {
            linkedStoreProductId: linkedStoreProduct.id,
            linkedStoreProductName: linkedStoreProduct.name,
            linkedStoreProductPrice: linkedStoreProduct.price,
          } : {}),
        }));
      } catch { /* quota exceeded — re-edit won't be available but cart works fine */ }

      addToCart({
        productId: linkedStoreProduct?.id ?? 0,
        name: linkedStoreProduct?.name ?? `Custom ${selectedProduct.name}`,
        price: displayPrice,
        quantity,
        size: isMug || isCap || isWaterBottle ? undefined : selectedSize,
        color: selectedColor.name,
        imageUrl: mockupUrl,
        customImages: [
          frontTexUrl,
          ...(backTexUrl ? [backTexUrl] : []),
          ...(leftSleeveTexUrl ? [leftSleeveTexUrl] : []),
          ...(rightSleeveTexUrl ? [rightSleeveTexUrl] : []),
          ...(neckLabelTexUrl ? [neckLabelTexUrl] : []),
        ],
        originalAssetUrls,
        originalAssets,
        customNote: JSON.stringify({
          studioDesign: true,
          sessionId,
          product: selectedProduct.name,
          category: selectedProduct.category,
          color: selectedColor.name,
          colorHex: selectedColor.hex,
          size: selectedSize,
          layerCount: layers.length,
          frontLayerCount: frontLayers.length,
          backLayerCount: backLayers.length,
          leftSleeveLayerCount: leftSleeveLayers.length,
          rightSleeveLayerCount: rightSleeveLayers.length,
          neckLabelLayerCount: neckLabelLayers.length,
          // Garment provenance — used by useCartItemPreview fallback composer
          mockupSrc: garmentSrc,
          printZone: frontPZ,
          printZoneBack: selectedProduct.printZoneBack ?? null,
          // NOTE: originalAssets and originalAssetUrls are stored as top-level
          // cart item fields (not here) to keep this JSON well under 2 KB.
        }),
      });

      toast({ title: "✓ Added to cart!", description: `Custom ${selectedProduct.name} (${selectedColor.name}) is ready.` });
      // Draft is now saved per-session — clear main draft key so a fresh visit starts clean.
      try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
      setHasDraft(false);
      setSaveStatus("idle");
      setTimeout(() => navigate("/cart"), 800);
    } finally {
      setIsAddingToCart(false);
    }
  }, [layers, selectedProduct, displayProduct, selectedColor, selectedSize, quantity, isMug, isCap, isWaterBottle, isZoneTabs, studioPrice, pz, addToCart, toast, navigate, settings, linkedStoreProduct]);

  /* ── Studio color palette — driven by the selected product's colors array.
     Admin overrides (settings.studioTshirtColors / studioMugColors) are still
     respected when set, so shop owners can customise available colours. */
  const parseColors = (raw: string) => {
    try { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr as { name: string; hex: string }[]; } catch {}
    return null;
  };
  const studioColors = (() => {
    const adminOverride = isMug
      ? parseColors(settings.studioMugColors)
      : (!isCap && !isWaterBottle) ? parseColors(settings.studioTshirtColors)
      : null;
    return adminOverride ?? selectedProduct.colors;
  })();

  /* ── Selected layer: corner handles for resize ─────── */
  const handleResizeDown = useCallback((e: React.PointerEvent<SVGCircleElement | SVGRectElement>) => {
    e.stopPropagation();
    if (!selectedLayer || selectedLayer.locked) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const startPt = clientToSVG(e.clientX, e.clientY);
    const startT = { ...selectedLayer.transform };
    const cx = pz.x + pz.w / 2 + startT.x;
    const cy = pz.y + pz.h / 2 + startT.y;
    const startDist = Math.hypot(startPt.x - cx, startPt.y - cy) || 1;

    const onMove = (me: PointerEvent) => {
      const pt = clientToSVG(me.clientX, me.clientY);
      const newDist = Math.hypot(pt.x - cx, pt.y - cy);
      const next = Math.max(0.1, Math.min(5, startT.scale * (newDist / startDist)));
      setLayers(prev => prev.map(l => l.id === selectedLayer.id
        ? { ...l, transform: { ...l.transform, scale: next } } : l));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      // commit
      setLayers(curr => { commitLayers(curr); return curr; });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [selectedLayer, clientToSVG, pz, commitLayers]);

  const selGeom = selectedLayer ? layerGeom(selectedLayer) : null;
  /* ── Edge strip handles for directional (non-proportional) resize ──
     Each entry stores the local (un-rotated) midpoint + strip dimensions.
     The SVG rendering applies rotation via transform="rotate(...)".
     Strips span the FULL edge length so any touch near the border works —
     not just a small 44×44 target at the midpoint. */
  const edgeMidpoints = useMemo(() => {
    if (!selectedLayer || !selGeom || selectedLayer.type !== "image") return [];
    const { cx, cy, x, y, w, h } = selGeom;
    // stripW / stripH is the hit-area size. Spans the full edge + 20px padding each side.
    return [
      { key: "n", midX: cx,    midY: y,     stripW: Math.max(w + 20, 60), stripH: 38, cursor: "ns-resize" },
      { key: "s", midX: cx,    midY: y + h, stripW: Math.max(w + 20, 60), stripH: 38, cursor: "ns-resize" },
      { key: "e", midX: x + w, midY: cy,    stripW: 38, stripH: Math.max(h + 20, 60), cursor: "ew-resize" },
      { key: "w", midX: x,     midY: cy,    stripW: 38, stripH: Math.max(h + 20, 60), cursor: "ew-resize" },
    ];
  }, [selectedLayer, selGeom]);

  /* ── Delete button pointer-down handler ────────────── */
  const handleDeletePointerDown = useCallback((e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    if (!selectedLayer) return;
    const target = e.target as Element;
    target.setPointerCapture(e.pointerId);
    const layerId = selectedLayer.id;
    const pointerId = e.pointerId;
    const onUp = (ue: PointerEvent) => {
      if (ue.pointerId !== pointerId) return;
      window.removeEventListener("pointerup", onUp);
      removeLayer(layerId);
    };
    window.addEventListener("pointerup", onUp);
  }, [selectedLayer, removeLayer]);

  const handleEdgeResizeDown = useCallback((e: React.PointerEvent<SVGCircleElement | SVGRectElement>, edgeKey: string) => {
    e.stopPropagation();
    if (!selectedLayer || selectedLayer.locked || selectedLayer.type !== "image") return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const startT = { ...selectedLayer.transform };
    const geom = (() => {
      const cx = pz.x + pz.w / 2 + startT.x;
      const cy = pz.y + pz.h / 2 + startT.y;
      const aspect = (selectedLayer as ImageLayer).naturalW / Math.max((selectedLayer as ImageLayer).naturalH, 1);
      const baseW = pz.w * startT.scale;
      return { cx, cy, aspect, baseW };
    })();

    const onMove = (me: PointerEvent) => {
      const pt = clientToSVG(me.clientX, me.clientY);
      const dx = pt.x - geom.cx; const dy = pt.y - geom.cy;
      const rad = -(startT.rotation * Math.PI) / 180;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      if (edgeKey === "n" || edgeKey === "s") {
        const baseH = geom.baseW / geom.aspect;
        const newScaleY = Math.max(0.05, Math.min(10, (Math.abs(ly) * 2) / baseH));
        setLayers(prev => prev.map(l => l.id === selectedLayer.id
          ? { ...l, transform: { ...l.transform, scaleY: newScaleY } } : l));
      } else {
        const newScaleX = Math.max(0.05, Math.min(10, (Math.abs(lx) * 2) / geom.baseW));
        setLayers(prev => prev.map(l => l.id === selectedLayer.id
          ? { ...l, transform: { ...l.transform, scaleX: newScaleX } } : l));
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove as EventListener);
      window.removeEventListener("pointerup", onUp);
      setLayers(curr => { commitLayers(curr); return curr; });
    };
    window.addEventListener("pointermove", onMove as EventListener);
    window.addEventListener("pointerup", onUp);
  }, [selectedLayer, clientToSVG, pz, commitLayers]);

  /* ── Renderable layer geometry list (memo) ─────────── */
  const layersRender = layers.map(l => ({ layer: l, geom: layerGeom(l) }));
  // Rotated handle positions for the selected layer
  const rotatedCorners = useMemo(() => {
    if (!selectedLayer || !selGeom) return [];
    const { cx, cy, x, y, w, h } = selGeom;
    const rad = (selectedLayer.transform.rotation * Math.PI) / 180;
    const corners = [
      { key: "nw", x, y },
      { key: "ne", x: x + w, y },
      { key: "sw", x, y: y + h },
      { key: "se", x: x + w, y: y + h },
    ];
    return corners.map(c => {
      const dx = c.x - cx; const dy = c.y - cy;
      return {
        key: c.key,
        x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
        y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
      };
    });
  }, [selectedLayer, selGeom]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F3F0" }}>
      <SEOHead
        title="Design Studio | Create Custom Apparel Online — TryNex Lifestyle"
        description="Design your own custom T-shirts, hoodies, mugs & more. Upload your artwork or add text, preview in 3D, and order with fast delivery across Bangladesh. COD available."
        canonical="/design-studio"
        keywords="custom t-shirt design online bangladesh, design your own shirt bd, personalized mug design, custom hoodie maker, কাস্টম ডিজাইন টি-শার্ট"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "TryNex Design Studio",
            "url": "https://trynexshop.com/design-studio",
            "description": "Free online tool to design custom T-shirts, hoodies, mugs and caps. Upload artwork, add text and order with fast delivery across Bangladesh.",
            "applicationCategory": "DesignApplication",
            "operatingSystem": "All",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BDT" },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://trynexshop.com/" },
              { "@type": "ListItem", "position": 2, "name": "Design Studio", "item": "https://trynexshop.com/design-studio" },
            ],
          },
        ]}
      />
      <Navbar />

      {/*
        Spacer reserves vertical space for the fixed AnnouncementBar + Navbar
        so the sticky page header below can use `top` without also stacking a
        margin (avoids double-offset on mobile when the announcement bar is
        visible).
      */}
      <div
        aria-hidden
        style={{ height: "calc(var(--announcement-height, 0px) + 4.25rem)" }}
      />

      {/* Page header */}
      <div
        className="border-b border-gray-200 sticky z-30"
        style={{
          background: "white",
          top: "calc(var(--announcement-height, 0px) + 4.25rem)",
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-shrink">
            <h1 className="font-display font-black text-base sm:text-xl text-gray-900 truncate">Design Studio</h1>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              <span className="hidden sm:inline">Designing: </span>
              <strong className="text-gray-700">{linkedStoreProduct?.name ?? selectedProduct.name}</strong>
              {linkedStoreProduct && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black text-white" style={{ background: "#E85D04" }}>STORE</span>
              )}
              <span className="text-gray-400"> · {
                isMugProduct
                  ? (mugMode === "side1" ? "Left Side" : mugMode === "side2" ? "Right Side" : "Full Wrap")
                  : (activeZoneConfig?.label ?? activeFace)
              }</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Saved indicator */}
            {(saveStatus !== "idle" || hasDraft) && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold"
                style={{ background: saveStatus === "saving" ? "#f3f4f6" : "#ecfdf5", color: saveStatus === "saving" ? "#6b7280" : "#047857" }}
                data-testid="draft-status">
                {saveStatus === "saving"
                  ? <><CloudUpload className="w-3 h-3 animate-pulse" /> Saving…</>
                  : <><Check className="w-3 h-3" /> Saved</>}
              </div>
            )}
            {layers.length > 0 && (
              <button
                onClick={clearDraft}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-gray-500 hover:text-red-600 transition-colors"
                style={{ background: "#f3f4f6" }}
                title="Clear all layers and draft"
                data-testid="clear-draft"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
            {/* Undo / Redo — hidden on mobile to save space */}
            <button onClick={undo} disabled={!canUndo}
              className="hidden sm:flex p-2 rounded-xl text-gray-600 disabled:opacity-30"
              style={{ background: "#f3f4f6" }} title="Undo (Ctrl+Z)">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={!canRedo}
              className="hidden sm:flex p-2 rounded-xl text-gray-600 disabled:opacity-30"
              style={{ background: "#f3f4f6" }} title="Redo (Ctrl+Y)">
              <Redo2 className="w-4 h-4" />
            </button>
            {/* 2D / 3D toggle — hidden on mobile (shown below product tabs instead) */}
            {effectiveSupports3D && (
              <div className="hidden sm:flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb", background: "white" }} data-testid="view-mode-toggle">
                <button
                  onClick={() => setViewMode("2d")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors"
                  style={{ background: viewMode === "2d" ? "#fff4ee" : "white", color: viewMode === "2d" ? "#E85D04" : "#6b7280" }}
                  title="2D editor"
                  data-testid="view-mode-2d"
                >
                  <Image2D className="w-3.5 h-3.5" /> 2D
                </button>
                <button
                  onClick={() => setViewMode("3d")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors"
                  style={{ background: viewMode === "3d" ? "#fff4ee" : "white", color: viewMode === "3d" ? "#E85D04" : "#6b7280", borderLeft: "1px solid #e5e7eb" }}
                  title="Realtime 3D preview"
                  data-testid="view-mode-3d"
                >
                  <Box className="w-3.5 h-3.5" /> 3D
                </button>
              </div>
            )}
            <button
              onClick={() => setShowPrintZone(v => !v)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background: showPrintZone ? "#fff4ee" : "#f3f4f6", color: showPrintZone ? "#E85D04" : "#6b7280" }}
            >
              {showPrintZone ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Print Zone
            </button>
            {/* Add to Cart — compact on mobile (icon only + short label) */}
            <motion.button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)", boxShadow: "0 4px 12px rgba(232,93,4,0.35)" }}
            >
              {isAddingToCart ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              <span className="hidden sm:inline">Add to Cart</span>
              <span className="sm:hidden">Cart</span>
            </motion.button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ═══════ LEFT: MOCKUP CANVAS ═══════ */}
          <div className="flex-1 min-w-0">
            {/* Mobile 2D/3D toggle — shown only on small screens above mockup */}
            {effectiveSupports3D && (
              <div className="flex sm:hidden items-center justify-between mb-3">
                <div className="flex items-center rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb", background: "white" }}>
                  <button
                    onClick={() => setViewMode("2d")}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-colors"
                    style={{ background: viewMode === "2d" ? "#fff4ee" : "white", color: viewMode === "2d" ? "#E85D04" : "#6b7280" }}
                  >
                    <Image2D className="w-3.5 h-3.5" /> 2D
                  </button>
                  <button
                    onClick={() => setViewMode("3d")}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-colors"
                    style={{ background: viewMode === "3d" ? "#fff4ee" : "white", color: viewMode === "3d" ? "#E85D04" : "#6b7280", borderLeft: "1px solid #e5e7eb" }}
                  >
                    <Box className="w-3.5 h-3.5" /> 3D
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={undo} disabled={!canUndo}
                    className="p-2 rounded-xl text-gray-500 disabled:opacity-30"
                    style={{ background: "#f3f4f6" }} title="Undo">
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={redo} disabled={!canRedo}
                    className="p-2 rounded-xl text-gray-500 disabled:opacity-30"
                    style={{ background: "#f3f4f6" }} title="Redo">
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Product selector bar */}
            <div className="flex items-center gap-2 mb-4">
              {/* Current product card */}
              <button
                onClick={() => { setShowProductPicker(true); setProductSearch(""); setProductPickerCategory("all"); }}
                className="flex items-center gap-3 flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl transition-all group"
                style={{
                  background: "white",
                  border: "1.5px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center"
                  style={{ border: "1px solid #f0efee" }}>
                  <img
                    src={displayProduct.frontSrc}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-xs font-black text-gray-800 truncate">{selectedProduct.name}</div>
                  <div className="text-[10px] text-gray-400 font-semibold">{selectedProduct.description}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-[11px] font-bold text-orange-500 group-hover:text-orange-600">
                  <Package className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Change</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>

            {/* ── Quick product tabs ── T-Shirt · Mug · Bottle (+ "More" opens full picker) */}
            {!linkedStoreProduct && (
              <div className="flex gap-1.5 mb-3" data-testid="quick-product-tabs">
                {QUICK_PRODUCT_IDS.map(pid => {
                  const prod = PRODUCTS.find(p => p.id === pid)!;
                  const isActive = selectedProduct.id === pid && !linkedStoreProduct;
                  const label =
                    pid === "mug" ? "Mug" :
                    pid === "hoodie" ? "Hoodie" :
                    pid === "longsleeve" ? "Long Sleeve" :
                    "T-Shirt";
                  return (
                    <button
                      key={pid}
                      onClick={() => handleQuickProductSwitch(prod)}
                      className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[9px] font-bold transition-all"
                      style={{
                        background: isActive ? "linear-gradient(135deg,#E85D04,#FB8500)" : "white",
                        color: isActive ? "white" : "#374151",
                        border: isActive ? "2px solid transparent" : "1.5px solid #e5e7eb",
                        boxShadow: isActive ? "0 4px 12px rgba(232,93,4,0.28)" : "none",
                      }}
                      title={prod.name}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center p-1.5"
                        style={{
                          background: isActive ? "rgba(255,255,255,0.22)" : "#f0f1f3",
                          color: isActive ? "white" : "#6b7280",
                        }}
                      >
                        {PRODUCT_TAB_ICONS[pid] ?? (
                          <img src={prod.frontSrc} alt={prod.name}
                            className="w-full h-full object-contain"
                            style={{ filter: isActive ? "brightness(0) invert(1)" : "none" }} />
                        )}
                      </div>
                      <span className="mt-0.5 leading-tight text-center">{label}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => { setShowProductPicker(true); setProductSearch(""); setProductPickerCategory("all"); }}
                  className="shrink-0 flex flex-col items-center gap-0.5 py-2 px-2.5 rounded-xl text-[10px] font-bold transition-all"
                  style={{ background: "white", color: "#6b7280", border: "1.5px solid #e5e7eb" }}
                  title="Browse all products"
                >
                  <Package className="w-4 h-4" />
                  <span className="mt-0.5">More</span>
                </button>
              </div>
            )}

            {/* Zone switcher — hidden in 3D mode.
                Apparel (tshirt/longsleeve/hoodie): shows 5 zone tabs (Front, Back,
                Left Sleeve, Right Sleeve, Neck Label) in a horizontally scrollable row.
                Mug: shows Side 1 / Side 2 / Full Wrap (handled separately below). */}
            {isZoneTabs && viewMode === "2d" && (
              <div className="mb-3" data-testid="zone-switcher">
                {/* Scrollable zone tab row */}
                <div
                  className="flex gap-1.5 overflow-x-auto pb-1"
                  style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
                >
                  {apparelZones.map(zone => {
                    const isActive = activeFace === zone.face;
                    const zoneLayerCount = layers.filter(l => (l.face ?? "front") === zone.face).length;
                    return (
                      <button
                        key={zone.face}
                        onClick={() => setActiveFace(zone.face)}
                        className="relative shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: isActive ? "linear-gradient(135deg,#1f2937,#374151)" : "white",
                          color: isActive ? "white" : "#374151",
                          border: isActive ? "none" : "1.5px solid #e5e7eb",
                          boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                        }}
                        data-testid={`zone-${zone.face}`}
                        title={zone.label}
                      >
                        {zone.shortLabel}
                        {/* Layer badge */}
                        {zoneLayerCount > 0 && !isActive && (
                          <span
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                            style={{ background: "#E85D04", boxShadow: "0 1px 4px rgba(232,93,4,0.4)" }}
                          >
                            {zoneLayerCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Dimensions hint for flat zones */}
                {isFlatZone && activeZoneConfig && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Ruler className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-gray-400">
                      Print area: {activeZoneConfig.pxDimensions}
                    </span>
                  </div>
                )}
                {/* Copy front → back helper */}
                {activeFace === "back" && currentFaceLayers.length === 0 && (() => {
                  const frontLayers = layers.filter(l => (l.face ?? "front") === "front");
                  if (frontLayers.length === 0) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const cloned = frontLayers.map(l => ({
                          ...l,
                          id: `${l.id}-back-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                          face: "back" as Face,
                        }));
                        commitLayers([...layers, ...cloned]);
                      }}
                      className="mt-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all"
                      style={{
                        background: "linear-gradient(135deg,#E85D04,#F48C06)",
                        color: "white",
                        boxShadow: "0 4px 12px rgba(232,93,4,0.25)",
                      }}
                      data-testid="mirror-front-to-back"
                    >
                      ↻ Apply front design to back
                    </button>
                  );
                })()}
              </div>
            )}

            {/* Mug-only print mode selector — replaces apparel Front/Back tabs.
                Side 1 / Side 2 → independent print panels (front + back faces);
                Wrap            → continuous artwork around the entire mug body.
                Hidden in 3D mode (use orbit camera instead). */}
            {isMugProduct && viewMode === "2d" && (
              <div className="flex gap-1.5 mb-3" data-testid="mug-mode-switcher">
                {([
                  { v: "side1", label: "Left Side" },
                  { v: "side2", label: "Right Side" },
                ] as const).map(({ v, label }) => (
                  <button key={v}
                    onClick={() => setMugMode(v)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: mugMode === v ? "linear-gradient(135deg,#1f2937,#374151)" : "white",
                      color: mugMode === v ? "white" : "#374151",
                      border: mugMode === v ? "none" : "1.5px solid #e5e7eb",
                      boxShadow: mugMode === v ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                    }}
                    data-testid={`mug-mode-${v}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Garment color swatches + label + hex input */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                  Color: <span className="text-gray-600 normal-case tracking-normal font-bold">{selectedColor.name}</span>
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {studioColors.map(c => {
                  const isSelected = selectedColor.hex.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button key={c.hex} title={c.name}
                      onClick={() => setSelectedColor({ name: c.name, hex: c.hex })}
                      className="w-8 h-8 rounded-xl border-2 transition-all hover:scale-110 relative"
                      style={{
                        background: c.hex,
                        borderColor: isSelected ? "#E85D04" : (c.hex.toUpperCase() === "#FFFFFF" || c.hex === "#F5F5F5" || c.hex === "#F5F2EC" || c.hex === "#F4F3F1" ? "#d1d5db" : c.hex),
                        boxShadow: isSelected ? "0 0 0 3px rgba(232,93,4,0.35), 0 2px 6px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.10)",
                      }}
                    >
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" style={{ color: (0.299 * parseInt(c.hex.slice(1,3),16) + 0.587 * parseInt(c.hex.slice(3,5),16) + 0.114 * parseInt(c.hex.slice(5,7),16)) > 128 ? "#333" : "white" }} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Custom hex/colour picker — toggle STUDIO_CUSTOM_COLOR_ENABLED to re-enable */}
              {STUDIO_CUSTOM_COLOR_ENABLED && (
                <div className="flex items-center gap-2 mt-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">Custom</label>
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="color"
                      value={selectedColor.hex.startsWith("#") && selectedColor.hex.length === 7 ? selectedColor.hex : "#ffffff"}
                      onChange={e => setSelectedColor({ name: "Custom", hex: e.target.value })}
                      className="w-8 h-7 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                      title="Pick any colour"
                    />
                    <input
                      type="text"
                      value={selectedColor.hex}
                      maxLength={7}
                      placeholder="#ffffff"
                      onChange={e => {
                        const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                          setSelectedColor({ name: v.length === 7 ? "Custom" : selectedColor.name, hex: v });
                        }
                      }}
                      className="flex-1 min-w-0 px-2 py-1 text-xs font-mono rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mockup area — clicking the background outside the canvas deselects */}
            <div
              className="relative rounded-3xl overflow-hidden select-none"
              style={{
                background: "radial-gradient(ellipse at 50% 40%, #F2F0ED 0%, #E8E5E1 50%, #DDDAD5 100%)",
                border: "1px solid #d8d5d0",
                boxShadow: "inset 0 2px 20px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.08)",
                isolation: "isolate",
              }}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => e.preventDefault()}
              onClick={(e) => {
                // Deselect when clicking the outer container padding/chrome (not the SVG/canvas)
                if ((e.target as Element).closest("svg") === null) {
                  setSelectedLayerId(null);
                }
              }}
            >
              <div
                className="relative w-full"
                style={{
                  aspectRatio: `${selectedProduct.aspect}`,
                  touchAction: "none",
                  transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
                  transformOrigin: "center center",
                  transition: gestureRef.current?.mode === "canvas-pinch" ? "none" : "transform 0.2s ease-out",
                  willChange: "transform",
                }}
              >
                {effectiveViewMode === "3d" && effectiveSupports3D ? (
                  <div className="absolute inset-0" data-testid="viewer-3d">
                    <Viewer3DErrorBoundary onReset={() => setViewMode("2d")}>
                    <Suspense fallback={
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading 3D preview…
                      </div>
                    }>
                      <ProductViewer3D
                        product={displayProduct}
                        garmentColor={selectedColor.hex}
                        front={{
                          layers: layers.filter(l => (l.face ?? "front") === "front") as unknown as ComposerLayer[],
                          printZone: isMugProduct ? MUG_SIDE_PZ : selectedProduct.printZone,
                          baseHeight: selectedProduct.baseHeight,
                        }}
                        back={supportsBack ? {
                          layers: layers.filter(l => (l.face ?? "front") === "back") as unknown as ComposerLayer[],
                          printZone: isMugProduct ? MUG_SIDE_PZ : (selectedProduct.printZoneBack ?? selectedProduct.printZone),
                          baseHeight: selectedProduct.baseHeight,
                        } : undefined}
                        activeFace={activeFace as "front" | "back" | undefined}
                        isWrapMode={isWrapMode}
                      />
                    </Suspense>
                    </Viewer3DErrorBoundary>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-[11px] font-bold text-white pointer-events-none"
                      style={{ background: "rgba(0,0,0,0.6)" }}>
                      Drag to rotate · Scroll to zoom
                    </div>
                    {layers.length === 0 && (
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
                          style={{ background: "rgba(255,255,255,0.82)", border: "1.5px dashed rgba(232,93,4,0.40)", backdropFilter: "blur(6px)", color: "#6b7280", whiteSpace: "nowrap" }}>
                          <Upload className="w-3.5 h-3.5 text-orange-400" />
                          Switch to 2D to add your design
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                <>
                {/* Floating face label inside the canvas — gives a clear, premium
                    "you are looking at the FRONT" indicator and animates between
                    faces. Doesn't affect interaction (pointer-events: none). */}
                {(supportsBack || isZoneTabs) && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isMugProduct ? mugMode : activeFace}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest pointer-events-none z-10"
                      style={{ background: "rgba(17,24,39,0.88)", color: "white", letterSpacing: "0.12em" }}
                    >
                      {isMugProduct
                        ? (mugMode === "side1" ? "Left Side" : mugMode === "side2" ? "Right Side" : "Full Wrap")
                        : (activeZoneConfig?.label ?? (activeFace === "front" ? "Front" : "Back"))}
                    </motion.div>
                  </AnimatePresence>
                )}
                <motion.svg
                  key={`${selectedProduct.id}-${isMugProduct ? mugMode : activeFace}`}
                  ref={svgRef as any}
                  viewBox={selectedProduct.viewBox}
                  className="absolute inset-0 w-full h-full"
                  style={{ touchAction: "none", userSelect: "none" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  {...(bindCanvasGestures() as Record<string, unknown>)}
                  onPointerDown={handleSvgPointerDown}
                  onClick={handleCanvasClick}
                >
                  {isFlatZone && activeZoneConfig
                    ? <FlatZoneSVG zone={activeZoneConfig} showPrintZone={effectiveShowPrintZone} garmentPhotoSrc={displayProduct.frontSrc} garmentColor={selectedColor.hex} />
                    : <GarmentSVG product={displayProduct} color={selectedColor.hex} showPrintZone={effectiveShowPrintZone} face={activeFace} mugMode={isMugProduct ? mugMode : undefined} />
                  }

                  {/* Layers (clipped to print zone) */}
                  <defs>
                    <clipPath id="design-clip">
                      <rect x={pz.x} y={pz.y} width={pz.w} height={pz.h} rx="4" />
                    </clipPath>
                    {/* Cylindrical perspective gradients — applied only for curved products (mug, waterbottle).
                        gradientUnits="userSpaceOnUse" so x1/x2 are in SVG coordinates matching the print zone. */}
                    {(selectedProduct.category === "mug" || selectedProduct.category === "waterbottle") && (<>
                      {/* Left-edge shadow — stronger cylinder wrap-around darkening */}
                      <linearGradient id="cyl-shade-l" gradientUnits="userSpaceOnUse"
                        x1={pz.x} y1={pz.y} x2={pz.x + pz.w} y2={pz.y}>
                        <stop offset="0%"   stopColor="rgba(0,0,0,0.42)" />
                        <stop offset="18%"  stopColor="rgba(0,0,0,0.12)" />
                        <stop offset="38%"  stopColor="rgba(0,0,0,0.02)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                      </linearGradient>
                      {/* Right-edge shadow — mirror of left */}
                      <linearGradient id="cyl-shade-r" gradientUnits="userSpaceOnUse"
                        x1={pz.x} y1={pz.y} x2={pz.x + pz.w} y2={pz.y}>
                        <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
                        <stop offset="62%"  stopColor="rgba(0,0,0,0.02)" />
                        <stop offset="82%"  stopColor="rgba(0,0,0,0.12)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.42)" />
                      </linearGradient>
                      {/* Center specular highlight — studio lamp on cylinder crown */}
                      <linearGradient id="cyl-highlight" gradientUnits="userSpaceOnUse"
                        x1={pz.x} y1={pz.y} x2={pz.x + pz.w} y2={pz.y}>
                        <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
                        <stop offset="30%"  stopColor="rgba(255,255,255,0.10)" />
                        <stop offset="50%"  stopColor="rgba(255,255,255,0.22)" />
                        <stop offset="70%"  stopColor="rgba(255,255,255,0.10)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                      </linearGradient>
                    </>)}
                  </defs>
                  <g clipPath="url(#design-clip)">
                    {layersRender
                      .filter(({ layer }) => (layer.face ?? "front") === activeFace)
                      .map(({ layer: l, geom: g }) => {
                      if (!l.visible) return null;
                      if (l.type === "image") {
                        // Base "printed on fabric" look: slight brightness/contrast/saturation
                        // shift simulates ink absorbed into cotton weave — no rectangular shade.
                        const isApparel = selectedProduct.category === "tshirt" ||
                          selectedProduct.category === "hoodie" ||
                          selectedProduct.category === "longsleeve";
                        const fabricBase = isApparel
                          ? "brightness(94%) contrast(106%) saturate(91%)"
                          : "";
                        const userAdj =
                          (l.brightness != null && l.brightness !== 100) ||
                          (l.contrast != null && l.contrast !== 100) ||
                          (l.saturation != null && l.saturation !== 100)
                            ? `brightness(${l.brightness ?? 100}%) contrast(${l.contrast ?? 100}%) saturate(${l.saturation ?? 100}%)`
                            : "";
                        const cssFilter = [fabricBase, userAdj].filter(Boolean).join(" ") || undefined;
                        // Build SVG transform: rotate + optional flip around image center
                        const flipSX = l.flipH ? -1 : 1;
                        const flipSY = l.flipV ? -1 : 1;
                        const hasFlip = l.flipH || l.flipV;
                        const imgTransform = hasFlip
                          ? `rotate(${l.transform.rotation}, ${g.cx}, ${g.cy}) translate(${g.cx}, ${g.cy}) scale(${flipSX}, ${flipSY}) translate(${-g.cx}, ${-g.cy})`
                          : `rotate(${l.transform.rotation}, ${g.cx}, ${g.cy})`;
                        return (
                          <image key={l.id}
                            data-layer-id={l.id}
                            href={l.src}
                            x={g.x} y={g.y} width={g.w} height={g.h}
                            opacity={l.transform.opacity}
                            transform={imgTransform}
                            preserveAspectRatio="none"
                            style={{ cursor: l.locked ? "not-allowed" : "grab", filter: cssFilter }}
                          />
                        );
                      }
                      // text — multiply blend so ink looks printed on fabric
                      const hasShadow = !!(l.shadowBlur || l.shadowOffsetX || l.shadowOffsetY);
                      const shadowFilterId = hasShadow ? `tshadow-${l.id}` : undefined;
                      return (
                        <g key={l.id}>
                          {hasShadow && (
                            <defs>
                              <filter id={shadowFilterId} x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow
                                  dx={l.shadowOffsetX ?? 2}
                                  dy={l.shadowOffsetY ?? 2}
                                  stdDeviation={(l.shadowBlur ?? 4) / 2}
                                  floodColor={l.shadowColor ?? "rgba(0,0,0,0.5)"}
                                />
                              </filter>
                            </defs>
                          )}
                          <text
                            data-layer-id={l.id}
                            x={l.textAlign === "left" ? g.cx - g.w / 2 : l.textAlign === "right" ? g.cx + g.w / 2 : g.cx}
                            y={g.cy}
                            fill={l.color}
                            fontFamily={l.fontFamily}
                            fontWeight={l.fontWeight}
                            fontStyle={l.fontStyle}
                            fontSize={l.fontSize * l.transform.scale}
                            opacity={l.transform.opacity}
                            textAnchor={l.textAlign === "left" ? "start" : l.textAlign === "right" ? "end" : "middle"}
                            dominantBaseline="middle"
                            letterSpacing={l.letterSpacing != null ? `${l.letterSpacing}em` : undefined}
                            stroke={l.strokeWidth ? (l.strokeColor ?? "#000000") : "none"}
                            strokeWidth={l.strokeWidth ? l.strokeWidth * l.transform.scale : undefined}
                            paintOrder={l.strokeWidth ? "stroke" : undefined}
                            transform={`rotate(${l.transform.rotation}, ${g.cx}, ${g.cy})`}
                            filter={shadowFilterId ? `url(#${shadowFilterId})` : undefined}
                            style={{ cursor: l.locked ? "not-allowed" : "grab", userSelect: "none", mixBlendMode: "multiply" }}
                          >{l.text}</text>
                        </g>
                      );
                    })}
                  </g>


                  {/* Cylindrical surface overlay — ONLY for mug & water bottle.
                      Gives 360° cylinder wrap depth with correct edge falloff on both sides.
                      Apparel products (tshirt/hoodie/longsleeve) do NOT get any overlay
                      so uploaded designs are rendered clean — no print-zone shade. */}
                  {(selectedProduct.category === "mug" || selectedProduct.category === "waterbottle") && (
                    <g clipPath="url(#design-clip)" pointerEvents="none">
                      <rect x={pz.x} y={pz.y} width={pz.w} height={pz.h} fill="url(#cyl-shade-l)" style={{ mixBlendMode: "multiply" as const }} />
                      <rect x={pz.x} y={pz.y} width={pz.w} height={pz.h} fill="url(#cyl-shade-r)" style={{ mixBlendMode: "multiply" as const }} />
                      <rect x={pz.x} y={pz.y} width={pz.w} height={pz.h} fill="url(#cyl-highlight)" style={{ mixBlendMode: "screen" as const }} />
                    </g>
                  )}


                  {/* Selection outline + handles */}
                  {selectedLayer && selGeom && (
                    <g pointerEvents="none">
                      <rect x={selGeom.x} y={selGeom.y} width={selGeom.w} height={selGeom.h}
                        fill="none" stroke="#E85D04" strokeWidth="1" strokeDasharray="4 3"
                        transform={`rotate(${selectedLayer.transform.rotation}, ${selGeom.cx}, ${selGeom.cy})`}
                        vectorEffect="non-scaling-stroke" />
                    </g>
                  )}
                  {/* Corner resize handles — visible dot + transparent 44px hit area */}
                  {selectedLayer && rotatedCorners.map(h => (
                    <g key={h.key}>
                      {/* Visible handle dot — smaller and minimal */}
                      <circle cx={h.x} cy={h.y} r={5}
                        fill="white" stroke="#E85D04" strokeWidth="1.5"
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.18))" }}
                        pointerEvents="none"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Transparent hit area — 30px radius on all devices for reliable finger taps */}
                      <circle cx={h.x} cy={h.y} r={30}
                        fill="transparent"
                        style={{ cursor: "nwse-resize", touchAction: "none" }}
                        pointerEvents="all"
                        onPointerDown={handleResizeDown}
                      />
                    </g>
                  ))}

                  {/* Edge midpoint handles — visible rect + transparent 44×44 hit rect */}
                  {selectedLayer && selectedLayer.type === "image" && selGeom && edgeMidpoints.map(h => (
                    /* Each strip is rendered in LOCAL (un-rotated) layer coordinates,
                       then rotated around the layer center via SVG transform.
                       This makes the entire edge length touchable — not just the midpoint. */
                    <g key={h.key} transform={`rotate(${selectedLayer.transform.rotation}, ${selGeom.cx}, ${selGeom.cy})`}>
                      {/* Full-edge transparent hit strip — spans the whole side */}
                      <rect
                        x={h.midX - h.stripW / 2}
                        y={h.midY - h.stripH / 2}
                        width={h.stripW}
                        height={h.stripH}
                        fill="transparent"
                        style={{ cursor: h.cursor, touchAction: "none" }}
                        pointerEvents="all"
                        onPointerDown={e => handleEdgeResizeDown(e as unknown as React.PointerEvent<SVGCircleElement | SVGRectElement>, h.key)}
                      />
                      {/* Pill-shaped visible indicator at the edge midpoint — minimal */}
                      <rect
                        x={h.key === "n" || h.key === "s" ? h.midX - 10 : h.midX - 4}
                        y={h.key === "n" || h.key === "s" ? h.midY - 4 : h.midY - 10}
                        width={h.key === "n" || h.key === "s" ? 20 : 8}
                        height={h.key === "n" || h.key === "s" ? 8 : 20}
                        rx={4}
                        fill="white"
                        stroke="#E85D04"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                        style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.18))" }}
                        pointerEvents="none"
                      />
                    </g>
                  ))}

                  {/* Red delete (×) button at the top-right corner of the selected layer */}
                  {selectedLayer && selectedLayer.type === "image" && (() => {
                    const ne = rotatedCorners.find(c => c.key === "ne");
                    if (!ne) return null;
                    return (
                      <g pointerEvents="all" style={{ cursor: "pointer" }}>
                        {/* Visible delete circle */}
                        <circle cx={ne.x} cy={ne.y} r={13}
                          fill="#ef4444" stroke="white" strokeWidth={2.5}
                          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
                          pointerEvents="none"
                        />
                        <line x1={ne.x - 4.5} y1={ne.y - 4.5} x2={ne.x + 4.5} y2={ne.y + 4.5} stroke="white" strokeWidth={2.2} strokeLinecap="round" pointerEvents="none" />
                        <line x1={ne.x + 4.5} y1={ne.y - 4.5} x2={ne.x - 4.5} y2={ne.y + 4.5} stroke="white" strokeWidth={2.2} strokeLinecap="round" pointerEvents="none" />
                        {/* Transparent 44-px hit area — fires delete on pointerup so gesture filterTaps can't swallow it */}
                        <circle cx={ne.x} cy={ne.y} r={22}
                          fill="transparent"
                          style={{ touchAction: "none" }}
                          pointerEvents="all"
                          onPointerDown={handleDeletePointerDown}
                        />
                      </g>
                    );
                  })()}

                  {/* Snap guides */}
                  {snapGuides.v && (
                    <line x1={pz.x + pz.w / 2} y1={pz.y - 8} x2={pz.x + pz.w / 2} y2={pz.y + pz.h + 8}
                      stroke="#E85D04" strokeWidth="1" strokeDasharray="2 3" />
                  )}
                  {snapGuides.h && (
                    <line x1={pz.x - 8} y1={pz.y + pz.h / 2} x2={pz.x + pz.w + 8} y2={pz.y + pz.h / 2}
                      stroke="#E85D04" strokeWidth="1" strokeDasharray="2 3" />
                  )}
                </motion.svg>

                {/* ── MAIN HORIZONTAL TOOLBAR ── */}
                {!isMobile && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-2xl border border-gray-200 shadow-xl z-30"
                    style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)" }}>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors group" title="Upload Image">
                      <Upload className="w-4 h-4 text-gray-500 group-hover:text-orange-500" />
                      <span className="text-[10px] font-bold text-gray-500 group-hover:text-orange-600">Upload</span>
                    </button>
                    <button onClick={() => {
                        const layer: TextLayer = {
                          id: uid(), name: "New text", type: "text", visible: true, locked: false,
                          transform: { ...ZERO_TRANSFORM },
                          text: "Your text", fontFamily: FONT_FAMILIES[0].value,
                          fontWeight: 700, fontStyle: "normal", fontSize: 40, color: "#111111",
                        };
                        addLayer(layer);
                        setActiveTab("text");
                      }} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors group" title="Add Text">
                      <Type className="w-4 h-4 text-gray-500 group-hover:text-orange-500" />
                      <span className="text-[10px] font-bold text-gray-500 group-hover:text-orange-600">Text</span>
                    </button>
                    <button onClick={() => setActiveTab("templates")} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors group" title="Templates">
                      <Sparkles className="w-4 h-4 text-gray-500 group-hover:text-orange-500" />
                      <span className="text-[10px] font-bold text-gray-500 group-hover:text-orange-600">Templates</span>
                    </button>
                    <button onClick={() => setActiveTab("layers")} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors group" title="Layers">
                      <LayersIcon className="w-4 h-4 text-gray-500 group-hover:text-orange-500" />
                      <span className="text-[10px] font-bold text-gray-500 group-hover:text-orange-600">Layers</span>
                    </button>
                    <div className="w-px h-8 bg-gray-200 mx-1" />
                    <button onClick={undo} disabled={!canUndo} className="p-2 rounded-xl hover:bg-white transition-colors disabled:opacity-30 group" title="Undo">
                      <Undo2 className="w-4 h-4 text-gray-500 group-hover:text-orange-500" />
                    </button>
                    <button onClick={redo} disabled={!canRedo} className="p-2 rounded-xl hover:bg-white transition-colors disabled:opacity-30 group" title="Redo">
                      <Redo2 className="w-4 h-4 text-gray-500 group-hover:text-orange-500" />
                    </button>
                    <div className="w-px h-8 bg-gray-200 mx-1" />
                    <button onClick={handleExportPNG} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors group" title="Export PNG (high quality)">
                      <Download className="w-4 h-4 text-gray-500 group-hover:text-orange-500" />
                      <span className="text-[10px] font-bold text-gray-500 group-hover:text-orange-600">PNG</span>
                    </button>
                    <button onClick={handleExportJPG} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-white transition-colors group" title="Export JPG (compressed)">
                      <Download className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                      <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-600">JPG</span>
                    </button>
                    <button onClick={clearDraft} className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-red-50 transition-colors group" title="Clear All">
                      <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                      <span className="text-[10px] font-bold text-gray-400 group-hover:text-red-600">Clear</span>
                    </button>
                  </div>
                )}

                {/* Empty state — transparent overlay so garment stays fully visible */}
                {layers.length === 0 && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-end cursor-pointer pb-5"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                    aria-label="Upload image"
                  >
                    {/* Subtle dashed print-zone hint at top */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex flex-col items-center gap-1 opacity-70">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(232,93,4,0.15)", border: "1.5px dashed rgba(232,93,4,0.6)" }}>
                          <Upload className="w-5 h-5 text-orange-500" />
                        </div>
                        <span className="text-[10px] font-bold text-orange-500 bg-white/80 px-2 py-0.5 rounded-full" style={{ backdropFilter: "blur(4px)" }}>
                          Tap to add design
                        </span>
                      </div>
                    </div>
                    {/* Action buttons — compact pill row at bottom, glass style */}
                    <motion.div
                      className="flex items-center gap-2 pointer-events-auto"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
                        style={{ background: "rgba(255,255,255,0.92)", color: "#374151", boxShadow: "0 2px 8px rgba(0,0,0,0.14)", backdropFilter: "blur(6px)" }}
                      >
                        <Upload className="w-3 h-3" /> Upload
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab("text"); setMobileToolOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
                        style={{ background: "rgba(255,255,255,0.92)", color: "#374151", boxShadow: "0 2px 8px rgba(0,0,0,0.14)", backdropFilter: "blur(6px)" }}
                      >
                        <Type className="w-3 h-3" /> Text
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab("ai"); setMobileToolOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
                        style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)", color: "white", boxShadow: "0 2px 12px rgba(232,93,4,0.4)" }}
                      >
                        <Wand2 className="w-3 h-3" /> AI Art
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab("templates"); setMobileToolOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95"
                        style={{ background: "rgba(255,255,255,0.92)", color: "#374151", boxShadow: "0 2px 8px rgba(0,0,0,0.14)", backdropFilter: "blur(6px)" }}
                      >
                        <Sparkles className="w-3 h-3" /> Templates
                      </button>
                    </motion.div>
                  </div>
                )}

                {/* Fabric label */}
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1.5 rounded-xl text-xs font-black"
                    style={{ background: "rgba(255,255,255,0.96)", color: "#374151", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}>
                    {selectedProduct.description}
                  </span>
                </div>
                </>
                )}

                {/* Processing overlay — shows in-viewport whenever remove-bg or upscale is running.
                    Absolute over the canvas so users never need to scroll to see it. */}
                {(isRemoving || isUpscaling) && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20"
                    style={{ background: "rgba(255,255,255,0.82)", backdropFilter: "blur(2px)" }}
                  >
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <p className="text-xs font-bold text-gray-700">
                      {isUpscaling ? "Upscaling image…"
                        : removeBgPhase === "model-download" ? "Downloading AI model (~30 MB)…"
                        : removeBgPhase === "processing" ? "Processing in-browser…"
                        : "Removing background…"}
                    </p>
                    {removeBgPhase === "model-download" && (
                      <p className="text-[10px] text-gray-400 text-center px-6">Model is cached after the first download — future removals will be instant.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Zoom controls — always visible once layers are present so users can
                  easily zoom out after uploading an image on mobile devices. */}
              {layers.length > 0 && (
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
                  {/* Zoom out */}
                  <button
                    aria-label="Zoom out"
                    onClick={() => {
                      const next = Math.max(0.4, Math.round((canvasZoom - 0.2) * 10) / 10);
                      canvasZoomRef.current = next;
                      setCanvasZoom(next);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-black"
                    style={{ background: "rgba(17,24,39,0.78)", color: "white", backdropFilter: "blur(6px)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
                  >
                    −
                  </button>
                  {/* Zoom level / Reset */}
                  {isCanvasZoomed && (
                    <button
                      onClick={() => {
                        canvasZoomRef.current = 1;
                        canvasPanRef.current = { x: 0, y: 0 };
                        setCanvasZoom(1);
                        setCanvasPan({ x: 0, y: 0 });
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold"
                      style={{ background: "rgba(17,24,39,0.78)", color: "white", backdropFilter: "blur(6px)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
                    >
                      <ZoomOut className="w-3 h-3" />
                      {Math.round(canvasZoom * 100)}%
                    </button>
                  )}
                  {/* Zoom in */}
                  <button
                    aria-label="Zoom in"
                    onClick={() => {
                      const next = Math.min(4, Math.round((canvasZoom + 0.2) * 10) / 10);
                      canvasZoomRef.current = next;
                      setCanvasZoom(next);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-black"
                    style={{ background: "rgba(17,24,39,0.78)", color: "white", backdropFilter: "blur(6px)", boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
                  >
                    +
                  </button>
                </div>
              )}

              {/* Print-safe warning — shown when any layer bleeds outside the print zone */}
              {anyLayerOutsidePZ && viewMode === "2d" && (
                <div className="mx-3 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold"
                  style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", color: "#dc2626" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Design extends outside print area — it will be cropped
                </div>
              )}

              {/* Interaction hint */}
              {layers.length > 0 && (
                <div className="px-4 py-2.5 text-[11px] font-semibold text-gray-500 flex items-center gap-2 border-t border-gray-100"
                  style={{ background: "white" }}>
                  <Move className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  Drag to move · Pinch to scale &amp; rotate · Use +/− buttons to zoom canvas
                </div>
              )}
            </div>

            {/* ═══════ MOBILE: Quick-actions bar (shown when layer selected) ═══════
                Lets users rotate, flip, centre, duplicate and delete without opening
                the full bottom-sheet tool panel. Only rendered on screens < lg. */}
            {selectedLayer && viewMode === "2d" && (
              <div className="lg:hidden mt-2 flex items-center gap-1.5 px-3 py-2.5 rounded-2xl"
                style={{ background: "white", border: "1px solid #e9e5e0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                {/* Layer type badge */}
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg mr-1 shrink-0"
                  style={{ background: selectedLayer.type === "text" ? "#ede9fe" : "#fff4ee", color: selectedLayer.type === "text" ? "#7c3aed" : "#E85D04" }}>
                  {selectedLayer.type === "text" ? "TXT" : "IMG"}
                </span>
                <div className="flex items-center gap-1 flex-1 justify-around">
                  {/* Rotate CCW */}
                  <button
                    aria-label="Rotate counter-clockwise"
                    onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, rotation: l.transform.rotation - 15 } }), true)}
                    className="p-2 rounded-xl active:scale-95 transition-transform"
                    style={{ background: "#f3f4f6" }}>
                    <RotateCcw className="w-4 h-4 text-gray-600" />
                  </button>
                  {/* Rotate CW */}
                  <button
                    aria-label="Rotate clockwise"
                    onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, rotation: l.transform.rotation + 15 } }), true)}
                    className="p-2 rounded-xl active:scale-95 transition-transform"
                    style={{ background: "#f3f4f6" }}>
                    <RotateCw className="w-4 h-4 text-gray-600" />
                  </button>
                  {/* Flip H — image layers only */}
                  {selectedLayer.type === "image" && (
                    <button
                      aria-label="Flip horizontal"
                      onClick={() => updateLayer(selectedLayer.id, l => l.type === "image" ? ({ ...l, flipH: !(l as any).flipH }) as any : l, true)}
                      className="p-2 rounded-xl active:scale-95 transition-transform"
                      style={{ background: "#f3f4f6" }}>
                      <FlipHorizontal className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                  {/* Centre on print zone */}
                  <button
                    aria-label="Centre layer"
                    onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, x: 0, y: 0 } }), true)}
                    className="p-2 rounded-xl active:scale-95 transition-transform"
                    style={{ background: "#f3f4f6" }}>
                    <Crosshair className="w-4 h-4 text-gray-600" />
                  </button>
                  {/* Duplicate */}
                  <button
                    aria-label="Duplicate layer"
                    onClick={() => {
                      const dup: Layer = { ...selectedLayer, id: uid(), name: `${selectedLayer.name} copy`, face: selectedLayer.face ?? activeFace };
                      const next = [...layers, dup];
                      commitLayers(next);
                      setSelectedLayerId(dup.id);
                    }}
                    className="p-2 rounded-xl active:scale-95 transition-transform"
                    style={{ background: "#f3f4f6" }}>
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                  {/* Delete */}
                  <button
                    aria-label="Delete layer"
                    onClick={() => removeLayer(selectedLayer.id)}
                    className="p-2 rounded-xl active:scale-95 transition-transform"
                    style={{ background: "#fef2f2" }}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
                {/* More tools shortcut */}
                <button
                  onClick={() => { setMobileToolOpen(true); setActiveTab("layers"); }}
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold text-white ml-1"
                  style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)", boxShadow: "0 3px 8px rgba(232,93,4,0.3)" }}>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>More</span>
                </button>
              </div>
            )}
          </div>

          {/* ═══════ MOBILE: Floating "Edit Tools" FAB ═══════ */}
          <button
            onClick={() => setMobileToolOpen(true)}
            className="lg:hidden fixed right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm text-white shadow-2xl"
            style={{
              background: "linear-gradient(135deg,#E85D04,#FB8500)",
              boxShadow: "0 8px 24px rgba(232,93,4,0.45)",
              bottom: "max(80px, calc(env(safe-area-inset-bottom, 0px) + 72px))",
            }}
          >
            <Wand2 className="w-4 h-4" /> Edit Tools
          </button>

          {/* Mobile bottom-sheet backdrop */}
          {mobileToolOpen && (
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileToolOpen(false)}
            />
          )}

          {/* ═══════ RIGHT: TABBED PANEL ═══════ */}
          {/* On desktop: inline sidebar. On mobile: slide-up bottom sheet via mobileToolOpen. */}
          <div className={`lg:w-[340px] shrink-0 flex flex-col lg:sticky lg:self-start
            ${mobileToolOpen
              ? 'fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl max-h-[92vh] overflow-hidden shadow-2xl gap-2'
              : 'hidden lg:flex gap-4'}`}
            style={mobileToolOpen
              ? { background: "#faf9f6", paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }
              : { top: "calc(var(--announcement-height, 0px) + 8.5rem)" }}
          >
            {/* Mobile drag handle */}
            {mobileToolOpen && (
              <div className="lg:hidden flex flex-col items-center pt-3 pb-1 shrink-0 sticky top-0 z-10"
                style={{ background: "#faf9f6" }}>
                <div className="w-10 h-1 rounded-full bg-gray-300 mb-2" />
                <div className="w-full flex items-center justify-between px-4 pb-2">
                  <span className="text-sm font-black text-gray-800">Design Tools</span>
                  <button onClick={() => setMobileToolOpen(false)}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Persistent hidden file inputs — always mounted so empty-state tap works
                regardless of which tab is active. fileInputRef is shared by:
                  • the "Tap to upload" empty-state overlay (all tabs)
                  • the "Upload Image" button in the Upload tab
                fileInputAddRef is used by the Layers tab "Image" add button. */}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
              className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleFileUpload(f); e.target.value = ""; } }} />

            {/* Tab strip */}
            <div className={`rounded-2xl${mobileToolOpen ? ' flex-1 min-h-0 flex flex-col' : ' overflow-hidden'}`} style={{ background: "white", border: "1px solid #e9e5e0" }}>
              <div className="flex border-b border-gray-100 shrink-0">
                {[
                  { id: "upload" as const,    label: "Upload",    icon: Upload },
                  { id: "text" as const,      label: "Text",      icon: Type },
                  { id: "ai" as const,        label: "AI Art",    icon: Wand2 },
                  { id: "layers" as const,    label: "Layers",    icon: LayersIcon },
                  { id: "templates" as const, label: "Templates", icon: Sparkles },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-[9px] font-bold transition-colors"
                    style={{
                      color: activeTab === id ? "#E85D04" : "#6b7280",
                      borderBottom: activeTab === id ? "2px solid #E85D04" : "2px solid transparent",
                      marginBottom: "-1px",
                    }}
                  >
                    <Icon className="w-4 h-4" />{label}
                    {id === "ai" && <span className="absolute top-1 right-1 bg-orange-500 text-white text-[6px] px-1 py-0.5 rounded-full font-black leading-none">AI</span>}
                  </button>
                ))}
              </div>

              <div className={mobileToolOpen ? 'flex-1 min-h-0 overflow-y-auto' : ''}>
              <AnimatePresence mode="wait">
                {/* ── UPLOAD TAB ── */}
                {activeTab === "upload" && (
                  <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                      style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)", boxShadow: "0 4px 12px rgba(232,93,4,0.3)" }}
                    >
                      <Upload className="w-4 h-4" /> Upload Image
                    </button>
                    <p className="text-[11px] text-gray-500 text-center">JPG, PNG, or WebP · Max 10MB</p>

                    {selectedLayer?.type === "image" && (
                      <>
                        <div className="rounded-xl border border-gray-100 p-2">
                          <img src={selectedLayer.src} alt="Preview" className="w-full h-20 object-contain rounded-lg"
                            style={{ background: "repeating-conic-gradient(#ccc 0% 25%,#f0f0f0 0% 50%) 0 0/16px 16px" }} />
                        </div>
                        <div>
                          <button onClick={handleRemoveBg} disabled={isRemoving || isUpscaling}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                            style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
                            title={removeBgServerConfigured === false ? "No remove.bg API key — will use in-browser AI (slower)" : undefined}
                          >
                            {isRemoving
                              ? <><Loader2 className="w-4 h-4 animate-spin" /> Removing background...</>
                              : <><Scissors className="w-4 h-4" /> Remove Background</>}
                          </button>
                          {removeBgServerConfigured === false && !isRemoving && (
                            <p className="text-[10px] text-amber-600 mt-1 text-center leading-tight">
                              Uses in-browser AI — admin can enable cloud processing in{" "}
                              <a href="/admin/settings" className="underline font-semibold">Settings</a>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setCropPct({ x: 0, y: 0, w: 100, h: 100 });
                            setCropLayerId(selectedLayer.id);
                          }}
                          disabled={isRemoving || isUpscaling}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                          style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
                        >
                          <Scissors className="w-4 h-4" /> Crop Image
                        </button>
                        <button onClick={handleUpscale} disabled={isRemoving || isUpscaling}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg,#FEF3C7,#FDE68A)", color: "#92400E", border: "1px solid #FCD34D" }}
                        >
                          {isUpscaling
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Upscaling…</>
                            : <><Wand2 className="w-4 h-4" /> Upscale to HD (2×)</>}
                        </button>
                      </>
                    )}

                    {/* Garment size picker (apparel only) */}
                    {!isMug && !isCap && !isWaterBottle && (
                      <div className="pt-3 border-t border-gray-100">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Garment Size</label>
                        <div className="flex flex-wrap gap-1.5">
                          {SIZE_CHART.map(s => (
                            <button key={s.size} onClick={() => setSelectedSize(s.size)}
                              className="px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                              style={{
                                background: selectedSize === s.size ? "linear-gradient(135deg,#E85D04,#FB8500)" : "#f3f4f6",
                                color: selectedSize === s.size ? "white" : "#374151",
                                boxShadow: selectedSize === s.size ? "0 2px 8px rgba(232,93,4,0.3)" : "none",
                              }}
                            >{s.size}</button>
                          ))}
                        </div>
                        <details className="mt-3">
                          <summary className="text-[11px] font-bold text-gray-500 cursor-pointer flex items-center gap-1">
                            <Ruler className="w-3 h-3" /> Size guide
                          </summary>
                          <div className="mt-2 rounded-lg overflow-hidden border border-gray-100">
                            <table className="w-full text-[11px]">
                              <thead><tr style={{ background: "#f9fafb" }}>
                                <th className="px-2 py-1.5 text-left font-black text-gray-600">Size</th>
                                <th className="px-2 py-1.5 text-left font-black text-gray-600">Chest</th>
                                <th className="px-2 py-1.5 text-left font-black text-gray-600">Length</th>
                              </tr></thead>
                              <tbody>
                                {SIZE_CHART.map((row, i) => (
                                  <tr key={row.size} className="border-t border-gray-50"
                                    style={{ background: selectedSize === row.size ? "#fff4ee" : i % 2 === 0 ? "white" : "#fafafa" }}>
                                    <td className="px-2 py-1.5 font-black" style={{ color: selectedSize === row.size ? "#E85D04" : "#111" }}>{row.size}</td>
                                    <td className="px-2 py-1.5 text-gray-600">{row.chest}"</td>
                                    <td className="px-2 py-1.5 text-gray-600">{row.length}"</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── TEXT TAB ── */}
                {activeTab === "text" && (
                  <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
                    <button
                      onClick={() => {
                        const layer: TextLayer = {
                          id: uid(), name: "New text", type: "text", visible: true, locked: false,
                          transform: { ...ZERO_TRANSFORM },
                          text: "Your text", fontFamily: FONT_FAMILIES[0].value,
                          fontWeight: 700, fontStyle: "normal", fontSize: 40, color: "#111111",
                        };
                        addLayer(layer);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white"
                      style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)", boxShadow: "0 4px 12px rgba(232,93,4,0.3)" }}
                    >
                      <Plus className="w-4 h-4" /> Add Text Layer
                    </button>

                    {selectedLayer?.type === "text" ? (
                      <>
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Text</label>
                          <input value={selectedLayer.text}
                            onChange={(e) => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, text: e.target.value, name: e.target.value || "Text" } : l, false)}
                            onBlur={() => commitLayers(layers)}
                            className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:border-orange-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Font</label>
                          <select value={selectedLayer.fontFamily}
                            onChange={(e) => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, fontFamily: e.target.value } : l, true)}
                            className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 outline-none"
                          >
                            {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Size</label>
                            <input type="number" min={8} max={200} value={selectedLayer.fontSize}
                              onChange={(e) => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, fontSize: Math.max(8, Math.min(200, parseInt(e.target.value) || 12)) } : l, false)}
                              onBlur={() => commitLayers(layers)}
                              className="w-full px-2 py-1.5 rounded-lg text-sm border border-gray-200 outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Color</label>
                            <input type="color" value={selectedLayer.color}
                              onChange={(e) => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, color: e.target.value } : l, false)}
                              onBlur={() => commitLayers(layers)}
                              className="w-full h-9 rounded-lg border border-gray-200 cursor-pointer" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, fontWeight: l.fontWeight >= 800 ? 400 : 800 } : l, true)}
                            className="flex-1 py-2 rounded-lg text-sm font-black border"
                            style={{
                              background: selectedLayer.fontWeight >= 800 ? "#fff4ee" : "white",
                              color: selectedLayer.fontWeight >= 800 ? "#E85D04" : "#374151",
                              borderColor: selectedLayer.fontWeight >= 800 ? "#fdd5b4" : "#e5e7eb",
                            }}
                          >B</button>
                          <button
                            onClick={() => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, fontStyle: l.fontStyle === "italic" ? "normal" : "italic" } : l, true)}
                            className="flex-1 py-2 rounded-lg text-sm italic font-bold border"
                            style={{
                              background: selectedLayer.fontStyle === "italic" ? "#fff4ee" : "white",
                              color: selectedLayer.fontStyle === "italic" ? "#E85D04" : "#374151",
                              borderColor: selectedLayer.fontStyle === "italic" ? "#fdd5b4" : "#e5e7eb",
                            }}
                          >I</button>
                        </div>

                        {/* Text Alignment */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Alignment</label>
                          <div className="flex gap-1">
                            {(["left", "center", "right"] as const).map(align => {
                              const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                              const isActive = (selectedLayer.textAlign ?? "center") === align;
                              return (
                                <button
                                  key={align}
                                  onClick={() => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, textAlign: align } : l, true)}
                                  className="flex-1 flex items-center justify-center py-2 rounded-lg border transition-all"
                                  style={{
                                    background: isActive ? "#fff4ee" : "white",
                                    color: isActive ? "#E85D04" : "#6b7280",
                                    borderColor: isActive ? "#fdd5b4" : "#e5e7eb",
                                  }}
                                  title={`Align ${align}`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Letter Spacing */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Letter Spacing</label>
                            <span className="text-[10px] font-bold text-gray-600">{(selectedLayer.letterSpacing ?? 0).toFixed(2)}em</span>
                          </div>
                          <input type="range" min="-0.1" max="0.5" step="0.01"
                            value={selectedLayer.letterSpacing ?? 0}
                            onChange={e => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, letterSpacing: parseFloat(e.target.value) } : l, false)}
                            onPointerUp={() => commitLayers(layers)}
                            className="w-full h-1.5 rounded-full appearance-none bg-gray-100" style={{ accentColor: "#E85D04" }} />
                        </div>

                        {/* Text Outline */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Text Outline</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-gray-400 font-semibold mb-1">Color</label>
                              <input type="color" value={selectedLayer.strokeColor ?? "#000000"}
                                onChange={e => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, strokeColor: e.target.value } : l, false)}
                                onBlur={() => commitLayers(layers)}
                                className="w-full h-8 rounded-lg border border-gray-200 cursor-pointer" />
                            </div>
                            <div>
                              <label className="block text-[9px] text-gray-400 font-semibold mb-1">Width (0=off)</label>
                              <input type="number" min={0} max={20} step={0.5}
                                value={selectedLayer.strokeWidth ?? 0}
                                onChange={e => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, strokeWidth: Math.max(0, parseFloat(e.target.value) || 0) } : l, false)}
                                onBlur={() => commitLayers(layers)}
                                className="w-full px-2 py-1.5 rounded-lg text-sm border border-gray-200 outline-none" />
                            </div>
                          </div>
                        </div>

                        {/* Text Shadow */}
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Text Shadow</label>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                              <label className="block text-[9px] text-gray-400 font-semibold mb-1">Color</label>
                              <input type="color" value={selectedLayer.shadowColor ?? "#000000"}
                                onChange={e => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, shadowColor: e.target.value } : l, false)}
                                onBlur={() => commitLayers(layers)}
                                className="w-full h-8 rounded-lg border border-gray-200 cursor-pointer" />
                            </div>
                            <div>
                              <label className="block text-[9px] text-gray-400 font-semibold mb-1">Blur</label>
                              <input type="number" min={0} max={30} step={1}
                                value={selectedLayer.shadowBlur ?? 0}
                                onChange={e => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, shadowBlur: Math.max(0, parseInt(e.target.value) || 0) } : l, false)}
                                onBlur={() => commitLayers(layers)}
                                className="w-full px-2 py-1.5 rounded-lg text-sm border border-gray-200 outline-none" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] text-gray-400 font-semibold mb-1">Offset X</label>
                              <input type="number" min={-20} max={20} step={1}
                                value={selectedLayer.shadowOffsetX ?? 0}
                                onChange={e => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, shadowOffsetX: parseInt(e.target.value) || 0 } : l, false)}
                                onBlur={() => commitLayers(layers)}
                                className="w-full px-2 py-1.5 rounded-lg text-sm border border-gray-200 outline-none" />
                            </div>
                            <div>
                              <label className="block text-[9px] text-gray-400 font-semibold mb-1">Offset Y</label>
                              <input type="number" min={-20} max={20} step={1}
                                value={selectedLayer.shadowOffsetY ?? 0}
                                onChange={e => updateLayer(selectedLayer.id, l => l.type === "text" ? { ...l, shadowOffsetY: parseInt(e.target.value) || 0 } : l, false)}
                                onBlur={() => commitLayers(layers)}
                                className="w-full px-2 py-1.5 rounded-lg text-sm border border-gray-200 outline-none" />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500 p-3 rounded-xl text-center" style={{ background: "#f9fafb" }}>
                        Add a text layer or select one to edit it.
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── LAYERS TAB ── */}
                {activeTab === "layers" && (
                  <motion.div key="layers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
                    {/* Add buttons */}
                    <div className="flex gap-2">
                      <input ref={fileInputAddRef} type="file" accept="image/jpeg,image/png,image/webp"
                        className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleFileUpload(f); e.target.value = ""; } }} />
                      <button onClick={() => fileInputAddRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border"
                        style={{ background: "white", color: "#374151", borderColor: "#e5e7eb" }}>
                        <ImageIcon className="w-3.5 h-3.5" /> Image
                      </button>
                      <button onClick={() => setActiveTab("text")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border"
                        style={{ background: "white", color: "#374151", borderColor: "#e5e7eb" }}>
                        <Type className="w-3.5 h-3.5" /> Text
                      </button>
                    </div>

                    {/* Layer list (top of stack first) */}
                    {layers.length === 0 ? (
                      <div className="text-xs text-gray-500 p-4 rounded-xl text-center" style={{ background: "#f9fafb" }}>
                        No layers yet. Add an image or text to start.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {[...layers].reverse().map((l) => {
                          const isSel = selectedLayerId === l.id;
                          return (
                            <div key={l.id}
                              onClick={() => setSelectedLayerId(l.id)}
                              className="flex items-center gap-2 p-2 rounded-lg cursor-pointer border"
                              style={{
                                background: isSel ? "#fff4ee" : "white",
                                borderColor: isSel ? "#fdd5b4" : "#eee",
                              }}
                            >
                              <button onClick={(e) => { e.stopPropagation();
                                updateLayer(l.id, x => ({ ...x, visible: !x.visible }), true);
                              }} className="text-gray-400 hover:text-gray-700" title="Show/hide">
                                {l.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              </button>
                              {l.type === "image" ? (
                                <img src={l.src} alt="" className="w-7 h-7 rounded object-cover bg-gray-100 shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                                  style={{ background: "#f3f4f6", color: l.color, fontWeight: 800, fontSize: 10 }}>T</div>
                              )}
                                <span className="text-xs font-bold text-gray-700 truncate flex-1">{l.name}</span>
                                <button onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1); }} className="text-gray-400 hover:text-gray-700" title="Bring forward">
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1); }} className="text-gray-400 hover:text-gray-700" title="Send backward">
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); duplicateLayer(l.id); }} className="text-gray-400 hover:text-gray-700" title="Duplicate">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation();
                                  updateLayer(l.id, x => ({ ...x, locked: !x.locked }), true);
                                }} className="text-gray-400 hover:text-gray-700" title="Lock/unlock">
                                  {l.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              <button onClick={(e) => { e.stopPropagation(); removeLayer(l.id); }} className="text-red-400 hover:text-red-600" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* AI Tools for image layers — shown prominently in the Layers tab */}
                    {selectedLayer?.type === 'image' && (
                      <div className='pt-3 border-t border-gray-100 space-y-2'>
                        <div className='text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2'>✨ AI Image Tools</div>
                        <button onClick={handleRemoveBg} disabled={isRemoving || isUpscaling}
                          className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:scale-[1.01]'
                          style={{ background: 'linear-gradient(135deg,#fff4ee,#ffe4cc)', color: '#E85D04', border: '1.5px solid #fdd5b4', boxShadow: '0 2px 8px rgba(232,93,4,0.15)' }}
                        >
                          {isRemoving
                            ? <><Loader2 className='w-4 h-4 animate-spin' /> Removing background...</>
                            : <><Scissors className='w-4 h-4' /> Remove Background</>}
                        </button>
                        <button onClick={handleUpscale} disabled={isRemoving || isUpscaling}
                          className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:scale-[1.01]'
                          style={{ background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', color: '#92400E', border: '1.5px solid #FCD34D', boxShadow: '0 2px 8px rgba(146,64,14,0.15)' }}
                        >
                          {isUpscaling
                            ? <><Loader2 className='w-4 h-4 animate-spin' /> Upscaling…</>
                            : <><Wand2 className='w-4 h-4' /> Upscale to HD (2×)</>}
                        </button>
                      </div>
                    )}
                    {/* Adjust selected layer */}
                    {selectedLayer && (
                      <div className="pt-3 border-t border-gray-100 space-y-3">
                        <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Adjust “{selectedLayer.name}”</div>
                        {/* Scale */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-gray-500">Scale</label>
                            <span className="text-[11px] font-bold text-gray-600">{Math.round(selectedLayer.transform.scale * 100)}%</span>
                          </div>
                          <input type="range" min="10" max="300" step="5"
                            value={Math.round(selectedLayer.transform.scale * 100)}
                            onChange={e => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, scale: parseInt(e.target.value) / 100 } }), false)}
                            onPointerUp={() => commitLayers(layers)}
                            className="w-full h-1.5 rounded-full appearance-none bg-gray-100" style={{ accentColor: "#E85D04" }} />
                          <div className="flex justify-between mt-1">
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, scale: Math.max(0.1, l.transform.scale - 0.05) } }), true)}
                              className="text-gray-400 hover:text-orange-500"><ZoomOut className="w-4 h-4" /></button>
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, scale: Math.min(5, l.transform.scale + 0.05) } }), true)}
                              className="text-gray-400 hover:text-orange-500"><ZoomIn className="w-4 h-4" /></button>
                          </div>
                        </div>
                        {/* Rotation */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-gray-500">Rotation</label>
                            <span className="text-[11px] font-bold text-gray-600">{Math.round(selectedLayer.transform.rotation)}°</span>
                          </div>
                          <input type="range" min="-180" max="180" step="1"
                            value={selectedLayer.transform.rotation}
                            onChange={e => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, rotation: parseInt(e.target.value) } }), false)}
                            onPointerUp={() => commitLayers(layers)}
                            className="w-full h-1.5 rounded-full appearance-none bg-gray-100" style={{ accentColor: "#E85D04" }} />
                          <div className="flex justify-between mt-1">
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, rotation: l.transform.rotation - 5 } }), true)}
                              className="text-gray-400 hover:text-orange-500"><RotateCcw className="w-4 h-4" /></button>
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, rotation: 0 } }), true)}
                              className="text-xs font-bold text-gray-400 hover:text-orange-500">Reset</button>
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, rotation: l.transform.rotation + 5 } }), true)}
                              className="text-gray-400 hover:text-orange-500"><RotateCw className="w-4 h-4" /></button>
                          </div>
                        </div>
                        {/* Opacity */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-gray-500">Opacity</label>
                            <span className="text-[11px] font-bold text-gray-600">{Math.round(selectedLayer.transform.opacity * 100)}%</span>
                          </div>
                          <input type="range" min="10" max="100" step="5"
                            value={Math.round(selectedLayer.transform.opacity * 100)}
                            onChange={e => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, opacity: parseInt(e.target.value) / 100 } }), false)}
                            onPointerUp={() => commitLayers(layers)}
                            className="w-full h-1.5 rounded-full appearance-none bg-gray-100" style={{ accentColor: "#E85D04" }} />
                        </div>
                        {/* Position */}
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Position</label>
                          <div className="grid grid-cols-3 gap-1 w-28 mx-auto">
                            <div />
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, y: l.transform.y - 4 } }), true)}
                              className="p-2 rounded-lg text-gray-500 hover:text-orange-500 hover:bg-orange-50 flex items-center justify-center"><ArrowUp className="w-4 h-4" /></button>
                            <div />
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, x: l.transform.x - 4 } }), true)}
                              className="p-2 rounded-lg text-gray-500 hover:text-orange-500 hover:bg-orange-50 flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></button>
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...ZERO_TRANSFORM } }), true)}
                              className="p-2 rounded-lg text-gray-500 hover:text-orange-500 hover:bg-orange-50 flex items-center justify-center"><RotateCcw className="w-3.5 h-3.5" /></button>
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, x: l.transform.x + 4 } }), true)}
                              className="p-2 rounded-lg text-gray-500 hover:text-orange-500 hover:bg-orange-50 flex items-center justify-center"><ArrowRight className="w-4 h-4" /></button>
                            <div />
                            <button onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, y: l.transform.y + 4 } }), true)}
                              className="p-2 rounded-lg text-gray-500 hover:text-orange-500 hover:bg-orange-50 flex items-center justify-center"><ArrowDown className="w-4 h-4" /></button>
                            <div />
                          </div>
                        </div>

                        {/* Align to print zone */}
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Align to Print Zone</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, x: 0 } }), true)}
                              className="flex-1 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1"
                              style={{ background: "white", borderColor: "#e5e7eb", color: "#374151" }}
                              title="Center horizontally in print zone"
                            >
                              ↔ Center H
                            </button>
                            <button
                              onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, y: 0 } }), true)}
                              className="flex-1 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1"
                              style={{ background: "white", borderColor: "#e5e7eb", color: "#374151" }}
                              title="Center vertically in print zone"
                            >
                              ↕ Center V
                            </button>
                          </div>
                          <button
                            onClick={() => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, x: 0, y: 0 } }), true)}
                            className="w-full mt-1.5 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1"
                            style={{ background: "#fff4ee", borderColor: "#fdd5b4", color: "#E85D04" }}
                          >
                            ⊞ Center Both
                          </button>
                        </div>

                        {/* Image filters — only for image layers */}
                        {selectedLayer.type === "image" && (
                          <div className="pt-2 border-t border-gray-100 space-y-3">
                            <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">Image Adjustments</div>
                            {/* Opacity */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-bold text-gray-500">Opacity</label>
                                <span className="text-[11px] font-bold text-gray-600">{Math.round((selectedLayer.transform.opacity ?? 1) * 100)}%</span>
                              </div>
                              <input type="range" min="0" max="100" step="5"
                                value={Math.round((selectedLayer.transform.opacity ?? 1) * 100)}
                                onChange={e => updateLayer(selectedLayer.id, l => ({ ...l, transform: { ...l.transform, opacity: parseInt(e.target.value) / 100 } }), false)}
                                onPointerUp={() => commitLayers(layers)}
                                className="w-full h-1.5 rounded-full appearance-none bg-gray-100" style={{ accentColor: "#E85D04" }} />
                            </div>
                            {/* Flip buttons */}
                            <div>
                              <div className="text-[11px] font-bold text-gray-500 mb-1.5">Flip</div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateLayer(selectedLayer.id, l => l.type === "image" ? { ...l, flipH: !l.flipH } : l, true)}
                                  className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
                                  style={{ background: (selectedLayer as ImageLayer).flipH ? "#fff4ee" : "white", borderColor: (selectedLayer as ImageLayer).flipH ? "#E85D04" : "#e5e7eb", color: (selectedLayer as ImageLayer).flipH ? "#E85D04" : "#6b7280" }}
                                >
                                  ↔ Flip H
                                </button>
                                <button
                                  onClick={() => updateLayer(selectedLayer.id, l => l.type === "image" ? { ...l, flipV: !l.flipV } : l, true)}
                                  className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all"
                                  style={{ background: (selectedLayer as ImageLayer).flipV ? "#fff4ee" : "white", borderColor: (selectedLayer as ImageLayer).flipV ? "#E85D04" : "#e5e7eb", color: (selectedLayer as ImageLayer).flipV ? "#E85D04" : "#6b7280" }}
                                >
                                  ↕ Flip V
                                </button>
                              </div>
                            </div>
                            {/* Brightness */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-bold text-gray-500">Brightness</label>
                                <span className="text-[11px] font-bold text-gray-600">{(selectedLayer as ImageLayer).brightness ?? 100}%</span>
                              </div>
                              <input type="range" min="20" max="200" step="5"
                                value={(selectedLayer as ImageLayer).brightness ?? 100}
                                onChange={e => updateLayer(selectedLayer.id, l => l.type === "image" ? { ...l, brightness: parseInt(e.target.value) } : l, false)}
                                onPointerUp={() => commitLayers(layers)}
                                className="w-full h-1.5 rounded-full appearance-none bg-gray-100" style={{ accentColor: "#E85D04" }} />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-bold text-gray-500">Contrast</label>
                                <span className="text-[11px] font-bold text-gray-600">{(selectedLayer as ImageLayer).contrast ?? 100}%</span>
                              </div>
                              <input type="range" min="20" max="200" step="5"
                                value={(selectedLayer as ImageLayer).contrast ?? 100}
                                onChange={e => updateLayer(selectedLayer.id, l => l.type === "image" ? { ...l, contrast: parseInt(e.target.value) } : l, false)}
                                onPointerUp={() => commitLayers(layers)}
                                className="w-full h-1.5 rounded-full appearance-none bg-gray-100" style={{ accentColor: "#E85D04" }} />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-bold text-gray-500">Saturation</label>
                                <span className="text-[11px] font-bold text-gray-600">{(selectedLayer as ImageLayer).saturation ?? 100}%</span>
                              </div>
                              <input type="range" min="0" max="200" step="5"
                                value={(selectedLayer as ImageLayer).saturation ?? 100}
                                onChange={e => updateLayer(selectedLayer.id, l => l.type === "image" ? { ...l, saturation: parseInt(e.target.value) } : l, false)}
                                onPointerUp={() => commitLayers(layers)}
                                className="w-full h-1.5 rounded-full appearance-none bg-gray-100" style={{ accentColor: "#E85D04" }} />
                            </div>
                            <button
                              onClick={() => updateLayer(selectedLayer.id, l => l.type === "image" ? { ...l, brightness: 100, contrast: 100, saturation: 100, flipH: false, flipV: false, transform: { ...l.transform, opacity: 1 } } : l, true)}
                              className="w-full py-2 rounded-lg text-xs font-bold border"
                              style={{ background: "white", borderColor: "#e5e7eb", color: "#6b7280" }}
                            >
                              Reset All Adjustments
                            </button>

                            {/* Quick filter presets */}
                            <div className="pt-2 border-t border-gray-100">
                              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Quick Presets</div>
                              <div className="grid grid-cols-4 gap-1">
                                {FILTER_PRESETS.map(preset => {
                                  const isActive = (selectedLayer as ImageLayer).brightness === preset.brightness
                                    && (selectedLayer as ImageLayer).contrast === preset.contrast
                                    && (selectedLayer as ImageLayer).saturation === preset.saturation;
                                  return (
                                    <button
                                      key={preset.name}
                                      onClick={() => updateLayer(selectedLayer.id, l => l.type === "image" ? { ...l, brightness: preset.brightness, contrast: preset.contrast, saturation: preset.saturation } : l, true)}
                                      className="py-1.5 rounded-lg text-[9px] font-black border transition-all"
                                      style={{
                                        background: isActive ? "#fff4ee" : "white",
                                        color: isActive ? "#E85D04" : "#6b7280",
                                        borderColor: isActive ? "#fdd5b4" : "#e5e7eb",
                                      }}
                                    >
                                      {preset.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── AI ART TAB ── */}
                {activeTab === "ai" && (
                  <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-3">
                    {/* Header */}
                    <div className="p-3 rounded-xl"
                      style={{ background: "linear-gradient(135deg,#3b0764,#6d28d9)", border: "none" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-200 shrink-0" />
                        <div className="text-xs font-black text-white">AI Image Studio</div>
                        <span className="ml-auto text-[9px] font-bold text-purple-300 bg-purple-800/60 px-1.5 py-0.5 rounded-full">FREE · UNLIMITED</span>
                      </div>
                      <div className="text-[10px] text-purple-200 leading-tight mb-2">
                        Generate any image, edit photos with AI commands, or create unique t-shirt designs.
                      </div>
                      {/* Model picker */}
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-purple-300 mb-1.5">AI Model</p>
                        <div className="grid grid-cols-3 gap-1">
                          {AI_MODELS.map(m => (
                            <button
                              key={m.id}
                              onClick={() => setAiModel(m.id)}
                              title={m.desc}
                              className="px-2 py-1.5 rounded-lg text-[9px] font-black transition-all text-left leading-tight"
                              style={{
                                background: aiModel === m.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                                color: aiModel === m.id ? "white" : "rgba(196,181,253,0.8)",
                                border: aiModel === m.id ? "1.5px solid rgba(255,255,255,0.3)" : "1.5px solid transparent",
                              }}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                        {aiModelUsed && (
                          <p className="text-[9px] text-purple-300 mt-1">Last used: <strong className="text-purple-200">{AI_MODELS.find(m => m.id === aiModelUsed)?.label ?? aiModelUsed}</strong></p>
                        )}
                      </div>
                    </div>

                    {/* ── Quick-edit panel for the currently selected image layer ── */}
                    {selectedLayer?.type === "image" && (
                      <div className="rounded-xl p-3 space-y-2.5"
                        style={{ background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "1.5px solid #ddd6fe" }}>
                        <div className="flex items-center gap-2">
                          <div className="text-[11px] font-black text-purple-800 flex-1">Selected layer</div>
                          <span className="text-[9px] font-bold text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded-full">image</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img
                            src={selectedLayer.src}
                            className="w-10 h-10 rounded-lg object-cover border border-purple-200 shrink-0"
                            style={{ background: "repeating-conic-gradient(#ddd6fe 0% 25%,#ede9fe 0% 50%) 0 0/12px 12px" }}
                            alt=""
                          />
                          <span className="text-[11px] font-semibold text-purple-700 truncate flex-1">{selectedLayer.name}</span>
                        </div>
                        {/* Three action buttons */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => {
                              // Convert data URL → Blob → File so the existing
                              // handleGenerateAI img2img flow works unchanged.
                              const src = (selectedLayer as any).src as string;
                              fetch(src)
                                .then(r => r.blob())
                                .then(blob => {
                                  const name = (selectedLayer.name || "layer").replace(/[^a-zA-Z0-9._-]/g, "_");
                                  const file = new File([blob], `${name}.png`, { type: blob.type || "image/png" });
                                  setAiRefFile(file);
                                  toast({ title: "Layer loaded as AI reference", description: "Describe how to edit it below." });
                                })
                                .catch(() => toast({ title: "Could not load layer", variant: "destructive" }));
                            }}
                            className="py-2 rounded-lg text-[10px] font-black flex flex-col items-center gap-0.5 transition-all hover:scale-[1.02]"
                            style={{ background: "white", color: "#7c3aed", border: "1.5px solid #ddd6fe" }}
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            Use as ref
                          </button>
                          <button
                            onClick={handleRemoveBg}
                            disabled={isRemoving || isUpscaling}
                            className="py-2 rounded-lg text-[10px] font-black flex flex-col items-center gap-0.5 disabled:opacity-50 transition-all hover:scale-[1.02]"
                            style={{ background: "white", color: "#E85D04", border: "1.5px solid #fdd5b4" }}
                          >
                            {isRemoving
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Scissors className="w-3.5 h-3.5" />}
                            {isRemoving ? "Removing…" : "Remove BG"}
                          </button>
                          <button
                            onClick={handleUpscale}
                            disabled={isRemoving || isUpscaling}
                            className="py-2 rounded-lg text-[10px] font-black flex flex-col items-center gap-0.5 disabled:opacity-50 transition-all hover:scale-[1.02]"
                            style={{ background: "white", color: "#92400E", border: "1.5px solid #FCD34D" }}
                          >
                            {isUpscaling
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Wand2 className="w-3.5 h-3.5" />}
                            {isUpscaling ? "Upscaling…" : "Upscale HD"}
                          </button>
                        </div>
                        <p className="text-[9px] text-purple-500 text-center leading-tight">
                          "Use as ref" → describe the edit below → tap <strong>Edit with AI</strong>
                        </p>
                      </div>
                    )}

                    {/* Reference image upload */}
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                        Reference image <span className="normal-case font-medium text-gray-400">(optional — AI will edit your photo)</span>
                      </label>
                      <input
                        ref={aiRefInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0] ?? null;
                          setAiRefFile(f);
                          e.target.value = "";
                        }}
                      />
                      {aiRefPreviewUrl ? (
                        <div className="flex items-center gap-2 p-2 rounded-xl border border-purple-200"
                          style={{ background: "rgba(124,58,237,0.04)" }}>
                          <img src={aiRefPreviewUrl} alt="reference" className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-200" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-gray-700 truncate">{aiRefFile?.name}</p>
                            <p className="text-[10px] text-purple-600 mt-0.5">AI will edit this image using your description below</p>
                          </div>
                          <button onClick={() => setAiRefFile(null)}
                            className="shrink-0 p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => aiRefInputRef.current?.click()}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-dashed transition-all hover:border-purple-300 hover:bg-purple-50"
                          style={{ borderColor: "#d1d5db", background: "#fafafa" }}
                        >
                          <Upload className="w-4 h-4 text-gray-400 shrink-0" />
                          <div className="text-left">
                            <p className="text-[11px] font-bold text-gray-600">Upload your image</p>
                            <p className="text-[10px] text-gray-400">JPG, PNG, WebP · AI will transform it</p>
                          </div>
                        </button>
                      )}
                    </div>

                    {/* Prompt input */}
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                        {aiRefFile ? "Editing command" : "Describe your image"}
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={e => { setAiPrompt(e.target.value); setAiError(null); }}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerateAI(); } }}
                        placeholder={aiRefFile
                          ? 'e.g. "Remove background and make it a cartoon" or "Make it look like a watercolor painting"'
                          : 'e.g. "Lion with crown, streetwear style" or "ফুলের ডিজাইন, রঙিন"'}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 focus:border-orange-400 outline-none resize-none"
                        style={{ background: "#fafafa" }}
                      />
                    </div>

                    {/* Style category prompt picker */}
                    {!aiRefFile && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Design styles</label>
                        {/* Category tabs */}
                        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
                          {AI_STYLE_CATEGORIES.map((cat, idx) => (
                            <button
                              key={idx}
                              onClick={() => setAiStyleTab(idx)}
                              className="shrink-0 px-2 py-1 rounded-lg text-[9px] font-black transition-all whitespace-nowrap"
                              style={{
                                background: aiStyleTab === idx ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "white",
                                color: aiStyleTab === idx ? "white" : "#6b7280",
                                border: aiStyleTab === idx ? "none" : "1.5px solid #e5e7eb",
                              }}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                        {/* Prompts for selected category */}
                        <div className="grid grid-cols-2 gap-1">
                          {AI_STYLE_CATEGORIES[aiStyleTab].prompts.map(s => (
                            <button key={s}
                              onClick={() => { setAiPrompt(s); setAiError(null); }}
                              className="px-2 py-1.5 rounded-lg text-[10px] font-bold border text-left transition-all hover:border-purple-300 hover:bg-purple-50 leading-tight"
                              style={{ background: "white", borderColor: "#e5e7eb", color: "#374151" }}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Negative prompt (advanced) */}
                    {!aiRefFile && (
                      <details className="group">
                        <summary className="text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer list-none flex items-center gap-1 select-none">
                          <span className="text-gray-300 group-open:rotate-90 transition-transform inline-block">▶</span>
                          Advanced options
                        </summary>
                        <div className="mt-2">
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Negative prompt <span className="font-normal text-gray-400">(what to avoid)</span></label>
                          <input
                            value={aiNegativePrompt}
                            onChange={e => setAiNegativePrompt(e.target.value)}
                            placeholder='e.g. "blurry, text, watermark, ugly"'
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 focus:border-purple-400 outline-none"
                            style={{ background: "#fafafa" }}
                          />
                        </div>
                      </details>
                    )}

                    {/* AI progress bar */}
                    {aiGenerating && (
                      <div className="rounded-xl p-3 space-y-1.5" style={{ background: "#f5f3ff", border: "1px solid #ede9fe" }}>
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-bold text-purple-700 flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {aiPhase ?? "Working…"}
                          </p>
                          <span className="text-[10px] font-black text-purple-400">{Math.round(aiProgress)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#ddd6fe" }}>
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${aiProgress}%`,
                              background: "linear-gradient(90deg,#7c3aed,#a855f7,#c084fc)",
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-purple-400">AI generation usually takes 10–30 seconds</p>
                      </div>
                    )}

                    {/* Generate button */}
                    <button
                      onClick={handleGenerateAI}
                      disabled={aiGenerating || !aiPrompt.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white disabled:opacity-50 transition-all"
                      style={{ background: aiRefFile
                        ? "linear-gradient(135deg,#7c3aed,#6d28d9)"
                        : "linear-gradient(135deg,#7c3aed,#a855f7)",
                        boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}
                    >
                      {aiGenerating
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {aiRefFile ? "Editing…" : "Generating…"}</>
                        : aiRefFile
                          ? <><Wand2 className="w-4 h-4" /> Edit with AI</>
                          : <><Wand2 className="w-4 h-4" /> Generate AI Image</>}
                    </button>

                    {aiError && (
                      <div className="flex items-start gap-2 p-3 rounded-xl text-xs text-red-700"
                        style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{aiError}</span>
                      </div>
                    )}

                    {/* History */}
                    {aiHistory.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 mb-2">Recent generations</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {aiHistory.map((h, i) => (
                            <button key={i} title={h.prompt}
                              onClick={() => {
                                const img = new Image();
                                img.onload = () => {
                                  const layer: ImageLayer = {
                                    id: uid(), name: h.prompt.slice(0, 30),
                                    type: "image", src: h.url,
                                    naturalW: img.naturalWidth || 512,
                                    naturalH: img.naturalHeight || 512,
                                    visible: true, locked: false,
                                    transform: { x: 0, y: 0, scale: 0.85, rotation: 0, opacity: 1 },
                                    face: activeFaceRef.current,
                                  };
                                  flushSync(() => {
                                    commitLayers([...layersRef.current, layer]);
                                    setSelectedLayerId(layer.id);
                                    setActiveTab("layers");
                                  });
                                };
                                img.src = h.url;
                              }}
                              className="aspect-square rounded-lg overflow-hidden border border-gray-100 hover:border-orange-300 transition-all hover:shadow-sm"
                              style={{ background: "#f9fafb" }}
                            >
                              <img src={h.url} alt={h.prompt} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1.5 text-center">Tap any previous result to re-add it</p>
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-2.5 rounded-xl text-[10px] text-gray-500"
                      style={{ background: "#f9fafb" }}>
                      <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-400" />
                      <span>After generating, use <strong>Remove Background</strong> in the Layers tab for a transparent cutout — perfect for t-shirt prints.</span>
                    </div>
                  </motion.div>
                )}

                {/* ── TEMPLATES TAB ── */}
                {activeTab === "templates" && (
                  <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
                    <p className="text-[11px] text-gray-500 mb-3">Pick a starter — adds editable text layers you can tweak.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {TEMPLATES.map(t => (
                        <button key={t.id}
                          onClick={() => {
                            const newLayers = t.create();
                            commitLayers([...layers, ...newLayers]);
                            setSelectedLayerId(newLayers[newLayers.length - 1].id);
                            setActiveTab("layers");
                          }}
                          className="aspect-square rounded-xl flex flex-col items-center justify-center p-3 text-center border transition-all hover:border-orange-300 hover:shadow-sm"
                          style={{ background: "#fafaf8", borderColor: "#eee" }}
                        >
                          <div className="text-base font-black text-gray-800 leading-tight whitespace-pre">{t.preview}</div>
                          <div className="text-[10px] mt-2 text-gray-500 font-semibold">{t.name}</div>
                        </button>
                      ))}
                    </div>

                    {/* Stickers subsection */}
                    <div className="mt-5 pt-4 border-t border-gray-100" data-testid="sticker-section">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Stickers</h3>
                        <span className="text-[10px] text-gray-400 font-semibold">{STICKERS.length} shapes</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-3">Tap to drop a vector sticker — drag, pinch & rotate just like an image.</p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {STICKERS.map(s => (
                          <button key={s.id}
                            data-testid={`sticker-${s.id}`}
                            title={s.name}
                            onClick={() => {
                              const img = new Image();
                              const finish = (w: number, h: number) => {
                                addLayer({
                                  id: uid(),
                                  name: s.name,
                                  type: "image",
                                  visible: true,
                                  locked: false,
                                  transform: { ...ZERO_TRANSFORM, scale: 0.4 },
                                  src: s.dataUrl,
                                  naturalW: w,
                                  naturalH: h,
                                });
                                setActiveTab("layers");
                              };
                              img.onload = () => finish(img.naturalWidth || 100, img.naturalHeight || 100);
                              // Defensive fallback: if the data URL fails to decode for any reason,
                              // still drop a layer at the SVG's known 100×100 viewBox dimensions
                              // and let the user know the preview thumbnail may be missing.
                              img.onerror = () => {
                                finish(100, 100);
                                toast({
                                  title: "Sticker added",
                                  description: "Couldn't render a preview, but the shape was placed.",
                                });
                              };
                              img.src = s.dataUrl;
                            }}
                            className="aspect-square rounded-lg flex items-center justify-center p-1.5 border transition-all hover:border-orange-300 hover:shadow-sm hover:bg-orange-50/30"
                            style={{ background: "white", borderColor: "#eee" }}
                          >
                            <img src={s.dataUrl} alt={s.name} className="w-full h-full object-contain pointer-events-none" />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-xl text-xs text-gray-500 flex items-start gap-2"
                      style={{ background: "#fff4ee", border: "1px solid #fdd5b4" }}>
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-orange-500" />
                      <span>Tap a template or sticker, then customize from the Layers tab.</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </div>

            {/* Quantity + price summary */}
            <div
              className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shrink-0"
              style={{ background: "white", border: "1px solid #e9e5e0" }}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">
                  {quantity > 1 ? `${quantity} × ৳${studioPrice.toLocaleString()}` : `৳${studioPrice.toLocaleString()} each`}
                </div>
                <div className="text-sm font-black text-gray-900">
                  Subtotal: <span className="text-orange-500">৳{(quantity * studioPrice).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg text-gray-700 disabled:opacity-40 transition-colors hover:bg-orange-50 hover:text-orange-600"
                  style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }}
                  aria-label="Decrease quantity"
                >−</button>
                <span className="text-sm font-black text-gray-800 w-6 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => Math.min(50, q + 1))}
                  disabled={quantity >= 50}
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg text-gray-700 disabled:opacity-40 transition-colors hover:bg-orange-50 hover:text-orange-600"
                  style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }}
                  aria-label="Increase quantity"
                >+</button>
              </div>
            </div>

            {/* Add to cart */}
            <motion.button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2.5 disabled:opacity-60 shrink-0"
              style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)", boxShadow: "0 8px 24px rgba(232,93,4,0.35)" }}
            >
              {isAddingToCart
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Adding to Cart...</>
                : <><ShoppingCart className="w-5 h-5" /> Add Custom {selectedProduct.name} to Cart</>}
            </motion.button>

            {(() => {
              const subtotal = quantity * studioPrice;
              const freeShip = subtotal >= 1500;
              return (
                <div className="text-center text-xs space-y-0.5">
                  {!isMug && !isCap && !isWaterBottle && (
                    <div className="text-gray-500">
                      Size: <strong className="text-gray-700">{selectedSize}</strong>
                    </div>
                  )}
                  <div className={freeShip ? "text-green-600 font-bold" : "text-gray-400"}>
                    {freeShip
                      ? "✓ Free shipping included!"
                      : `Add ৳${(1500 - subtotal).toLocaleString()} more for free shipping`}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      <Footer />

      <ConfirmDialog
        open={!!legacyDraftFound}
        title="Older design draft found"
        description={`We found a saved design from an older version of the editor (v${legacyDraftFound?.version ?? "?"}). It can't be restored automatically. Discard it and start fresh?`}
        confirmText="Discard old draft"
        cancelText="Keep for now"
        variant="warning"
        onConfirm={() => {
          try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
          setLegacyDraftFound(null);
          toast({ title: "Old draft discarded", description: "You can now start fresh." });
        }}
        onCancel={() => setLegacyDraftFound(null)}
      />

      {/* ═══════ PRODUCT CATALOG PICKER MODAL ═══════ */}
      <AnimatePresence>
        {showProductPicker && (
          <>
            {/* Backdrop */}
            <motion.div
              key="picker-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowProductPicker(false)}
            />
            {/* Modal panel */}
            <motion.div
              key="picker-panel"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed inset-x-3 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 flex flex-col"
              style={{
                maxWidth: 680,
                height: "min(90vh, 720px)",
                width: "100%",
                background: "white",
                borderRadius: "24px 24px 0 0",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              {/* Modal header */}
              <div className="px-5 pt-5 pb-3 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-black text-gray-900 text-lg">Choose a Blank to Design</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Select a clean blank template — T-shirts, hoodies, mugs, caps & more</p>
                  </div>
                  <button
                    onClick={() => setShowProductPicker(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                    style={{ background: "#f3f4f6" }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border border-gray-200 outline-none focus:border-orange-400"
                    style={{ background: "#f9fafb" }}
                  />
                </div>

                {/* Category filter pills */}
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {(["all", "tshirt", "hoodie", "longsleeve", "mug", "cap", "waterbottle"] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setProductPickerCategory(cat)}
                      className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all"
                      style={{
                        background: productPickerCategory === cat ? "linear-gradient(135deg,#E85D04,#FB8500)" : "#f3f4f6",
                        color: productPickerCategory === cat ? "white" : "#6b7280",
                        boxShadow: productPickerCategory === cat ? "0 3px 10px rgba(232,93,4,0.3)" : "none",
                      }}
                    >
                      {cat === "all" ? "All Products" : cat === "tshirt" ? "T-Shirts" : cat === "hoodie" ? "Hoodies" : cat === "longsleeve" ? "Long Sleeves" : cat === "mug" ? "Mugs" : cat === "cap" ? "Caps" : "Bottles"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product grid */}
              <div className="overflow-y-auto flex-1 px-5 pb-6" style={{ minHeight: 0 }}>
                {(() => {
                  const query = productSearch.trim().toLowerCase();

                  const filtered = PRODUCTS.filter(p => {
                    const matchesCat = productPickerCategory === "all" || p.category === productPickerCategory;
                    const matchesSearch = !query || p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
                    return matchesCat && matchesSearch;
                  });

                  if (filtered.length === 0) return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="font-bold text-gray-600">No templates found</p>
                      <p className="text-sm text-gray-400 mt-1">Try a different search or category</p>
                    </div>
                  );

                  return (
                    <div className="pt-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filtered.map(prod => {
                        const isSelected = selectedProduct.id === prod.id && !linkedStoreProduct;
                        return (
                          <button
                            key={prod.id}
                            onClick={() => {
                              perProductLayersRef.current[selectedProduct.id] = {
                                layers: layersRef.current,
                                stack: historyRef.current.stack,
                                index: historyRef.current.index,
                              };
                              const saved = perProductLayersRef.current[prod.id];
                              const newLayers = saved?.layers ?? [];
                              const newStack = saved?.stack ?? [[]];
                              const newHistIdx = saved?.index ?? 0;
                              historyRef.current = { stack: newStack, index: newHistIdx };
                              const nextColor = prod.colors.find(c => c.hex.toLowerCase() === selectedColor.hex.toLowerCase()) ?? prod.colors[0];
                              flushSync(() => {
                                setLayers(newLayers);
                                setSelectedLayerId(null);
                                setSelectedProduct(prod);
                                setSelectedColor(nextColor);
                                setLinkedStoreProduct(null);
                                setQuantity(1);
                                setActiveFace("front");
                              });
                              forceHistoryTick(t => t + 1);
                              // All products now support 3D — no reset needed when switching
                              setShowProductPicker(false);
                            }}
                            className="flex flex-col rounded-2xl overflow-hidden transition-all text-left group"
                            style={{
                              border: isSelected ? "2.5px solid #E85D04" : "1.5px solid #e5e7eb",
                              boxShadow: isSelected ? "0 4px 16px rgba(232,93,4,0.2)" : "0 1px 6px rgba(0,0,0,0.05)",
                              background: isSelected ? "#fff9f6" : "white",
                            }}
                          >
                            {/* Product photo */}
                            <div className="w-full aspect-square relative overflow-hidden"
                              style={{ background: "radial-gradient(ellipse at 50% 40%, #f5f5f3 0%, #e8e5e0 100%)" }}>
                              <img
                                src={prod.frontSrc}
                                alt={prod.name}
                                className="w-full h-full object-contain transition-transform group-hover:scale-105"
                                style={{ padding: "8%" }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "";
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                              {prod.badge && (
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-black text-white"
                                  style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)" }}>
                                  {prod.badge}
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                                  style={{ background: "#E85D04" }}>
                                  <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                            {/* Info */}
                            <div className="px-3 py-2.5">
                              <div className="text-xs font-black text-gray-800 leading-tight truncate">{prod.name}</div>
                              <div className="text-[10px] text-gray-400 font-semibold mt-0.5 mb-1.5">{prod.description}</div>
                              {prod.colors.length > 1 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {prod.colors.slice(0, 6).map(c => (
                                    <div
                                      key={c.hex}
                                      className="w-3 h-3 rounded-full"
                                      style={{
                                        background: c.hex,
                                        border: (c.hex === "#F8F7F4" || c.hex === "#F5F5F3" || c.hex === "#F2EFE9" || c.hex === "#F5F5F5" || c.hex === "#F5F2EC" || c.hex === "#F4F3F1")
                                          ? "1px solid #d1d5db"
                                          : "1px solid transparent",
                                      }}
                                      title={c.name}
                                    />
                                  ))}
                                  {prod.colors.length > 6 && (
                                    <span className="text-[9px] text-gray-400 font-bold">+{prod.colors.length - 6}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                        </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════ CROP IMAGE MODAL ═══════════════════ */}
      {cropLayerId && (() => {
        const cl = layers.find(l => l.id === cropLayerId) as ImageLayer | undefined;
        if (!cl || cl.type !== "image") return null;
        const aspect = cl.naturalW / Math.max(cl.naturalH, 1);
        // Crop handle drag logic (uses closure refs to avoid stale captures)
        const dragRef = { active: false, corner: "", startX: 0, startY: 0, startCrop: cropPct };
        const CORNERS = [
          { key: "tl", cx: cropPct.x,              cy: cropPct.y,              cursor: "nw-resize" },
          { key: "tr", cx: cropPct.x + cropPct.w,  cy: cropPct.y,              cursor: "ne-resize" },
          { key: "bl", cx: cropPct.x,              cy: cropPct.y + cropPct.h,  cursor: "sw-resize" },
          { key: "br", cx: cropPct.x + cropPct.w,  cy: cropPct.y + cropPct.h,  cursor: "se-resize" },
        ];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={() => setCropLayerId(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{ width: "min(480px, 95vw)" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <span className="font-bold text-gray-800 text-sm">Crop Image</span>
                <button onClick={() => setCropLayerId(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Image + SVG crop overlay */}
              <div className="p-4">
                <div
                  className="relative mx-auto overflow-hidden rounded-xl"
                  style={{
                    width: "100%",
                    maxHeight: "340px",
                    aspectRatio: String(aspect),
                    background: "repeating-conic-gradient(#ccc 0% 25%,#f0f0f0 0% 50%) 0 0/16px 16px",
                  }}
                >
                  <img
                    src={cl.src} alt="Crop preview"
                    className="absolute inset-0 w-full h-full object-fill"
                    draggable={false}
                    style={{ userSelect: "none" }}
                  />
                  {/* SVG crop overlay — dark mask + bright rect + handles */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ touchAction: "none" }}
                    onPointerMove={e => {
                      if (!dragRef.active) return;
                      const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                      const px = ((e.clientX - rect.left) / rect.width) * 100;
                      const py = ((e.clientY - rect.top) / rect.height) * 100;
                      const dx = px - dragRef.startX;
                      const dy = py - dragRef.startY;
                      const s = dragRef.startCrop;
                      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
                      setCropPct(prev => {
                        let { x, y, w, h } = s;
                        if (dragRef.corner === "tl") { x = clamp(s.x + dx, 0, s.x + s.w - 5); y = clamp(s.y + dy, 0, s.y + s.h - 5); w = s.w - (x - s.x); h = s.h - (y - s.y); }
                        else if (dragRef.corner === "tr") { w = clamp(s.w + dx, 5, 100 - s.x); y = clamp(s.y + dy, 0, s.y + s.h - 5); h = s.h - (y - s.y); }
                        else if (dragRef.corner === "bl") { x = clamp(s.x + dx, 0, s.x + s.w - 5); w = s.w - (x - s.x); h = clamp(s.h + dy, 5, 100 - s.y); }
                        else if (dragRef.corner === "br") { w = clamp(s.w + dx, 5, 100 - s.x); h = clamp(s.h + dy, 5, 100 - s.y); }
                        return { x, y, w, h };
                      });
                    }}
                    onPointerUp={() => { dragRef.active = false; }}
                  >
                    {/* Dark mask outside crop rect */}
                    <path
                      fillRule="evenodd"
                      d={`M0,0 H100 V100 H0 Z M${cropPct.x},${cropPct.y} H${cropPct.x + cropPct.w} V${cropPct.y + cropPct.h} H${cropPct.x} Z`}
                      fill="rgba(0,0,0,0.45)"
                    />
                    {/* Crop border */}
                    <rect x={cropPct.x} y={cropPct.y} width={cropPct.w} height={cropPct.h}
                      fill="none" stroke="white" strokeWidth="0.6" strokeDasharray="2 1.5" />
                    {/* Corner handles */}
                    {CORNERS.map(c => (
                      <circle key={c.key} cx={c.cx} cy={c.cy} r={2.5}
                        fill="white" stroke="#E85D04" strokeWidth="0.5"
                        style={{ cursor: c.cursor, touchAction: "none" }}
                        onPointerDown={e => {
                          e.stopPropagation();
                          (e.target as Element).setPointerCapture(e.pointerId);
                          const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                          dragRef.active = true;
                          dragRef.corner = c.key;
                          dragRef.startX = ((e.clientX - rect.left) / rect.width) * 100;
                          dragRef.startY = ((e.clientY - rect.top) / rect.height) * 100;
                          dragRef.startCrop = { ...cropPct };
                        }}
                      />
                    ))}
                  </svg>
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-2">Drag the corners to adjust the crop area</p>
              </div>
              {/* Actions */}
              <div className="flex gap-2 px-4 pb-4">
                <button onClick={() => setCropLayerId(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={applyCrop}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)" }}>
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
