import { useEffect, lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import { ScrollProvider } from "@/context/ScrollContext";
import { useLenis } from "@/hooks/useLenis";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { TrackingPixels } from "@/components/TrackingPixels";
import { BrandingUpdater } from "@/components/BrandingUpdater";
import { ScrollToTop } from "@/components/ScrollToTop";
import { BackToTop } from "@/components/BackToTop";
import { AbandonedCartPopup } from "@/components/AbandonedCartPopup";
import { DesignDraftReminder } from "@/components/DesignDraftReminder";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { SocialAuthLoader } from "@/components/SocialAuthLoader";
import { FlashSaleBar } from "@/components/FlashSaleBar";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { useUtmCapture } from "@/hooks/useUtm";
import { Loader } from "@/components/ui/Loader";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { getApiBaseUrl } from "@/lib/utils";
import { ApiError, setBaseUrl } from "@workspace/api-client-react";

// Keep generated hooks (orders, stats, products) on the same API origin as
// the hand-written fetches. In production this avoids a Pages proxy request
// hanging while direct authenticated Render requests remain healthy.
setBaseUrl(getApiBaseUrl());

/**
 * lazyWithRetry — wraps lazy() with a single automatic retry on chunk load
 * failure (network blip, stale deploy). Prevents a hard crash when the
 * dynamic import transiently fails.
 */
function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err) => {
      const msg = err?.message || "";
      if (/chunk|module|fetch|dynamically imported/i.test(msg)) {
        // One automatic retry after a short pause
        return new Promise<{ default: T }>((resolve, reject) =>
          setTimeout(() => factory().then(resolve).catch(reject), 800)
        );
      }
      throw err;
    })
  );
}

// Only Home is needed for an initial storefront visit. Product detail, cart,
// and checkout can carry indirect visual/editor dependencies, so keep them
// behind the existing retrying lazy boundary rather than loading their chunks
// before a customer requests those routes.
import Home from "./pages/Home";

const Products       = lazyWithRetry(() => import("./pages/Products"));
const ProductDetail  = lazyWithRetry(() => import("./pages/ProductDetail"));
const Cart           = lazyWithRetry(() => import("./pages/Cart"));
const Checkout       = lazyWithRetry(() => import("./pages/Checkout"));
const TrackOrder     = lazyWithRetry(() => import("./pages/TrackOrder"));
const Blog           = lazyWithRetry(() => import("./pages/Blog"));
const BlogPost       = lazyWithRetry(() => import("./pages/BlogPost"));
const Wishlist       = lazyWithRetry(() => import("./pages/Wishlist"));
const ShippingPolicy = lazyWithRetry(() => import("./pages/ShippingPolicy"));
const ReturnPolicy   = lazyWithRetry(() => import("./pages/ReturnPolicy"));
const PrivacyPolicy  = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"));
const Login          = lazyWithRetry(() => import("./pages/Login"));
const Signup         = lazyWithRetry(() => import("./pages/Signup"));
const Account        = lazyWithRetry(() => import("./pages/Account"));
const NotFound       = lazyWithRetry(() => import("./pages/not-found"));
const SeoGuide       = lazyWithRetry(() => import("./pages/SeoGuide").then(m => ({ default: m.SeoGuide })));
const KeywordLanding = lazyWithRetry(() => import("./pages/KeywordLanding"));

const AdminLogin           = lazyWithRetry(() => import("./pages/admin/Login"));
const AdminDashboard       = lazyWithRetry(() => import("./pages/admin/Dashboard"));
const AdminProducts        = lazyWithRetry(() => import("./pages/admin/AdminProducts"));
const AdminCategories      = lazyWithRetry(() => import("./pages/admin/AdminCategories"));
const AdminOrders          = lazyWithRetry(() => import("./pages/admin/AdminOrders"));
const AdminSettings        = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminBlog            = lazyWithRetry(() => import("./pages/admin/AdminBlog"));
const AdminCustomers       = lazyWithRetry(() => import("./pages/admin/AdminCustomers"));
const AdminBackup          = lazyWithRetry(() => import("./pages/admin/AdminBackup"));
const AdminFacebookImport  = lazyWithRetry(() => import("./pages/admin/AdminFacebookImport"));
const AdminReviews         = lazyWithRetry(() => import("./pages/admin/AdminReviews"));
const AdminTechStack       = lazyWithRetry(() => import("./pages/admin/AdminTechStack"));
const AdminDesigner        = lazyWithRetry(() => import("./pages/admin/AdminDesigner"));
const AdminFacebookGuide   = lazyWithRetry(() => import("./pages/admin/AdminFacebookGuide"));
const AdminDeployment      = lazyWithRetry(() => import("./pages/admin/AdminDeployment"));
const AdminHampers         = lazyWithRetry(() => import("./pages/admin/AdminHampers"));
const AdminActivityLog     = lazyWithRetry(() => import("./pages/admin/AdminActivityLog"));
const AdminSecurity        = lazyWithRetry(() => import("./pages/admin/AdminSecurity"));
const AdminSEO             = lazyWithRetry(() => import("./pages/admin/AdminSEO"));
const AdminPromoCodes      = lazyWithRetry(() => import("./pages/admin/AdminPromoCodes"));
const AdminReferrals       = lazyWithRetry(() => import("./pages/admin/AdminReferrals"));
const AdminNewsletter         = lazyWithRetry(() => import("./pages/admin/AdminNewsletter"));
const AdminDatabaseCluster    = lazyWithRetry(() => import("./pages/admin/AdminDatabaseCluster"));
const AdminPageBuilder      = lazyWithRetry(() => import("./pages/admin/AdminPageBuilder"));
const AdminMockups          = lazyWithRetry(() => import("./pages/admin/AdminMockups"));
const AdminAIDeveloper      = lazyWithRetry(() => import("./pages/admin/AdminAIDeveloper"));
const AdminRoles            = lazyWithRetry(() => import("./pages/admin/AdminRoles"));
const SecretsAdmin          = lazyWithRetry(() => import("./pages/admin/SecretsAdmin"));

