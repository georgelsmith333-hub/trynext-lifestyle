import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, ShoppingCart, Settings, LogOut, Menu, X,
  FileText, Users, HardDrive, Sparkles, Star, Code2, BookOpen, Paintbrush,
  GitBranch, Gift, Layers, History, Shield, Search, Tag, Share2, Mail,
  ChevronRight, DatabaseZap, Images, Bot,
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
      { name: "Page Builder", href: "/admin/page-builder", icon: LayoutDashboard },
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
      { name: "Settings", href: "/admin/settings", icon: Settings },
      { name: "Backup", href: "/admin/backup", icon: HardDrive },
      { name: "Activity Log", href: "/admin/logs", icon: History },
      { name: "Security", href: "/admin/security", icon: Shield },
      { name: "DB Cluster", href: "/admin/db-cluster", icon: DatabaseZap },
      { name: "Deployment", href: "/admin/deployment", icon: GitBranch },
      { name: "Tech Stack", href: "/admin/tech-stack", icon: Code2 },
      { name: "FB Import Guide", href: "/admin/facebook-guide", icon: BookOpen },
    ],
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = sessionStorage.getItem('trynex_admin_token');
  const authOpts = { request: { headers: getAuthHeaders() } };

  const { data, isPending, isFetching, isError } = useAdminMe(authOpts);
  const { mutateAsync: logout } = useAdminLogout(authOpts);

  useEffect(() => {
    if (!token) {
      setLocation("/admin/login");
      return;
    }
    if (!isPending && !isFetching && (isError || (data && !data.admin))) {
      sessionStorage.removeItem('trynex_admin_token');
      setLocation("/admin/login");
    }
  }, [isPending, isFetching, isError, data, setLocation, token]);

  const handleLogout = async () => {
    sessionStorage.removeItem('trynex_admin_token');
    await logout().catch(() => {});
    setLocation("/admin/login");
  };

  if (!token || isPending || isFetching) return <Loader fullScreen />;
  if (isError || !data?.admin) return <Loader fullScreen />;

  const isActive = (item: MenuItem) =>
    item.exact
      ? location === item.href
      : location === item.href || location.startsWith(item.href + "/");

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "#0f0f0f", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(150deg, #E85D04, #FB8500)',
                boxShadow: '0 0 0 1px rgba(232,93,4,0.4), 0 4px 12px rgba(232,93,4,0.3)',
              }}>
              <svg width="18" height="18" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                <path d="M6 9h14" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
                <path d="M13 9v11" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
                <path d="M21 4 L21.8 6.2 L24 7 L21.8 7.8 L21 10 L20.2 7.8 L18 7 L20.2 6.2 Z" fill="rgba(255,255,255,0.9)"/>
              </svg>
            </div>
            <div className="leading-none">
              <span className="font-black font-display text-[17px] text-white">TRY<span style={{ color: '#FB8500' }}>NEX</span></span>
              <span className="block text-[9px] font-bold tracking-widest uppercase mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Admin Panel</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5" style={{ scrollbarWidth: "none" }}>
          {MENU_GROUPS.map(group => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.12em]"
                style={{ color: 'rgba(255,255,255,0.25)' }}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-150 group/item relative",
                        active
                          ? "text-white"
                          : "hover:text-white"
                      )}
                      style={active ? {
                        background: 'linear-gradient(135deg, rgba(232,93,4,0.25), rgba(251,133,0,0.15))',
                        color: '#FB8500',
                        boxShadow: 'inset 1px 0 0 #E85D04, inset 0 0 0 1px rgba(232,93,4,0.15)',
                      } : {
                        color: 'rgba(255,255,255,0.45)',
                      }}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0 transition-transform duration-150",
                        active ? "" : "group-hover/item:scale-110"
                      )} />
                      <span className="flex-1">{item.name}</span>
                      {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                      {item.badge && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                          style={{ background: '#E85D04', color: 'white' }}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* View Store + Logout */}
        <div className="shrink-0 p-3 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <Link href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
            View Store
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-[13px] transition-all duration-150 w-full text-left"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = ''; }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center gap-4 px-5 bg-white shrink-0"
          style={{ borderBottom: "1px solid #f0f0f0", boxShadow: "0 1px 0 #f0f0f0" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Current page breadcrumb */}
          <div className="flex-1 hidden sm:flex items-center gap-2 text-sm">
            {MENU_GROUPS.flatMap(g => g.items).find(item => isActive(item)) && (
              <>
                <span className="text-gray-400 font-medium">
                  {MENU_GROUPS.find(g => g.items.some(item => isActive(item)))?.label}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                <span className="font-semibold text-gray-700">
                  {MENU_GROUPS.flatMap(g => g.items).find(item => isActive(item))?.name}
                </span>
              </>
            )}
          </div>

          {/* Admin avatar */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)' }}>
              A
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-black text-gray-800 leading-none">Admin</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">TryNex Panel</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          {children}
        </main>
      </div>

      {/* Floating AI Assistant — available on every admin page */}
      <AdminAIAssistant />
    </div>
  );
}
