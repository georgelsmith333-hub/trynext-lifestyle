import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, getApiUrl } from "@/lib/utils";
import {
  User, Mail, Phone, LogOut, Edit3, Check, X, Package, Heart,
  Loader2, ShieldCheck, Gift, TrendingUp, Wallet, Eye, Clock,
  ArrowRight, Lock, ChevronDown, ChevronUp, CheckCircle2,
  ShoppingBag, Calendar, MapPin, Tag, Copy, Share2, ExternalLink,
  MessageSquare, Send, ChevronLeft, Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { OrderSkeleton } from "@/components/ui/skeleton";
import { PreviewLightbox, type PreviewItem } from "@/components/ZoomableImage";

interface ReferralData {
  code: string;
  totalUses: number;
  totalEarnings: number;
  discountPercent: number;
  active: boolean;
}

interface RecentProduct {
  id: number;
  slug: string;
  name: string;
  price: number;
  discountPrice?: number;
  imageUrl?: string;
}

interface OrderItem {
  productId: number;
  productName: string;
  productImage?: string;
  imageUrl?: string;
  customNote?: string;
  isStudio?: boolean;
  quantity: number;
  size?: string;
  color?: string;
  price: number;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  items: OrderItem[];
  subtotal: string;
  shippingCost: string;
  total: string;
  promoCode?: string;
  promoDiscount?: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingDistrict?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

interface OrderMessage {
  id: number;
  order_id: number;
  sender_type: "admin" | "customer";
  sender_name: string;
  message: string;
  attachment_url?: string;
  read_by_customer: boolean;
  created_at: string;
}

export default function Account() {
  const [, navigate] = useLocation();
  const { customer, isLoading, isAuthenticated, updateProfile, logout } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "messages" | "referral" | "recent">("profile");

  const [myReferral, setMyReferral] = useState<ReferralData | null>(null);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderLightbox, setOrderLightbox] = useState<{ orderId: number; index: number } | null>(null);

  const [messages, setMessages] = useState<Record<number, OrderMessage[]>>({});
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (customer) {
      setEditName(customer.name);
      setEditPhone(customer.phone || "");
    }
  }, [customer]);

  useEffect(() => {
    if (customer?.email) {
      fetch(getApiUrl(`/api/referrals/my/${encodeURIComponent(customer.email)}`))
        .then(r => r.json())
        .then(data => { if (data.referral) setMyReferral(data.referral); })
        .catch(() => {});
    }
  }, [customer?.email]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("trynex_recently_viewed");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentProducts(Array.isArray(parsed) ? parsed.slice(0, 8) : []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === "orders" && customer) {
      fetchOrders();
    }
  }, [activeTab, customer]);

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (tab === "orders") setActiveTab("orders");
      if (tab === "messages") setActiveTab("messages");
    };
    window.addEventListener("account-tab", handler);
    return () => window.removeEventListener("account-tab", handler);
  }, []);

  const fetchMessages = async (orderId: number) => {
    const token = localStorage.getItem("trynex_customer_token");
    if (!token) return;
    setMessagesLoading(true);
    try {
      const resp = await fetch(getApiUrl(`/api/orders/${orderId}/messages`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setMessages(prev => ({ ...prev, [orderId]: data.messages || [] }));
      }
    } catch {}
    setMessagesLoading(false);
  };

  const sendMessage = async (orderId: number) => {
    const token = localStorage.getItem("trynex_customer_token");
    if (!token || !messageInput.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      const resp = await fetch(getApiUrl(`/api/orders/${orderId}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: messageInput.trim() }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setMessages(prev => ({ ...prev, [orderId]: [...(prev[orderId] || []), data.message] }));
        setMessageInput("");
      } else {
        toast({ title: "Could not send message", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" });
    }
    setSendingMessage(false);
  };

  const fetchUnreadCount = async () => {
    const token = localStorage.getItem("trynex_customer_token");
    if (!token) return;
    try {
      const resp = await fetch(getApiUrl("/api/orders/my/messages/unread-count"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUnreadCount(data.count || 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === "messages" && customer && orders.length === 0) {
      fetchOrders();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, customer]);

  useEffect(() => {
    if (activeTab === "messages" && selectedOrderId !== null) {
      fetchMessages(selectedOrderId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedOrderId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    const token = localStorage.getItem("trynex_customer_token");
    if (!token) return;
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const resp = await fetch(getApiUrl("/api/orders/my"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Failed to fetch orders");
      const data = await resp.json();
      setOrders(data.orders || []);
    } catch {
      setOrdersError("Could not load orders. Please try again.");
    }
    setOrdersLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: editName, phone: editPhone });
      toast({ title: "✓ Profile updated", description: "Your changes have been saved." });
    } catch {
      toast({ title: "Could not save changes", description: "Please try again.", variant: "destructive" });
    }
    setSaving(false);
    setEditing(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    const token = localStorage.getItem("trynex_customer_token");
    if (!token) return;
    setPasswordSaving(true);
    try {
      const resp = await fetch(getApiUrl("/api/auth/change-password"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setPasswordError(data.message || "Failed to change password");
      } else {
        toast({ title: "✓ Password changed", description: "Your new password is now active." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setChangingPassword(false);
      }
    } catch {
      setPasswordError("Network error. Please try again.");
    }
    setPasswordSaving(false);
  };

  // Suppress account UI render until BOTH:
  //   1. Auth state has resolved (isLoading === false), AND
  //   2. We have a customer object to render with.
  // This prevents the brief flash of empty-account chrome between
  // session resolution and the redirect-to-/login effect firing.
  if (isLoading || !isAuthenticated || !customer) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User, badge: 0 },
    { id: "orders" as const, label: "My Orders", icon: ShoppingBag, badge: 0 },
    { id: "messages" as const, label: "Messages", icon: MessageSquare, badge: unreadCount },
    { id: "referral" as const, label: "Referrals", icon: Gift, badge: 0 },
    { id: "recent" as const, label: "Recent", icon: Eye, badge: 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOHead title="My Account" description="Manage your TryNex Lifestyle account" noindex />
      <Navbar />

      <main className="flex-1 px-4 py-6 sm:py-12 pt-header">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-5 sm:px-6 py-6 sm:py-8" style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {customer.avatar ? (
                      <img src={customer.avatar} alt={customer.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/50 shadow-lg object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/50">
                        <User className="w-7 h-7 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">{customer.name}</h2>
                      <p className="text-orange-100 text-xs sm:text-sm flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Customer
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="flex border-b border-gray-100 overflow-x-auto no-scrollbar">
                {tabs.map(({ id, label, icon: Icon, badge }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveTab(id);
                      if (id === "messages") { setUnreadCount(0); setSelectedOrderId(null); }
                    }}
                    className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                      activeTab === id
                        ? "text-orange-600 border-orange-500"
                        : "text-gray-400 border-transparent hover:text-gray-600"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                    {badge > 0 && (
                      <span className="ml-0.5 min-w-[1.1rem] h-[1.1rem] px-1 text-[9px] font-black text-white rounded-full flex items-center justify-center bg-red-500">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </button>
                ))}
                </div>
                {/* Fade indicator — scroll hint on mobile */}
                <div className="absolute right-0 top-0 h-full w-8 pointer-events-none"
                  style={{ background: 'linear-gradient(to left, white 30%, transparent)' }} />
              </div>

              <div className="p-5 sm:p-6">
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 text-sm">Profile Information</h3>
                        {!editing ? (
                          <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-orange-600 hover:bg-orange-50 transition-all"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50 transition-all"
                            >
                              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                            </button>
                            <button
                              onClick={() => { setEditing(false); setEditName(customer.name); setEditPhone(customer.phone || ""); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-50 transition-all"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Name</p>
                            {editing ? (
                              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm" />
                            ) : (
                              <p className="text-gray-900 font-medium text-sm">{customer.name}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Mail className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Email</p>
                            <p className="text-gray-900 font-medium text-sm truncate">{customer.email}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Phone className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Phone</p>
                            {editing ? (
                              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="01XXXXXXXXX"
                                className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm" />
                            ) : (
                              <p className="text-gray-900 font-medium text-sm">{customer.phone || "Not set"}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Link
                        href="/track"
                        className="flex items-center gap-2 p-3 sm:p-4 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-all group"
                      >
                        <Package className="w-5 h-5 text-orange-500 shrink-0" />
                        <span className="text-sm font-semibold text-gray-900">Track Orders</span>
                      </Link>
                      <Link
                        href="/wishlist"
                        className="flex items-center gap-2 p-3 sm:p-4 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-all group"
                      >
                        <Heart className="w-5 h-5 text-red-500 shrink-0" />
                        <span className="text-sm font-semibold text-gray-900">Wishlist</span>
                      </Link>
                    </div>

                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => { setChangingPassword(!changingPassword); setPasswordError(""); setPasswordSuccess(""); }}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                      >
                        <span className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-gray-400" />
                          Change Password
                        </span>
                        {changingPassword ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>
                      <AnimatePresence>
                        {changingPassword && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <form onSubmit={handleChangePassword} className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                              {passwordError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{passwordError}</div>
                              )}
                              {passwordSuccess && (
                                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> {passwordSuccess}
                                </div>
                              )}
                              <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Current password"
                                required
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
                              />
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New password (min 6 characters)"
                                required
                                minLength={6}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
                              />
                              <input
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                placeholder="Confirm new password"
                                required
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm"
                              />
                              <button
                                type="submit"
                                disabled={passwordSaving}
                                className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {passwordSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                Update Password
                              </button>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {activeTab === "orders" && (
                  <div>
                    {ordersLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <OrderSkeleton key={i} />
                        ))}
                      </div>
                    ) : ordersError ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-red-500 mb-3">{ordersError}</p>
                        <button onClick={fetchOrders} className="text-sm text-orange-600 font-semibold hover:underline">Try Again</button>
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="text-center py-10">
                        <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-900 mb-1.5">No Orders Yet</h3>
                        <p className="text-sm text-gray-500 mb-4">Your order history will appear here once you place an order.</p>
                        <Link
                          href="/products"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                          style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}
                        >
                          Shop Now <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order) => (
                          <div key={order.id} className="border border-gray-100 rounded-xl overflow-hidden hover:border-orange-200 transition-all">
                            <div className="flex items-center justify-between px-4 py-3 bg-gray-50/60">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-gray-900 font-mono">#{order.orderNumber}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                                  {STATUS_LABELS[order.status] || order.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                <Calendar className="w-3 h-3" />
                                {new Date(order.createdAt).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                              </div>
                            </div>

                            <div className="px-4 py-3 space-y-2">
                              {(() => {
                                const previewItems: PreviewItem[] = [];
                                const previewIndexByItem = new Map<number, number>();
                                order.items.forEach((item, idx) => {
                                  let isStudio = !!item.isStudio;
                                  if (!isStudio) {
                                    try { isStudio = !!JSON.parse(item.customNote ?? "{}").studioDesign; } catch {}
                                  }
                                  const src = item.imageUrl || item.productImage || '';
                                  if (!src) return;
                                  previewIndexByItem.set(idx, previewItems.length);
                                  previewItems.push({ src, alt: `${item.productName} preview`, isStudio });
                                });
                                const isOpen = orderLightbox?.orderId === order.id;
                                return (
                                  <>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                      {order.items.slice(0, 4).map((item, i) => {
                                        const src = item.imageUrl || item.productImage || '';
                                        const lbIdx = previewIndexByItem.get(i);
                                        const canZoom = src && lbIdx !== undefined;
                                        return (
                                          <div key={i} className="shrink-0 flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                                            {src && (
                                              canZoom ? (
                                                <button
                                                  type="button"
                                                  onClick={() => setOrderLightbox({ orderId: order.id, index: lbIdx! })}
                                                  className="rounded overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-zoom-in"
                                                  aria-label={`View ${item.productName} preview full size`}
                                                >
                                                  <img src={src} alt={item.productName} className="w-6 h-6 object-cover" />
                                                </button>
                                              ) : (
                                                <img src={src} alt={item.productName} className="w-6 h-6 rounded object-cover" />
                                              )
                                            )}
                                            <span className="text-xs text-gray-700 font-medium whitespace-nowrap">{item.productName}</span>
                                            <span className="text-[10px] text-gray-400">×{item.quantity}</span>
                                          </div>
                                        );
                                      })}
                                      {order.items.length > 4 && (
                                        <div className="shrink-0 flex items-center px-2.5 py-1.5 text-xs text-gray-400">
                                          +{order.items.length - 4} more
                                        </div>
                                      )}
                                    </div>
                                    <PreviewLightbox
                                      items={previewItems}
                                      index={isOpen ? orderLightbox!.index : null}
                                      onIndexChange={(i) => setOrderLightbox({ orderId: order.id, index: i })}
                                      onClose={() => setOrderLightbox(null)}
                                    />
                                  </>
                                );
                              })()}

                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {order.shippingDistrict || order.shippingCity || "Bangladesh"}
                                  </span>
                                  {order.promoCode && (
                                    <span className="flex items-center gap-1 text-green-600">
                                      <Tag className="w-3 h-3" />
                                      {order.promoCode}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-gray-900">{formatPrice(parseFloat(order.total))}</p>
                                  <p className="text-[10px] text-gray-400 capitalize">{order.paymentMethod}</p>
                                </div>
                              </div>

                              <div className="flex justify-end pt-2 border-t border-gray-100 mt-1">
                                <Link
                                  // Auto-fill: prefer phone, fall back to email
                                  // so the tracking page can auto-submit even
                                  // for users who never set a phone number.
                                  href={(() => {
                                    const id = customer?.phone?.trim();
                                    const email = customer?.email?.trim();
                                    const param = id
                                      ? `phone=${encodeURIComponent(id)}`
                                      : email
                                      ? `email=${encodeURIComponent(email)}`
                                      : "";
                                    return `/track?order=${encodeURIComponent(order.orderNumber)}${param ? `&${param}` : ""}`;
                                  })()}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors hover:bg-orange-50"
                                  style={{ color: '#E85D04', border: '1px solid #fed7aa' }}
                                  data-testid={`button-track-order-${order.orderNumber}`}
                                >
                                  Track this order <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "messages" && (
                  <div>
                    {selectedOrderId === null ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                            <Bell className="w-4 h-4 text-orange-500" />
                            Messages &amp; Support
                          </h3>
                          <p className="text-[10px] text-gray-400">Tap an order to chat</p>
                        </div>
                        {/* Direct contact CTA — always visible */}
                        <a
                          href="https://wa.me/8801903426915?text=Hi%20TryNex!%20I%20need%20help%20with%20my%20order%20or%20have%20a%20question."
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 w-full p-3 rounded-xl mb-4 hover:brightness-95 transition-all"
                          style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}
                        >
                          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-white font-bold text-sm leading-none">Chat with TryNex Team</p>
                            <p className="text-white/80 text-[11px] mt-0.5">Start a new conversation instantly on WhatsApp</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-white/60 shrink-0" />
                        </a>

                        {ordersLoading ? (
                          <div className="space-y-3">
                            {[...Array(3)].map((_, i) => <OrderSkeleton key={i} />)}
                          </div>
                        ) : orders.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                            <h3 className="font-bold text-gray-900 mb-1">No Orders Yet</h3>
                            <p className="text-sm text-gray-500 mb-4">Place an order to chat about it — or use WhatsApp above for any question.</p>
                            <Link href="/products" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}>
                              Shop Now <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {orders.map((order) => {
                              const orderMsgs = messages[order.id] || [];
                              const lastMsg = orderMsgs[orderMsgs.length - 1];
                              const unread = orderMsgs.filter(m => m.sender_type === "admin" && !m.read_by_customer).length;
                              return (
                                <button
                                  key={order.id}
                                  onClick={() => { setSelectedOrderId(order.id); fetchMessages(order.id); }}
                                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all"
                                >
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-black" style={{ background: "linear-gradient(135deg,#E85D04,#FB8500)" }}>
                                    <Package className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-gray-900 font-mono">#{order.orderNumber}</span>
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                                        {STATUS_LABELS[order.status] || order.status}
                                      </span>
                                    </div>
                                    {lastMsg ? (
                                      <p className="text-xs text-gray-500 truncate mt-0.5">{lastMsg.sender_type === "admin" ? "TryNex: " : "You: "}{lastMsg.message}</p>
                                    ) : (
                                      <p className="text-xs text-gray-400 italic mt-0.5">No messages yet — tap to start</p>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    {unread > 0 && (
                                      <span className="min-w-[1.1rem] h-[1.1rem] px-1 text-[9px] font-black text-white rounded-full flex items-center justify-center bg-red-500">
                                        {unread}
                                      </span>
                                    )}
                                    {lastMsg && (
                                      <span className="text-[10px] text-gray-400">{new Date(lastMsg.created_at).toLocaleDateString("en-BD", { day: "numeric", month: "short" })}</span>
                                    )}
                                    <ChevronLeft className="w-3.5 h-3.5 text-gray-300 rotate-180" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col" style={{ minHeight: "320px" }}>
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                          <button
                            onClick={() => setSelectedOrderId(null)}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-all"
                          >
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                          </button>
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              #{orders.find(o => o.id === selectedOrderId)?.orderNumber}
                            </p>
                            <p className="text-[10px] text-gray-400">Conversation with TryNex Team</p>
                          </div>
                        </div>

                        <div className="flex-1 space-y-3 mb-4 overflow-y-auto max-h-[400px] pr-1">
                          {messagesLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                            </div>
                          ) : (messages[selectedOrderId] || []).length === 0 ? (
                            <div className="text-center py-8">
                              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No messages yet</p>
                              <p className="text-xs text-gray-400">Send a message to the TryNex Team below</p>
                            </div>
                          ) : (
                            (messages[selectedOrderId] || []).map((msg) => (
                              <div key={msg.id} className={`flex ${msg.sender_type === "customer" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                                  msg.sender_type === "customer"
                                    ? "bg-orange-500 text-white rounded-br-sm"
                                    : "bg-gray-100 text-gray-900 rounded-bl-sm"
                                }`}>
                                  {msg.sender_type === "admin" && (
                                    <p className="text-[10px] font-bold text-orange-600 mb-0.5">{msg.sender_name}</p>
                                  )}
                                  <p className="text-xs leading-relaxed whitespace-pre-line">{msg.message}</p>
                                  <p className={`text-[10px] mt-1 ${msg.sender_type === "customer" ? "text-orange-100" : "text-gray-400"}`}>
                                    {new Date(msg.created_at).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <form
                          onSubmit={(e) => { e.preventDefault(); sendMessage(selectedOrderId); }}
                          className="flex items-end gap-2"
                        >
                          <textarea
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(selectedOrderId); }
                            }}
                            placeholder="Type a message..."
                            rows={2}
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm resize-none"
                          />
                          <button
                            type="submit"
                            disabled={!messageInput.trim() || sendingMessage}
                            className="flex items-center justify-center w-10 h-10 rounded-xl text-white transition-all disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}
                          >
                            {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "referral" && (
                  <div>
                    {myReferral ? (
                      <div className="space-y-4">
                        {/* Code + stats */}
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 text-center">Your Affiliate Link</p>
                          <p className="text-2xl font-black font-mono tracking-wider text-orange-600 text-center mb-2">{myReferral.code}</p>
                          <div className="bg-white rounded-lg px-3 py-2 border border-orange-100 flex items-center gap-2">
                            <p className="text-[10px] text-gray-500 font-mono break-all flex-1">{window.location.origin}?ref={myReferral.code}</p>
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(`${window.location.origin}?ref=${myReferral.code}`);
                                toast({ title: "Link copied!", description: "Share it to earn 10% on every sale." });
                              }}
                              className="shrink-0 p-1.5 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
                              title="Copy link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-3 rounded-xl bg-orange-50 border border-orange-100">
                            <TrendingUp className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                            <p className="text-xl font-black text-orange-600">{myReferral.totalUses || 0}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Sales</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-green-50 border border-green-100">
                            <Wallet className="w-4 h-4 text-green-500 mx-auto mb-1" />
                            <p className="text-xl font-black text-green-600">{formatPrice(myReferral.totalEarnings || 0)}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Earned</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
                            <Gift className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                            <p className="text-xl font-black text-blue-600">10%</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Rate</p>
                          </div>
                        </div>

                        {/* Share buttons */}
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Share Directly</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}?ref=${myReferral.code}`;
                                const msg = encodeURIComponent(`🎁 TryNex Lifestyle থেকে কাস্টম টি-শার্ট অর্ডার করুন!\n✅ আমার লিঙ্ক দিয়ে অর্ডার করলে ১০% ছাড় পাবেন!\n👉 ${url}`);
                                window.open(`https://wa.me/?text=${msg}`, '_blank');
                              }}
                              className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white"
                              style={{ background: "#25D366" }}
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.118 1.522 5.852L0 24l6.302-1.493A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 01-5.004-1.368l-.36-.214-3.732.883.936-3.628-.235-.373A9.817 9.817 0 012.182 12c0-5.42 4.399-9.818 9.818-9.818 5.42 0 9.818 4.399 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>
                              WhatsApp
                            </button>
                            <button
                              onClick={() => {
                                const url = encodeURIComponent(`${window.location.origin}?ref=${myReferral.code}`);
                                window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
                              }}
                              className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white"
                              style={{ background: "#1877F2" }}
                            >
                              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                              Facebook
                            </button>
                            <button
                              onClick={async () => {
                                const url = `${window.location.origin}?ref=${myReferral.code}`;
                                try { await navigator.share({ title: "Get 10% off at TryNex!", text: "Use my referral link for 10% off!", url }); }
                                catch { await navigator.clipboard.writeText(url); toast({ title: "Link copied!" }); }
                              }}
                              className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                            >
                              <Share2 className="w-4 h-4" /> More Apps
                            </button>
                            <a
                              href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}?ref=${myReferral.code}`)}&color=E85D04`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                            >
                              <ExternalLink className="w-4 h-4" /> QR Code
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                          <span>Earnings = store credit • Redeem via WhatsApp</span>
                          <Link href="/referral" className="font-semibold text-orange-500 hover:underline flex items-center gap-1">
                            Full Page <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-900 mb-2">No Affiliate Code Yet</h3>
                        <p className="text-sm text-gray-500 mb-1">Create your code and earn 10% on every sale you drive.</p>
                        <p className="text-xs text-gray-400 mb-4">Share via WhatsApp, Facebook, or any channel you use.</p>
                        <Link
                          href="/referral"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                          style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}
                        >
                          Get My Affiliate Code <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "recent" && (
                  <div>
                    {recentProducts.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {recentProducts.map((product) => (
                          <Link
                            key={product.id}
                            href={`/product/${product.slug || product.id}`}
                            className="group rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all bg-white"
                          >
                            <div className="aspect-square bg-gray-100 overflow-hidden">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { e.currentTarget.style.display = "none"; }} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <Package className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="p-2.5">
                              <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                              <p className="text-xs font-bold text-orange-600 mt-0.5">
                                {formatPrice(product.discountPrice || product.price)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="font-bold text-gray-900 mb-2">No Recently Viewed Products</h3>
                        <p className="text-sm text-gray-500 mb-4">Start browsing our collection to see your recent views here.</p>
                        <Link
                          href="/products"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
                          style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}
                        >
                          Browse Products <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
