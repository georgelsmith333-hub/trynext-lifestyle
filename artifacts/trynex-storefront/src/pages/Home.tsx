import { Link, useLocation } from "wouter";
import { prefetchDesignStudio } from "@/lib/prefetch";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/ProductCard";
import { SEOHead } from "@/components/SEOHead";
import { ConnectWithUs } from "@/components/ConnectWithUs";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { ProductCardSkeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import SpinWheel from "@/components/SpinWheel";
import { useListProducts, useGetTestimonials } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/utils";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  ArrowRight, Sparkles, Zap, Package, Star, Check, Truck,
  ShieldCheck, Clock, Palette, Layers, Award, ChevronRight,
  Users, Flame, Shirt, Coffee, Crown, TrendingUp, Eye
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { TypewriterHero } from "@/components/home/TypewriterHero";

const MARQUEE_ITEMS = [
  "PREMIUM QUALITY", "CUSTOM DESIGNS", "FAST DELIVERY", "MADE IN BANGLADESH",
  "YOU IMAGINE WE CRAFT", "LIMITED EDITION", "EXCLUSIVE DROPS", "100% AUTHENTIC",
  "PREMIUM 320GSM FABRIC", "BEST PRICE IN BD"
];

const FEATURES = [
  {
    icon: Palette,
    title: "100% Custom Design",
    desc: "Every piece crafted to your exact vision — from concept sketch to wearable masterpiece, delivered to your door.",
    color: "var(--color-primary)",
    bg: "#fff4ee",
    badge: "Unlimited Creativity"
  },
  {
    icon: Zap,
    title: "24-Hour Express",
    desc: "Lightning-fast production with nationwide delivery across all 64 districts. Speed meets premium quality.",
    color: "#d97706",
    bg: "#fffbeb",
    badge: "Super Fast"
  },
  {
    icon: Layers,
    title: "Premium Materials",
    desc: "We source only the finest 230-320GSM fabrics. Vibrant colors, sharp prints, lasting comfort — every time.",
    color: "#16a34a",
    bg: "#f0fdf4",
    badge: "Top Grade"
  },
];

const PROCESS = [
  { step: "01", title: "Choose & Design", desc: "Pick your product and share your design — or let our team help create something incredible.", icon: Palette },
  { step: "02", title: "We Craft It", desc: "Our artisans use premium fabrics and state-of-the-art printing to bring your vision to life.", icon: Layers },
  { step: "03", title: "Fast Delivery", desc: "Packed with care, delivered express anywhere in Bangladesh within 3-7 business days.", icon: Truck },
];

const BASE_STATS = [
  { value: "6", suffix: "", label: "Product Families", icon: Shirt, color: "var(--color-primary)" },
  { value: "2", suffix: "", label: "T-Shirt Print Sides", icon: Layers, color: "#2563eb" },
  { value: "25", suffix: "%", label: "Advance at Checkout", icon: ShieldCheck, color: "#d97706" },
  { value: "64", suffix: "", label: "Districts Served", icon: Truck, color: "#16a34a" },
];

const CATEGORIES = [
  { name: "T-Shirts",      icon: "tshirt",      desc: "230GSM premium cotton",       count: "Starting ৳450",   color: "#fff4ee", accent: "var(--color-primary)", href: "/products?category=t-shirts" },
  { name: "Long Sleeve",  icon: "longsleeve",  desc: "Comfort fit long sleeves",     count: "Starting ৳599",   color: "#f0f7ff", accent: "#2563eb",             href: "/products?category=long-sleeves" },
  { name: "Hoodies",       icon: "hoodie",       desc: "320GSM premium fleece",       count: "Starting ৳1,299", color: "#ecfeff", accent: "#0891b2",             href: "/products?category=hoodies" },
  { name: "Mugs",          icon: "mug",          desc: "Ceramic & sublimation",       count: "Starting ৳449",   color: "#fdf4ff", accent: "#9333ea",             href: "/products?category=mugs" },
  { name: "Caps",          icon: "cap",          desc: "Embroidered & printed",       count: "Starting ৳499",   color: "#f0fdf4", accent: "#16a34a",             href: "/products?category=caps" },
  { name: "Water Bottles", icon: "waterbottle",  desc: "600ml aluminium custom",      count: "Starting ৳699",   color: "#eff6ff", accent: "#2563eb",             href: "/products?category=water-bottles" },
];


const PAYMENT_METHODS = [
  {
    name: "bKash", shortName: "bKash",
    color: "#e2136e", textColor: "#fff", bg: "#e2136e",
    labelStyle: { fontFamily: "serif", fontStyle: "italic", fontWeight: 900, letterSpacing: "-0.02em" },
  },
  {
    name: "Nagad", shortName: "Nagad",
    color: "#f7941d", textColor: "#fff", bg: "#f7941d",
    labelStyle: { fontWeight: 900, letterSpacing: "0.02em" },
  },
  {
    name: "uPay", shortName: "uPay",
    color: "#8b2291", textColor: "#fff", bg: "#8b2291",
    labelStyle: { fontWeight: 900 },
  },
  {
    name: "Visa", shortName: "VISA",
    color: "#1a1f71", textColor: "#fff", bg: "#1a1f71",
    labelStyle: { fontFamily: "serif", fontWeight: 900, letterSpacing: "0.1em" },
  },
];

/**
 * 24/7 rolling flash-sale countdown (Bangladesh Standard Time = UTC+6).
 * The day is split into two 12-hour windows:
 *   00:00–12:00 BST  → "Day Flash Sale"   (timer counts to 12:00 noon)
 *   12:00–24:00 BST  → "Night Flash Sale" (timer counts to midnight)
 * The timer ALWAYS has a positive value — it resets the instant it hits 0.
 */
function getBSTSaleTarget(): { end: Date; label: string } {
  const nowMs = Date.now();
  const bstOffsetMs = 6 * 60 * 60 * 1000; // UTC+6
  const bstNowMs = nowMs + bstOffsetMs;
  const bstDate = new Date(bstNowMs);

  // Milliseconds elapsed since BST midnight today
  const msSinceBSTMidnight =
    (bstDate.getUTCHours() * 3600 + bstDate.getUTCMinutes() * 60 + bstDate.getUTCSeconds()) * 1000
    + bstDate.getUTCMilliseconds();

  const halfDayMs = 12 * 60 * 60 * 1000; // 12 hours
  const fullDayMs = 24 * 60 * 60 * 1000; // 24 hours

  if (msSinceBSTMidnight < halfDayMs) {
    // 00:00–12:00 BST — count to noon
    return { end: new Date(nowMs + (halfDayMs - msSinceBSTMidnight)), label: "Day Flash Sale ☀️" };
  } else {
    // 12:00–24:00 BST — count to midnight
    return { end: new Date(nowMs + (fullDayMs - msSinceBSTMidnight)), label: "Night Flash Sale ⚡" };
  }
}

function FlipDigit({ value, prevValue }: { value: string; prevValue: string }) {
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (value !== prevValue) {
      setFlipping(true);
      const t = setTimeout(() => setFlipping(false), 500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [value, prevValue]);

  return (
    <div className="relative w-[2.2rem] sm:w-[3rem] h-[2.8rem] sm:h-[3.8rem]" style={{ perspective: '200px' }}>
      <div className="absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #FF8C00 0%, var(--color-primary) 48%, #CC4E03 48.5%, var(--color-primary) 49%, #D45A04 100%)',
          boxShadow: '0 8px 32px rgba(232,93,4,0.6), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.3), inset 0 -1px 1px rgba(0,0,0,0.2)',
        }}>
        <div className="absolute inset-x-0 top-0 h-[48%] rounded-t-xl sm:rounded-t-2xl"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%)' }} />
        <div className="absolute inset-x-0 top-[48%] h-[1px]"
          style={{ background: 'rgba(0,0,0,0.2)', boxShadow: '0 1px 0 rgba(255,255,255,0.1)' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-black text-white text-xl sm:text-3xl font-mono tabular-nums drop-shadow-lg transition-transform duration-300 ${flipping ? 'scale-110' : 'scale-100'}`}
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3), 0 0 20px rgba(255,140,0,0.3)' }}>
            {value}
          </span>
        </div>
      </div>
      <div className="absolute -inset-[2px] rounded-xl sm:rounded-2xl pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(255,200,100,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.2) 100%)',
          borderRadius: 'inherit',
        }} />
    </div>
  );
}

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [saleLabel, setSaleLabel] = useState("Flash Sale ☀️");
  const prevRef = useRef({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const { end, label } = getBSTSaleTarget();
      setSaleLabel(label);
      const diff = Math.max(1, end.getTime() - Date.now());
      setTimeLeft(prev => {
        prevRef.current = prev;
        return {
          h: Math.floor(diff / 3600000),
          m: Math.floor((diff % 3600000) / 60000),
          s: Math.floor((diff % 60000) / 1000),
        };
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const prev = prevRef.current;

  return (
    <div className="flex flex-col items-center gap-3 relative">
      <div className="flex items-center gap-2">
        <div className="h-px w-8 sm:w-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(232,93,4,0.4))' }} />
        <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em]">{saleLabel}</p>
        <div className="h-px w-8 sm:w-12" style={{ background: 'linear-gradient(90deg, rgba(232,93,4,0.4), transparent)' }} />
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {[
          { v: timeLeft.h, p: prev.h, l: "HRS" },
          { v: timeLeft.m, p: prev.m, l: "MIN" },
          { v: timeLeft.s, p: prev.s, l: "SEC" },
        ].map(({ v, p, l }, i) => (
          <div key={l} className="flex items-center gap-2 sm:gap-3">
            <div className="text-center">
              <div className="flex gap-[3px] sm:gap-1">
                <FlipDigit value={pad(v)[0]} prevValue={pad(p)[0]} />
                <FlipDigit value={pad(v)[1]} prevValue={pad(p)[1]} />
              </div>
              <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 mt-1.5 tracking-[0.2em] uppercase">{l}</p>
            </div>
            {i < 2 && (
              <div className="flex flex-col gap-1.5 sm:gap-2 mb-5">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse" style={{ background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary-medium)' }} />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full animate-pulse" style={{ background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary-medium)', animationDelay: '0.3s' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedCounter({ target, suffix = "", duration = 2200 }: { target: string; suffix?: string; duration?: number }) {
  const numTarget = parseFloat(target);
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const startedRef = useRef(false);

  const startCount = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const t0 = Date.now();
    const tick = () => {
      const elapsed = Date.now() - t0;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(eased * numTarget));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [numTarget, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      startCount();
      return;
    }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) startCount(); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [startCount]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}


function SplitTextReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const prefersReduced = usePrefersReducedMotion();

  if (prefersReduced) {
    return <span className={className}>{text}</span>;
  }

  const words = text.split(" ");
  return (
    <span ref={ref} className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} style={{ display: 'inline-block', whiteSpace: 'pre' }}>
          <motion.span
            style={{ display: 'inline-block' }}
            initial={{ opacity: 0, y: 24, rotateX: -30 }}
            animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
            transition={{
              duration: 0.45,
              delay: delay + wi * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {word}
          </motion.span>
          {wi < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}


function useMagneticEffect<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setPos({
      x: (e.clientX - cx) * 0.35,
      y: (e.clientY - cy) * 0.35,
    });
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    setPos({ x: 0, y: 0 });
  }, []);

  const magneticStyle: React.CSSProperties = {
    transform: hovered ? `translate(${pos.x}px, ${pos.y}px)` : 'translate(0,0)',
    transition: hovered ? 'transform 0.15s ease' : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
  };

  const eventHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };

  return { ref, magneticStyle, eventHandlers };
}

function MagneticButton({ children, className, style, href, onClick, onMouseEnter, onTouchStart }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onTouchStart?: () => void;
}) {
  const linkMagnet = useMagneticEffect<HTMLAnchorElement>();
  const btnMagnet = useMagneticEffect<HTMLButtonElement>();
  const [, navigate] = useLocation();

  if (href) {
    return (
      <a
        ref={linkMagnet.ref}
        href={href}
        onClick={(e) => { e.preventDefault(); navigate(href); }}
        className={className}
        style={{ ...style, ...linkMagnet.magneticStyle }}
        {...linkMagnet.eventHandlers}
        onMouseEnter={() => { linkMagnet.eventHandlers?.onMouseEnter?.(); onMouseEnter?.(); }}
        onTouchStart={onTouchStart}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      ref={btnMagnet.ref}
      onClick={onClick}
      className={className}
      style={{ ...style, ...btnMagnet.magneticStyle }}
      {...btnMagnet.eventHandlers}
    >
      {children}
    </button>
  );
}

function HowItWorksConnector({ active }: { active: boolean }) {
  return (
    <svg
      className="hidden md:block absolute top-10 left-1/2 w-full"
      height="2"
      style={{ overflow: 'visible', zIndex: 0 }}
      aria-hidden="true"
    >
      <line
        x1="0" y1="1" x2="100%" y2="1"
        stroke="url(#connectorGrad)"
        strokeWidth="2"
        strokeDasharray="200"
        strokeDashoffset={active ? 0 : 200}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
      />
      <defs>
        <linearGradient id="connectorGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fb8500" />
          <stop offset="100%" stopColor="#fbd580" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type PublicStats = {
  todayOrders: number;
  totalOrders: number;
  minutesSinceLastOrder: number | null;
} | null;

function usePublicStats(): PublicStats {
  const [stats, setStats] = useState<PublicStats>(null);

  useEffect(() => {
    const fetchStats = () =>
      fetch(getApiUrl("/api/public-stats"))
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setStats(data); })
        .catch(() => {});

    fetchStats();
    const id = setInterval(fetchStats, 60000);
    return () => clearInterval(id);
  }, []);

  return stats;
}

function LiveSocialProof({ stats, primaryColor = 'var(--color-primary)' }: { stats: PublicStats; primaryColor?: string }) {
  if (!stats) return null;

  const lastOrderLabel = stats.minutesSinceLastOrder === null
    ? null
    : stats.minutesSinceLastOrder < 2
    ? "Last order just now"
    : stats.minutesSinceLastOrder < 60
    ? `Last order ${stats.minutesSinceLastOrder}m ago`
    : stats.minutesSinceLastOrder < 1440
    ? `Last order ${Math.floor(stats.minutesSinceLastOrder / 60)}h ago`
    : "Last order today";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-3"
    >
      {stats.todayOrders > 0 && (
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: '#fff4ee', color: primaryColor, border: '1.5px solid #fdd5b4' }}>
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: primaryColor }}
          />
          {stats.todayOrders.toLocaleString()} orders placed today
        </span>
      )}
      {stats.todayOrders === 0 && stats.totalOrders > 0 && (
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: '#fff4ee', color: primaryColor, border: '1.5px solid #fdd5b4' }}>
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: primaryColor }}
          />
          {stats.totalOrders.toLocaleString()} orders placed
        </span>
      )}
      {lastOrderLabel && (
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: '#f0fdf4', color: '#16a34a', border: '1.5px solid #bbf7d0' }}>
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: '#16a34a' }}
          />
          {lastOrderLabel}
        </span>
      )}
    </motion.div>
  );
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  viewCount: number;
  trending: boolean;
}

function useTopPosts() {
  return useQuery<{ posts: BlogPost[] }>({
    queryKey: ["/api/blog/top-posts"],
    queryFn: async () => {
      const url = getApiUrl("/api/blog?sort=views&limit=5&published=true");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load top posts");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

function HomeTopPostsWidget() {
  const { data, isLoading, isError } = useTopPosts();
  const posts = data?.posts ?? [];

  if (!isLoading && !isError && posts.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="py-14 px-4 bg-white"
    >
      <div className="container-wide">
        <div className="text-center mb-10">
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-4"
            style={{ background: "rgba(232,93,4,0.08)", color: "var(--color-primary, #E85D04)", border: "1px solid rgba(232,93,4,0.15)" }}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Top Posts
          </motion.span>
          <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-gray-900 mt-2">
            Most Popular on the Blog
          </h2>
          <p className="text-gray-400 text-sm mt-2">The articles our readers love most — dive in.</p>
        </div>

        <div className="rounded-2xl overflow-hidden max-w-2xl mx-auto"
          style={{ border: "1px solid #f0f0f0", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-2 px-5 py-4"
            style={{ background: "linear-gradient(135deg,#E85D04 0%,#FB8500 100%)" }}>
            <TrendingUp className="w-4 h-4 text-white" />
            <span className="text-sm font-black uppercase tracking-wider text-white">Top Posts This Week</span>
          </div>

          <div className="bg-white divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <span className="w-5 h-5 rounded bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-4/5" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : isError ? (
              <p className="px-5 py-6 text-sm text-red-400 text-center">Could not load top posts.</p>
            ) : (
              posts.map((post, idx) => (
                <Link key={post.id} href={`/blog/${post.slug}`}
                  className="flex items-center gap-3 px-5 py-3.5 group hover:bg-orange-50/60 transition-colors">
                  <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-black"
                    style={idx === 0
                      ? { background: "rgba(232,93,4,0.12)", color: "#E85D04" }
                      : { background: "#f5f5f5", color: "#9ca3af" }}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-orange-600 transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-400 font-medium">
                      <Eye className="w-3 h-3" />
                      {post.viewCount.toLocaleString()} views
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
                </Link>
              ))
            )}
          </div>

          <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 text-center">
            <Link href="/blog"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors">
              View all articles <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export default function Home() {
  // The home page only displays 20 curated cards. Keep the initial payload
  // bounded so a mobile visitor does not download the full catalogue merely
  // to choose those cards client-side.
  const { data: productsData, isLoading, isError, refetch } = useListProducts({ limit: 24 });
  const { data: testimonialsData } = useGetTestimonials();
  const publicStats = usePublicStats();
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);
  const allProducts = productsData?.products || [];
  const featuredProducts = useMemo(() => {
    const categoryMatchers: Array<(product: typeof allProducts[number]) => boolean> = [
      p => /t-?shirt|tee/i.test(`${p.categoryName || ""} ${p.name}`),
      p => /hoodie|sweatshirt/i.test(`${p.categoryName || ""} ${p.name}`),
      p => /mug|cup/i.test(`${p.categoryName || ""} ${p.name}`),
      p => /cap|hat/i.test(`${p.categoryName || ""} ${p.name}`),
      p => /long.?sleeve/i.test(`${p.categoryName || ""} ${p.name}`),
      p => /bottle|flask|canteen/i.test(`${p.categoryName || ""} ${p.name}`),
    ];
    const ranked = [...allProducts].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (b.id || 0) - (a.id || 0));
    const buckets = categoryMatchers.map(match => ranked.filter(match));
    const selected: typeof ranked = [];
    const selectedIds = new Set<number>();
    let round = 0;
    while (selected.length < 20 && round < 20) {
      for (const bucket of buckets) {
        const product = bucket[round];
        if (product && !selectedIds.has(product.id)) {
          selected.push(product);
          selectedIds.add(product.id);
        }
        if (selected.length >= 20) break;
      }
      round += 1;
    }
    for (const product of ranked) {
      if (selected.length >= 20) break;
      if (!selectedIds.has(product.id)) selected.push(product);
    }
    return selected.slice(0, 20);
  }, [allProducts]);
  const dynamicTestimonials = testimonialsData?.testimonials || [];
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const howItWorksInView = useInView(howItWorksRef, { once: true, margin: "-80px" });
  const settings = useSiteSettings();

  const testimonials = dynamicTestimonials.map(t => ({
    name: t.name,
    role: t.role || "",
    stars: typeof t.stars === "number" && t.stars > 0 ? t.stars : null,
    text: t.body,
    location: t.location || "",
  }));

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEOHead
        title="Premium Custom Apparel Bangladesh | Custom T-Shirts, Hoodies & Gifts"
        description="Trynext Lifestyle offers custom T-shirts, hoodies, mugs, and gift hampers with delivery across Bangladesh."
        canonical="/"
        keywords="custom t-shirt bangladesh, premium apparel bangladesh, custom hoodie bd, custom mug bd, custom cap bangladesh, gift hamper dhaka, personalized gifts bd, কাস্টম টি-শার্ট, কাস্টম হুডি বাংলাদেশ, ট্রাইনেক্স"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "ClothingStore",
            "name": settings.siteName || "Trynext Lifestyle",
            "alternateName": "Trynext",
            "url": "https://trynext.pages.dev",
            "logo": "https://trynext.pages.dev/favicon.svg",
            "image": "https://trynext.pages.dev/opengraph.jpg",
            "description": "Bangladesh's #1 premium custom apparel brand. Custom T-shirts, Hoodies, Mugs & Caps with fast nationwide delivery.",
            ...(settings.phone ? { "telephone": settings.phone } : {}),
            ...(settings.email ? { "email": settings.email } : {}),
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Dhaka",
              "addressLocality": "Dhaka",
              "addressRegion": "Dhaka Division",
              "addressCountry": "BD"
            },
            "areaServed": { "@type": "Country", "name": "Bangladesh" },
            "currenciesAccepted": "BDT",
            "paymentAccepted": "bKash, Nagad, uPay (25% advance or full payment; balance on delivery)",
            "priceRange": "৳399 - ৳3,999",
            "openingHoursSpecification": [
              { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"], "opens": "09:00", "closes": "22:00" }
            ],
            ...(settings.phone ? {
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": settings.phone,
                "contactType": "customer service",
                "areaServed": "BD",
                "availableLanguage": ["English", "Bengali"]
              }
            } : {}),
            "sameAs": [
              "https://www.facebook.com/trynextlifestyle",
              "https://www.instagram.com/trynextlifestyle"
            ],
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Custom Apparel & Gifts",
              "itemListElement": [
                { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Custom T-Shirt", "description": "230GSM premium cotton custom T-shirt" } },
                { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Custom Hoodie", "description": "320GSM fleece custom hoodie" } },
                { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Custom Mug", "description": "11oz ceramic custom mug" } },
                { "@type": "Offer", "itemOffered": { "@type": "Product", "name": "Gift Hamper", "description": "Curated premium gift hampers Bangladesh" } }
              ]
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
             "name": settings.siteName || "Trynext Lifestyle",
            "url": "https://trynext.pages.dev",
            "logo": { "@type": "ImageObject", "url": "https://trynext.pages.dev/favicon.svg", "width": 512, "height": 512 },
             ...(settings.phone ? { "contactPoint": { "@type": "ContactPoint", "telephone": settings.phone, "contactType": "sales", "areaServed": "BD" } } : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
             "name": settings.siteName || "Trynext Lifestyle",
            "url": "https://trynext.pages.dev",
            "potentialAction": {
              "@type": "SearchAction",
              "target": { "@type": "EntryPoint", "urlTemplate": "https://trynext.pages.dev/products?search={search_term_string}" },
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
      <Navbar />
      <SpinWheel autoOpen forceOpen={spinWheelOpen} onClose={() => setSpinWheelOpen(false)} />

      <TypewriterHero />

      {/* ═══════════════════════════════════════
          MARQUEE TICKER
      ═══════════════════════════════════════ */}
      <section className="py-4 overflow-hidden border-y border-orange-100"
        style={{ background: 'linear-gradient(135deg, #FFF4EA, #FFF8F2)' }}>
        <div className="animate-marquee">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-4 px-6 text-sm font-black tracking-widest"
              style={{ color: 'var(--color-primary)' }}>
              {item}
              <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
            </span>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SPECIAL OFFERS + FEATURED PRODUCTS
          (placed RIGHT AFTER the marquee ticker so the
           "Special Offers" hero card + offer products
           appear immediately under the marquee, before
           the Payment Trust Ribbon and Categories grid.)
      ═══════════════════════════════════════ */}
      {settings.sectionFeaturedEnabled !== false && <section className="py-20 px-4 bg-white" data-testid="section-special-offers">
        <div className="container-wide mx-auto">
          {/* Promo banner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl mb-10 px-6 py-8 sm:px-10 sm:py-10"
            style={{
              background: 'linear-gradient(135deg, #1a0a02 0%, #4a1a04 50%, #E85D04 100%)',
              boxShadow: '0 20px 60px -20px rgba(232,93,4,0.45)',
            }}
          >
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20" style={{ background: '#FB8500' }} />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full opacity-10" style={{ background: '#FFB703' }} />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="text-white">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/15 backdrop-blur-sm">
                  <Sparkles className="w-3 h-3" /> Limited Time
                </span>
                <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl mt-3 leading-tight">
                  Special Offers — Save Big Today
                </h2>
                <p className="text-white/80 text-sm sm:text-base mt-2 max-w-xl">
                  Hand-picked best sellers at exclusive prices. Free design preview &amp; fast nationwide delivery.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link href="/products?tab=offers"
                  className="inline-flex min-h-11 items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-white text-orange-600 hover:bg-orange-50 transition-colors shadow-lg group focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-700">
                  Shop All Offers
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                {settings.spinWheelEnabled !== false && (
                  <button
                    type="button"
                    onClick={() => setSpinWheelOpen(true)}
                    data-testid="button-open-spin-wheel"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-700"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Spin &amp; Win
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="product-grid-responsive" aria-label="Loading products" aria-busy="true">
              {Array.from({ length: 20 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/60 px-6 py-12 text-center" role="alert">
              <Package className="mx-auto mb-3 h-10 w-10 text-orange-400" aria-hidden="true" />
              <h3 className="font-display text-xl font-black text-gray-900">Featured products are taking a moment</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">The catalogue could not load right now. Try again or browse the full shop.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => void refetch()} className="min-h-11 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2" data-testid="button-retry-featured-products">
                  Try again
                </button>
                <Link href="/products" className="inline-flex min-h-11 items-center rounded-xl border border-orange-200 bg-white px-5 py-2.5 text-sm font-bold text-orange-700 transition hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2">
                  Browse the shop
                </Link>
              </div>
            </div>
          ) : featuredProducts.length === 0 ? null : (
            <ErrorBoundary section="featured products">
              <div className="product-grid-responsive">
                {featuredProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} eagerImage={false} />
                ))}
              </div>
              <div className="flex justify-center mt-10">
                <Link href="/products"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-transform hover:-translate-y-0.5 group"
                  style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)', boxShadow: '0 10px 30px -10px rgba(232,93,4,0.5)' }}>
                  Browse Full Catalogue
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </ErrorBoundary>
          )}
        </div>
      </section>}

      {/* ═══════════════════════════════════════
          PAYMENT TRUST RIBBON
      ═══════════════════════════════════════ */}
      <section className="py-6 px-4 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-3"
          >
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 text-center">
              Accepted Payments
            </p>
            <div className="w-full overflow-x-auto no-scrollbar">
              <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-max mx-auto px-2">
                {PAYMENT_METHODS.map((pm, i) => (
                  <motion.div
                    key={pm.name}
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    whileHover={{ y: -2, scale: 1.05 }}
                    className="cursor-default shrink-0"
                    title={pm.name}
                  >
                    <div
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs text-white flex items-center shadow-sm"
                      style={{
                        background: pm.bg,
                        boxShadow: `0 2px 8px ${pm.color}30`,
                      }}
                    >
                      <span style={{ ...pm.labelStyle, color: pm.textColor, fontSize: '11px' }}>
                        {pm.shortName}
                      </span>
                    </div>
                  </motion.div>
                ))}
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shrink-0"
                  style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Secure
                </span>
              </div>
            </div>
            <LiveSocialProof stats={publicStats} primaryColor="var(--color-primary)" />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CATEGORIES GRID
      ═══════════════════════════════════════ */}
      {settings.sectionCategoriesEnabled !== false && <section className="py-20 px-4" style={{ background: '#FAFAFA' }}>
        <div className="container-wide mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center mb-10 md:mb-16">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="section-eyebrow mb-4"
            >
              <Package className="w-3 h-3" /> Our Collections
            </motion.span>
            <h2 className="section-heading mt-4">
              <SplitTextReveal text="Shop by Category" delay={0.05} />
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-500 mt-4 max-w-xl mx-auto"
            >
              From premium tees to cozy hoodies — every product made with care, ready for your custom design.
            </motion.p>
          </div>

          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-8 md:pb-0 md:grid md:grid-cols-3 lg:grid-cols-6 snap-x snap-mandatory no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {CATEGORIES.filter(cat => {
              if (cat.icon === "tshirt"      && settings.categoryTshirtsEnabled   === false) return false;
              if (cat.icon === "hoodie"      && settings.categoryHoodiesEnabled   === false) return false;
              if (cat.icon === "cap"         && settings.categoryCapsEnabled      === false) return false;
              if (cat.icon === "mug"         && settings.categoryMugsEnabled      === false) return false;
              if (cat.icon === "custom"      && settings.categoryCustomEnabled    === false) return false;
              return true;
            }).map((cat, i) => {
              /* Use crisp mockup photos for category cards — clean on any background */
              const imageMap: Record<string, string> = {
                tshirt:      "/mockups/psd-master-v10/runtime-roles/tshirt/white/front-base.png",
                longsleeve:  "/mockups/psd-master-v10/runtime-roles/longsleeve/white/front-base.png",
                hoodie:      "/mockups/psd-master-v10/runtime-roles/hoodie/white/front-base.png",
                cap:         "/mockups/psd-master-v10/runtime-roles/cap/white/front-base.png",
                mug:         "/mockups/psd-master-v10/runtime-roles/mug/white/front-base.png",
                waterbottle: "/mockups/psd-master-v10/runtime-roles/waterbottle/white/front-base.png",
                watertumbler:"/mockups/psd-master-v10/runtime-roles/waterbottle/white/front-base.png",
              };

              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="min-w-[280px] md:min-w-0 snap-center"
                >
                  <Link href={cat.href}
                    className="flex flex-col group h-full rounded-3xl transition-all cursor-pointer border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
                      {cat.icon === "custom" ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
                          <img
                            src="/images/cat-tshirt.png"
                            alt="Design Studio"
                            width={400}
                            height={500}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-orange-500/15 to-transparent pointer-events-none" />
                          <div className="absolute top-3 right-3 pointer-events-none">
                            <span className="bg-orange-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-md">
                              ✦ Studio
                            </span>
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={imageMap[cat.icon as string] || "/images/product-placeholder.svg"} 
                          alt={cat.name}
                          width={400}
                          height={500}
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 p-4"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    
                    <div className="p-6 text-left">
                      <h3 className="font-black text-gray-900 text-xl mb-1">{cat.name}</h3>
                      <p className="text-xs text-gray-500 mb-4 line-clamp-1">{cat.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-primary uppercase tracking-wider"
                          style={{ color: cat.accent }}>
                          {cat.count}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>}

      {/* ═══════════════════════════════════════
          FLASH SALE BANNER
          (12-hour rolling countdown — never stops:
           06:00↔18:00 BST = Day Sale,
           18:00↔06:00 BST = Night Sale)
      ═══════════════════════════════════════ */}
      {settings.sectionFlashSaleEnabled !== false && <section className="py-8 sm:py-12 px-4" style={{ background: 'white' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl p-6 sm:p-10 flex flex-col items-center text-center gap-6"
            style={{
              background: 'linear-gradient(160deg, #1a1512 0%, #231c17 40%, #1C1917 100%)',
              border: '1px solid rgba(232,93,4,0.15)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 80px rgba(232,93,4,0.08)',
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full blur-[100px] opacity-15"
              style={{ background: 'radial-gradient(ellipse, var(--color-primary), transparent)' }} />
            <div className="absolute bottom-0 right-0 w-[300px] h-[200px] rounded-full blur-[80px] opacity-10"
              style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }} />
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            <div className="relative">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
                style={{ background: 'rgba(232,93,4,0.12)', border: '1px solid rgba(232,93,4,0.25)' }}>
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="text-orange-400 font-black text-xs uppercase tracking-[0.2em]">Flash Sale</span>
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display text-white mb-2 leading-tight">
                {(() => {
                  const title = settings.promoBannerTitle || "Up to";
                  const discount = settings.promoBannerDiscount || "30% OFF";
                  if (title.toLowerCase().includes(discount.toLowerCase())) {
                    return <>{title.replace(new RegExp(discount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '')} <span className="relative" style={{ color: 'var(--color-primary)' }}>{discount}<div className="absolute -inset-1 blur-lg opacity-30" style={{ background: 'var(--color-primary)' }} /></span></>;
                  }
                  return <>{title} <span className="relative" style={{ color: 'var(--color-primary)' }}>{discount}<div className="absolute -inset-1 blur-lg opacity-30" style={{ background: 'var(--color-primary)' }} /></span></>;
                })()}
              </h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto">
                {settings.promoBannerSubtitle || "On selected T-shirts & Hoodies. Limited stock — don't miss out!"}
              </p>
            </div>

            <CountdownTimer />

            <Link
              href="/products?tab=offers"
              className="relative group px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl font-black text-gray-900 text-sm sm:text-base flex items-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:scale-105 shimmer-btn"
              style={{
                background: 'linear-gradient(135deg, #FFB347 0%, var(--color-primary) 40%, var(--color-primary) 100%)',
                boxShadow: '0 8px 32px var(--color-primary-medium), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <Flame className="w-4 h-4 transition-transform group-hover:rotate-12" /> {settings.promoBannerCTA || "Shop the Sale"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>}

      {/* ═══════════════════════════════════════
          FEATURES / WHY CHOOSE US
      ═══════════════════════════════════════ */}
      <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #FFF8F3 0%, #FFF4EC 100%)' }}>
        <div className="container-wide mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="section-eyebrow mb-4"
            >
              <Award className="w-3 h-3" /> Why Trynext?
            </motion.span>
            <h2 className="section-heading mt-4">
              <SplitTextReveal text="Built for Bangladesh" delay={0.04} />
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              className="text-gray-500 mt-4 max-w-xl mx-auto"
            >
              We combine premium quality, lightning-fast production, and Bangladesh-first service — all in one brand.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  whileHover={{ y: -8, boxShadow: `0 20px 60px ${f.color}18` }}
                  className="p-8 rounded-3xl text-center border relative overflow-hidden group"
                  style={{
                    background: 'white',
                    borderColor: `${f.color}20`,
                    boxShadow: `0 4px 24px ${f.color}08`,
                    transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${f.color}05, transparent 60%)` }} />
                  <motion.div
                    whileHover={{ rotate: 8, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                    style={{ background: f.bg, border: `1.5px solid ${f.color}25` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: f.color }} />
                  </motion.div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black mb-4"
                    style={{ background: f.bg, color: f.color }}>
                    {f.badge}
                  </span>
                  <h3 className="text-xl font-black text-gray-900 mb-3">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          HOW IT WORKS — Animated SVG connector
      ═══════════════════════════════════════ */}
      <section className="py-20 px-4 bg-white" ref={howItWorksRef}>
        <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="section-eyebrow mb-4"
            >
              <Clock className="w-3 h-3" /> How It Works
            </motion.span>
            <h2 className="section-heading mt-4">
              <SplitTextReveal text="Simple as 1-2-3" delay={0.04} />
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PROCESS.map((p, i) => {
              const StepIcon = p.icon;
              return (
                <motion.div
                  key={p.step}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center relative"
                >
                  {i < PROCESS.length - 1 && (
                    <HowItWorksConnector active={howItWorksInView} />
                  )}
                  <motion.div
                    whileHover={{ rotate: 6, scale: 1.08 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #fff4ee, #ffe8d4)', border: '2px solid #fdd5b4' }}
                  >
                    <StepIcon className="w-8 h-8 text-orange-500" />
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4 }}
                      className="absolute inset-0 rounded-2xl"
                      style={{ border: '2px solid var(--color-primary)' }}
                    />
                  </motion.div>
                  <div className="text-xs font-black text-orange-400 tracking-widest mb-2">STEP {p.step}</div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          DESIGN STUDIO CTA BANNER
      ═══════════════════════════════════════ */}
      <section className="py-14 px-4 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1C1917 0%, #2d2116 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse 60% 80% at 15% 50%, rgba(232,93,4,0.12) 0%, transparent 70%), radial-gradient(ellipse 40% 60% at 85% 50%, rgba(251,133,0,0.08) 0%, transparent 70%)' }} />
        <div className="container-wide flex flex-col md:flex-row items-center gap-8 md:gap-12 relative">
          <div className="flex-1 text-center md:text-left">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-5"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-medium)' }}
            >
              🎨 New Feature
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display font-black text-3xl md:text-4xl text-white mb-4 leading-tight"
            >
              Design Your Own<br />
              <span style={{ color: 'var(--color-primary)' }}>T-Shirt or Mug</span> — Live
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-300 text-base mb-8 max-w-md mx-auto md:mx-0"
            >
              Upload your artwork, position it on the product, adjust size and rotation — then add to cart. No calls needed.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-3 justify-center md:justify-start"
            >
              <a
                href="/design-studio"
                onMouseEnter={prefetchDesignStudio}
                onTouchStart={prefetchDesignStudio}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-black text-white text-sm"
                style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary))', boxShadow: '0 8px 24px var(--color-primary-medium)' }}
              >
                🎨 Open Design Studio
              </a>
              <a
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                Browse Ready Products
              </a>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 flex gap-4 items-center"
          >
            {[
              { label: "Upload Art", icon: "📤", desc: "Any JPG/PNG" },
              { label: "Position", icon: "🎯", desc: "Drag & resize" },
              { label: "Order", icon: "✅", desc: "Add to cart" },
            ].map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="text-center px-4 py-4 rounded-2xl w-24"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="text-2xl mb-2">{step.icon}</div>
                <div className="text-xs font-black text-white mb-0.5">{step.label}</div>
                <div className="text-[10px] text-gray-400">{step.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          KEYWORD LANDING PAGE CARDS
          "Most Popular Custom Products"
      ═══════════════════════════════════════ */}
      <section className="py-14 bg-white">
        <div className="container-wide mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center mb-10">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="section-eyebrow mb-4"
            >
              Custom Products
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display font-black text-2xl md:text-3xl text-gray-900 mt-4"
            >
              Most Popular Custom Products in Bangladesh
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-500 mt-3 text-sm"
            >
              Fast nationwide delivery · Premium quality · No minimum order
            </motion.p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {([
              { href: "/custom-tshirt-bangladesh",  emoji: "👕", title: "Custom T-Shirt",     desc: "From ৳399 · DTG & Screen Print",  color: "#E85D04" },
              { href: "/custom-hoodie-bangladesh",   emoji: "🧥", title: "Custom Hoodie",      desc: "340GSM premium fleece",            color: "#7c3aed" },
              { href: "/custom-mug-bangladesh",      emoji: "☕", title: "Custom Mug",         desc: "Photo & name print mugs",         color: "#2563eb" },
              { href: "/corporate-gift-dhaka",       emoji: "🏢", title: "Corporate Gift",     desc: "Bulk orders with brand logo",     color: "#16a34a" },
              { href: "/custom-gift-bangladesh",     emoji: "🎁", title: "Custom Gift",        desc: "Personalised gift hampers",       color: "#db2777" },
              { href: "/birthday-gift-bangladesh",   emoji: "🎂", title: "Birthday Gift",      desc: "Same-day Dhaka delivery",        color: "#d97706" },
            ] as Array<{ href: string; emoji: string; title: string; desc: string; color: string }>).map((item, i) => (
              <motion.a
                key={item.href}
                href={item.href}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                className="flex items-center gap-4 p-4 md:p-5 rounded-2xl border border-gray-100 bg-white hover:border-orange-200 transition-all group cursor-pointer"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-2xl"
                  style={{ background: `${item.color}14` }}
                >
                  {item.emoji}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-gray-900 text-sm group-hover:text-orange-600 transition-colors truncate">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{item.desc}</div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      {settings.sectionStatsEnabled !== false && <section className="py-12 bg-gray-50/50">
        <div className="container-wide mx-auto px-4 md:px-8 lg:px-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {BASE_STATS.map((stat, i) => {
              const liveValue = stat.value;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${stat.color}10`, color: stat.color }}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    <AnimatedCounter target={liveValue} suffix={stat.suffix} />
                  </div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {stat.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>}

      {/* ═══════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════ */}
      {settings.sectionTestimonialsEnabled !== false && testimonials.length > 0 && <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #FAFAFA 0%, #FFF4EC 100%)' }}>
        <div className="container-wide mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center mb-12">
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="section-eyebrow mb-4"
            >
              <Star className="w-3 h-3" /> Customer Feedback
            </motion.span>
            <h2 className="section-heading mt-4">
              <SplitTextReveal text="Feedback From Our Customers" delay={0.025} />
            </h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-gray-500 mt-4"
            >
              Approved feedback shared by customers who have ordered with Trynext.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(() => {
              const AVATAR_GRADIENTS = [
                'linear-gradient(135deg, #E85D04, #FB8500)',
                'linear-gradient(135deg, #2563eb, #3b82f6)',
                'linear-gradient(135deg, #16a34a, #22c55e)',
                'linear-gradient(135deg, #9333ea, #a855f7)',
              ];
              return testimonials.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -6 }}
                  className="p-6 rounded-2xl bg-white border border-gray-100 relative overflow-hidden group cursor-default"
                  style={{
                    boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
                    transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  {/* Top gradient accent on hover */}
                  <div className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }} />

                  {/* Quote mark */}
                  <div className="absolute top-4 right-5 text-5xl font-black text-gray-100 leading-none select-none" aria-hidden="true">"</div>

                  {t.stars !== null && (
                    <div className="flex mb-3" aria-label={`${t.stars} out of 5 stars`}>
                      {Array.from({ length: t.stars }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 leading-relaxed mb-5 relative">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0"
                      style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}>
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-400">{t.role}{t.location ? ` · ${t.location}` : ''}</p>
                    </div>
                  </div>
                </motion.div>
              ));
            })()}
          </div>
        </div>
      </section>}

      {/* ═══════════════════════════════════════
          TRUST BADGES
      ═══════════════════════════════════════ */}
      <section className="py-12 px-4 bg-white border-y border-gray-100">
        <div className="container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { iconKey: settings.trustBadge1Icon || "shield", title: settings.trustBadge1Title || "100% Secure Payments", desc: settings.trustBadge1Desc || "bKash, Nagad & uPay — 25% advance", color: "#16a34a", bg: "#f0fdf4" },
              { iconKey: settings.trustBadge2Icon || "truck", title: settings.trustBadge2Title || "Nationwide Delivery", desc: settings.trustBadge2Desc || "All 64 districts of Bangladesh", color: "#2563eb", bg: "#eff6ff" },
              { iconKey: settings.trustBadge3Icon || "award", title: settings.trustBadge3Title || "Quality Guarantee", desc: settings.trustBadge3Desc || "230-320GSM premium fabric", color: 'var(--color-primary)', bg: "#fff4ee" },
              { iconKey: settings.trustBadge4Icon || "layers", title: settings.trustBadge4Title || "Design Studio Ready", desc: settings.trustBadge4Desc || "Preview artwork before checkout", color: "#9333ea", bg: "#fdf4ff" },
            ].map(({ iconKey, title, desc, color, bg }, i) => {
              const iconMap: Record<string, React.ElementType> = {
                shield: ShieldCheck, truck: Truck, award: Award,
                users: Users, star: Star, check: Check, package: Package,
              };
              const Icon = iconMap[iconKey] ?? ShieldCheck;
              return (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: bg }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}15` }}>
                  {React.createElement(Icon as React.ComponentType<{ className?: string; style?: React.CSSProperties }>, { className: "w-5 h-5", style: { color } })}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-tight">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </motion.div>
            );
            })}
          </div>
        </div>
      </section>

      <HomeTopPostsWidget />

      {/* Recently Viewed + Instagram */}
      <RecentlyViewed />
      <ConnectWithUs />

      {/* ═══════════════════════════════════════
          CTA SECTION — Glowing animated border
      ═══════════════════════════════════════ */}
      <section className="py-24 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)' }}>
        {/* Animated glow rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.12, 0.24, 0.12] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)', filter: 'blur(60px)' }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center relative z-10"
        >
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold mb-8"
            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', border: '1px solid var(--color-primary-medium)' }}>
            <Palette className="w-4 h-4" /> Custom Order
          </span>
          <h2 className="font-display font-black text-white leading-tight mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', letterSpacing: '-0.03em' }}>
            Have a design in mind?<br />
            <span style={{ color: 'var(--color-primary)' }}>Let's make it real.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto mb-12 leading-relaxed">
            Share your idea — we handle design, print and delivery. 100% unique, 100% yours.
            Starting from just <strong className="text-white">৳750</strong>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <MagneticButton
              href="/design-studio"
              onMouseEnter={prefetchDesignStudio}
              onTouchStart={prefetchDesignStudio}
              className="inline-flex items-center justify-center gap-2.5 px-10 py-5 rounded-2xl font-bold text-white text-lg shimmer-btn"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), #FB8500)',
                boxShadow: '0 8px 32px var(--color-primary-medium)',
              }}
            >
              Start Designing <ArrowRight className="w-5 h-5" />
            </MagneticButton>
            <Link
              href="/track"
              className="inline-flex items-center justify-center gap-2.5 px-10 py-5 rounded-2xl font-bold text-white text-lg transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.12)' }}
            >
              Track Your Order
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm font-semibold text-gray-500">
            {["Free shipping above ৳1,500", "Design support", "Artwork preview before checkout"].map(t => (
              <span key={t} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-orange-500" /> {t}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
