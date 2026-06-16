import { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { OrderSkeleton } from "@/components/ui/skeleton";
import {
  Search, Clock, CheckCircle2, Truck, MapPin,
  XCircle, AlertTriangle, RefreshCw, Box, Star, Loader2, Gift, Heart, Package,
  MessageSquare, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice, cn, getApiUrl } from "@/lib/utils";
import { ItemPreviewThumb, PreviewLightbox, type PreviewItem } from "@/components/ZoomableImage";

const inputClass = "w-full px-4 py-3.5 rounded-xl text-base sm:text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-gray-400";
const inputStyle = { background: 'white', border: '1px solid #e5e7eb', color: '#111827' };

const PAYMENT_STATUSES: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof XCircle; desc: string }> = {
  pending: {
    label: 'Not Paid', color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)',
    icon: XCircle, desc: 'Payment not yet received'
  },
  not_paid: {
    label: 'Not Paid', color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)',
    icon: XCircle, desc: 'Payment not yet received'
  },
  submitted: {
    label: 'Under Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)',
    icon: RefreshCw, desc: 'Your payment is being verified by admin'
  },
  verified: {
    label: 'Payment Confirmed', color: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.15)',
    icon: CheckCircle2, desc: 'Payment received and confirmed!'
  },
  wrong: {
    label: 'Payment Issue', color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)',
    icon: AlertTriangle, desc: 'Issue with payment — contact us on WhatsApp'
  },
  cod: {
    label: 'Cash on Delivery', color: '#16a34a', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)',
    icon: CheckCircle2, desc: 'Pay when you receive your order'
  },
};

const ORDER_STEPS = [
  { key: 'pending', icon: Clock, label: 'Order Placed', desc: 'Your order has been received' },
  { key: 'confirmed', icon: CheckCircle2, label: 'Confirmed', desc: 'Order has been confirmed' },
  { key: 'design_review', icon: Search, label: 'Design Review', desc: 'Our team is reviewing your design' },
  { key: 'design_approved', icon: Star, label: 'Design Approved', desc: 'Your design is ready for production' },
  { key: 'in_production', icon: RefreshCw, label: 'In Production', desc: 'Your custom items are being made' },
  { key: 'quality_check', icon: CheckCircle2, label: 'Quality Check', desc: 'Final inspection before packing' },
  { key: 'ready_to_ship', icon: Package, label: 'Ready to Ship', desc: 'Packed and waiting for pickup' },
  { key: 'shipped', icon: Box, label: 'Shipped', desc: 'Handed over to courier' },
  { key: 'out_for_delivery', icon: Truck, label: 'Out for Delivery', desc: 'Our rider is on the way' },
  { key: 'delivered', icon: CheckCircle2, label: 'Delivered', desc: 'Successfully delivered!' },
];

function getOrderStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0,
    confirmed: 1,
    design_review: 2,
    design_approved: 3,
    in_production: 4,
    quality_check: 5,
    ready_to_ship: 6,
    shipped: 7,
    out_for_delivery: 8,
    delivered: 9,
    cancelled: -1,
    refunded: -1
  };
  return map[status] ?? 0;
}

type TrackBody = { orderNumber: string; email?: string; phone?: string };

