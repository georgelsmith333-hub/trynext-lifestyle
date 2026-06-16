import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useLocation } from "wouter";
import {
  initFacebookPixel,
  initGoogleAds,
  trackPageView,
} from "@/lib/tracking";

// GA4 (G-TF8CJ1DL75) is hardcoded in index.html so it fires immediately
// before React mounts — ensuring Google sees it even on slow connections.
// This component only handles FB Pixel, Google Ads, and SPA page-view events.

export function TrackingPixels() {
  const settings = useSiteSettings();
  const [location] = useLocation();
  const initialized = useRef(false);

  useEffect(() => {
    if (!settings.isLoaded || initialized.current) return;
    initialized.current = true;

    if (settings.facebookPixelId) {
      initFacebookPixel(settings.facebookPixelId);
    }
    if (settings.googleAdsId) {
      initGoogleAds(settings.googleAdsId);
    }
  }, [settings.isLoaded, settings.facebookPixelId, settings.googleAdsId]);

  // Fire a page_view on every client-side route change (SPA navigation).
  // GA4 already received the initial page_view from the hardcoded tag;
  // subsequent navigations need to be tracked manually.
  useEffect(() => {
    if (!window.gtag) return;
    window.gtag("event", "page_view", { page_path: location });
    if (window.fbq) window.fbq("track", "PageView");
  }, [location]);

  return null;
}
