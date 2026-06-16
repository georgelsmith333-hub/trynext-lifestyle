import { AdminLayout } from "@/components/layout/AdminLayout";
import { Code2, Server, Database, Globe, Palette, Shield, Package, Layers, Cpu, Monitor } from "lucide-react";

const STACK_SECTIONS = [
  {
    title: "Frontend",
    icon: Monitor,
    color: "bg-blue-50 text-blue-600",
    items: [
      { name: "React 18", desc: "UI library with hooks, context, and suspense" },
      { name: "Vite 7", desc: "Lightning-fast build tool with HMR" },
      { name: "TypeScript 5", desc: "Type-safe JavaScript across all packages" },
      { name: "Tailwind CSS 4", desc: "Utility-first CSS framework" },
      { name: "Framer Motion", desc: "Production-ready animations and transitions" },
      { name: "Wouter", desc: "Lightweight client-side routing" },
      { name: "TanStack Query v5", desc: "Data fetching, caching & synchronization" },
      { name: "React Helmet Async", desc: "SEO meta tag management" },
      { name: "Lucide React", desc: "Beautiful open-source icon library" },
      { name: "Radix UI", desc: "Accessible headless UI primitives" },
      { name: "React Hook Form", desc: "Performant form state management + Zod validation" },
    ],
  },
  {
    title: "Design Studio",
    icon: Palette,
    color: "bg-orange-50 text-orange-600",
    items: [
      { name: "HTML5 Canvas API", desc: "Layer compositor for design editing" },
      { name: "SVG Print Zones", desc: "Per-product calibrated print area overlays (1000×1000 coord space)" },
      { name: "React Three Fiber", desc: "3D product viewer with GLB models (T-shirt, Hoodie, Cap, Mug)" },
      { name: "Planar UV Mapping", desc: "Real-time design projection onto 3D mesh" },
      { name: "Pollinations.ai", desc: "Free AI art generation — Flux Realism, Flux Kontext, Turbo models" },
      { name: "remove.bg API", desc: "Server-side background removal with WASM TensorFlow.js fallback" },
      { name: "AI Upscaling", desc: "2× resolution upscaling for print-ready output" },
      { name: "Design Templates", desc: "12 built-in design presets (BD Pride, Namaste, Big Word, etc.)" },
      { name: "Undo/Redo Stack", desc: "Up to 50 design state history steps" },
      { name: "Snap Guides", desc: "Centre-align guides within print zone" },
      { name: "Draft Autosave", desc: "Design drafts persisted to localStorage across sessions" },
    ],
  },
  {
    title: "Backend",
    icon: Server,
    color: "bg-green-50 text-green-600",
    items: [
      { name: "Node.js", desc: "JavaScript runtime" },
      { name: "Express 5", desc: "Minimal web framework" },
      { name: "TypeScript", desc: "Type-safe server code" },
      { name: "Pino", desc: "High-performance JSON logger" },
      { name: "JWT (jsonwebtoken)", desc: "Authentication tokens — httpOnly cookie + Bearer header" },
      { name: "Cookie Parser", desc: "HTTP cookie handling" },
      { name: "CORS", desc: "Credential-based origin whitelisting (trynexshop.com + Expo mobile)" },
      { name: "Multer", desc: "Multipart file upload handling (images up to 10 MB)" },
      { name: "Sharp", desc: "Server-side image resizing & WebP conversion" },
      { name: "Upstash Redis SDK", desc: "Distributed rate limiting and session caching" },
      { name: "Telegram Bot API", desc: "Instant order + message notifications to admin Telegram" },
      { name: "node-fetch / undici", desc: "Server-side HTTP client for Pollinations AI, remove.bg, webhooks" },
    ],
  },
  {
    title: "Database",
    icon: Database,
    color: "bg-purple-50 text-purple-600",
    items: [
      { name: "PostgreSQL", desc: "Relational database (Neon Serverless — multi-region, pooled)" },
      { name: "Drizzle ORM", desc: "Type-safe SQL ORM with zero overhead" },
      { name: "Drizzle Zod", desc: "Schema validation from DB types" },
    ],
  },
  {
    title: "Design System",
    icon: Palette,
    color: "bg-orange-50 text-orange-600",
    items: [
      { name: "Primary Color", desc: "#E85D04 (Orange)" },
      { name: "Accent Color", desc: "#FB8500 (Light Orange)" },
      { name: "Display Font", desc: "Outfit (700-900 weight)" },
      { name: "Body Font", desc: "Plus Jakarta Sans (300-800)" },
      { name: "Currency", desc: "BDT (৳)" },
      { name: "Theme", desc: "Light/Warm — no dark mode" },
    ],
  },
  {
    title: "SEO & Marketing",
    icon: Globe,
    color: "bg-teal-50 text-teal-600",
    items: [
      { name: "Open Graph Tags", desc: "WhatsApp/Facebook/Twitter link previews" },
      { name: "Schema.org JSON-LD", desc: "Structured data for Google" },
      { name: "Dynamic Sitemap", desc: "/api/sitemap.xml — auto-generated" },
      { name: "robots.txt", desc: "Search engine crawl directives" },
      { name: "Meta Tags", desc: "Per-page title, description, keywords" },
      { name: "Canonical URLs", desc: "Duplicate content prevention" },
    ],
  },
  {
    title: "Auth & Security",
    icon: Shield,
    color: "bg-red-50 text-red-600",
    items: [
      { name: "Admin Auth", desc: "JWT + httpOnly cookies, SHA-256 hashed passwords" },
      { name: "Customer Auth", desc: "Email/password, Google OAuth, Facebook Login" },
      { name: "CORS Protection", desc: "Credential-based origin whitelisting" },
      { name: "Input Validation", desc: "Zod schemas on API inputs" },
    ],
  },
  {
    title: "Mobile App",
    icon: Cpu,
    color: "bg-violet-50 text-violet-600",
    items: [
      { name: "Expo SDK 52", desc: "React Native framework for iOS & Android" },
      { name: "Expo Router", desc: "File-based navigation with tab layout" },
      { name: "React Native Reanimated", desc: "Native-thread 60fps animations" },
      { name: "React Native Gesture Handler", desc: "Touch gesture recognition" },
      { name: "NativeWind", desc: "Tailwind CSS for React Native" },
      { name: "AsyncStorage", desc: "Persistent local storage on device" },
    ],
  },
  {
    title: "Infrastructure",
    icon: Layers,
    color: "bg-indigo-50 text-indigo-600",
    items: [
      { name: "pnpm Monorepo", desc: "Single workspace — storefront, API, mobile, promo" },
      { name: "Cloudflare Pages", desc: "Global CDN & static hosting for the storefront (trynexshop.com)" },
      { name: "Cloudflare R2", desc: "S3-compatible object storage for product & upload images" },
      { name: "Cloudflare DNS", desc: "Authoritative DNS + DDoS protection for trynexshop.com" },
      { name: "Replit Autoscale", desc: "API server hosting — auto-scales on demand, always-on deployment" },
      { name: "Neon PostgreSQL", desc: "Serverless Postgres — branching, pooled connections, zero cold-start" },
      { name: "Upstash Redis", desc: "Serverless Redis for rate limiting, session cache, API response cache" },
      { name: "GitHub", desc: "Source code repository — push-to-deploy pipeline to Cloudflare Pages" },
      { name: "Orval", desc: "OpenAPI → TypeScript client codegen for type-safe API calls" },
    ],
  },
  {
    title: "API Architecture",
    icon: Cpu,
    color: "bg-amber-50 text-amber-600",
    items: [
      { name: "RESTful API", desc: "All endpoints under /api/*" },
      { name: "OpenAPI 3.1 Spec", desc: "Auto-generated spec → orval codegen" },
      { name: "Auto-migration", desc: "Drizzle migrations run on startup" },
      { name: "Auto-seed", desc: "Sample blog posts seeded if DB empty" },
      { name: "Streaming AI Chat", desc: "Server-Sent Events for GPT-4o streaming responses" },
      { name: "AI Execute", desc: "NL → store action pipeline with risk scoring + undo" },
      { name: "Rate Limiting", desc: "express-rate-limit on promo, auth, message endpoints" },
      { name: "IP Cooldowns", desc: "In-process Map for exit-intent promo (10-min per IP)" },
    ],
  },
  {
    title: "Marketing & Growth",
    icon: Globe,
    color: "bg-teal-50 text-teal-600",
    items: [
      { name: "SpinWheel", desc: "Gamified discount popup (24hr cooldown, 20s delay)" },
      { name: "Exit Intent Popup", desc: "WELCOME-XXXX unique promo code on exit" },
      { name: "Abandoned Cart Popup", desc: "45s timer, 15-min re-show throttle" },
      { name: "Social Proof Toasts", desc: "Live-style recent purchase notifications" },
      { name: "Referral System", desc: "Shareable codes with % commission tracking" },
      { name: "Newsletter Signup", desc: "Email capture with subscriber management" },
      { name: "Promo Code Engine", desc: "% / flat / free-shipping codes with expiry" },
      { name: "WhatsApp Integration", desc: "Order confirmation links + direct chat" },
    ],
  },
];

