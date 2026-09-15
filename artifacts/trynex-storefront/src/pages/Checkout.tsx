import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { useCart } from "@/context/CartContext";
import { useCreateOrder, type CreateOrderRequest } from "@workspace/api-client-react";
import { formatPrice, getApiUrl } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  CheckCircle2, CreditCard, Banknote,
  ShieldCheck, Copy, Check, ArrowRight,
  Smartphone, Info, Tag, MapPin, MessageCircle, Phone, AlertCircle, Search,
  LocateFixed, Loader2, Upload
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { trackInitiateCheckout, trackPurchase } from "@/lib/tracking";
import { getStoredUtm } from "@/hooks/useUtm";
import { TrustBadges } from "@/components/TrustBadges";
import { CartItemThumbnail } from "@/components/CartItemThumbnail";
import { ItemPreviewThumb, PreviewLightbox, type PreviewItem } from "@/components/ZoomableImage";
import { useAuth } from "@/context/AuthContext";
import { LogIn, UserPlus, X as XIcon } from "lucide-react";

import { BD_UPAZILAS, getDivisionForDistrict, getAllDistricts, getPostCode } from "@/data/bd-addresses";
import { DeliveryAreaPicker } from "@/components/DeliveryAreaPicker";

const checkoutSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(1, "Last name is required").optional(),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")).nullable(),
  customerPhone: z.string().min(10, "Valid phone number required (10-11 digits)"),
  shippingAddress: z.string().min(5, "Street address required (House / Road / Area)"),
  shippingDistrict: z.string().min(2, "District is required"),
  shippingUpazila: z.string().min(2, "Upazila is required").optional(),
  shippingUnion: z.string().optional().or(z.literal("")),
  shippingPostCode: z.string().optional().or(z.literal("")),
  shippingCity: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal(""))
});
type CheckoutFormData = z.infer<typeof checkoutSchema>;

const DISTRICTS = getAllDistricts();

const inputClass = "w-full scroll-mt-28 px-4 py-3.5 rounded-xl text-base sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all placeholder:text-gray-400";
const inputStyle = { background: 'white', border: '1px solid #e5e7eb', color: '#111827' };

