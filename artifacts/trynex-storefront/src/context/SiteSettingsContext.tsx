import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useGetSettings } from "@workspace/api-client-react";

interface SiteSettings {
  siteName: string;
  tagline: string;
  footerDescription: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  heroTitle: string;
  heroSubtitle: string;
  announcementBar: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
  googleAdsId: string;
  freeShippingThreshold: number;
  shippingCost: number;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  upayNumber: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  bankRoutingNumber: string;
  cardPaymentNote: string;
  codEnabled: boolean;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  promoBannerTitle: string;
  promoBannerSubtitle: string;
  promoBannerDiscount: string;
  promoBannerCTA: string;
  promoBannerEnabled: boolean;
  siteIcon: string;
  facebookAppId: string;
  googleClientId: string;
  googleSiteVerification: string;
  studioTshirtColors: string;
  studioMugColors: string;
  studioTshirtPrice: number;
  studioMugPrice: number;
  studioHoodiePrice: number;
  studioLongsleevePrice: number;
  studioCapPrice: number;
  studioWaterbottlePrice: number;
  studioTshirtCustomizationFee: number;
  studioHoodieCustomizationFee: number;
  studioLongsleeveCustomizationFee: number;
  studioCapCustomizationFee: number;
  studioMugCustomizationFee: number;
  studioWaterbottleCustomizationFee: number;
  heroImageUrl: string;
  heroGradient: string;
  heroCTAText: string;
  heroCTALink: string;
  primaryColor: string;
  announcementColor: string;
  trustBadge1Title: string;
  trustBadge1Desc: string;
  trustBadge2Title: string;
  trustBadge2Desc: string;
  trustBadge3Title: string;
  trustBadge3Desc: string;
  trustBadge4Title: string;
  trustBadge4Desc: string;
  sectionFeaturedEnabled: boolean;
  sectionCategoriesEnabled: boolean;
  sectionFlashSaleEnabled: boolean;
  sectionTestimonialsEnabled: boolean;
  sectionStatsEnabled: boolean;
  categoryTshirtsEnabled: boolean;
  categoryHoodiesEnabled: boolean;
  categoryCapsEnabled: boolean;
  categoryMugsEnabled: boolean;
  categoryCustomEnabled: boolean;
  trustBadge1Icon: string;
  trustBadge2Icon: string;
  trustBadge3Icon: string;
  trustBadge4Icon: string;
  announcementEnabled: boolean;
  announcementAutoHide: boolean;
  flashSaleEnabled: boolean;
  flashSaleEndTime: string;
  flashSaleMessage: string;
  scarcityThreshold: number;
  exitIntentPromoEnabled: boolean;
  exitIntentPromoCode: string;
  exitIntentPromoDiscount: string;
  salePageTitle: string;
  salePageSubtitle: string;
  salePageBadge: string;
  spinWheelEnabled: boolean;
  spinWheelDelay: number;
  spinWheelTitle: string;
  spinWheelSubtitle: string;
  spinWheelResetAt: number;
  spinWheelCooldownHours: number;
  seoDefaultTitle: string;
  seoDefaultDescription: string;
  seoDefaultKeywords: string;
  seoOgImage: string;
  seoTwitterHandle: string;
  metaCapiTokenConfigured: boolean;
  heroTypewriterPhrases: string;
  isLoaded: boolean;
}

const CACHE_KEY = "trynext_site_settings_v6";

function getCachedSettings(): Partial<SiteSettings> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return {};
}

const cached = getCachedSettings();

const c = (key: keyof SiteSettings) => (cached[key] as any) ?? undefined;