const DB_TABLES = [
  { name: "products", desc: "Product catalog with variants, images, pricing, customizable flag" },
  { name: "categories", desc: "Product categories with slugs and product count" },
  { name: "orders", desc: "Customer orders with items, payment, shipping, design assets" },
  { name: "order_messages", desc: "Per-order customer ↔ admin chat messages" },
  { name: "customers", desc: "Registered customer accounts (email, Google, Facebook auth)" },
  { name: "admins", desc: "Admin credentials (SHA-256 + salt hashed)" },
  { name: "blog_posts", desc: "Blog content with SEO fields and view counts" },
  { name: "reviews", desc: "Product reviews with ratings and approval status" },
  { name: "promo_codes", desc: "Discount codes — %, flat, free shipping, referral, spin-win" },
  { name: "referrals", desc: "Referral program — codes, commissions, sales tracking" },
  { name: "settings", desc: "Key-value site configuration (hero, designer, spin wheel, AI, etc.)" },
  { name: "hampers", desc: "Gift hamper bundles with product combinations" },
  { name: "activity_log", desc: "Admin action audit trail" },
];

export default function AdminTechStack() {
  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Code2 className="w-7 h-7 text-orange-500" />
            Site Tech Stack & Configuration
          </h1>
          <p className="text-gray-500 mt-1">Complete technical overview of the TryNex Lifestyle platform</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {STACK_SECTIONS.map((section) => (
            <div key={section.title} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${section.color}`}>
                  <section.icon className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-gray-900">{section.title}</h2>
              </div>
              <div className="p-4 space-y-2">
                {section.items.map((item) => (
                  <div key={item.name} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-gray-900 bg-gray-100 rounded px-2 py-0.5 mt-0.5 whitespace-nowrap">{item.name}</span>
                    <span className="text-sm text-gray-500">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50 text-purple-600">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-gray-900">Database Tables</h2>
          </div>
          <div className="p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {DB_TABLES.map((table) => (
                <div key={table.name} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <code className="text-xs font-mono font-bold text-purple-600 bg-purple-50 rounded px-2 py-0.5 mt-0.5">{table.name}</code>
                  <span className="text-sm text-gray-500">{table.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-gray-900">API Endpoints</h2>
          </div>
          <div className="p-4 text-sm">
            <div className="grid gap-1.5 font-mono text-xs">
              {[
                { method: "GET", path: "/api/products", desc: "List products" },
                { method: "GET", path: "/api/products/:id", desc: "Get product (ID or slug)" },
                { method: "GET", path: "/api/categories", desc: "List categories" },
                { method: "POST", path: "/api/orders", desc: "Create order" },
                { method: "POST", path: "/api/orders/track", desc: "Track order (requires email or phone)" },
                { method: "GET", path: "/api/blog", desc: "List blog posts" },
                { method: "POST", path: "/api/auth/register", desc: "Customer signup" },
                { method: "POST", path: "/api/auth/login", desc: "Customer login" },
                { method: "POST", path: "/api/auth/google", desc: "Google OAuth" },
                { method: "POST", path: "/api/auth/facebook", desc: "Facebook login" },
                { method: "GET", path: "/api/auth/me", desc: "Current customer" },
                { method: "POST", path: "/api/admin/login", desc: "Admin login" },
                { method: "GET", path: "/api/sitemap.xml", desc: "Dynamic sitemap" },
              ].map((endpoint) => (
                <div key={endpoint.path + endpoint.method} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${endpoint.method === "GET" ? "bg-green-500" : "bg-blue-500"}`}>
                    {endpoint.method}
                  </span>
                  <span className="text-gray-800">{endpoint.path}</span>
                  <span className="text-gray-400 ml-auto">{endpoint.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