const Hampers        = lazyWithRetry(() => import("./pages/Hampers"));
const HamperDetail   = lazyWithRetry(() => import("./pages/HamperDetail"));
const HamperBuilder  = lazyWithRetry(() => import("./pages/HamperBuilder"));
const Referral       = lazyWithRetry(() => import("./pages/Referral"));
const DesignStudioV2 = lazyWithRetry(() => import("./pages/studio/DesignStudioV2"));
const SalePage       = lazyWithRetry(() => import("./pages/SalePage"));
const FAQ            = lazyWithRetry(() => import("./pages/FAQ"));
const About          = lazyWithRetry(() => import("./pages/About"));
const Contact        = lazyWithRetry(() => import("./pages/Contact"));
const SizeGuide      = lazyWithRetry(() => import("./pages/SizeGuide"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The Pages gateway already exhausts safe-read origin failover before it
      // returns an explicit 503. Retrying that response blindly can keep a
      // visitor on a loading skeleton for another full failover window. Let
      // page-level recovery UI appear immediately for this terminal gateway
      // state while retaining one retry for other transient client failures.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 503) return false;
        return failureCount < 1;
      },
      staleTime: 20 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  }
});

function Router() {
  const [location] = useLocation();

  return (
    // No mode="wait" — old page stays visible while new page mounts.
    // This eliminates the blank white gap that mode="wait" causes when
    // lazy chunks take time to load or Suspense resolves slowly.
    // The new page fades in on top of the old one, giving instant feedback.
    <AnimatePresence initial={false}>
      <motion.div
        key={location}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, position: "absolute" as const, top: 0, left: 0, right: 0, zIndex: -1 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        style={{ minHeight: "100vh", width: "100%", position: "relative" }}
      >
        <Suspense fallback={<Loader />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/products" component={Products} />
            <Route path="/shop" component={Products} />
            <Route path="/product/:id" component={ProductDetail} />
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/track" component={TrackOrder} />
            <Route path="/track-order" component={TrackOrder} />
            <Route path="/blog" component={Blog} />
            <Route path="/blog/:slug" component={BlogPost} />
            <Route path="/wishlist" component={Wishlist} />
            <Route path="/shipping-policy" component={ShippingPolicy} />
            <Route path="/return-policy" component={ReturnPolicy} />
            <Route path="/privacy-policy" component={PrivacyPolicy} />
            <Route path="/terms-of-service" component={TermsOfService} />
            <Route path="/referral" component={Referral} />
             {/* V2 is the active responsive production design studio */}
             <Route path="/design-studio" component={DesignStudioV2} />
            <Route path="/design-studio-v1" component={() => <Redirect to="/design-studio" />} />
            <Route path="/design-studio-v2" component={() => <Redirect to="/design-studio" />} />
            <Route path="/hampers" component={Hampers} />
            <Route path="/hampers/build" component={HamperBuilder} />
            <Route path="/hampers/:slug" component={HamperDetail} />
            <Route path="/sale" component={SalePage} />
            <Route path="/faq" component={FAQ} />
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route path="/size-guide" component={SizeGuide} />
            <Route path="/seo-guide" component={SeoGuide} />
            <Route path="/custom-tshirt-bangladesh"  component={(p: any) => <KeywordLanding params={{ slug: "custom-tshirt-bangladesh" }} />} />
            <Route path="/custom-hoodie-bangladesh"  component={(p: any) => <KeywordLanding params={{ slug: "custom-hoodie-bangladesh" }} />} />
            <Route path="/custom-gift-bangladesh"    component={(p: any) => <KeywordLanding params={{ slug: "custom-gift-bangladesh" }} />} />
            <Route path="/corporate-gift-dhaka"      component={(p: any) => <KeywordLanding params={{ slug: "corporate-gift-dhaka" }} />} />
            <Route path="/custom-mug-bangladesh"     component={(p: any) => <KeywordLanding params={{ slug: "custom-mug-bangladesh" }} />} />
            <Route path="/birthday-gift-bangladesh"  component={(p: any) => <KeywordLanding params={{ slug: "birthday-gift-bangladesh" }} />} />
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route path="/account" component={Account} />

            {/* ── Admin panel ──────────────────────────────────────────────
                All admin routes are listed FLAT in the outer Switch so that
                Wouter v3 resolves them with unambiguous exact-prefix matching.
                Specific sub-routes must come BEFORE the bare /admin route so
                the Switch stops at the right entry.
                Each component is already wrapped in AdminLayout which handles
                auth-redirect internally. AppErrorBoundary at the top catches
                any render error that escapes AdminLayout.
            ─────────────────────────────────────────────────────────────── */}
            <Route path="/admin/login"         component={AdminLogin} />
            <Route path="/admin/products"      component={AdminProducts} />
            <Route path="/admin/categories"    component={AdminCategories} />
            <Route path="/admin/orders"        component={AdminOrders} />
            <Route path="/admin/blog"          component={AdminBlog} />
            <Route path="/admin/customers"     component={AdminCustomers} />
            <Route path="/admin/backup"        component={AdminBackup} />
            <Route path="/admin/settings"      component={AdminSettings} />
            <Route path="/admin/facebook-import" component={AdminFacebookImport} />
            <Route path="/admin/reviews"       component={AdminReviews} />
            <Route path="/admin/tech-stack"    component={AdminTechStack} />
            <Route path="/admin/facebook-guide" component={AdminFacebookGuide} />
            <Route path="/admin/designer"      component={AdminDesigner} />
            <Route path="/admin/deployment"    component={AdminDeployment} />
            <Route path="/admin/hampers"       component={AdminHampers} />
            <Route path="/admin/logs"          component={AdminActivityLog} />
            <Route path="/admin/security"      component={AdminSecurity} />
            <Route path="/admin/seo"           component={AdminSEO} />
            <Route path="/admin/promo-codes"   component={AdminPromoCodes} />
            <Route path="/admin/referrals"     component={AdminReferrals} />
            <Route path="/admin/newsletter"    component={AdminNewsletter} />
            <Route path="/admin/db-cluster"    component={AdminDatabaseCluster} />
            <Route path="/admin/page-builder"  component={AdminPageBuilder} />
            <Route path="/admin/mockups"       component={AdminMockups} />
            <Route path="/admin/ai-developer" component={AdminAIDeveloper} />
            <Route path="/admin/roles"        component={AdminRoles} />
            <Route path="/admin/secrets"      component={SecretsAdmin} />
            <Route path="/admin"               component={AdminDashboard} />

            {/* Short-URL redirects */}
            <Route path="/privacy"><Redirect to="/privacy-policy" /></Route>
            <Route path="/terms"><Redirect to="/terms-of-service" /></Route>
            <Route path="/shipping"><Redirect to="/shipping-policy" /></Route>
            <Route path="/returns"><Redirect to="/return-policy" /></Route>
            <Route path="/refund"><Redirect to="/return-policy" /></Route>
            <Route path="/customize"><Redirect to="/design-studio" /></Route>
            <Route path="/design"><Redirect to="/design-studio" /></Route>
            <Route path="/gift-hampers"><Redirect to="/hampers" /></Route>
            <Route path="/gift-hamper"><Redirect to="/hampers" /></Route>

            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to, { replace: true } as any); }, [to, navigate]);
  return null;
}

function CaptureReferralCode() {
  const [location] = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("trynext_ref_code", ref.toUpperCase().trim());
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [location]);
  return null;
}

function AppInner() {
  useLenis();
  useUtmCapture();
  return null;
}

function App() {
  return (
    <AppErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SiteSettingsProvider>
          <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ScrollProvider>
                <AppInner />
                <ScrollProgressBar />
                <CaptureReferralCode />
                <TrackingPixels />
                <SocialAuthLoader />
                <BrandingUpdater />
                <ScrollToTop />
                <FlashSaleBar />
                <AnnouncementBar />
                <Router />
                <WhatsAppButton />
                <BackToTop />
                <AbandonedCartPopup />
                <DesignDraftReminder />
                <ExitIntentPopup />
              </ScrollProvider>
              </WouterRouter>
              <Toaster />
            </WishlistProvider>
          </CartProvider>
          </AuthProvider>
          </SiteSettingsProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
    </AppErrorBoundary>
  );
}

export default App;
