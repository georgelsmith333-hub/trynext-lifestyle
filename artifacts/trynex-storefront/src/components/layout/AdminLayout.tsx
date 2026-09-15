import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, ShoppingCart, Settings, LogOut, Menu, X,
  FileText, Users, HardDrive, Sparkles, Star, Code2, BookOpen, Paintbrush,
  GitBranch, Gift, Layers, History, Shield, Search, Tag, Share2, Mail,
  ChevronRight, DatabaseZap, Images, Bot, KeyRound, Store, CircleUserRound,
} from "lucide-react";
import { useAdminLogout, useAdminMe } from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import { Loader } from "@/components/ui/Loader";
import { cn, getAuthHeaders } from "@/lib/utils";
import { AdminAIAssistant } from "@/components/AdminAIAssistant";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "Commerce",
    items: [
      { name: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
      { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { name: "Products", href: "/admin/products", icon: Package },
      { name: "Categories", href: "/admin/categories", icon: Layers },
      { name: "Gift Hampers", href: "/admin/hampers", icon: Gift },
      { name: "Promo Codes", href: "/admin/promo-codes", icon: Tag },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Mockup Gallery", href: "/admin/mockups", icon: Images },
      { name: "Page Designer", href: "/admin/designer", icon: Paintbrush },
      { name: "Layout Builder", href: "/admin/page-builder", icon: LayoutDashboard },
      { name: "Blog Posts", href: "/admin/blog", icon: FileText },
      { name: "Reviews", href: "/admin/reviews", icon: Star },
      { name: "SEO", href: "/admin/seo", icon: Search },
    ],
  },
  {
    label: "Marketing",
    items: [
      { name: "Social Import", href: "/admin/facebook-import", icon: Sparkles },
      { name: "Referrals", href: "/admin/referrals", icon: Share2 },
      { name: "Newsletter", href: "/admin/newsletter", icon: Mail },
      { name: "Customers", href: "/admin/customers", icon: Users },
    ],
  },
  {
    label: "System",
    items: [
      { name: "AI Developer", href: "/admin/ai-developer", icon: Bot, badge: "AI" },
      { name: "Secrets", href: "/admin/secrets", icon: KeyRound },
      { name: "Settings", href: "/admin/settings", icon: Settings },
      { name: "Backup", href: "/admin/backup", icon: HardDrive },
      { name: "Activity Log", href: "/admin/logs", icon: History },
      { name: "Security", href: "/admin/security", icon: Shield },
      { name: "DB Cluster", href: "/admin/db-cluster", icon: DatabaseZap },
      { name: "Deployment", href: "/admin/deployment", icon: GitBranch },
      { name: "Roles", href: "/admin/roles", icon: Shield },
      { name: "Tech Stack", href: "/admin/tech-stack", icon: Code2 },
      { name: "FB Import Guide", href: "/admin/facebook-guide", icon: BookOpen },
    ],
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const token = sessionStorage.getItem("trynext_admin_token");
  const authOpts = { request: { headers: getAuthHeaders() } };
  const { data, isPending, isFetching, isError } = useAdminMe(authOpts);
  const { mutateAsync: logout } = useAdminLogout(authOpts);

  useEffect(() => {
    if (!token) {
      setLocation("/admin/login");
      return;
    }
    if (!isPending && !isFetching && (isError || (data && !data.admin))) {
      sessionStorage.removeItem("trynext_admin_token");
      setLocation("/admin/login");
    }
  }, [isPending, isFetching, isError, data, setLocation, token]);

  const handleLogout = async () => {
    sessionStorage.removeItem("trynext_admin_token");
    await logout().catch(() => {});
    setLocation("/admin/login");
  };

  if (!token || isPending) return <Loader fullScreen />;
  if (isError || (!isPending && data && !data.admin)) return <Loader fullScreen />;

  const activeItem = MENU_GROUPS.flatMap((group) => group.items).find((item) =>
    item.exact ? location === item.href : location === item.href || location.startsWith(`${item.href}/`)
  );
  const activeGroup = MENU_GROUPS.find((group) => group.items.some((item) => item === activeItem));

  return (
    <div className="min-h-[100dvh] flex bg-[var(--admin-canvas)] text-[var(--admin-ink)]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          data-testid="button-close-navigation-overlay"
          className="fixed inset-0 z-40 bg-[rgba(15,20,16,.62)] backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(86vw,292px)] flex-col bg-[var(--admin-shell)] transition-transform duration-300 md:relative md:w-[270px] md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Admin navigation"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <Link href="/" data-testid="link-admin-brand" className="group flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e85d04] text-white shadow-[0_8px_24px_rgba(232,93,4,.25)]">
              <Store className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-[18px] font-black tracking-[-.04em] text-white">
                TRY<span className="text-[#fb8500]">NEX</span>
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[.2em] text-white/35">Operator console</span>
            </span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            data-testid="button-close-navigation"
            className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#43d17a]" />
            Store operations live
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/45">Keep today’s catalogue, stock and orders moving.</p>
        </div>

        <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {MENU_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[.18em] text-white/30">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeItem === item;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      data-testid={`link-admin-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
                        active ? "bg-[#e85d04]/20 text-[#ff9a52]" : "text-white/52 hover:bg-white/[.06] hover:text-white"
                      )}
                    >
                      {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#fb8500]" />}
                      <Icon className={cn("h-[17px] w-[17px] shrink-0", active ? "text-[#fb8500]" : "text-white/45 group-hover:text-white/80")} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      {item.badge && <span className="rounded-md bg-[#e85d04] px-1.5 py-0.5 text-[9px] font-black text-white">{item.badge}</span>}
                      {active && <ChevronRight className="h-3.5 w-3.5 text-[#fb8500]/70" aria-hidden="true" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <Link href="/" data-testid="link-view-store" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white/50 hover:bg-white/[.06] hover:text-white">
            <Store className="h-4 w-4" aria-hidden="true" /> View storefront
          </Link>
          <button
            type="button"
            data-testid="button-admin-logout"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-white/50 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center gap-4 border-b border-[var(--admin-line)] bg-[#f7f8f5]/90 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            aria-label="Open navigation"
            data-testid="button-open-navigation"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl border border-[var(--admin-line)] bg-white p-2.5 text-[var(--admin-ink)] shadow-sm md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[.13em] text-[#8b948a] sm:flex">
              <span>{activeGroup?.label ?? "Admin"}</span>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-[var(--admin-ink)]">{activeItem?.name ?? "Console"}</span>
            </div>
            <p className="truncate text-sm font-bold sm:hidden">{activeItem?.name ?? "Operator console"}</p>
          </div>
          <div className="flex items-center gap-3" data-testid="status-admin-session">
            <span className="hidden items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#6f7d70] lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2ebc68]" /> Live
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--admin-line)] bg-white px-2 py-1.5 shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#172019] text-white"><CircleUserRound className="h-4 w-4" aria-hidden="true" /></span>
              <span className="hidden pr-1 text-xs font-bold sm:block">Admin</span>
            </div>
          </div>
        </header>
        <main className="admin-canvas admin-grid min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
      <AdminAIAssistant />
    </div>
  );
}