type CheckoutStep = 'form' | 'gateway' | 'success';
type PaymentMethod = 'bkash' | 'nagad' | 'upay' | 'bank' | 'card' | 'cod';
type PaymentMode = 'full' | 'advance';

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const settings = useSiteSettings();

  const PAYMENT_NUMBER_LOCAL = settings.bkashNumber || "";
  const WHATSAPP_NUMBER_LOCAL = settings.whatsappNumber?.replace(/[^0-9]/g, '').replace(/^880/, '') || "";
  const WHATSAPP_NUMBER_INTL = settings.whatsappNumber?.replace(/[^+0-9]/g, '') || "";
  // Shipping config comes from admin Site Settings; 0/blank ⇒ feature disabled
  const freeShippingThreshold = settings.freeShippingThreshold || 0;
  const shippingFee = settings.shippingCost || 0;

  const [paymentMode, setPaymentMode] = useState<PaymentMode>('advance');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStep>('form');
  const [createdOrder, setCreatedOrder] = useState<Record<string, unknown> | null>(null);
  const [lastFour, setLastFour] = useState("");
  const [senderName, setSenderName] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentProofName, setPaymentProofName] = useState("");
  const [paymentProofNotice, setPaymentProofNotice] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSubmitError, setPaymentSubmitError] = useState<string | null>(null);
  const paymentSubmissionInFlightRef = useRef(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isReferralCode, setIsReferralCode] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsPickerAutoOpen, setGpsPickerAutoOpen] = useState(false);
  const [serverWaking, setServerWaking] = useState(false);
  const refAppliedRef = useRef(false);
  const wakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapshotRef = useRef({ total: 0, advance: 0, shipping: 0 });
  const itemsSnapshotRef = useRef<Array<{ name: string; imageUrl?: string; customNote?: string; customImages?: string[]; quantity: number; price: number; size?: string; color?: string }>>([]);
  const [successLightboxIndex, setSuccessLightboxIndex] = useState<number | null>(null);

  const { mutateAsync: createOrder, isPending } = useCreateOrder();
  const formRef = useRef<HTMLFormElement>(null);
  const stepPanelRef = useRef<HTMLDivElement>(null);

  const goToStep = useCallback((nextStep: number) => {
    setStep(nextStep);
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        stepPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        stepPanelRef.current?.focus({ preventScroll: true });
      }, 0);
    });
  }, []);

  const { customer, loginAsGuest } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);
  const [, navigate] = useLocation();
  const [hideAuthBanner, setHideAuthBanner] = useState<boolean>(() => {
    try { return sessionStorage.getItem("checkout_auth_banner_dismissed") === "1"; } catch { return false; }
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { shippingDistrict: '', shippingUpazila: '', shippingUnion: '', shippingPostCode: '' }
  });

  // Always scroll to top when checkout mounts — critical on mobile where cart bar leaves viewport at bottom
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    } catch {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // trigger is available directly from useForm — no need for window hack

  // Auto-fill name/email/phone for logged-in customers (do NOT pre-fill address)
  useEffect(() => {
    if (!customer) return;
    const fullName = (customer.name || "").trim();
    const sp = fullName.indexOf(" ");
    const first = sp > 0 ? fullName.slice(0, sp) : fullName;
    const last  = sp > 0 ? fullName.slice(sp + 1) : "";
    if (first && !watch("firstName")) setValue("firstName", first, { shouldValidate: false });
    if (last  && !watch("lastName"))  setValue("lastName", last,   { shouldValidate: false });
    if (customer.email && !watch("customerEmail")) setValue("customerEmail", customer.email, { shouldValidate: false });
    if (customer.phone && !watch("customerPhone")) setValue("customerPhone", customer.phone, { shouldValidate: false });
  }, [customer, setValue, watch]);

  // Spinner-wheel reward auto-apply at checkout — set the code AND validate it
  // so the discount actually appears on the total. Runs once on mount.
  const spinAutoAppliedRef = useRef(false);
  useEffect(() => {
    if (spinAutoAppliedRef.current) return;
    try {
      const raw = localStorage.getItem("spin_reward");
      if (!raw) return;
      const r = JSON.parse(raw) as { code?: string; usedOn?: string };
      if (r?.code && !r.usedOn && !promoApplied && !promoInput) {
        spinAutoAppliedRef.current = true;
        setPromoInput(r.code);
        // Pass the code directly — validatePromo would read stale promoInput state
        // because React batches state updates and the new value isn't flushed yet.
        setTimeout(() => { void validatePromo(r.code); }, 0);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const keys = Object.keys(errors);
    if (keys.length > 0) {
      const firstErrorField = formRef.current?.querySelector(`[name="${keys[0]}"]`) as HTMLElement | null;
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
    }
  }, [errors]);

  const selectedDistrict = watch("shippingDistrict");
  const selectedUpazila = watch("shippingUpazila");

  const handleGPSDetect = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({ title: "Select manually", description: "Location services are not available on this device. Please choose your district below." });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          const data = await res.json();
          const addr = data.address || {};
          const detectedDistrict = addr.county || addr.state_district || addr.city || "";
          const detectedSuburb = addr.suburb || addr.town || addr.village || addr.neighbourhood || "";
          const detectedPostCode = addr.postcode || "";

          const matched = DISTRICTS.find(d => detectedDistrict.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(detectedDistrict.toLowerCase()));
          if (matched) {
            setValue("shippingDistrict", matched, { shouldValidate: true });
            const division = getDivisionForDistrict(matched);
            if (division) setValue("shippingCity", division);

            const upazilas = BD_UPAZILAS[matched] || [];
            const matchedUpazila = upazilas.find(u =>
              detectedSuburb.toLowerCase().includes(u.toLowerCase()) ||
              u.toLowerCase().includes(detectedSuburb.toLowerCase())
            );
            if (matchedUpazila) {
              setValue("shippingUpazila", matchedUpazila, { shouldValidate: true });
              const pc = getPostCode(matched, matchedUpazila);
              if (pc) setValue("shippingPostCode", pc);
            } else {
              setValue("shippingUpazila", "");
              const pc = getPostCode(matched);
              if (pc) setValue("shippingPostCode", pc);
            }

            if (detectedPostCode) setValue("shippingPostCode", detectedPostCode);

            toast({ title: "Location detected!", description: `${matched}${matchedUpazila ? `, ${matchedUpazila}` : ''}${division ? ` — ${division} Division` : ''}` });
          } else {
            toast({ title: "Select manually", description: "We couldn't auto-detect your exact district. Please choose from the list below." });
            setGpsPickerAutoOpen(true);
          }
        } catch {
          toast({ title: "Select manually", description: "Location lookup timed out. Please choose your district from the list below." });
          setGpsPickerAutoOpen(true);
        }
        setGpsLoading(false);
      },
      (err) => {
        if (err.code === 1) {
          toast({ title: "Location permission needed", description: "Please allow location access in your browser settings, or select your district manually." });
        } else {
          toast({ title: "Select manually", description: "Could not determine your location. Please choose your district from the list below." });
        }
        setGpsLoading(false);
        setGpsPickerAutoOpen(true);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }, [setValue, toast]);

  const gpsTriedRef = useRef(false);
  useEffect(() => {
    if (gpsTriedRef.current) return;
    gpsTriedRef.current = true;
    if (!navigator.geolocation) return;
    try {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(result => {
          if (result.state === 'granted') {
            handleGPSDetect();
          }
          // If 'prompt' → don't auto-trigger; let the user click the button
          // If 'denied' → silently skip
        }).catch(() => {});
      } else {
        // No permissions API → attempt once
        handleGPSDetect();
      }
    } catch {
      handleGPSDetect();
    }
  }, [handleGPSDetect]);

  useEffect(() => {
    return () => {
      if (wakingTimerRef.current) clearTimeout(wakingTimerRef.current);
    };
  }, []);

  const checkoutEntryFiredRef = useRef(false);
  useEffect(() => {
    if (checkoutEntryFiredRef.current || items.length === 0) return;
    checkoutEntryFiredRef.current = true;
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    trackInitiateCheckout(
      items.map(i => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
      total
    );
  }, [items]);

  useEffect(() => {
    if (refAppliedRef.current || promoApplied) return;
    const refCode = localStorage.getItem("trynext_ref_code");
    if (refCode) {
      refAppliedRef.current = true;
      setPromoInput(refCode);
      setTimeout(() => {
        const liveTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const emailForSelfCheck = watch("customerEmail") || undefined;
        fetch(getApiUrl("/api/promo-codes/validate"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ code: refCode, orderTotal: liveTotal, customerEmail: emailForSelfCheck }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.valid) {
              setPromoDiscount(data.discount || 0);
              setPromoApplied(data.code);
              setIsReferralCode(!!data.isReferral);
              toast({ title: data.message });
            }
          })
          .catch(() => {});
      }, 500);
    }
  }, [items, promoApplied]);

  const getPaymentNumber = (method: PaymentMethod) => {
    if (method === 'bkash') return settings.bkashNumber || "";
    if (method === 'nagad') return settings.nagadNumber || "";
    if (method === 'upay') return settings.upayNumber || "";
    return "";
  };

  const bankConfigured = !!(settings.bankName && settings.bankAccountNumber && settings.bankAccountName);
  const anyWalletConfigured = !!(settings.bkashNumber || settings.nagadNumber || settings.upayNumber);

  // Keep the visible method list aligned with the API and mobile checkout.
  // Wallets and bank transfer are shown only when their destination is usable;
  // COD follows the admin toggle and card-on-delivery is always available.
  const configuredPaymentMethods: PaymentMethod[] = [
    ...(['bkash', 'nagad', 'upay'] as PaymentMethod[]).filter((m) => !!getPaymentNumber(m)),
    ...(bankConfigured ? ['bank' as const] : []),
    ...(settings.codEnabled ? ['cod' as const] : []),
    'card',
  ];
  const validatePromo = async (codeOverride?: string) => {
    const codeToValidate = codeOverride?.trim() ?? promoInput.trim();
    if (!codeToValidate) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const liveTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const customerEmailVal = watch("customerEmail") || undefined;
      const res = await fetch(getApiUrl("/api/promo-codes/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ code: codeToValidate, orderTotal: liveTotal, customerEmail: customerEmailVal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.message || "Invalid code");
        setPromoDiscount(0);
        setPromoApplied(null);
        return;
      }
      setPromoDiscount(data.discount || 0);
      setPromoApplied(data.code);
      setIsReferralCode(!!data.isReferral);
      toast({ title: data.message });
    } catch {
      setPromoError("Failed to validate. Try again.");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setPromoDiscount(0);
    setPromoApplied(null);
    setPromoInput("");
    setPromoError(null);
    setIsReferralCode(false);
  };

  const liveSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // Shipping is charged unless either: shipping is free (fee=0), no items in cart,
  // or admin has set a free-shipping threshold and the order qualifies.
  const qualifiesForFreeShipping = freeShippingThreshold > 0 && liveSubtotal >= freeShippingThreshold;
  const shippingCost = liveSubtotal > 0 && !qualifiesForFreeShipping ? shippingFee : 0;
  const total = Math.max(0, liveSubtotal + shippingCost - promoDiscount);
  // COD is a payment method, not a separate payment mode. Every non-full
  // order therefore has the same 25% amount due now; this prevents a COD
  // selection from ever producing a zero-value "advance" order.
  const advanceAmount = Math.ceil(total * 0.25);
  const amountDueNow = paymentMode === 'full' ? total : advanceAmount;

  const displayTotal = checkoutStatus === 'form' ? total : snapshotRef.current.total;
  const displayAdvance = checkoutStatus === 'form' ? advanceAmount : snapshotRef.current.advance;

  useEffect(() => {
    if (items.length === 0 && checkoutStatus === 'form') {
      setLocation("/cart");
    }
  }, [items.length, checkoutStatus, setLocation]);

  // Normalize the wallet selection before any conditional return. Keeping this
  // hook above the empty-cart branch prevents React error #310 when a cart is
  // emptied or restored during navigation.
  useEffect(() => {
    if (configuredPaymentMethods.length > 0 && !configuredPaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(configuredPaymentMethods[0]);
    }
    setPaymentMode('advance');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configuredPaymentMethods.join(",")]);

  // Suppress checkout render while redirecting to /cart on empty cart.
  // We render a deterministic loading state instead of `return null` so
  // the user never sees a flash of empty checkout chrome before the
  // redirect lands.
  if (items.length === 0 && checkoutStatus === 'form') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-xs font-medium tracking-wide uppercase">Returning to cart…</p>
        </div>
      </div>
    );
  }

  const effectiveGatewayMethod: PaymentMethod = configuredPaymentMethods.includes(paymentMethod)
    ? paymentMethod
    : (configuredPaymentMethods[0] ?? 'bkash');

  const onSubmit = async (data: CheckoutFormData) => {
    const snapSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const snapQualifies = freeShippingThreshold > 0 && snapSubtotal >= freeShippingThreshold;
    const snapShipping = snapSubtotal > 0 && !snapQualifies ? shippingFee : 0;
    const snapTotal = Math.max(0, snapSubtotal + snapShipping - promoDiscount);
    const snapAdvance = Math.ceil(snapTotal * 0.25);

    snapshotRef.current = { total: snapTotal, advance: snapAdvance, shipping: snapShipping };

    const { firstName, lastName, shippingUpazila, shippingUnion, shippingPostCode, shippingAddress, ...rest } = data;
    const customerName = `${firstName} ${lastName}`.trim();
    const addressParts = [shippingAddress];
    if (shippingUnion) addressParts.push(shippingUnion);
    if (shippingUpazila) addressParts.push(shippingUpazila);
    if (shippingPostCode) addressParts.push(`PO: ${shippingPostCode}`);
    const formattedAddress = addressParts.join(", ");

    if (wakingTimerRef.current) clearTimeout(wakingTimerRef.current);
    // If the very first request is still in flight after 6s, the API is
    // most likely cold-starting (Render free tier). Surface a friendly
    // "warming up" indicator so the customer doesn't think it crashed.
    wakingTimerRef.current = setTimeout(() => setServerWaking(true), 6000);

    const utm = getStoredUtm();
    const orderPayload = {
      ...rest,
      shippingAddress: formattedAddress,
      customerName,
      paymentMethod,
      notes: [
        rest.notes,
        paymentMode === 'advance' ? 'Payment plan: 25% advance + cash on delivery' : 'Payment plan: full payment',
      ].filter(Boolean).join(' | '),
      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        size: i.size,
        color: i.color,
        imageUrl: i.imageUrl,
        customNote: i.hamperPayload
          ? JSON.stringify({ hamper: i.hamperPayload, unitPrice: i.price })
          : i.customNote,
        customImages: i.customImages,
        // Keep print-ready studio uploads in the order payload. These are
        // storage paths/metadata, not the large preview data URLs.
        originalAssetUrls: i.originalAssetUrls,
        originalAssets: i.originalAssets,
      })),
      ...(promoApplied ? { promoCode: promoApplied } : {}),
      ...(utm.utmSource ? { utmSource: utm.utmSource } : {}),
      ...(utm.utmMedium ? { utmMedium: utm.utmMedium } : {}),
      ...(utm.utmCampaign ? { utmCampaign: utm.utmCampaign } : {}),
    };

    // Retry transient errors (network blips, cold-start gateway timeouts,
    // 502/503/504 from Render warm-up) up to 3 times with exponential
    // backoff. Validation / business errors (structured 4xx with `error`
    // code) are NEVER retried — those need user action. Rate-limit (429)
    // is also not retried; we surface a clear message instead.
    const isTransient = (err: unknown): boolean => {
      const e = err as { status?: number; name?: string; message?: string } | undefined;
      const status = e?.status;
      // Network-level failure (no response) — definitely retry.
      if (!status || status === 0) return true;
      if (e?.name === "TypeError" || /network|fetch|aborted/i.test(e?.message ?? "")) return true;
      // Render cold-start / gateway hiccups — retry.
      if (status === 502 || status === 503 || status === 504) return true;
      // Anything else 4xx (incl. 429 rate limit) is final.
      if (status >= 400 && status < 500) return false;
      // Generic 5xx — retry once is reasonable.
      if (status >= 500) return true;
      return false;
    };

    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [0, 1500, 3500]; // 0s → 1.5s → 3.5s

    try {
      let order: unknown;
      let lastErr: unknown;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (BACKOFF_MS[attempt]) {
          await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]));
          // After the first failure, we know the server is cold or flaky —
          // promote the "warming up" UI immediately rather than waiting.
          setServerWaking(true);
        }
        try {
          order = await createOrder(orderPayload as CreateOrderRequest);
          lastErr = undefined;
          break;
        } catch (e) {
          lastErr = e;
          if (!isTransient(e)) throw e;
          if (attempt === MAX_ATTEMPTS - 1) throw e;
        }
      }
      if (lastErr) throw lastErr;

      const orderData = order as unknown as Record<string, unknown>;
      setCreatedOrder(orderData);

      const rawServerTotal = typeof orderData.total === "number" ? orderData.total : snapTotal;
      const serverSubtotal = typeof orderData.subtotal === "number" ? orderData.subtotal : snapSubtotal;
      const serverShipping = typeof orderData.shippingCost === "number" ? orderData.shippingCost : snapshotRef.current.shipping;
      // Some already-published API builds return the line-item subtotal as `total`
      // while still returning the shipping field separately. Reconcile that narrow
      // legacy response so the wallet gateway never undercharges or misstates the
      // customer’s advance amount after order creation. A current full total is
      // preserved unchanged, including valid promo/free-shipping adjustments.
      const serverTotal = rawServerTotal === snapSubtotal && snapTotal > rawServerTotal
        ? snapTotal
        : rawServerTotal === serverSubtotal && serverShipping > 0
          ? rawServerTotal + serverShipping
          : rawServerTotal;
      const serverAdvance = Math.ceil(serverTotal * 0.25);
      snapshotRef.current = { total: serverTotal, advance: serverAdvance, shipping: serverShipping };

      trackPurchase({
        orderId: orderData.orderNumber as string,
        total: serverTotal,
        items: items.map(i => ({ id: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
      });

      if (isReferralCode && promoApplied) {
        // NOTE: Do NOT call PUT /api/referrals/:code/use here.
        // The server already updates usedCount + totalEarnings inside the order
        // creation DB transaction. Calling it again would double-count earnings.
        localStorage.removeItem("trynext_ref_code");
      }

      if (wakingTimerRef.current) { clearTimeout(wakingTimerRef.current); wakingTimerRef.current = null; }
      setServerWaking(false);
      itemsSnapshotRef.current = items.map(i => ({
        name: i.name,
        imageUrl: i.imageUrl,
        customNote: i.customNote,
        customImages: i.customImages,
        quantity: i.quantity,
        price: i.price,
        size: i.size,
        color: i.color,
      }));
      clearCart();

      // Wallet orders must stop at the gateway so the customer can send the
      // exact 25% amount and submit transaction evidence. Payment is only
      // marked submitted after the customer presses “I've Sent the Payment”.
      if (paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'upay' || paymentMethod === 'bank') {
        setCheckoutStatus('gateway');
      } else {
        setCheckoutStatus('success');
      }
    } catch (err: any) {
      if (wakingTimerRef.current) { clearTimeout(wakingTimerRef.current); wakingTimerRef.current = null; }
      setServerWaking(false);
      const errBody = err?.data || err?.body || {};
      const code = errBody?.error;
      const serverMessage = errBody?.message;
      const fullErrorText = err?.response?.data
        ? JSON.stringify(err.response.data).slice(0, 300)
        : err?.message || err?.toString?.() || "";
      // eslint-disable-next-line no-console
      console.error("[Checkout] order submit failed:", { status: err?.status, code, serverMessage, fullErrorText, err });

      if (code === "promo_invalid") {
        removePromo();
        toast({
          title: "Promo code is no longer valid",
          description: "It may have expired or reached its limit. Your order total has been updated — please try again.",
          variant: "destructive",
        });
      } else if (code === "self_referral") {
        removePromo();
        toast({
          title: "You can't use your own referral code",
          description: "Try a different code or remove it to continue.",
          variant: "destructive",
        });
      } else if (code === "stock_out") {
        toast({
          title: "Out of stock",
          description: serverMessage || "One of your items is out of stock. Please update your cart.",
          variant: "destructive",
        });
        setTimeout(() => setLocation("/cart"), 2500);
      } else if (code === "product_missing") {
        toast({
          title: "Item no longer available",
          description: serverMessage || "An item in your cart has been removed by the store. Please update your cart.",
          variant: "destructive",
        });
        setTimeout(() => setLocation("/cart"), 2500);
      } else if (code === "hamper_invalid") {
        toast({
          title: "Gift hamper issue",
          description: serverMessage || "One of your gift hampers is no longer valid. Please rebuild it from the Hampers page.",
          variant: "destructive",
        });
      } else if (code === "validation_error") {
        toast({
          title: "Please check your details",
          description: serverMessage || "Some fields look incorrect. Review and try again.",
          variant: "destructive",
        });
      } else if (code === "rate_limited" || err?.status === 429) {
        toast({
          title: "Too many attempts from your network",
          description: serverMessage || "Please wait a few minutes and try again, or message us on WhatsApp to place your order directly.",
          variant: "destructive",
        });
      } else if (err?.status === 502 || err?.status === 503 || err?.status === 504) {
        toast({
          title: "Server is waking up",
          description: "Our servers were sleeping and didn't respond in time. Please tap Place Order again — it should go through now.",
          variant: "destructive",
        });
      } else if (err?.status === 0 || err?.name === "TypeError" || /network|fetch|aborted/i.test(err?.message ?? "")) {
        toast({
          title: "Connection lost",
          description: "We couldn't reach the server. Check your internet and try again — or message us on WhatsApp.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to place order",
          description: serverMessage || fullErrorText || "Please try again in a moment, or message us on WhatsApp for help.",
          variant: "destructive",
        });
      }
    }
  };

  const handlePaymentSubmit = async () => {
    if (paymentSubmissionInFlightRef.current || isSubmittingPayment) return;
    setPaymentSubmitError(null);
    if (paymentMethod === 'bank') {
      if (senderName.trim().length < 2) {
        toast({ title: "Enter account holder name", description: "Enter the name used for the bank transfer.", variant: "destructive" });
        return;
      }
      if (bankReference.trim().length < 4) {
        toast({ title: "Enter bank reference", description: "Enter the bank transfer reference or confirmation number.", variant: "destructive" });
        return;
      }
    } else {
      if (lastFour.length !== 4) {
        const message = "Enter exactly 4 digits from the wallet number you paid from.";
        setPaymentSubmitError(message);
        toast({ title: "Sender number is incomplete", description: message, variant: "destructive" });
        return;
      }
    }
    const orderId = Number((createdOrder as Record<string, unknown>)?.id);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      const message = 'Your order reference is missing. Please return to checkout and try again.';
      setPaymentSubmitError(message);
      toast({ title: 'Order reference missing', description: message, variant: 'destructive' });
      return;
    }
    paymentSubmissionInFlightRef.current = true;
    setIsSubmittingPayment(true);
    try {
      const res = await fetch(getApiUrl(`/api/orders/${orderId}/payment-info`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          paymentMethod,
          customerEmail: watch("customerEmail") || undefined,
          customerPhone: watch("customerPhone"),
          lastFourDigits: lastFour || undefined,
          transactionId: undefined,
          paymentProofUrl,
          senderName: senderName.trim() || undefined,
          bankReference: bankReference.trim() || undefined,
          promoCode: promoApplied || undefined,
        })
      });
      const updatedOrder = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(updatedOrder?.message || `Server error: ${res.status}`);
      }
      if (updatedOrder && typeof updatedOrder === 'object') {
        setCreatedOrder(prev => ({ ...(prev || {}), ...(updatedOrder as Record<string, unknown>) }));
      }
      setPaymentSubmitError(null);
      setCheckoutStatus('success');
    } catch (err: any) {
      paymentSubmissionInFlightRef.current = false;
      const message = err?.message || "Please try again or contact us on WhatsApp.";
      setPaymentSubmitError(message);
      toast({ title: "Payment submission failed", description: message, variant: "destructive" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };
  const uploadPaymentProof = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Image required', description: 'Please choose a JPG, PNG, or WebP screenshot.', variant: 'destructive' });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Screenshot is too large', description: 'Please choose an image smaller than 8 MB.', variant: 'destructive' });
      return;
    }
    setIsUploadingProof(true);
    try {
      const req = await fetch(getApiUrl('/api/storage/uploads/request-url'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The API rejects cross-site state-changing requests without this
          // explicit AJAX marker. Without it, valid payment screenshots fail
          // before a signed upload URL is issued.
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ name: `payment-proof-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)}`, contentType: file.type, size: file.size }),
      });
      const requestBody = await req.json().catch(() => null);
      if (!req.ok || !requestBody?.uploadURL || !requestBody?.objectPath) {
        throw new Error(requestBody?.message || `Could not prepare the upload (server ${req.status})`);
      }
      const { uploadURL, objectPath } = requestBody as { uploadURL: string; objectPath: string };
      const put = await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!put.ok) {
        const detail = await put.text().catch(() => '');
        throw new Error(`Could not upload the screenshot (storage ${put.status}${detail ? `: ${detail.slice(0, 120)}` : ''})`);
      }
      // Uploaded entities live in the private storage namespace. The prior
      // public-objects URL was invalid for R2/S3-backed uploads and made the
      // proof appear to disappear even after the PUT completed.
      const entityId = String(objectPath).replace(/^\/objects\//, '').replace(/^\/+/, '');
      if (!entityId) throw new Error('The upload completed without an object reference');
      setPaymentProofUrl(`/api/storage/objects/${entityId}`);
      setPaymentProofName(file.name);
      setPaymentProofNotice(null);
      toast({ title: 'Payment proof attached', description: 'Your screenshot is ready to submit.' });
    } catch (err: any) {
      setPaymentProofNotice('Screenshot upload is unavailable right now. You can still submit with the required last 4 sender digits.');
      toast({ title: 'Screenshot optional', description: 'We could not attach the screenshot, but you can continue with the required last 4 sender digits.' });
    } finally {
      setIsUploadingProof(false);
    }
  };

  const activePaymentNumber = getPaymentNumber(effectiveGatewayMethod);
  const effectivePaymentNumber = activePaymentNumber;
  const paymentNumberReady = !!effectivePaymentNumber;

  const copyNumber = async () => {
    if (!effectivePaymentNumber) return;
    await navigator.clipboard.writeText(effectivePaymentNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 3000);
  };

  const gatewayTheme: Record<PaymentMethod, {
    name: string;
    primary: string;
    light: string;
    border: string;
    glow: string;
    badge: string;
    logo: React.ReactNode;
    icon: React.ReactNode;
  }> = {
    bkash: {
      name: 'bKash',
      primary: '#e2136e',
      light: 'rgba(226,19,110,0.08)',
      border: 'rgba(226,19,110,0.2)',
      glow: '0 4px 30px rgba(226,19,110,0.1)',
      badge: 'linear-gradient(135deg, #e2136e 0%, #c0105c 100%)',
      logo: <span className="text-4xl font-black" style={{ color: '#e2136e' }}>bKash</span>,
      icon: <Smartphone className="w-5 h-5" />,
    },
    nagad: {
      name: 'Nagad',
      primary: '#f7941d',
      light: 'rgba(247,148,29,0.08)',
      border: 'rgba(247,148,29,0.2)',
      glow: '0 4px 30px rgba(247,148,29,0.1)',
      badge: 'linear-gradient(135deg, #f7941d 0%, #e07800 100%)',
      logo: <span className="text-4xl font-black" style={{ color: '#f7941d' }}>Nagad</span>,
      icon: <Smartphone className="w-5 h-5" />,
    },
    upay: {
      name: 'uPay',
      primary: '#0077cc',
      light: 'rgba(0,119,204,0.08)',
      border: 'rgba(0,119,204,0.2)',
      glow: '0 4px 30px rgba(0,119,204,0.1)',
      badge: 'linear-gradient(135deg, #0077cc 0%, #005fa3 100%)',
      logo: <span className="text-4xl font-black" style={{ color: '#0077cc' }}>uPay</span>,
      icon: <Smartphone className="w-5 h-5" />,
    },
    bank: {
      name: 'Bank Transfer',
      primary: '#16a34a',
      light: 'rgba(22,163,74,0.08)',
      border: 'rgba(22,163,74,0.2)',
      glow: '0 4px 30px rgba(22,163,74,0.1)',
      badge: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      logo: <span className="text-3xl font-black" style={{ color: '#16a34a' }}>Bank</span>,
      icon: <Banknote className="w-5 h-5" />,
    },
    card: {
      name: 'Card Payment',
      primary: '#7c3aed',
      light: 'rgba(124,58,237,0.08)',
      border: 'rgba(124,58,237,0.2)',
      glow: '0 4px 30px rgba(124,58,237,0.1)',
      badge: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      logo: <span className="text-3xl font-black" style={{ color: '#7c3aed' }}>Card</span>,
      icon: <CreditCard className="w-5 h-5" />,
    },
    cod: {
      name: 'Cash on Delivery',
      primary: '#0891b2',
      light: 'rgba(8,145,178,0.08)',
      border: 'rgba(8,145,178,0.2)',
      glow: '0 4px 30px rgba(8,145,178,0.1)',
      badge: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
      logo: <span className="text-3xl font-black" style={{ color: '#0891b2' }}>COD</span>,
      icon: <Banknote className="w-5 h-5" />,
    },
  };

  const theme = gatewayTheme[effectiveGatewayMethod];

  const isWalletMethod = paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'upay';
  const canProceed = (() => {
    if (configuredPaymentMethods.length === 0) return false;
    if (isWalletMethod) {
      // The screenshot is uploaded only after the order exists, because the
      // payment-proof object is attached to the created order on the gateway
      // screen. Requiring it here deadlocks Step 2 and makes Review Order
      // impossible. The sender suffix is enough to reach the review step.
      return paymentNumberReady && lastFour.length === 4;
    }
    if (paymentMethod === 'bank') {
      return bankConfigured && senderName.trim().length > 0 && bankReference.trim().length > 0;
    }
    return paymentMethod === 'cod' || paymentMethod === 'card';
  })();

  if (checkoutStatus === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20 }}
          className="max-w-xl w-full rounded-3xl p-8 text-center bg-white"
          style={{ border: '1px solid #e5e7eb', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}
        >
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2, damping: 15 }}
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(22,163,74,0.08)', border: '2px solid rgba(22,163,74,0.2)' }}
          >
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </motion.div>

          <h1 className="text-4xl font-black font-display mb-2 text-gray-900">Order Confirmed!</h1>
          <p className="text-gray-400 mb-6 leading-relaxed text-sm">
             {paymentMode === 'full'
               ? "Full payment submitted! Our team will verify and confirm your order shortly."
               : paymentMethod === 'cod'
                 ? "Your order is reserved. We'll contact you to collect the 25% advance, then deliver the balance by cash on delivery."
                 : "25% advance submitted. We'll collect the remaining balance on delivery."}
          </p>

          <div className="p-5 rounded-2xl mb-4 bg-gray-50 border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Order Reference</p>
            <p className="text-2xl font-black tracking-wider text-orange-600 font-mono">{createdOrder?.orderNumber as string}</p>
            <p className="text-xs text-gray-400 mt-1">Save this number to track your order</p>
          </div>

          {itemsSnapshotRef.current.length > 0 && (() => {
            const previewItems: PreviewItem[] = [];
            const previewIndexByItem = new Map<number, number>();
            itemsSnapshotRef.current.forEach((item, idx) => {
              const src = item.imageUrl || '';
              if (!src) return;
              let isStudio = false;
              try { isStudio = !!JSON.parse(item.customNote ?? "{}").studioDesign; } catch {}
              previewIndexByItem.set(idx, previewItems.length);
              previewItems.push({ src, alt: `${item.name} preview`, isStudio });
            });
            return (
              <>
                <div className="p-4 rounded-2xl mb-4 bg-gray-50 border border-gray-100 text-left">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Order</p>
                  <div className="space-y-2">
                    {itemsSnapshotRef.current.map((item, i) => {
                      let isStudio = false;
                      try { isStudio = !!JSON.parse(item.customNote ?? "{}").studioDesign; } catch {}
                      const src = item.imageUrl || '';
                      return (
                        <div key={i} className="flex items-center gap-3">
                          {src ? (
                            <ItemPreviewThumb
                              src={src}
                              alt={`${item.name} preview`}
                              isStudio={isStudio}
                              size="sm"
                              onOpen={
                                previewIndexByItem.has(i)
                                  ? () => setSuccessLightboxIndex(previewIndexByItem.get(i)!)
                                  : undefined
                              }
                            />
                          ) : (
                            <CartItemThumbnail item={item} size={48} />
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-xs leading-tight truncate text-gray-800">{item.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 text-left">
                              Qty: {item.quantity}
                              {item.size ? ` · ${item.size}` : ''}
                              {item.color ? ` · ${item.color}` : ''}
                            </p>
                          </div>
                          <p className="font-bold text-xs text-orange-600 shrink-0">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <PreviewLightbox
                  items={previewItems}
                  index={successLightboxIndex}
                  onIndexChange={setSuccessLightboxIndex}
                  onClose={() => setSuccessLightboxIndex(null)}
                />
              </>
            );
          })()}

          {paymentMethod === 'cod' ? (
            <div className="p-4 rounded-2xl mb-4 text-left" style={{ background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.18)' }}>
              <p className="text-xs font-bold text-cyan-700 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Advance Required to Confirm
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Advance due: <strong className="text-gray-900">{formatPrice(snapshotRef.current.advance)}</strong></p>
                <p>Remaining on delivery: <strong className="text-gray-900">{formatPrice(snapshotRef.current.total - snapshotRef.current.advance)}</strong></p>
              </div>
            </div>
          ) : paymentMode === 'full' ? (
            <div className="p-4 rounded-2xl mb-4 text-left" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Full Payment Under Verification
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Amount sent: <strong className="text-gray-900">{formatPrice(snapshotRef.current.total)}</strong></p>
                <p>We'll confirm your order once payment is verified.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl mb-4 text-left" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Advance Payment Under Verification
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Advance paid: <strong className="text-gray-900">{formatPrice(snapshotRef.current.advance)}</strong></p>
                <p>Remaining on delivery: <strong className="text-gray-900">{formatPrice(snapshotRef.current.total - snapshotRef.current.advance)}</strong></p>
              </div>
            </div>
          )}

          {WHATSAPP_NUMBER_INTL && (
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER_INTL.replace('+', '')}?text=Hi Trynext! My order number is ${createdOrder?.orderNumber}. I need help.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white text-sm mb-2"
              style={{ background: '#25D366', boxShadow: '0 4px 20px rgba(37,211,102,0.3)' }}
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp{WHATSAPP_NUMBER_LOCAL ? ` — ${WHATSAPP_NUMBER_LOCAL}` : ""}
            </a>
          )}
          {WHATSAPP_NUMBER_INTL && (
            <a
              href={`tel:${WHATSAPP_NUMBER_INTL}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm mb-3"
              style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', color: '#16a34a' }}
            >
              <Phone className="w-4 h-4" /> Call Us{WHATSAPP_NUMBER_LOCAL ? ` — ${WHATSAPP_NUMBER_LOCAL}` : ""}
            </a>
          )}

          <button
            onClick={() => {
              const oNum = encodeURIComponent(String(createdOrder?.orderNumber || ''));
              const ph = encodeURIComponent(String(createdOrder?.customerPhone || ''));
              setLocation(`/track?order=${oNum}&phone=${ph}`);
            }}
            className="btn-glow w-full py-4 rounded-xl font-bold text-white text-base mb-3"
            style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)', boxShadow: '0 6px 24px rgba(232,93,4,0.35)' }}>
            Track My Order
          </button>
          <button onClick={() => setLocation("/")}
            className="w-full py-3.5 rounded-xl font-semibold text-sm text-gray-500 hover:text-gray-700 transition-colors bg-gray-50 border border-gray-200">
            Continue Shopping
          </button>
        </motion.div>
      </div>
    );
  }

  if (checkoutStatus === 'gateway') {
    const snapTotal = snapshotRef.current.total;
    const snapAdvance = snapshotRef.current.advance;
    const snapRemaining = snapTotal - snapAdvance;
    const amountToSend = paymentMode === 'full' ? snapTotal : snapAdvance;
    const gatewayEvidenceReady = isWalletMethod
      ? paymentNumberReady && lastFour.length === 4
      : paymentMethod === 'bank'
        ? bankConfigured && senderName.trim().length >= 2 && bankReference.trim().length >= 4
        : true;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full space-y-4"
        >
          <div className="rounded-3xl overflow-hidden bg-white"
            style={{ border: `1px solid ${theme.border}`, boxShadow: theme.glow }}>

            <div className="p-6 text-center" style={{ background: theme.light, borderBottom: `1px solid ${theme.border}` }}>
              <div className="mb-2">{theme.logo}</div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Payment Gateway</p>
              <p className="text-sm text-gray-500">
                {`Pay 25% advance via ${theme.name} — rest collected on delivery`}
              </p>
            </div>

            <div className="p-6 space-y-5">

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Order #</p>
                  <p className="font-black text-sm font-mono text-orange-600">{createdOrder?.orderNumber as string}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Order Total</p>
                  <p className="font-black text-sm text-gray-900">{formatPrice(snapTotal)}</p>
                </div>
              </div>

              <div className="rounded-2xl p-5 text-center" style={{ background: theme.light, border: `2px solid ${theme.border}` }}>
                <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: theme.primary }}>
                  Send This Amount (25% Advance)
                </p>
                <p className="text-6xl font-black font-display" style={{ color: theme.primary }}>
                  {formatPrice(amountToSend)}
                </p>
                {paymentMode === 'advance' && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
                    <p className="text-xs font-semibold text-gray-500">
                      Remaining <strong className="text-gray-900 text-sm">{formatPrice(snapRemaining)}</strong> paid on delivery
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">How to Pay</p>
                {[
                  `Open your ${theme.name} app`,
                  `Go to "Send Money"`,
                  `Enter number: ${effectivePaymentNumber}`,
                  `Send exactly ${formatPrice(amountToSend)}`,
                  'Enter the last 4 digits of the wallet number you paid from below',
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                      style={{ background: theme.light, color: theme.primary, border: `1px solid ${theme.border}` }}>
                      {i + 1}
                    </div>
                    <span className="text-sm text-gray-600 leading-relaxed">{s}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-4 bg-gray-50" style={{ border: `1px solid ${theme.border}` }}>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Send Money To</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 mb-1">{theme.name} Personal Number</p>
                    <p className="text-3xl font-black tracking-widest font-mono" style={{ color: theme.primary }}>
                      {effectivePaymentNumber}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">Tap COPY then paste directly in {theme.name} app</p>
                    {!paymentNumberReady && (
                      <p className="text-[10px] text-red-500 mt-1 font-bold">Admin number not configured — use WhatsApp to confirm payment.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      void copyNumber();
                    }}
                    className="flex flex-col items-center gap-1 w-14 h-14 rounded-xl justify-center transition-all duration-300 shrink-0"
                    style={{
                      background: copiedNumber ? 'rgba(22,163,74,0.08)' : theme.light,
                      border: copiedNumber ? '1px solid rgba(22,163,74,0.2)' : `1px solid ${theme.border}`,
                      color: copiedNumber ? '#16a34a' : theme.primary,
                    }}
                  >
                    {copiedNumber ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    <span className="text-[8px] font-black">{copiedNumber ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
                {copiedNumber && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3" /> {effectivePaymentNumber} copied! Paste directly in {theme.name} app.
                  </motion.p>
                )}
              </div>

              <div>
                <label htmlFor="payment-sender-last-four" className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2 mt-4">
                  Sender Number — Last 4 Digits
                </label>
                <input
                  id="payment-sender-last-four"
                  type="tel"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 5678"
                  aria-label="Last four digits of the number used to send payment"
                  value={lastFour}
                  onChange={e => {
                    setPaymentSubmitError(null);
                    setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  className={inputClass}
                  style={{ ...inputStyle, letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.5rem', fontWeight: 900 }}
                />
                  <p className="text-xs text-gray-500 mt-1.5">
                  Use the last 4 digits of <strong>your own sending number</strong>, not our merchant number. Never enter your full number.
                </p>
                <p className="text-xs text-gray-400 mt-1">Example: if your sending number ends in 5678, enter <strong>5678</strong>.</p>

                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2 mt-5">
                  Payment Screenshot (Optional)
                </label>
                <label className="relative overflow-hidden flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-colors hover:bg-orange-50"
                  style={{ background: paymentProofUrl ? 'rgba(22,163,74,0.06)' : '#fffaf5', border: `1px dashed ${paymentProofUrl ? 'rgba(22,163,74,0.4)' : 'rgba(232,93,4,0.35)'}` }}>
                  <Upload className="w-5 h-5 text-orange-500 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-gray-800">{isUploadingProof ? 'Uploading screenshot…' : paymentProofName || 'Attach payment screenshot'}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">Optional · JPG, PNG, or WebP · max 8 MB</span>
                  </span>
                  {paymentProofUrl && <Check className="w-5 h-5 text-green-600 shrink-0" />}
                  <input id="payment-proof-file" type="file" accept="image/png,image/jpeg,image/webp" className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" disabled={isUploadingProof} onChange={e => { const f = e.target.files?.[0]; if (f) void uploadPaymentProof(f); }} />
                </label>
                {paymentProofNotice && (
                  <p role="status" className="mt-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    {paymentProofNotice}
                  </p>
                )}
              </div>

              {paymentMethod === 'bank' && (
                <div className="rounded-2xl p-4 mb-5 bg-gray-50" style={{ border: `1px solid ${theme.border}` }}>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Bank Transfer Details</p>
                  <p className="text-sm text-gray-700"><strong>{settings.bankName}</strong> · {settings.bankAccountName}</p>
                  <p className="text-lg font-black font-mono text-gray-900 mt-1">{settings.bankAccountNumber}</p>
                  {settings.bankBranch && <p className="text-xs text-gray-500 mt-1">Branch: {settings.bankBranch}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <input value={senderName} onChange={e => setSenderName(e.target.value.slice(0, 100))} placeholder="Transfer account holder name" className={inputClass} style={inputStyle} />
                    <input value={bankReference} onChange={e => setBankReference(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 100))} placeholder="Bank reference / ID" className={inputClass} style={inputStyle} />
                  </div>
                </div>
              )}

              {paymentSubmitError && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {paymentSubmitError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePaymentSubmit}
                disabled={isSubmittingPayment}
                className="w-full py-4 rounded-xl font-black text-white text-base flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40"
                style={{
                  background: !isSubmittingPayment ? theme.badge : '#e5e7eb',
                  boxShadow: !isSubmittingPayment ? `0 8px 30px ${theme.light}` : 'none',
                  color: !isSubmittingPayment ? 'white' : '#9ca3af',
                }}
              >
                {isSubmittingPayment ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                ) : (
                  <>I've Sent the Payment <ArrowRight className="w-5 h-5" /></>
                )}
              </button>

                      {!gatewayEvidenceReady && !paymentSubmitError && (
                <p className="text-center text-xs font-semibold text-gray-500">
                  {isWalletMethod ? <>Enter the required <strong>4 sender digits</strong>. The screenshot is optional and can be attached for faster verification.</> : <>Complete the required payment reference fields to submit this transfer.</>}
                </p>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Your payment info is secure & encrypted
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden bg-white" style={{ border: '1px solid rgba(37,211,102,0.2)' }}>
            <div className="p-4">
              <p className="text-xs font-black uppercase tracking-widest text-green-600 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Need Help? Contact Us
              </p>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                Having trouble? Wrong amount? Contact us immediately — we're here for you.
              </p>
              {WHATSAPP_NUMBER_INTL && (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER_INTL.replace('+', '')}?text=Hi! I need help with my ${theme.name} payment for order ${createdOrder?.orderNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm"
                    style={{ background: '#25D366', boxShadow: '0 4px 15px rgba(37,211,102,0.3)' }}
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <a
                    href={`tel:${WHATSAPP_NUMBER_INTL}`}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
                    style={{ background: 'rgba(37,211,102,0.06)', border: '1px solid rgba(37,211,102,0.15)', color: '#16a34a' }}
                  >
                    <Phone className="w-4 h-4" /> Call Us
                  </a>
                </div>
              )}
              {WHATSAPP_NUMBER_LOCAL && (
                <p className="text-center text-xs text-gray-400 mt-2">{WHATSAPP_NUMBER_LOCAL}</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEOHead title="Checkout" description="Complete your order at Trynext Lifestyle." noindex />
      <Navbar />

      <main ref={stepPanelRef} tabIndex={-1} className="flex-1 pt-header pb-24 outline-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Mobile Order Summary Toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-sm">Order Summary</span>
                <span className="text-xs text-gray-400">({items.length} items)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-orange-600">{formatPrice(total)}</span>
                <motion.div animate={{ rotate: summaryExpanded ? 180 : 0 }}>
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </motion.div>
              </div>
            </button>
            <AnimatePresence>
              {summaryExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-white border-x border-b border-gray-50 rounded-b-2xl space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="flex gap-3 items-center">
                        <CartItemThumbnail item={item} size={48} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-400">Qty: {item.quantity}</p>
                        </div>
                        <span className="font-bold text-xs">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="pt-4 border-t border-gray-50 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotal</span>
                        <span>{formatPrice(liveSubtotal)}</span>
                      </div>
                      <div className="flex justify-between font-black text-gray-900">
                        <span>Total</span>
                        <span className="text-orange-600">{formatPrice(total)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-start justify-center gap-0 max-w-lg mx-auto px-1 sm:px-3" role="navigation" aria-label="Checkout progress">
              {[
                { num: 1, label: "Delivery", done: step > 1, active: step === 1 },
                { num: 2, label: "Payment", done: step > 2, active: step === 2 },
                { num: 3, label: "Review", done: false, active: step === 3 },
              ].map((s, i) => (
                <div key={s.num} className="flex items-start flex-1 min-w-0 last:flex-initial">
                  <div className="flex flex-col items-center gap-1.5 min-w-[58px] sm:min-w-[72px]">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all"
                      style={{
                        background: s.done
                          ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                          : s.active
                            ? 'linear-gradient(135deg, #E85D04, #FB8500)'
                            : '#f3f4f6',
                        color: s.done || s.active ? 'white' : '#9ca3af',
                        boxShadow: s.active ? '0 4px 12px rgba(232,93,4,0.3)' : 'none',
                      }}
                      aria-current={s.active ? 'step' : undefined}
                    >
                      {s.done ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    {/* Hide label on very small screens, show only for active/done or on larger screens */}
                    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap ${s.active ? 'text-orange-600' : s.done ? 'text-green-600' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className="flex-1 h-0.5 mx-1.5 sm:mx-2 mt-[18px] rounded-full min-w-[18px]" style={{ background: s.done ? '#16a34a' : '#e5e7eb' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {!customer && !hideAuthBanner && (
            <div className="mb-6 rounded-2xl border p-4 sm:p-5 flex items-start gap-3 sm:gap-4"
              style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', borderColor: '#fdba74' }}>
              <div className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center shrink-0"
                style={{ background: '#E85D04', color: 'white' }}>
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm sm:text-base text-gray-900">
                  Sign in to save this order &amp; track it easily
                </p>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  Your cart stays — no need to re-enter details next time.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" onClick={() => navigate("/login?redirect=/checkout")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white"
                    style={{ background: '#E85D04' }}>
                    <LogIn className="w-3.5 h-3.5" /> Sign in
                  </button>
                  <button type="button" onClick={() => navigate("/signup?redirect=/checkout")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border"
                    style={{ borderColor: '#E85D04', color: '#E85D04', background: 'white' }}>
                    <UserPlus className="w-3.5 h-3.5" /> Create account
                  </button>
                  <button type="button"
                    disabled={guestLoading}
                    onClick={async () => {
                      setGuestLoading(true);
                      const fn = (watch("firstName") || "").trim();
                      const ln = (watch("lastName") || "").trim();
                      const phone = (watch("customerPhone") || "").trim();
                      const r = await loginAsGuest({
                        name: [fn, ln].filter(Boolean).join(" ") || undefined,
                        phone: phone || undefined,
                      });
                      setGuestLoading(false);
                      if (!r.success) {
                        toast({ title: "Guest checkout failed", description: r.error || "Try again.", variant: "destructive" });
                      } else {
                        toast({ title: "Continuing as guest", description: "We'll create a guest account so you can track this order." });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold disabled:opacity-60"
                    style={{ background: '#f3f4f6', color: '#374151' }}>
                    {guestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Continue as Guest
                  </button>
                </div>
              </div>
              <button type="button" aria-label="Dismiss"
                onClick={() => {
                  setHideAuthBanner(true);
                  try { sessionStorage.setItem("checkout_auth_banner_dismissed", "1"); } catch {}
                }}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors shrink-0">
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <form id="checkout-form" ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Delivery Details Step 1 */}
                <div className={`p-4 sm:p-7 rounded-3xl ${step !== 1 ? 'hidden' : ''}`} style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                  <h2 className="text-xl font-black font-display flex items-center gap-3 mb-6 text-gray-800">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(232,93,4,0.08)', color: '#E85D04' }}>
                      <MapPin className="w-4 h-4" />
                    </span>
                    Step 1: Delivery Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="co-firstName" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">First Name *</label>
                      <input
                        id="co-firstName"
                        type="text"
                        inputMode="text"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        {...register("firstName")}
                        className={inputClass}
                        style={{ ...inputStyle, borderColor: errors.firstName ? '#f87171' : undefined }}
                        placeholder="First name"
                        autoComplete="given-name"
                        aria-invalid={!!errors.firstName}
                        aria-describedby={errors.firstName ? "co-firstName-error" : undefined}
                      />
                      {errors.firstName && <p id="co-firstName-error" role="alert" className="text-red-500 text-xs mt-1.5">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="co-lastName" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Last Name *</label>
                      <input
                        id="co-lastName"
                        type="text"
                        inputMode="text"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        {...register("lastName")}
                        className={inputClass}
                        style={{ ...inputStyle, borderColor: errors.lastName ? '#f87171' : undefined }}
                        placeholder="Last name"
                        autoComplete="family-name"
                        aria-invalid={!!errors.lastName}
                        aria-describedby={errors.lastName ? "co-lastName-error" : undefined}
                      />
                      {errors.lastName && <p id="co-lastName-error" role="alert" className="text-red-500 text-xs mt-1.5">{errors.lastName.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="co-email" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Email *</label>
                      <input
                        id="co-email"
                        type="email"
                        inputMode="email"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        {...register("customerEmail")}
                        className={inputClass}
                        style={{ ...inputStyle, borderColor: errors.customerEmail ? '#f87171' : undefined }}
                        placeholder="you@example.com"
                        autoComplete="email"
                        aria-invalid={!!errors.customerEmail}
                        aria-describedby={errors.customerEmail ? "co-email-error" : undefined}
                      />
                      {errors.customerEmail && <p id="co-email-error" role="alert" className="text-red-500 text-xs mt-1.5">{errors.customerEmail.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="co-phone" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Phone *</label>
                      <input
                        id="co-phone"
                        type="tel"
                        inputMode="tel"
                        enterKeyHint="next"
                        {...register("customerPhone")}
                        className={inputClass}
                        style={{ ...inputStyle, borderColor: errors.customerPhone ? '#f87171' : undefined }}
                        placeholder="01XXXXXXXXX"
                        autoComplete="tel"
                        aria-invalid={!!errors.customerPhone}
                        aria-describedby={errors.customerPhone ? "co-phone-error" : undefined}
                      />
                      {errors.customerPhone && <p id="co-phone-error" role="alert" className="text-red-500 text-xs mt-1.5">{errors.customerPhone.message}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="co-address" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Street Address *</label>
                      <textarea
                        id="co-address"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        {...register("shippingAddress")}
                        rows={3}
                        className={`${inputClass} resize-none`}
                        style={{ ...inputStyle, borderColor: errors.shippingAddress ? '#f87171' : undefined }}
                        placeholder="House / Road / Area / Thana"
                        autoComplete="street-address"
                        aria-invalid={!!errors.shippingAddress}
                        aria-describedby={errors.shippingAddress ? "co-address-error" : undefined}
                      />
                      {errors.shippingAddress && <p id="co-address-error" role="alert" className="text-red-500 text-xs mt-1.5">{errors.shippingAddress.message}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <DeliveryAreaPicker
                        selectedDistrict={selectedDistrict}
                        selectedUpazila={selectedUpazila ?? ""}
                        onSelect={(district, upazila, division, postCode) => {
                          setValue("shippingDistrict", district, { shouldValidate: true });
                          setValue("shippingUpazila", upazila, { shouldValidate: true });
                          setValue("shippingCity", division);
                          setValue("shippingPostCode", postCode);
                          setValue("shippingUnion", "");
                        }}
                        onGPSDetect={handleGPSDetect}
                        gpsLoading={gpsLoading}
                        autoOpen={gpsPickerAutoOpen}
                        error={errors.shippingDistrict?.message || errors.shippingUpazila?.message}
                      />
                    </div>
                    {selectedDistrict && (
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Union / Ward (Optional)</label>
                          <input
                            {...register("shippingUnion")}
                            className={inputClass}
                            style={inputStyle}
                            placeholder="e.g. Ward 5, Kalabagan"
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Post Code</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            enterKeyHint="done"
                            {...register("shippingPostCode")}
                            className={inputClass}
                            style={inputStyle}
                            placeholder="e.g. 1205"
                            autoComplete="postal-code"
                          />
                        </div>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Order Notes (Optional)</label>
                      <input {...register("notes")} className={inputClass} style={inputStyle} placeholder="Any special instructions..." />
                    </div>
                  </div>
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={async () => {
                        const fields: Array<keyof CheckoutFormData> = [
                          "firstName", "lastName", "customerPhone", "shippingAddress",
                          "shippingDistrict", "shippingUpazila"
                        ];
                        const isValid = await trigger(fields);
                        if (isValid) goToStep(2);
                      }}
                      className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black flex items-center justify-center gap-2 hover:bg-black transition-all"
                    >
                      Continue to Payment <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Payment Method Step 2 */}
                <div className={`p-4 sm:p-7 rounded-3xl ${step !== 2 ? 'hidden' : ''}`} style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                  <h2 className="text-xl font-black font-display flex items-center gap-3 mb-6 text-gray-800">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(232,93,4,0.08)', color: '#E85D04' }}>
                      <CreditCard className="w-4 h-4" />
                    </span>
                    Step 2: Payment
                  </h2>

                  <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                    Choose how you pay. For wallets, send the amount to our merchant number and enter your sending details below.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (paymentMethod === 'card') {
                          const advanceMethod = configuredPaymentMethods.find(m => m !== 'card');
                          if (!advanceMethod) return;
                          setPaymentMethod(advanceMethod);
                        }
                        setPaymentMode('advance');
                      }}
                      className="text-left p-4 rounded-2xl transition-all duration-200 focus:outline-none relative"
                      style={{
                        background: paymentMode === 'advance' ? 'rgba(22,163,74,0.05)' : '#f9fafb',
                        border: paymentMode === 'advance' ? '2px solid rgba(22,163,74,0.45)' : '2px solid #e5e7eb',
                        boxShadow: paymentMode === 'advance' ? '0 2px 16px rgba(22,163,74,0.10)' : 'none',
                      }}
                    >
                      <span className="absolute -top-2.5 right-3 text-[10px] font-black bg-green-500 text-white px-2 py-0.5 rounded-full">RECOMMENDED</span>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMode === 'advance' ? 'border-green-500' : 'border-gray-300'}`}>
                          {paymentMode === 'advance' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                        </div>
                        <span className="font-black text-sm text-gray-900">25% Advance</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed pl-6">
                        Pay <strong className="text-gray-800">{formatPrice(advanceAmount)}</strong> now, rest on delivery.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (paymentMethod === 'cod') {
                          const advanceMethod = configuredPaymentMethods.find(m => m !== 'cod' && m !== 'card');
                          if (advanceMethod) setPaymentMethod(advanceMethod);
                        }
                        setPaymentMode('full');
                      }}
                      className="text-left p-4 rounded-2xl transition-all duration-200 focus:outline-none relative"
                      style={{
                        background: paymentMode === 'full' ? 'rgba(232,93,4,0.05)' : '#f9fafb',
                        border: paymentMode === 'full' ? '2px solid rgba(232,93,4,0.45)' : '2px solid #e5e7eb',
                        boxShadow: paymentMode === 'full' ? '0 2px 16px rgba(232,93,4,0.10)' : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMode === 'full' ? 'border-orange-500' : 'border-gray-300'}`}>
                          {paymentMode === 'full' && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                        </div>
                        <span className="font-black text-sm text-gray-900">Full Payment</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed pl-6">
                        Pay the complete <strong className="text-gray-800">{formatPrice(total)}</strong> now.
                      </p>
                    </button>

                  </div>

                  {configuredPaymentMethods.length > 0 ? (
                    <div className="mb-6">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Select Payment Method</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {configuredPaymentMethods.map((method) => {
                          const t = gatewayTheme[method];
                          const isSelected = paymentMethod === method;
                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => {
                                setPaymentMethod(method);
                                setPaymentMode('advance');
                              }}
                              className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-200 focus:outline-none disabled:opacity-40"
                              style={{
                                background: isSelected ? t.light : '#f9fafb',
                                border: isSelected ? `2px solid ${t.border}` : '2px solid #e5e7eb',
                                color: isSelected ? t.primary : '#9ca3af',
                                boxShadow: isSelected ? t.glow : 'none',
                              }}
                            >
                              {isSelected && (
                                <div className="absolute top-2 right-2" style={{ color: t.primary }}>
                                  <Check className="w-4 h-4" />
                                </div>
                              )}
                              {t.icon}
                              <span className="font-black text-sm">{t.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-8 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm">
                      <p className="font-bold">Payment is not configured yet.</p>
                      <p className="mt-1">Please contact support or try again later.</p>
                    </div>
                  )}

                  {(paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'upay') && (
                    <div className="rounded-2xl p-5 mb-6" style={{ background: theme.light, border: `2px solid ${theme.border}` }}>
                      <div className="flex items-center justify-between mb-4">
                        <div>{theme.logo}</div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-gray-400">Send Amount</p>
                          <p className="text-2xl font-black font-display" style={{ color: theme.primary }}>
                            {formatPrice(amountDueNow)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl p-4 bg-white mb-4" style={{ border: `1px solid ${theme.border}` }}>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Send Money To</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-[10px] text-gray-400 mb-1">{theme.name} Personal Number</p>
                            <p className="text-2xl font-black tracking-widest font-mono" style={{ color: theme.primary }}>
                              {effectivePaymentNumber || "Not configured"}
                            </p>
                            {!paymentNumberReady && (
                              <p className="text-[10px] text-red-500 mt-1 font-bold">Admin number not configured — contact us on WhatsApp to confirm payment.</p>
                            )}
                          </div>
                          {paymentNumberReady && (
                            <button
                              onClick={copyNumber}
                              className="flex flex-col items-center gap-1 w-14 h-14 rounded-xl justify-center transition-all duration-300 shrink-0"
                              style={{
                                background: copiedNumber ? 'rgba(22,163,74,0.08)' : theme.light,
                                border: copiedNumber ? '1px solid rgba(22,163,74,0.2)' : `1px solid ${theme.border}`,
                                color: copiedNumber ? '#16a34a' : theme.primary,
                              }}
                            >
                              {copiedNumber ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                              <span className="text-[8px] font-black">{copiedNumber ? 'COPIED' : 'COPY'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Last 4 Digits of Sending Number *</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="e.g. 5678"
                            value={lastFour}
                            onChange={e => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className={inputClass}
                            style={{ ...inputStyle, letterSpacing: '0.5em', textAlign: 'center', fontSize: '1.5rem', fontWeight: 900 }}
                          />
                        </div>

                      </div>
                    </div>
                  )}

                  {paymentMethod === 'bank' && (
                    <div className="rounded-2xl p-5 mb-6" style={{ background: theme.light, border: `2px solid ${theme.border}` }}>
                      <div className="flex items-center gap-3 mb-4">
                        {theme.icon}
                        <span className="text-xl font-black" style={{ color: theme.primary }}>Bank Transfer</span>
                      </div>
                      <div className="rounded-xl p-4 bg-white mb-4" style={{ border: `1px solid ${theme.border}` }}>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Transfer To</p>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-400">Bank:</span> <strong className="text-gray-900">{settings.bankName || "Not configured"}</strong></p>
                          <p><span className="text-gray-400">Account Name:</span> <strong className="text-gray-900">{settings.bankAccountName || "Not configured"}</strong></p>
                          <p><span className="text-gray-400">Account Number:</span> <strong className="text-gray-900">{settings.bankAccountNumber || "Not configured"}</strong></p>
                          {settings.bankBranch && <p><span className="text-gray-400">Branch:</span> <strong className="text-gray-900">{settings.bankBranch}</strong></p>}
                          {settings.bankRoutingNumber && <p><span className="text-gray-400">Routing:</span> <strong className="text-gray-900">{settings.bankRoutingNumber}</strong></p>}
                        </div>
                        {!bankConfigured && (
                          <p className="text-xs text-red-500 mt-3 font-bold">Bank details not configured — contact us on WhatsApp.</p>
                        )}
                      </div>
                      <div className="rounded-xl p-4 bg-white mb-4" style={{ border: `1px solid ${theme.border}` }}>
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Send Amount</p>
                        <p className="text-2xl font-black font-display" style={{ color: theme.primary }}>{formatPrice(paymentMode === 'full' ? total : advanceAmount)}</p>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Sender Name / Account Name *</label>
                          <input
                            type="text"
                            placeholder="Your bank account name"
                            value={senderName}
                            onChange={e => setSenderName(e.target.value.slice(0, 100))}
                            className={inputClass}
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Transaction / Reference Number *</label>
                          <input
                            type="text"
                            placeholder="e.g. REF123456"
                            value={bankReference}
                            onChange={e => setBankReference(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 50))}
                            className={inputClass}
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="rounded-2xl p-5 mb-6" style={{ background: theme.light, border: `2px solid ${theme.border}` }}>
                      <div className="flex items-center gap-3 mb-3">
                        {theme.icon}
                        <span className="text-xl font-black" style={{ color: theme.primary }}>Card Payment</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-2">{settings.cardPaymentNote}</p>
                      <p className="text-xs text-gray-400">Pay the full amount <strong>{formatPrice(total)}</strong> to our delivery agent using a POS card machine.</p>
                    </div>
                  )}

                  {paymentMethod === 'cod' && (
                    <div className="rounded-2xl p-5 mb-6" style={{ background: theme.light, border: `2px solid ${theme.border}` }}>
                      <div className="flex items-center gap-3 mb-3">
                        {theme.icon}
                        <span className="text-xl font-black" style={{ color: theme.primary }}>Cash on Delivery</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">
                        A 25% advance of <strong className="text-gray-900">{formatPrice(advanceAmount)}</strong> is required to confirm your order.
                        Our team will contact you with payment instructions.
                      </p>
                      <p className="text-xs text-gray-400">Remaining balance <strong>{formatPrice(total - advanceAmount)}</strong> will be collected on delivery.</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => goToStep(3)}
                      disabled={!canProceed}
                      className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${
                        canProceed
                          ? 'bg-gray-900 text-white hover:bg-black'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Review Order <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-500 font-bold text-sm"
                    >
                      Back to Delivery
                    </button>
                  </div>
                </div>

                {/* Review & Place Order Step 3 */}
                <div className={`p-4 sm:p-7 rounded-3xl ${step !== 3 ? 'hidden' : ''}`} style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                  <h2 className="text-xl font-black font-display flex items-center gap-3 mb-6 text-gray-800">
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(232,93,4,0.08)', color: '#E85D04' }}>
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    Step 3: Review &amp; Place Order
                  </h2>

                  <div className="space-y-6 mb-8">
                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Delivery To</p>
                        <button type="button" onClick={() => goToStep(1)} className="text-[10px] font-black text-orange-600 uppercase">Edit</button>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{watch("firstName")} {watch("lastName")}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{watch("customerPhone")}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {watch("shippingAddress")}, {watch("shippingUpazila")}, {watch("shippingDistrict")}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payment Method</p>
                        <button type="button" onClick={() => goToStep(2)} className="text-[10px] font-black text-orange-600 uppercase">Edit</button>
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                         {paymentMode === 'full' ? 'Full Payment' : '25% Advance + Pay on Delivery'}
                      </p>
                       <p className="text-xs text-gray-500 mt-0.5">Via {theme.name}{paymentMethod === 'cod' ? ` (25% advance ${formatPrice(advanceAmount)})` : ''}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-4 rounded-2xl bg-[#E85D04] text-white font-black text-lg shadow-lg shadow-orange-100 flex items-center justify-center gap-2 hover:bg-[#FB8500] transition-all disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Placing Order...
                        </>
                      ) : (
                        <>
                           Place Order ({formatPrice(amountDueNow)})
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="w-full py-3 rounded-xl bg-white border border-gray-200 text-gray-500 font-bold text-sm"
                    >
                      Back to Payment
                    </button>
                  </div>

                  <div className="mt-6">
                    <TrustBadges />
                  </div>
                </div>
              </form>
            </div>

            <div className="lg:col-span-5 order-first lg:order-last">
              <div className="lg:sticky lg:top-28 rounded-3xl p-5 sm:p-7" style={{ background: 'white', border: '1px solid #e5e7eb' }}>
                <h3 className="text-lg font-black font-display mb-6 text-gray-800">Order Summary</h3>

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 mb-6 hide-scrollbar">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <CartItemThumbnail item={item} size={56} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight truncate text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Qty: {item.quantity}
                          {item.size ? ` · ${item.size}` : ''}
                          {item.color ? ` · ${item.color}` : ''}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-orange-600 shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-4 mb-4">
                  {!promoApplied ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                        placeholder="Promo or referral code"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
                      />
                      <button
                        type="button"
                        onClick={() => validatePromo()}
                        disabled={promoLoading || !promoInput.trim()}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white shrink-0 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}
                      >
                        {promoLoading ? "..." : "Apply"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}>
                      <span className="text-sm font-bold text-green-600 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> {promoApplied} — {formatPrice(promoDiscount)} off
                      </span>
                      <button type="button" onClick={removePromo} className="text-xs font-semibold text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  )}
                  {promoError && <p className="text-xs text-red-500 mt-1.5 font-medium">{promoError}</p>}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-2.5 mb-6 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-700">{formatPrice(liveSubtotal)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span className="font-semibold">-{formatPrice(promoDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping</span>
                    <span className={shippingCost === 0 ? "font-bold text-green-500" : "font-semibold text-gray-700"}>
                      {shippingCost === 0 ? "FREE" : formatPrice(shippingCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <span className="font-bold text-lg text-gray-800">Total</span>
                    <span className="font-black text-2xl text-primary">{formatPrice(total)}</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {paymentMode === 'full' ? (
                      <div className="flex justify-between items-center p-3 rounded-xl"
                        style={{ background: 'rgba(232,93,4,0.04)', border: '1px solid rgba(232,93,4,0.12)' }}>
                        <span className="text-xs font-bold text-orange-600">Pay Now (Full — via {theme.name})</span>
                        <span className="font-black text-orange-600">{formatPrice(total)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center p-3 rounded-xl"
                          style={{ background: 'rgba(232,93,4,0.04)', border: '1px solid rgba(232,93,4,0.12)' }}>
                          <span className="text-xs font-bold text-orange-600">Pay Now (25% Advance via {theme.name})</span>
                          <span className="font-black text-orange-600">{formatPrice(advanceAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl"
                          style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                          <span className="text-xs font-bold text-green-600">Remaining (Paid on Delivery)</span>
                          <span className="font-black text-green-600">{formatPrice(total - advanceAmount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <TrustBadges />


                {serverWaking && isPending && (
                  <div className="mt-3 p-3 rounded-xl text-xs font-semibold text-amber-700 flex items-start gap-2"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Loader2 className="w-3.5 h-3.5 shrink-0 mt-0.5 animate-spin" />
                    <span>Our server is waking up — this can take 30–50 seconds on the first request after a quiet period. Please don't close the page.</span>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary/50" />
                  Secure · All 64 Districts{freeShippingThreshold > 0 ? ` · Free Shipping ৳${freeShippingThreshold}+` : ""}
                </div>

                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER_INTL.replace('+', '')}?text=Hi Trynext! I need help with my order.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl font-semibold text-xs transition-all"
                  style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.15)', color: '#16a34a' }}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Any questions? WhatsApp us — {WHATSAPP_NUMBER_LOCAL}
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