async function fetchTrack(body: TrackBody, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(getApiUrl('/api/orders/track'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify(body),
      signal,
    });
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

function buildTrackBody(oNum: string, identifier: string): TrackBody {
  const isEmail = identifier.includes("@");
  return isEmail
    ? { orderNumber: oNum.toUpperCase(), email: identifier.toLowerCase().trim() }
    : { orderNumber: oNum.toUpperCase(), phone: identifier.trim() };
}

export default function TrackOrder() {
  const settings = useSiteSettings();
  const [orderNumber, setOrderNumber] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [trackError, setTrackError] = useState(false);
  const [liveOrderData, setLiveOrderData] = useState<Record<string, unknown> | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didAutoTrack = useRef(false);
  const identifierRef = useRef("");

  /* ── Customer messaging ──────────────────────────────────── */
  const [orderMessages, setOrderMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMsg, setIsSendingMsg] = useState(false);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [showMsgPanel, setShowMsgPanel] = useState(false);
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const effectiveEmail = identifierRef.current.includes("@")
    ? identifierRef.current
    : null;

  const loadMessages = useCallback(async (orderId: number, email: string) => {
    setIsLoadingMsgs(true);
    try {
      const r = await fetch(
        getApiUrl(`/api/orders/${orderId}/messages?trackEmail=${encodeURIComponent(email)}`),
        { headers: { "Content-Type": "application/json" } }
      );
      if (r.ok) {
        const d = await r.json() as { messages: any[] };
        setOrderMessages(d.messages ?? []);
      }
    } catch {}
    setIsLoadingMsgs(false);
  }, []);

  useEffect(() => {
    const orderId = liveOrderData?.id as number | undefined;
    if (orderId && effectiveEmail) {
      loadMessages(orderId, effectiveEmail);
    }
  }, [liveOrderData?.id, effectiveEmail, loadMessages]);

  useEffect(() => {
    if (showMsgPanel && msgsEndRef.current) {
      msgsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [orderMessages, showMsgPanel]);

  const handleSendMsg = async () => {
    const orderId = liveOrderData?.id as number | undefined;
    if (!orderId || !effectiveEmail || !newMessage.trim() || isSendingMsg) return;
    setIsSendingMsg(true);
    try {
      const r = await fetch(getApiUrl(`/api/orders/${orderId}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim(), trackEmail: effectiveEmail }),
      });
      if (r.ok) {
        setNewMessage("");
        await loadMessages(orderId, effectiveEmail);
      }
    } catch {}
    setIsSendingMsg(false);
  };

  // Auto-track when redirected from order completion (URL has ?order=&phone= or ?order=&email=)
  useEffect(() => {
    if (didAutoTrack.current) return;
    const params = new URLSearchParams(window.location.search);
    const oNum = (params.get("order") || params.get("orderNumber") || "").toUpperCase();
    const identifier = params.get("phone") || params.get("email") || "";
    if (oNum && identifier) {
      didAutoTrack.current = true;
      setOrderNumber(oNum);
      setEmailOrPhone(identifier);
      identifierRef.current = identifier;
      setHasSearched(true);
      setIsPending(true);
      setTrackError(false);
      const ctrl = new AbortController();
      fetchTrack(buildTrackBody(oNum, identifier), ctrl.signal).then(d => {
        if (d) setLiveOrderData(d);
        else setTrackError(true);
      }).finally(() => setIsPending(false));
      return () => ctrl.abort();
    }
    return undefined;
  }, []);

  // Live polling every 12 seconds once we have order data
  useEffect(() => {
    if (liveOrderData && liveOrderData.orderNumber) {
      setIsPolling(true);
      const poll = async () => {
        const id = identifierRef.current || emailOrPhone;
        if (!id) return;
        const d = await fetchTrack(
          buildTrackBody(String(liveOrderData.orderNumber), id),
          AbortSignal.timeout(10000)
        );
        if (d) setLiveOrderData(d);
      };
      pollingRef.current = setInterval(poll, 12000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsPolling(false);
      };
    }
    return undefined;
  }, [liveOrderData?.orderNumber]);

  const handleTrack = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const oNum = orderNumber.trim().toUpperCase();
    const id = emailOrPhone.trim();
    if (!oNum || !id) return;
    identifierRef.current = id;
    setHasSearched(true);
    setIsPending(true);
    setTrackError(false);
    setLiveOrderData(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
    const d = await fetchTrack(buildTrackBody(oNum, id), AbortSignal.timeout(15000));
    if (d) {
      setLiveOrderData(d);
      setTrackError(false);
    } else {
      setTrackError(true);
    }
    setIsPending(false);
  }, [orderNumber, emailOrPhone]);

  const error = trackError;

  const displayOrder = liveOrderData as any;
  const stepIdx = displayOrder ? getOrderStepIndex(displayOrder.status as string) : -1;
  const paymentInfo = displayOrder ? PAYMENT_STATUSES[(displayOrder.paymentStatus as string)] || PAYMENT_STATUSES.pending : null;
  const PayIcon = paymentInfo?.icon;

  const TRYNEX_NUMBER = settings.whatsappNumber
    ? (settings.whatsappNumber.startsWith('+') ? settings.whatsappNumber : `+88${settings.whatsappNumber.replace(/[^0-9]/g, '')}`)
    : (settings.phone || "");

  const paymentMethodLabel: Record<string, string> = {
    cod: 'Cash on Delivery', bkash: 'bKash', nagad: 'Nagad', rocket: 'Rocket'
  };

  const timeline = (displayOrder?.timeline as any[]) || [];

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { previewItems, previewIndexByItem } = (() => {
    const items: PreviewItem[] = [];
    const map = new Map<number, number>();
    const rawItems = (displayOrder?.items as Array<Record<string, unknown>> | undefined) ?? [];
    rawItems.forEach((item: any, idx: number) => {
      let hamper: any = null;
      try { hamper = JSON.parse(item.customNote ?? "{}").hamper; } catch {}
      if (hamper) return;
      const src = (item.imageUrl as string) || (item.productImage as string) || '';
      if (!src) return;
      map.set(idx, items.length);
      items.push({
        src,
        alt: `${item.productName as string} preview`,
        isStudio: !!item.isStudio,
      });
    });
    return { previewItems: items, previewIndexByItem: map };
  })();

  useEffect(() => {
    if (lightboxIndex !== null && lightboxIndex >= previewItems.length) {
      setLightboxIndex(null);
    }
  }, [lightboxIndex, previewItems.length]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEOHead
        title="Track Your Order"
        description="Track your TryNex Lifestyle order in real-time. Enter your order number to see live delivery status updates."
        canonical="/track"
        keywords="track order trynex, order tracking bangladesh"
      />
      <Navbar />

      <main className="flex-1 pt-header pb-24 flex flex-col items-center">
        <div className="max-w-2xl w-full px-4 sm:px-6">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex w-20 h-20 rounded-3xl items-center justify-center mb-6"
              style={{ background: 'rgba(232,93,4,0.08)', border: '1px solid rgba(232,93,4,0.15)' }}>
              <MapPin className="w-9 h-9 text-orange-500" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">Live Tracking</p>
            <h1 className="text-5xl font-black font-display tracking-tighter mb-4">Track Your Order</h1>
            <p className="text-gray-400 text-base">Real-time updates on your TryNex order status.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-7 rounded-3xl mb-8"
            style={{ background: 'white', border: '1px solid #e5e7eb' }}
          >
            <form onSubmit={handleTrack} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                    Order Number *
                  </label>
                  <input
                    required
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    placeholder="e.g. TN250325XXXX"
                    value={orderNumber}
                    onChange={e => setOrderNumber(e.target.value.toUpperCase())}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                    Email or Phone Number *
                  </label>
                  <input
                    required
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    placeholder="your@email.com or 01XXXXXXXXX"
                    value={emailOrPhone}
                    onChange={e => setEmailOrPhone(e.target.value)}
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending || !orderNumber || !emailOrPhone}
                className="btn-glow w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 text-base disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)', boxShadow: '0 6px 24px rgba(232,93,4,0.35)' }}
              >
                {isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> Searching...</> : <><Search className="w-5 h-5" /> Track Order</>}
              </button>
            </form>
          </motion.div>

          <AnimatePresence>
            {isPending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 mb-6"
                aria-label="Searching for order"
                aria-busy="true"
              >
                <OrderSkeleton />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {hasSearched && !isPending && error && !displayOrder && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center p-6 rounded-2xl text-sm font-semibold mb-6"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                <XCircle className="w-6 h-6 mx-auto mb-2 opacity-70" />
                Order not found. Please check your Order Number and Email, then try again.
                {TRYNEX_NUMBER && <p className="text-xs text-gray-400 mt-2">Need help? WhatsApp: {TRYNEX_NUMBER}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {displayOrder && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Main Card */}
                <div className="rounded-3xl overflow-hidden"
                  style={{ background: 'white', border: '1px solid #e5e7eb' }}>

                  {/* Status Header */}
                  <div className="p-6 sm:p-8"
                    style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Order Reference</p>
                        <p className="text-2xl font-black font-mono text-primary">{displayOrder.orderNumber as string}</p>
                      </div>
                      {isPolling && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Live</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-8">
                      Placed on {displayOrder.createdAt ? new Date(displayOrder.createdAt as string).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                    </p>

                    {(displayOrder.status as string) !== 'cancelled' ? (
                      <div>
                        {/* Current Status Banner */}
                        <div className="mb-6 p-4 rounded-2xl flex items-center gap-3"
                          style={{
                            background: stepIdx === 4 ? 'rgba(34,197,94,0.08)' : 'rgba(232,93,4,0.06)',
                            border: `1px solid ${stepIdx === 4 ? 'rgba(34,197,94,0.2)' : 'rgba(232,93,4,0.15)'}`
                          }}>
                          {(() => { const CurrentIcon = ORDER_STEPS[stepIdx >= 0 ? stepIdx : 0].icon; return <CurrentIcon className="w-6 h-6 shrink-0" style={{ color: stepIdx === 4 ? '#22c55e' : '#E85D04' }} />; })()}
                          <div>
                            <p className="font-black text-sm" style={{ color: stepIdx === 4 ? '#16a34a' : '#E85D04' }}>
                              {ORDER_STEPS[stepIdx >= 0 ? stepIdx : 0].label}
                            </p>
                            <p className="text-xs text-gray-500">{ORDER_STEPS[stepIdx >= 0 ? stepIdx : 0].desc}</p>
                          </div>
                        </div>

                        {/* Progress Steps — responsive: compact on mobile, full on sm+ */}
                        <div className="relative">
                          {/* Track line */}
                          <div className="absolute top-3.5 sm:top-5 left-3.5 sm:left-5 right-3.5 sm:right-5 h-0.5 rounded-full" style={{ background: '#e5e7eb' }} />
                          {stepIdx > 0 && (
                            <div
                              className="absolute top-3.5 sm:top-5 left-3.5 sm:left-5 h-0.5 rounded-full transition-all duration-1000"
                              style={{
                                background: 'linear-gradient(90deg, #E85D04, #FB8500)',
                                width: `${(stepIdx / (ORDER_STEPS.length - 1)) * (100 - 10)}%`,
                                maxWidth: 'calc(100% - 28px)',
                              }}
                            />
                          )}
                          <div className="relative flex justify-between">
                            {ORDER_STEPS.map((step, i) => {
                              const isActive = stepIdx >= i;
                              const isCurrent = stepIdx === i;
                              const Icon = step.icon;
                              const shortLabels: Record<string, string> = {
                                'Order Placed': 'Placed',
                                'Processing': 'Prep',
                                'Shipped': 'Shipped',
                                'On the Way': 'Transit',
                                'Delivered': 'Done',
                              };
                              return (
                                <div key={step.key} className="flex flex-col items-center gap-1 sm:gap-2 z-10" title={step.label}>
                                  <motion.div
                                    animate={isCurrent ? { scale: [1, 1.12, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500"
                                    style={{
                                      background: isActive ? (stepIdx === 4 && i === 4 ? '#22c55e' : 'hsl(var(--primary))') : 'white',
                                      borderColor: isActive ? (stepIdx === 4 && i === 4 ? '#22c55e' : 'hsl(var(--primary))') : '#e5e7eb',
                                      color: isActive ? 'white' : '#d1d5db',
                                      boxShadow: isCurrent ? (stepIdx === 4 ? '0 0 16px rgba(34,197,94,0.5)' : '0 0 16px rgba(255,107,43,0.5)') : undefined
                                    }}
                                  >
                                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </motion.div>
                                  <span className={cn("text-[8px] sm:text-[10px] font-black text-center leading-tight max-w-[40px] sm:max-w-none", isActive ? "text-gray-700" : "text-gray-300")}>
                                    <span className="hidden sm:inline">{step.label}</span>
                                    <span className="sm:hidden">{shortLabels[step.label] ?? step.label}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 rounded-2xl"
                        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                        <XCircle className="w-6 h-6 text-red-500" />
                        <div>
                          <p className="font-black text-red-500">Order Cancelled</p>
                          <p className="text-xs text-gray-400">Contact us if you need assistance</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Courier / Tracking Info */}
                  {(displayOrder.courierName || displayOrder.trackingNumber) && (
                    <div className="px-6 sm:px-8 py-5 border-t border-gray-100">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Shipping Info</p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                        <Truck className="w-6 h-6 shrink-0 text-blue-500 hidden sm:block" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Truck className="w-5 h-5 shrink-0 text-blue-500 sm:hidden" />
                            <p className="font-black text-sm text-blue-700">
                              {displayOrder.courierName || 'Courier Partner'}
                            </p>
                          </div>
                          <p className="text-xs text-blue-600 mt-1 ml-8 sm:ml-0">
                            Tracking: {displayOrder.trackingNumber || 'Processing...'}
                          </p>
                        </div>
                        {displayOrder.trackingUrl && (
                          <a
                            href={displayOrder.trackingUrl as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Track Link
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order Timeline */}
                  {timeline.length > 0 && (
                    <div className="px-6 sm:px-8 py-5 border-t border-gray-100">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Status Timeline</p>
                      <div className="space-y-4">
                        {timeline.map((t, i) => {
                          const step = ORDER_STEPS.find(s => s.key === t.status);
                          const StepIcon = step?.icon || Box;
                          return (
                            <div key={i} className="flex gap-4 relative">
                              {i < timeline.length - 1 && (
                                <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-gray-100" />
                              )}
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10",
                                i === timeline.length - 1 ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                              )}>
                                <StepIcon className="w-3 h-3" />
                              </div>
                              <div className="flex-1 pb-4">
                                <div className="flex justify-between items-start">
                                  <p className={cn("text-xs font-black", i === timeline.length - 1 ? "text-gray-900" : "text-gray-500")}>
                                    {step?.label || t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                                  </p>
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    {new Date(t.timestamp).toLocaleDateString('en-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-0.5">{t.note}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Payment Status */}
                  {paymentInfo && (displayOrder.paymentMethod as string) !== 'cod' && (
                    <div className="px-6 sm:px-8 py-5 border-t border-gray-100">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Payment Status</p>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 rounded-2xl"
                        style={{ background: paymentInfo.bg, border: `1px solid ${paymentInfo.border}` }}>
                        <div className="flex items-center gap-3 flex-1">
                          {PayIcon && <PayIcon className="w-6 h-6 shrink-0" style={{ color: paymentInfo.color }} />}
                          <div className="flex-1">
                            <p className="font-black text-sm" style={{ color: paymentInfo.color }}>{paymentInfo.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{paymentInfo.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 sm:border-transparent">
                          {(displayOrder.paymentStatus as string) === 'verified' && (
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                      </div>
                      {(displayOrder.paymentStatus as string) === 'submitted' && (
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> Verification takes 5–30 minutes. This page refreshes automatically.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Customer Info */}
                  <div className="px-6 sm:px-8 py-5 border-t border-gray-100">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Delivery Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Customer</p>
                        <p className="font-bold text-sm text-gray-800">{String(displayOrder.customerName ?? '')}</p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment</p>
                        <p className="font-bold text-sm text-gray-800">{paymentMethodLabel[String(displayOrder.paymentMethod ?? '')] || String(displayOrder.paymentMethod ?? '')}</p>
                      </div>
                      {!!displayOrder.shippingDistrict && (
                        <div className="col-span-2 p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Shipping District</p>
                          <p className="font-bold text-sm text-gray-800">{String(displayOrder.shippingDistrict)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="px-6 sm:px-8 py-5 border-t border-gray-100">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Items Ordered</p>
                    <div className="space-y-3">
                      {(displayOrder.items as Array<Record<string, unknown>>).map((item: any, idx: number) => {
                        let hamper: any = null;
                        try { hamper = JSON.parse(item.customNote ?? "{}").hamper; } catch {}
                        if (hamper) {
                          return (
                            <div key={idx} className="py-3 border-b border-gray-100 last:border-0">
                              <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                                  style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)' }}>
                                  <Gift className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest text-white mb-1"
                                    style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)' }}>
                                    <Gift className="w-2 h-2" /> Gift Hamper
                                  </span>
                                  <p className="font-bold text-sm text-gray-800">{hamper.hamperName || item.productName}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity as number} · {(hamper.items || []).length} items inside</p>
                                  {hamper.recipientName && (
                                    <p className="text-xs text-gray-600 mt-1 italic flex items-center gap-1">
                                      <Heart className="w-3 h-3 text-orange-400" /> For: <strong>{hamper.recipientName}</strong>
                                    </p>
                                  )}
                                </div>
                                <span className="font-bold text-orange-600 text-sm shrink-0">{formatPrice((item.price as number) * (item.quantity as number))}</span>
                              </div>
                              <div className="mt-2 ml-[4.5rem] pl-3 border-l-2 border-orange-100 space-y-0.5">
                                {(hamper.items || []).map((it: any, i: number) => (
                                  <div key={i} className="text-xs text-gray-600">
                                    • {it.name}{it.quantity > 1 ? ` × ${it.quantity}` : ''}
                                  </div>
                                ))}
                                {hamper.giftMessage && (
                                  <div className="mt-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Gift Message</p>
                                    <p className="text-xs text-gray-700 italic mt-0.5">"{hamper.giftMessage}"</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        const previewSrc = (item.imageUrl as string) || (item.productImage as string) || '';
                        const isStudio = !!item.isStudio;
                        return (
                        <div key={idx} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                          <ItemPreviewThumb
                            src={previewSrc}
                            alt={`${item.productName as string} preview`}
                            isStudio={isStudio}
                            onOpen={
                              previewIndexByItem.has(idx)
                                ? () => setLightboxIndex(previewIndexByItem.get(idx)!)
                                : undefined
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm leading-snug text-gray-800">{item.productName as string}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Qty: {item.quantity as number}
                              {item.size ? ` · Size: ${item.size}` : ''}
                              {item.color ? ` · Color: ${item.color}` : ''}
                            </p>
                          </div>
                          <span className="font-bold text-orange-600 text-sm shrink-0">{formatPrice((item.price as number) * (item.quantity as number))}</span>
                        </div>
                        );
                      })}
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>Subtotal</span><span>{formatPrice(displayOrder.subtotal as number)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>Shipping</span>
                        <span className="text-gray-900">{(displayOrder.shippingCost as number) === 0 ? "FREE" : formatPrice(displayOrder.shippingCost as number)}</span>
                      </div>
                      <div className="flex justify-between font-black text-lg pt-2 border-t border-gray-100">
                        <span className="text-gray-800">Total</span><span className="text-primary">{formatPrice(displayOrder.total as number)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Customer ↔ Admin Messaging ── */}
                {effectiveEmail && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                    <button
                      type="button"
                      onClick={() => setShowMsgPanel(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3.5 font-bold text-sm"
                      style={{ background: '#f9fafb', color: '#374151' }}
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-orange-500" />
                        Messages from TryNex
                        {orderMessages.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-600">
                            {orderMessages.length}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-400">{showMsgPanel ? "▲" : "▼"}</span>
                    </button>
                    {showMsgPanel && (
                      <div className="p-3 space-y-2">
                        {isLoadingMsgs ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading messages…
                          </div>
                        ) : orderMessages.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-5">No messages yet. Send us a message below.</p>
                        ) : (
                          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                            {orderMessages.map((msg: any) => {
                              const isAdmin = msg.sender_type === "admin";
                              return (
                                <div key={msg.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                                  <div
                                    className="max-w-[85%] rounded-xl px-3 py-2 text-sm break-words overflow-wrap-anywhere"
                                    style={{
                                      background: isAdmin ? '#fff7ed' : '#E85D04',
                                      color: isAdmin ? '#111827' : 'white',
                                      border: isAdmin ? '1px solid #fed7aa' : 'none',
                                      wordBreak: 'break-word',
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {isAdmin && (
                                      <p className="text-[10px] font-bold mb-0.5 text-orange-600">{msg.sender_name || "TryNex Team"}</p>
                                    )}
                                    <p className="leading-snug">{msg.message}</p>
                                    <p className="text-[10px] opacity-60 mt-0.5">
                                      {new Date(msg.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            <div ref={msgsEndRef} />
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <textarea
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMsg(); } }}
                            placeholder="Send a message to TryNex…"
                            rows={2}
                            maxLength={2000}
                            className="flex-1 resize-none text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-400"
                            style={{ background: 'white', border: '1px solid #e5e7eb', color: '#111827' }}
                          />
                          <button
                            type="button"
                            onClick={handleSendMsg}
                            disabled={isSendingMsg || !newMessage.trim()}
                            className="px-3 py-2 rounded-xl font-black text-xs text-white transition-all disabled:opacity-50"
                            style={{ background: '#E85D04' }}
                          >
                            {isSendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {TRYNEX_NUMBER && (
                  <div className="p-5 rounded-2xl text-center"
                    style={{ background: 'rgba(255,107,43,0.05)', border: '1px solid rgba(255,107,43,0.1)' }}>
                    <p className="text-sm text-gray-500">
                      Questions? WhatsApp us at{' '}
                      <a
                        href={`https://wa.me/${TRYNEX_NUMBER.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-black text-orange-600 hover:underline"
                      >
                        {TRYNEX_NUMBER}
                      </a>
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <PreviewLightbox
        items={previewItems}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />

      <Footer />
    </div>
  );
}
