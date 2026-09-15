import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, Pen, Flame, Zap, Truck, Layers, ShieldCheck, Sparkles,
} from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const tshirtSrc = "/mockups/psd-master-v10/runtime-roles/tshirt/white/front-base.png";
const mugSrc    = "/mockups/psd-master-v10/runtime-roles/mug/white/front-base.png";
const capSrc    = "/mockups/psd-master-v10/runtime-roles/cap/white/front-base.png";
const hoodieSrc = "/mockups/psd-master-v10/runtime-roles/hoodie/white/front-base.png";
const longsleeveSrc = "/mockups/psd-master-v10/runtime-roles/longsleeve/white/front-base.png";
const bottleSrc = "/mockups/psd-master-v10/runtime-roles/waterbottle/white/front-base.png";

const DEFAULT_PHRASES: string[] = [
  "T-Shirts.",
  "Hoodies.",
  "Mugs.",
  "Caps.",
  "Water Bottles.",
  "Custom Gifts.",
  "আপনার ডিজাইন.",
];

const HERO_STATS = [
  { value: "6", label: "Product Families" },
  { value: "2", label: "T-Shirt Print Sides" },
  { value: "64", label: "Districts" },
  { value: "Custom", label: "Made for Your Idea" },
];

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

function useTypewriter(phrases: string[], opts?: {
  typeSpeed?: number;
  deleteSpeed?: number;
  holdMs?: number;
  enabled?: boolean;
}) {
  const typeSpeed = opts?.typeSpeed ?? 80;
  const deleteSpeed = opts?.deleteSpeed ?? 38;
  const holdMs = opts?.holdMs ?? 1400;
  const enabled = opts?.enabled ?? true;
  const safe = phrases.length > 0 ? phrases : [""];

  const [text, setText] = useState(safe[0]);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("holding");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    indexRef.current = 0;
    setText(safe[0]);
    setPhase("holding");
  }, [phrases]);

  useEffect(() => {
    if (enabled) return;
    setText(safe[indexRef.current % safe.length]);
    setPhase("holding");
    return undefined;
  }, [enabled, safe]);

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const current = safe[indexRef.current];

    if (phase === "typing") {
      if (text.length < current.length) {
        timer = window.setTimeout(() => setText(current.slice(0, text.length + 1)), typeSpeed);
      } else {
        timer = window.setTimeout(() => setPhase("holding"), holdMs);
      }
    } else if (phase === "holding") {
      timer = window.setTimeout(() => setPhase("deleting"), holdMs);
    } else {
      if (text.length > 0) {
        timer = window.setTimeout(() => setText(current.slice(0, text.length - 1)), deleteSpeed);
      } else {
        indexRef.current = (indexRef.current + 1) % safe.length;
        setPhase("typing");
      }
    }
    return () => { if (timer) window.clearTimeout(timer); };
  }, [text, phase, safe, typeSpeed, deleteSpeed, holdMs, enabled]);

  return text;
}

// Multi-product grid shown in the hero right column
const HERO_PRODUCT_GRID = [
  { src: hoodieSrc, label: "Custom Hoodie", badge: "Best Seller", badgeColor: "#E85D04", delay: 0.1, floatY: 10, href: "/products?category=hoodies&sort=bestsellers" },
  { src: bottleSrc, label: "Water Bottle", badge: "New", badgeColor: "#0EA5E9", delay: 0.25, floatY: 8, href: "/products?category=water-bottles&sort=newest" },
  { src: tshirtSrc, label: "Custom T-Shirt", badge: "Top Pick", badgeColor: "#10B981", delay: 0.15, floatY: 12, href: "/products?category=t-shirts&sort=bestsellers" },
  { src: capSrc, label: "Custom Cap", badge: "Trending", badgeColor: "#7C3AED", delay: 0.3, floatY: 9, href: "/products?category=caps&sort=newest" },
  { src: longsleeveSrc, label: "Long Sleeve", badge: "New", badgeColor: "#2563EB", delay: 0.2, floatY: 7, href: "/products?category=long-sleeves&sort=newest" },
  { src: mugSrc, label: "Custom Mug", badge: "Popular", badgeColor: "#9333EA", delay: 0.35, floatY: 6, href: "/products?category=mugs&sort=bestsellers" },
];


