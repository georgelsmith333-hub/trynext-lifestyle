import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { ProductCard } from "@/components/ProductCard";
import { getLandingPage } from "@/data/landingPages";
import { getApiUrl } from "@/lib/utils";
import { ChevronDown, ChevronUp, ArrowRight, CheckCircle2, Truck, ShieldCheck, Headphones } from "lucide-react";
import { useState } from "react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const SITE_URL = "https://trynext.shop";

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  discountPrice?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
  categoryName?: string;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-white hover:bg-orange-50/40 transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-semibold text-neutral-800 text-base">{q}</span>
        {open
          ? <ChevronUp className="w-5 h-5 text-orange-500 shrink-0" />
          : <ChevronDown className="w-5 h-5 text-neutral-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-5 pt-1 bg-white text-neutral-600 text-sm leading-relaxed border-t border-neutral-100">
          {a}
        </div>
      )}
    </div>
  );
}

export default function KeywordLanding({ params }: { params: { slug: string } }) {
  const config = getLandingPage(params.slug);
  const settings = useSiteSettings();
  const waNum = (settings.whatsappNumber || settings.phone || "").replace(/[^0-9]/g, "");

  const { data: productsData } = useQuery<{ products: Product[] }>({
    queryKey: ["keyword-landing-products", params.slug],
    queryFn: async () => {
      let url: string;
      if (config?.categoryFilter) {
        url = getApiUrl(`/api/products?category=${encodeURIComponent(config.categoryFilter)}&limit=8`);
      } else if (config?.searchFilter) {
        url = getApiUrl(`/api/products?search=${encodeURIComponent(config.searchFilter)}&limit=8`);
      } else {
        url = getApiUrl(`/api/products?limit=8&featured=true`);
      }
      const r = await fetch(url);
      if (!r.ok) return { products: [] };
      const data = await r.json();
      const list: Product[] = Array.isArray(data) ? data : data.products ?? [];
      if (config?.tagFilter) {
        const tag = config.tagFilter.toLowerCase();
        const filtered = list.filter((p) =>
          p.name?.toLowerCase().includes(tag) ||
          (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(tag))) ||
          p.categoryName?.toLowerCase().includes(tag)
        );
        return { products: filtered.length >= 2 ? filtered : list };
      }
      return { products: list };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!config,
  });

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-4">Page not found</h1>
          <Link href="/products" className="text-orange-500 underline">Browse all products</Link>
        </div>
      </div>
    );
  }

  const products = productsData?.products ?? [];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: config.h1, item: `${SITE_URL}/${config.slug}` },
    ],
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: config.h1,
    description: config.description,
    url: `${SITE_URL}/${config.slug}`,
    publisher: {
      "@type": "Organization",
      name: "Trynext Lifestyle",
      url: SITE_URL,
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#organization`,
    name: "Trynext Lifestyle",
    description: "Bangladesh's leading custom apparel, mug, and gifting brand. Design your own t-shirt, hoodie, or mug with fast nationwide delivery.",
    url: SITE_URL,
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    image: `${SITE_URL}/opengraph.jpg`,
    logo: `${SITE_URL}/apple-touch-icon.png`,
    priceRange: "৳৳",
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      opens: "09:00",
      closes: "21:00",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "BD",
      addressLocality: "Dhaka",
      addressRegion: "Dhaka Division",
    },
    areaServed: {
      "@type": "Country",
      name: "Bangladesh",
    },
    sameAs: [
      "https://www.facebook.com/trynextlifestyle",
      "https://www.instagram.com/trynextlifestyle",
    ],
  };

  return (
    <>
      <SEOHead
        title={config.seoTitle.replace(" | Trynext Lifestyle", "").replace(" | Trynext", "")}
        description={config.description}
        canonical={`/${config.slug}`}
        keywords={config.keywords}
        jsonLd={[faqSchema, breadcrumbSchema, collectionSchema, localBusinessSchema]}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-orange-50 to-white pt-16 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 tracking-wide uppercase">
            {config.heroTag}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-neutral-900 leading-tight mb-6 tracking-tight">
            {config.h1}
          </h1>
          <p className="text-lg text-neutral-600 leading-relaxed max-w-2xl mx-auto mb-8">
            {config.intro}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href={config.ctaHref}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-orange-200 hover:scale-105 transition-all"
            >
              {config.ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/design-studio"
              className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-7 py-3.5 rounded-2xl border-2 border-orange-200 hover:border-orange-400 transition-all"
            >
              Design Your Own
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust signals ────────────────────────────────────────────── */}
      <section className="bg-white border-y border-neutral-100 py-6 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, label: "Premium Quality" },
            { icon: <Truck className="w-5 h-5 text-blue-500" />, label: "All 64 Districts" },
            { icon: <ShieldCheck className="w-5 h-5 text-orange-500" />, label: "100% Satisfaction" },
            { icon: <Headphones className="w-5 h-5 text-purple-500" />, label: "24/7 WhatsApp" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              {item.icon}
              <span className="text-xs font-semibold text-neutral-600">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────────────── */}
      {products.length > 0 && (
        <section className="py-14 px-4 bg-neutral-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black text-neutral-900 mb-2 text-center">
              Featured {config.h1}
            </h2>
            <p className="text-neutral-500 text-center mb-8">
              Handpicked bestsellers — order now, deliver fast.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href={config.ctaHref}
                className="inline-flex items-center gap-2 bg-neutral-900 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-neutral-800 transition-colors"
              >
                View All Products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── How to Order ─────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-neutral-900 mb-10 text-center">
            How to Order — 3 Simple Steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Choose & Design",
                desc: "Browse our products or open the Design Studio. Upload your artwork, type your name, or pick a ready-made template.",
              },
              {
                step: "02",
                title: "Place & Pay",
                desc: "Add to cart, choose your size, and checkout. Pay in full or just 25% in advance via bKash or Nagad — rest on delivery.",
              },
              {
                step: "03",
                title: "Receive & Enjoy",
                desc: "We print, quality-check, and dispatch your order. Track it live and receive it within 3–5 business days.",
              },
            ].map((s) => (
              <div key={s.step} className="bg-orange-50 rounded-2xl p-6 text-center">
                <div className="text-4xl font-black text-orange-200 mb-3">{s.step}</div>
                <h3 className="font-bold text-neutral-800 mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Trynext ───────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-neutral-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black mb-3">
            Why Choose Trynext for Custom Gifts
          </h2>
          <p className="text-neutral-400 mb-10 max-w-xl mx-auto">
            Custom gifts and apparel with nationwide delivery across Bangladesh.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 text-left">
            {[
              { title: "Premium Materials", desc: "We only use top-grade fabric and printing materials — nothing cheap, nothing that fades." },
              { title: "No Minimum Order", desc: "Whether you need 1 piece or 1,000, we treat every order with the same care." },
              { title: "Fast Nationwide Delivery", desc: "Ships to all 64 districts. Same-day delivery in Dhaka for urgent orders." },
              { title: "bKash & Nagad Accepted", desc: "Pay in full or just 25% in advance via bKash or Nagad — the rest is collected on delivery." },
              { title: "Free Design Help", desc: "Not a designer? No problem. Our team will help you create the perfect design." },
              { title: "Order Support", desc: "Our team is available to help with product, artwork, and order questions." },
            ].map((item, i) => (
              <div key={i} className="bg-neutral-800 rounded-xl p-4">
                <div className="font-bold text-white mb-1 text-sm">{item.title}</div>
                <div className="text-neutral-400 text-xs leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-white" id="faq">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-neutral-900 mb-2 text-center">
            Frequently Asked Questions
          </h2>
          <p className="text-neutral-500 text-center mb-8">
            Everything you need to know about {config.h1.toLowerCase()} from Trynext.
          </p>
          <div className="space-y-3">
            {config.faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Related pages (Internal linking) ─────────────────────────── */}
      <section className="py-10 px-4 bg-orange-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-neutral-700 mb-4 text-center">
            Explore More from Trynext
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {config.relatedPages.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="bg-white text-orange-600 border border-orange-200 hover:border-orange-400 hover:bg-orange-50 font-semibold px-5 py-2.5 rounded-full text-sm transition-all"
              >
                {p.label}
              </Link>
            ))}
            <Link
              href="/blog"
              className="bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400 font-semibold px-5 py-2.5 rounded-full text-sm transition-all"
            >
              Read Our Blog
            </Link>
            <Link
              href="/faq"
              className="bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400 font-semibold px-5 py-2.5 rounded-full text-sm transition-all"
            >
              Full FAQ
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black mb-3">
            Ready to Order Your {config.h1}?
          </h2>
          <p className="text-orange-100 mb-8">
            Start your custom order with product options, design support, and nationwide delivery.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href={config.ctaHref}
              className="bg-white text-orange-600 font-black px-8 py-3.5 rounded-2xl hover:bg-orange-50 transition-colors shadow-xl"
            >
              {config.ctaLabel}
            </Link>
            {waNum && (
              <a
                href={`https://wa.me/${waNum}?text=Hi%2C%20I%20want%20to%20order%20a%20custom%20gift`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-green-600 transition-colors"
              >
                WhatsApp Us
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