const defaults: SiteSettings = {
  siteName: c("siteName") || "",
  tagline: c("tagline") || "",
  footerDescription: c("footerDescription") || "",
  phone: c("phone") || "",
  whatsappNumber: c("whatsappNumber") || "",
  email: c("email") || "",
  address: c("address") || "",
  heroTitle: c("heroTitle") || "",
  heroSubtitle: c("heroSubtitle") || "",
  announcementBar: c("announcementBar") || "",
  googleAnalyticsId: c("googleAnalyticsId") || "",
  facebookPixelId: c("facebookPixelId") || "",
  googleAdsId: c("googleAdsId") || "",
  freeShippingThreshold: c("freeShippingThreshold") ?? 0,
  shippingCost: c("shippingCost") ?? 0,
  bkashNumber: c("bkashNumber") || "",
  nagadNumber: c("nagadNumber") || "",
  rocketNumber: c("rocketNumber") || "",
  upayNumber: c("upayNumber") || "",
  bankName: c("bankName") || "",
  bankAccountName: c("bankAccountName") || "",
  bankAccountNumber: c("bankAccountNumber") || "",
  bankBranch: c("bankBranch") || "",
  bankRoutingNumber: c("bankRoutingNumber") || "",
  cardPaymentNote: c("cardPaymentNote") || "Pay with card on delivery (POS machine available).",
  codEnabled: c("codEnabled") ?? true,
  facebookUrl: c("facebookUrl") || "",
  instagramUrl: c("instagramUrl") || "",
  youtubeUrl: c("youtubeUrl") || "",
  promoBannerTitle: c("promoBannerTitle") || "",
  promoBannerSubtitle: c("promoBannerSubtitle") || "",
  promoBannerDiscount: c("promoBannerDiscount") || "",
  promoBannerCTA: c("promoBannerCTA") || "",
  promoBannerEnabled: c("promoBannerEnabled") ?? true,
  siteIcon: c("siteIcon") || "",
  facebookAppId: c("facebookAppId") || "",
  googleClientId: c("googleClientId") || "",
  googleSiteVerification: c("googleSiteVerification") || "",
  studioTshirtColors: c("studioTshirtColors") || "",
  studioMugColors: c("studioMugColors") || "",
  // Published custom-design defaults: T-shirt ৳450 + ৳99; mug ৳449 + ৳99.
  studioTshirtPrice: Number(c("studioTshirtPrice")) || 450,
  studioMugPrice: Number(c("studioMugPrice")) || 449,
  studioHoodiePrice: Number(c("studioHoodiePrice")) || 1699,
  studioLongsleevePrice: Number(c("studioLongsleevePrice")) || 1299,
  studioCapPrice: Number(c("studioCapPrice")) || 699,
  studioWaterbottlePrice: Number(c("studioWaterbottlePrice")) || 899,
  studioTshirtCustomizationFee: Number(c("studioTshirtCustomizationFee")) || 99,
  studioHoodieCustomizationFee: Number(c("studioHoodieCustomizationFee")) || 99,
  studioLongsleeveCustomizationFee: Number(c("studioLongsleeveCustomizationFee")) || 99,
  studioCapCustomizationFee: Number(c("studioCapCustomizationFee")) || 99,
  studioMugCustomizationFee: Number(c("studioMugCustomizationFee")) || 99,
  studioWaterbottleCustomizationFee: Number(c("studioWaterbottleCustomizationFee")) || 99,
  heroImageUrl: c("heroImageUrl") || "",
  heroGradient: c("heroGradient") || "",
  heroCTAText: c("heroCTAText") || "Shop Now",
  heroCTALink: c("heroCTALink") || "/shop",
  primaryColor: c("primaryColor") || "#E85D04",
  announcementColor: c("announcementColor") || "#E85D04",
  trustBadge1Title: c("trustBadge1Title") || "100% Secure Payments",
  trustBadge1Desc: c("trustBadge1Desc") || "bKash, Nagad & uPay — 25% advance",
  trustBadge2Title: c("trustBadge2Title") || "Nationwide Delivery",
  trustBadge2Desc: c("trustBadge2Desc") || "All 64 districts of Bangladesh",
  trustBadge3Title: c("trustBadge3Title") || "Quality Guarantee",
  trustBadge3Desc: c("trustBadge3Desc") || "230-320GSM premium fabric",
  trustBadge4Title: c("trustBadge4Title") || "Design Studio Ready",
  trustBadge4Desc: c("trustBadge4Desc") || "Preview artwork before checkout",
  sectionFeaturedEnabled: c("sectionFeaturedEnabled") ?? true,
  sectionCategoriesEnabled: c("sectionCategoriesEnabled") ?? true,
  sectionFlashSaleEnabled: c("sectionFlashSaleEnabled") ?? true,
  sectionTestimonialsEnabled: c("sectionTestimonialsEnabled") ?? true,
  sectionStatsEnabled: c("sectionStatsEnabled") ?? true,
  categoryTshirtsEnabled: c("categoryTshirtsEnabled") ?? true,
  categoryHoodiesEnabled: c("categoryHoodiesEnabled") ?? true,
  categoryCapsEnabled: c("categoryCapsEnabled") ?? true,
  categoryMugsEnabled: c("categoryMugsEnabled") ?? true,
  categoryCustomEnabled: c("categoryCustomEnabled") ?? true,
  trustBadge1Icon: c("trustBadge1Icon") || "shield",
  trustBadge2Icon: c("trustBadge2Icon") || "truck",
  trustBadge3Icon: c("trustBadge3Icon") || "award",
  trustBadge4Icon: c("trustBadge4Icon") || "users",
  announcementEnabled: c("announcementEnabled") ?? true,
  announcementAutoHide: c("announcementAutoHide") ?? false,
  flashSaleEnabled: c("flashSaleEnabled") ?? false,
  flashSaleEndTime: c("flashSaleEndTime") || "",
  flashSaleMessage: c("flashSaleMessage") || "⚡ FLASH SALE — Limited Stock!",
  scarcityThreshold: Number(c("scarcityThreshold")) || 5,
  exitIntentPromoEnabled: c("exitIntentPromoEnabled") ?? true,
  exitIntentPromoCode: c("exitIntentPromoCode") || "",
  exitIntentPromoDiscount: c("exitIntentPromoDiscount") || "10%",
  salePageTitle: c("salePageTitle") || "Mega Sale — Up to 50% Off!",
  salePageSubtitle: c("salePageSubtitle") || "Bangladesh's best custom apparel at unbeatable prices.",
  salePageBadge: c("salePageBadge") || "LIMITED TIME",
  spinWheelEnabled: c("spinWheelEnabled") ?? true,
  spinWheelDelay: Number(c("spinWheelDelay")) || 4,
  spinWheelTitle: c("spinWheelTitle") || "Spin & Win an Offer!",
  spinWheelSubtitle: c("spinWheelSubtitle") || "One free spin — no purchase needed.",
  spinWheelResetAt: Number(c("spinWheelResetAt")) || 0,
  spinWheelCooldownHours: Number(c("spinWheelCooldownHours")) || 24,
  seoDefaultTitle: c("seoDefaultTitle") || "Trynext Lifestyle — Custom Apparel & Gifts in Bangladesh",
  seoDefaultDescription: c("seoDefaultDescription") || "Design and order custom T-shirts, hoodies, mugs, caps, and gift hampers in Bangladesh. Premium quality, nationwide delivery, pay just 25% in advance.",
  seoDefaultKeywords: c("seoDefaultKeywords") || "custom t-shirt bangladesh, personalized mug, gift hamper, custom hoodie, design studio, trynext",
  seoOgImage: c("seoOgImage") || "",
  seoTwitterHandle: c("seoTwitterHandle") || "",
  metaCapiTokenConfigured: c("metaCapiTokenConfigured") ?? false,
  heroTypewriterPhrases: c("heroTypewriterPhrases") || "",
  isLoaded: false,
};

const SiteSettingsContext = createContext<SiteSettings>(defaults);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useGetSettings();
  const remote = (data as Partial<SiteSettings> | undefined) || {};
  const settings: SiteSettings = {
    ...defaults,
    ...remote,
    // Keep the configured wallet destination authoritative; empty means the
    // method is unavailable rather than inventing a customer-facing number.
    upayNumber: remote.upayNumber?.trim() || defaults.upayNumber || "",
    isLoaded: !!data,
  };

  useEffect(() => {
    if (data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
    }
  }, [data]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