export function TypewriterHero() {
  const settings = useSiteSettings();
  const reduced = usePrefersReducedMotion();

  const phrases = useMemo(() => {
    const custom = (settings.heroTypewriterPhrases || "")
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    return custom.length > 0 ? custom : DEFAULT_PHRASES;
  }, [settings.heroTypewriterPhrases]);
  const typed = useTypewriter(phrases, { enabled: !reduced });

  // Lightweight scroll-driven parallax for the background blob layer.
  const bgRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = Math.min(window.scrollY, 600) * 0.18;
        if (bgRef.current) bgRef.current.style.transform = `translate3d(0, ${y}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [reduced]);

  // Phrase-level live region: announce only completed phrase changes.
  const [announcedPhrase, setAnnouncedPhrase] = useState(phrases[0] ?? "");
  useEffect(() => {
    if (reduced) return;
    const current = phrases.find(p => p === typed);
    if (current && current !== announcedPhrase) setAnnouncedPhrase(current);
  }, [typed, phrases, reduced, announcedPhrase]);

  const background = settings.heroImageUrl
    ? `url(${settings.heroImageUrl}) center/cover no-repeat`
    : settings.heroGradient
      ? settings.heroGradient
      : "linear-gradient(145deg, #FFFCF8 0%, #FFF6ED 35%, #FFEEDE 65%, #FFF2E4 100%)";

  const headlineFallback = phrases[0];

  return (
    <section
      className="relative overflow-hidden pb-12 md:pb-16"
      style={{ paddingTop: "calc(var(--announcement-height, 0px) + 4.25rem + 2.5rem)" }}
      aria-label="Hero"
    >
      {/* Hidden phrase-level live region for assistive tech */}
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
          overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
        }}
      >
        We craft {announcedPhrase}
      </span>

      {/* Background w/ micro-parallax */}
      <div
        ref={bgRef}
        className="absolute inset-0 will-change-transform"
        style={{ background }}
        aria-hidden="true"
      />

      {/* Soft ambient blobs + dot grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full blur-[80px] opacity-40"
          style={{ background: "radial-gradient(circle, rgba(251,133,0,0.55), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-24 w-[420px] h-[420px] rounded-full blur-[80px] opacity-30"
          style={{ background: "radial-gradient(circle, rgba(232,93,4,0.45), transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-primary) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      <div className="relative z-10 w-full container-wide grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-6 md:gap-8 lg:gap-12 items-center">

        {/* ── LEFT: copy ── */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0 w-full">

          {/* Eyebrow */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full flex justify-center md:justify-start mb-5"
          >
            <span
              className="inline-flex flex-wrap items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-[11px] sm:text-xs tracking-wide max-w-full"
              style={{
                background: "linear-gradient(135deg, #fff4ee, #ffe8d4)",
                color: "var(--color-primary)",
                border: "1.5px solid #fdd5b4",
              }}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Custom apparel made for your idea</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] text-white font-black tracking-wider shrink-0"
                style={{ background: "var(--color-primary)" }}
              >
                NEW
              </span>
            </span>
          </motion.div>

          {/* Headline */}
          <h1
            className="font-display font-black leading-[1.02] mb-4 sm:mb-5 text-gray-900"
            style={{
              fontSize: "clamp(1.75rem, 6vw, 4.5rem)",
              letterSpacing: "-0.03em",
            }}
          >
            <span style={{ display: "block" }}>You Imagine,</span>
            <span style={{ display: "block" }}>
              <span
                style={{
                  background: "linear-gradient(135deg, var(--color-primary) 0%, #FB8500 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                We Craft
              </span>{" "}
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  minWidth: "0.6em",
                  maxWidth: "100%",
                  color: "var(--color-primary)",
                  overflowWrap: "anywhere",
                  whiteSpace: "normal",
                  verticalAlign: "baseline",
                }}
              >
                {reduced ? headlineFallback : typed}
                <span
                  aria-hidden="true"
                  className="inline-block align-baseline ml-1"
                  style={{
                    width: "0.06em",
                    height: "0.85em",
                    background: "currentColor",
                    transform: "translateY(0.06em)",
                    borderRadius: "1px",
                    animation: reduced ? undefined : "twCursorBlink 1s steps(2, start) infinite",
                  }}
                />
              </span>
            </span>
          </h1>

          {/* Subtitle */}
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-sm sm:text-lg text-gray-600 w-full max-w-xl mb-6 leading-relaxed"
          >
            {settings.heroSubtitle ||
              "Premium 320GSM cotton, vibrant prints, and 24-hour express delivery to all 64 districts of Bangladesh."}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto md:w-full lg:w-auto mb-6"
          >
            <Link
              href="/design-studio"
              className="group inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl font-bold text-white text-[0.95rem] sm:text-base transition-transform active:scale-95 hover:-translate-y-0.5 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, var(--color-primary), #FB8500)",
                boxShadow: "0 12px 32px rgba(232,93,4,0.38)",
              }}
              data-testid="hero-cta-primary"
            >
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"
                style={{ background: "linear-gradient(120deg, transparent, white, transparent)" }}
                aria-hidden="true"
              />
              <Pen className="w-4 h-4 sm:w-[1.05rem] sm:h-[1.05rem] relative" />
              <span className="relative">Start Designing</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 relative transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/products?sort=bestsellers"
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-gray-800 text-[0.95rem] sm:text-base bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:border-orange-300 hover:text-orange-600 hover:shadow-lg transition-all"
              data-testid="hero-cta-secondary"
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              Shop Best Sellers
            </Link>
          </motion.div>

          {/* ── MOBILE PRODUCT STRIP (hidden on lg+) ── */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55 }}
            className="md:hidden w-full mt-6"
          >
            <div
              className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
            >
              {HERO_PRODUCT_GRID.map((p, i) => (
                <Link
                  key={p.label}
                  href={p.href}
                  className="flex-none relative rounded-2xl overflow-hidden"
                  style={{
                    width: "130px",
                    background: "rgba(255,253,251,0.94)",
                    border: "1.5px solid rgba(232,93,4,0.14)",
                    boxShadow: "0 8px 24px rgba(90,47,20,0.10), 0 2px 6px rgba(232,93,4,0.06)",
                  }}
                >
                  <div
                    className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase tracking-wider"
                     style={{ background: p.badgeColor, boxShadow: "0 2px 6px rgba(90,47,20,0.16)" }}
                  >
                    {p.badge}
                  </div>
                  <img
                    src={p.src}
                    alt={p.label}
                    loading={i < 2 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full object-contain select-none pointer-events-none p-2"
                    style={{ height: "100px" }}
                    draggable={false}
                  />
                  <div className="pb-2.5 text-center">
                     <span className="text-[10px] font-black text-gray-800">{p.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Trust chips */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="w-full flex flex-wrap gap-1.5 sm:gap-2.5 justify-center md:justify-start mb-7"
          >
            {[
              { icon: Zap, label: "24hr Production" },
              { icon: Truck, label: "64 Districts" },
              { icon: Layers, label: "320GSM Fabric" },
              { icon: ShieldCheck, label: "25% Advance Only" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold bg-white/85 backdrop-blur-sm"
                style={{ border: "1px solid rgba(232,93,4,0.18)", color: "#444" }}
              >
                <Icon className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
                {label}
              </span>
            ))}
          </motion.div>

          {/* Animated stats row */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 sm:gap-5 w-full max-w-[280px] sm:max-w-none"
          >
            {HERO_STATS.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center md:items-start lg:px-5 lg:border-l lg:border-orange-200 first:lg:border-l-0 first:lg:pl-0 min-w-0"
              >
                <span
                  className="font-black text-base sm:text-2xl lg:text-3xl leading-none text-center md:text-left whitespace-nowrap"
                  style={{ color: "var(--color-primary)" }}
                >
                  {s.value}
                </span>
                <span className="text-[9px] sm:text-[11px] uppercase tracking-wide text-gray-500 font-semibold mt-1 text-center lg:text-left leading-tight">
                  {s.label}
                </span>
              </div>
            ))}
          </motion.div>

        </div>

        {/* ── RIGHT: Premium multi-product showcase (tablet + desktop) ── */}
        <div className="hidden md:flex flex-col gap-3 lg:gap-4 w-full max-w-lg ml-auto">

          {/* Top row: 3 product cards */}
          <div className="flex gap-2 lg:gap-3">
            {HERO_PRODUCT_GRID.slice(0, 3).map((p, i) => (
              <motion.div
                key={p.label}
                className="flex-1 relative rounded-2xl lg:rounded-3xl overflow-hidden cursor-pointer"
                style={{
                  background: "rgba(255,253,251,0.94)",
                  border: "1.5px solid rgba(232,93,4,0.14)",
                  boxShadow: "0 16px 36px rgba(90,47,20,0.12), 0 2px 8px rgba(232,93,4,0.06)",
                  minHeight: "160px",
                }}
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => window.location.href = p.href}
                whileHover={{ scale: 1.02 }}
              >
                {/* Badge */}
                <div
                  className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[8px] lg:text-[9px] font-black text-white uppercase tracking-wider"
                  style={{ background: p.badgeColor, boxShadow: "0 2px 8px rgba(90,47,20,0.16)" }}
                >
                  {p.badge}
                </div>
                {/* Product image with gentle float */}
                <motion.img
                  src={p.src}
                  alt={p.label}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = tshirtSrc; }}
                  className="w-full h-28 md:h-32 lg:h-44 object-contain select-none pointer-events-none p-3"
                  draggable={false}
                  animate={reduced ? undefined : { y: [0, -(p.floatY / 2), 0] }}
                  transition={reduced ? undefined : {
                    duration: 4 + i * 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.3,
                  }}
                />
                {/* Label */}
                <div className="pb-3 text-center">
                  <span className="text-[10px] lg:text-xs font-black text-gray-800">{p.label}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom row: 3 more product cards */}
          <div className="flex gap-2 lg:gap-3">
            {HERO_PRODUCT_GRID.slice(3, 6).map((p, i) => (
              <motion.div
                key={p.label}
                className="flex-1 relative rounded-2xl lg:rounded-3xl overflow-hidden cursor-pointer"
                style={{
                  background: "rgba(255,253,251,0.94)",
                  border: "1.5px solid rgba(232,93,4,0.14)",
                  boxShadow: "0 16px 36px rgba(90,47,20,0.12), 0 2px 8px rgba(232,93,4,0.06)",
                  minHeight: "160px",
                }}
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: p.delay, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => window.location.href = p.href}
                whileHover={{ scale: 1.02 }}
              >
                {/* Badge */}
                <div
                  className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[8px] lg:text-[9px] font-black text-white uppercase tracking-wider"
                  style={{ background: p.badgeColor, boxShadow: "0 2px 8px rgba(90,47,20,0.16)" }}
                >
                  {p.badge}
                </div>
                {/* Product image */}
                <motion.img
                  src={p.src}
                  alt={p.label}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = tshirtSrc; }}
                  className="w-full h-28 md:h-32 lg:h-44 object-contain select-none pointer-events-none p-3"
                  draggable={false}
                  animate={reduced ? undefined : { y: [0, -(p.floatY / 2), 0] }}
                  transition={reduced ? undefined : {
                    duration: 4.5 + i * 0.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.4 + 0.2,
                  }}
                />
                {/* Label */}
                <div className="pb-3 text-center">
                  <span className="text-[10px] lg:text-xs font-black text-gray-800">{p.label}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom trust strip */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex items-center justify-between bg-white rounded-xl lg:rounded-2xl px-4 lg:px-5 py-2.5 lg:py-3"
            style={{
              boxShadow: "0 4px 20px rgba(232,93,4,0.10)",
              border: "1px solid rgba(232,93,4,0.12)",
            }}
          >
            <div className="flex items-center gap-1 text-[10px] lg:text-xs font-bold text-gray-700">
              <ShieldCheck className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-green-600" />
              Secure ordering
            </div>
            <div className="text-[10px] lg:text-xs font-black text-gray-800">Custom design support</div>
            <div className="flex items-center gap-1 text-[10px] lg:text-xs font-bold text-orange-600">
              <Truck className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
              Nationwide delivery
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes twCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
