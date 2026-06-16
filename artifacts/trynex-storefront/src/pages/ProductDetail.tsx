import { useParams, Link, useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Loader } from "@/components/ui/Loader";
import { ProductDetailSkeleton } from "@/components/ui/skeleton";
import { useGetProduct, useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice, cn, getApiUrl } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCartActions } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { trackViewContent } from "@/lib/tracking";
import { ViewerCount } from "@/components/ViewerCount";
import { MobileImageLightbox } from "@/components/MobileImageLightbox";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import {
  Minus, Plus, ShoppingBag, ShieldCheck, Truck, Star, Search,
  RotateCcw, ArrowLeft, ArrowRight, Check, Heart, Share2, Ruler, MessageCircle, Sparkles,
  Upload, Image as ImageIcon, X as XIcon, ZoomIn, Bell, Calendar, Package2, ShoppingCart
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRef, useCallback } from "react";

const COLOR_MAP: Record<string, string> = {
  'Black': '#1a1a1a', 'White': '#f0f0f0', 'Grey': '#6b7280', 'Gray': '#6b7280',
  'Navy': '#1e3a5f', 'Olive': '#4a5240', 'Charcoal': '#374151', 'Maroon': '#7f1d1d',
  'Red': '#dc2626', 'Blue': '#1d4ed8', 'Cream': '#fef3c7', 'Khaki': '#a18b52',
  'Burgundy': '#6b1a2a', 'Brown': '#7c4a2b', 'Yellow': '#eab308', 'Green': '#16a34a',
  'Orange': '#ea580c', 'Pink': '#ec4899', 'Purple': '#7c3aed', 'Teal': '#0d9488',
  'Sky Blue': '#0ea5e9', 'Lime': '#84cc16', 'Coral': '#f97316', 'Indigo': '#6366f1',
};

const SIZE_GUIDE = [
  { size: "S", chest: "36-38", length: "27", sleeve: "32" },
  { size: "M", chest: "38-40", length: "28", sleeve: "33" },
  { size: "L", chest: "40-42", length: "29", sleeve: "34" },
  { size: "XL", chest: "42-44", length: "30", sleeve: "35" },
  { size: "2XL", chest: "44-46", length: "31", sleeve: "36" },
  { size: "3XL", chest: "46-48", length: "32", sleeve: "37" },
];

const REVIEW_SAMPLES = [
  { name: "Rakib H.", rating: 5, text: "Amazing quality! The print is sharp and fabric is premium. Delivery was super fast.", date: "2 days ago", location: "Dhaka" },
  { name: "Priya M.", rating: 5, text: "Exactly what I ordered. The color is vibrant and the stitching is perfect.", date: "1 week ago", location: "Chittagong" },
  { name: "Tanvir A.", rating: 4, text: "Good quality product. Would recommend TryNex to everyone!", date: "2 weeks ago", location: "Sylhet" },
];

function ReviewsSection({ productId, rating }: { productId: number; rating: number }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitName, setSubmitName] = useState("");
  const [submitEmail, setSubmitEmail] = useState("");
  const [submitRating, setSubmitRating] = useState(5);
  const [submitText, setSubmitText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchReviews = async () => {
    setReviewsError(false);
    try {
      const res = await fetch(getApiUrl(`/api/reviews/${productId}`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setStats(data.stats || null);
    } catch {
      setReviewsError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setReviews([]);
    setStats(null);
    fetchReviews();
  }, [productId]);

  const handleSubmitReview = async () => {
    if (!submitName || !submitEmail || !submitRating) return;
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl("/api/reviews"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, customerName: submitName, customerEmail: submitEmail, rating: submitRating, text: submitText }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: data.message || "Failed", variant: "destructive" }); return; }
      toast({ title: "Review submitted!", description: "It will appear once approved by our team." });
      setShowForm(false);
      setSubmitName(""); setSubmitEmail(""); setSubmitRating(5); setSubmitText("");
    } catch { toast({ title: "Failed to submit", variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const avg = stats?.average || rating;
  const total = stats?.total || 0;

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (reviewsError) return (
    <div className="text-center py-10">
      <p className="text-sm text-gray-500 mb-3">Could not load reviews. Please try again.</p>
      <button onClick={fetchReviews} className="text-sm text-orange-600 font-semibold hover:underline">Retry</button>
    </div>
  );

  return (
    <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 p-5 sm:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
        <div className="text-center">
          <div className="text-5xl font-black text-gray-900">{avg}</div>
          <div className="flex justify-center mt-2">
            {Array.from({ length: 5 }).map((_, j) => (
              <Star key={j} className="w-4 h-4" style={{ fill: j < Math.floor(avg) ? '#FB8500' : '#e5e7eb', color: j < Math.floor(avg) ? '#FB8500' : '#e5e7eb' }} />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">{total} review{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((s) => {
            const count = stats?.distribution?.[s] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={s} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 w-4">{s}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#FB8500' }} />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-xl font-bold text-sm border-2 border-dashed border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600 transition-all">
          Write a Review
        </button>
      ) : (
        <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h4 className="font-black text-gray-900">Write Your Review</h4>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button" onClick={() => setSubmitRating(s)}>
                <Star className="w-6 h-6" style={{ fill: s <= submitRating ? '#FB8500' : '#e5e7eb', color: s <= submitRating ? '#FB8500' : '#e5e7eb' }} />
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Your name *" value={submitName} onChange={e => setSubmitName(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            <input type="email" placeholder="Your email *" value={submitEmail} onChange={e => setSubmitEmail(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <textarea placeholder="Share your experience (optional)" rows={3} value={submitText} onChange={e => setSubmitText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-sm text-gray-500">Cancel</button>
            <button type="button" onClick={handleSubmitReview} disabled={submitting || !submitName || !submitEmail}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}>
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Loading reviews...</div>
      ) : reviews.length > 0 ? reviews.map((review: any, i: number) => (
        <motion.div key={review.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
          className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)' }}>
                {review.customerName?.[0] || "?"}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                  {review.customerName}
                  {review.verified && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-bold border border-green-100">Verified</span>}
                </p>
                <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex">
              {Array.from({ length: review.rating }).map((_: any, j: number) => (
                <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          {review.text && <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>}
        </motion.div>
      )) : (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No reviews yet. Be the first to review this product!</p>
        </div>
      )}

    </motion.div>
  );
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function formatDeliveryDate(date: Date): string {
  return date.toLocaleDateString('en-BD', { weekday: 'short', month: 'short', day: 'numeric' });
}

function compressAndConvertToBase64(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas not supported")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProductDetail() {
  const { id } = useParams();
  const numericId = Number(id);
  const isNumeric = !isNaN(numericId) && numericId > 0;
  const isSlug = !isNumeric && !!id && id.length > 0;

  const queryClient = useQueryClient();
  const cachedProduct = useMemo(() => {
    if (!isNumeric && !isSlug) return undefined;
    const listKeyPrefix = [getListProductsQueryKey()[0]];
    const entries = queryClient.getQueriesData<{ products: any[] } | undefined>({ queryKey: listKeyPrefix });
    for (const [, data] of entries) {
      const list = data?.products;
      if (!Array.isArray(list)) continue;
      const found = list.find((p: any) =>
        isNumeric ? p?.id === numericId : (p?.slug === id || String(p?.id) === id)
      );
      if (found) return found;
    }
    return undefined;
  }, [queryClient, isNumeric, isSlug, numericId, id]);

  const { data: productFromHook, isLoading: hookLoading, error: hookError } = useGetProduct(isNumeric ? String(numericId) : '0', {
    query: { enabled: isNumeric, retry: 2, staleTime: 30000, initialData: isNumeric ? cachedProduct : undefined }
  } as any);

  const [slugProduct, setSlugProduct] = useState<any>(isSlug ? cachedProduct : null);
  const [slugLoading, setSlugLoading] = useState(isSlug && !cachedProduct);
  const [slugError, setSlugError] = useState(false);

  useEffect(() => {
    if (!isSlug) return;
    const hasInitial = !!cachedProduct;
    if (!hasInitial) setSlugLoading(true);
    setSlugError(false);
    fetch(getApiUrl(`/api/products/${encodeURIComponent(id!)}`))
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setSlugProduct(data))
      .catch(() => { if (!hasInitial) setSlugError(true); })
      .finally(() => setSlugLoading(false));
  }, [id, isSlug, cachedProduct]);

  const product = isNumeric ? productFromHook : slugProduct;
  const isLoading = isNumeric ? hookLoading : slugLoading;
  const error = isNumeric ? hookError : slugError;
  const productId = product?.id ?? numericId;
  const isValidId = isNumeric || isSlug;

  const { data: relatedData } = useListProducts(
    { limit: 4, category: product?.categoryId ? String(product.categoryId) : undefined } as any,
    { query: { enabled: !!product, staleTime: 60000 } as any }
  );
  const relatedProducts = (relatedData?.products || []).filter(p => p.id !== productId).slice(0, 4);

  const { data: fbtData } = useListProducts(
    { limit: 8 } as any,
    { query: { enabled: !!product, staleTime: 60000 } as any }
  );
  const fbtProducts = (fbtData?.products || [])
    .filter((p: any) => p.id !== productId && p.categoryId !== product?.categoryId && p.stock > 0)
    .slice(0, 3);

  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!productId) return;
    fetch(getApiUrl(`/api/reviews/${productId}`))
      .then(res => res.json())
      .then(data => setStats(data.stats || null))
      .catch(() => {});
  }, [productId]);

  const [, navigate] = useLocation();
  const { addToCart } = useCartActions();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { toast } = useToast();
  const settings = useSiteSettings();
  const { addProduct: trackRecentlyViewed } = useRecentlyViewed();
  const whatsappNum = (settings.whatsappNumber?.replace(/[^0-9]/g, '') || '8801903426915');

  const prefersReducedMotion = useReducedMotion();
  const [quantity, setQuantity] = useState(1);

  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySubmitted, setNotifySubmitted] = useState(false);
  const [notifySubmitting, setNotifySubmitting] = useState(false);
  const [qtyPulse, setQtyPulse] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [customNote, setCustomNote] = useState("");
  const [customImages, setCustomImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addedToBag, setAddedToBag] = useState(false);
  const [activeImage, setActiveImage] = useState<string>("");
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [sizeShake, setSizeShake] = useState(0);
  const [colorShake, setColorShake] = useState(0);
  const [activeTab, setActiveTab] = useState<"details" | "reviews">("details");
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const mainAddToCartRef = useRef<HTMLButtonElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  useEffect(() => {
    if (!product || product.stock < 1) return;
    const root = document.documentElement;
    const setOffset = () => {
      const isMobile = window.innerWidth < 768;
      const stickyVisible = root.dataset.stickyAddVisible === '1';
      root.style.setProperty('--mobile-sticky-offset', isMobile && stickyVisible ? '76px' : '0px');
    };
    setOffset();
    window.addEventListener('resize', setOffset, { passive: true });
    const observer = new MutationObserver(setOffset);
    observer.observe(root, { attributes: true, attributeFilter: ['data-sticky-add-visible'] });
    return () => {
      window.removeEventListener('resize', setOffset);
      observer.disconnect();
      root.style.setProperty('--mobile-sticky-offset', '0px');
      delete root.dataset.stickyAddVisible;
    };
  }, [product?.id, product?.stock]);

  useEffect(() => {
    setActiveImage("");
    setQuantity(1);
    setSelectedSize("");
    setSelectedColor("");
    setCustomNote("");
    setCustomImages([]);
    if (product) {
      trackViewContent({
        id: product.id,
        name: product.name,
        price: product.discountPrice || product.price,
      });
      trackRecentlyViewed({
        id: product.id,
        name: product.name,
        slug: product.slug || String(product.id),
        price: product.discountPrice || product.price,
        imageUrl: product.imageUrl || '',
      });
    }
  }, [product?.id]);

  if (isLoading) return <ProductDetailSkeleton />;

  const NotFound = (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-20">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-4xl font-black font-display tracking-tight text-gray-900 mb-3">Product Not Found</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">This product may have been removed or the link is incorrect.</p>
          <Link href="/products" className="btn-primary inline-flex">
            <ArrowLeft className="w-5 h-5" /> Browse All Products
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (!isValidId || error || !product) return NotFound;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setUploadingImage(true);
    let successCount = 0;
    try {
      for (const file of fileArray) {
        if (file.size > 15 * 1024 * 1024) {
          toast({ title: "File too large", description: `${file.name} exceeds 15MB. Please use a smaller image.`, variant: "destructive" });
          continue;
        }
        if (!file.type.startsWith("image/")) {
          toast({ title: "Invalid file type", description: `${file.name} is not an image. Please upload PNG, JPG, or SVG.`, variant: "destructive" });
          continue;
        }
        try {
          const compressed = await compressAndConvertToBase64(file);
          setCustomImages(prev => [...prev, compressed]);
          successCount++;
        } catch {
          toast({ title: "Could not process image", description: `${file.name} could not be loaded. Please try a different image.`, variant: "destructive" });
        }
      }
      if (successCount > 0) {
        toast({ title: `${successCount} image${successCount > 1 ? 's' : ''} attached!`, description: "Your design reference has been added to the order." });
      }
    } catch {
      toast({ title: "Upload failed", description: "Something went wrong. Please try selecting the image again.", variant: "destructive" });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleNotifyMe = async () => {
    if (!notifyEmail || notifySubmitting) return;
    setNotifySubmitting(true);
    try {
      await fetch(getApiUrl("/api/newsletter/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: notifyEmail, source: `back-in-stock:${product?.id}` }),
      });
    } catch {}
    setNotifySubmitted(true);
    setNotifySubmitting(false);
  };

  const handleAddToCart = () => {
    if (product.stock < 1) return;
    
    let hasError = false;

    // Require size selection when sizes are available
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setSizeShake(n => n + 1);
      hasError = true;
    }

    if (hasError) {
      const firstError = document.getElementById("size-picker");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Block if selected color is marked out of stock
    if (selectedColor) {
      const variant = (product.colorVariants ?? []).find((v: any) => v.name === selectedColor);
      if (variant && variant.inStock === false) return;
    }
    const itemPrice = product.discountPrice || product.price;
    addToCart({
      productId: product.id,
      name: product.name,
      price: itemPrice,
      originalPrice: product.price,
      quantity,
      imageUrl: displayImage || product.imageUrl,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      customNote: customNote || undefined,
      customImages: customImages.length > 0 ? customImages : undefined,
    } as any);
    setAddedToBag(true);
    toast({
      title: "✓ Added to cart!",
      description: `${product.name} × ${quantity}`,
      action: (
        <ToastAction altText="Checkout now" onClick={() => navigate("/checkout")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap border-0"
          style={{ background: '#E85D04' }}>
          Checkout <ArrowRight className="w-3 h-3" />
        </ToastAction>
      ),
    });
    setTimeout(() => setAddedToBag(false), 1200);
  };

  const discount = product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const displayImage = activeImage || product.imageUrl || "";
  const wishlisted = isWishlisted(product.id);
  const rating = product.rating ? parseFloat(String(product.rating)) : 4.9;

  const handleShare = async () => {
    try {
      await navigator.share({ title: product.name, url: window.location.href });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied!", description: "Share it with your friends." });
    }
  };

  const handleWhatsAppOrder = () => {
    const itemPrice = product.discountPrice || product.price;
    const totalPrice = itemPrice * quantity;
    const lines = [
      `Assalamu Alaikum, TryNex!`,
      ``,
      `I'd like to place an order:`,
      ``,
      `🛍️ *Product:* ${product.name}`,
      `💰 *Price:* ${formatPrice(itemPrice)}${product.discountPrice ? ` (was ${formatPrice(product.price)})` : ``}`,
      `📦 *Quantity:* ${quantity}`,
      `💵 *Total:* ${formatPrice(totalPrice)}`,
    ];
    if (selectedSize) lines.push(`📏 *Size:* ${selectedSize}`);
    if (selectedColor) lines.push(`🎨 *Color:* ${selectedColor}`);
    if (customNote) lines.push(`✏️ *Custom Note:* ${customNote}`);
    lines.push(``);
    lines.push(`🔗 *Product Link:* ${window.location.href}`);
    lines.push(``);
    lines.push(`Please confirm availability and delivery details. Thank you!`);
    const msg = lines.join('\n');
    let waNum = whatsappNum.replace(/^(\+?88)+/, '');
    waNum = '88' + waNum;
    window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SEOHead
        title={`${product.name} | TryNex Lifestyle`}
        description={product.description?.substring(0, 160) || `Buy ${product.name} from TryNex Lifestyle. Premium quality custom apparel in Bangladesh. Fast delivery to Dhaka and beyond.`}
        canonical={`/product/${product.slug || product.id}`}
        ogImage={product.imageUrl || undefined}
        ogType="product"
        keywords={`${product.name}, buy ${product.name} bangladesh, trynex ${product.name}, customized gift Bangladesh, কাস্টম গিফট বাংলাদেশ`}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "description": product.description || `Buy ${product.name} from TryNex Lifestyle. Premium quality, fast delivery across Bangladesh.`,
            "image": product.imageUrl || "",
            "sku": `TN-${product.id}`,
            "brand": { "@type": "Brand", "name": "TryNex Lifestyle" },
            "offers": {
              "@type": "Offer",
              "priceCurrency": "BDT",
              "price": product.discountPrice || product.price,
              "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "url": `https://trynexshop.com/products/${product.slug || product.id}`,
              "itemCondition": "https://schema.org/NewCondition",
              "seller": { "@type": "Organization", "name": "TryNex Lifestyle" }
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": stats?.average || product.rating || 4.9,
              "reviewCount": stats?.total || 10,
              "bestRating": "5",
              "worstRating": "1"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://trynexshop.com/" },
              { "@type": "ListItem", "position": 2, "name": "Shop", "item": "https://trynexshop.com/products" },
              { "@type": "ListItem", "position": 3, "name": product.name, "item": `https://trynexshop.com/products/${product.slug || product.id}` },
            ],
          },
        ]}
      />
      <Navbar />

      <main className="flex-1 pt-header pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-8 font-medium">
            <Link href="/" className="hover:text-orange-600 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-orange-600 transition-colors">Shop</Link>
            <span>/</span>
            <span className="text-gray-700 line-clamp-1">{product.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12">
            {/* Images Column */}
            <div className="relative flex flex-col gap-4">
              {/* Desktop Image Viewer */}
              <motion.div
                ref={imageContainerRef}
                className="relative aspect-square rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm group cursor-zoom-in hidden md:block"
                layoutId={`product-image-${product.id}`}
                onMouseEnter={() => setZoomActive(true)}
                onMouseLeave={() => setZoomActive(false)}
                onMouseMove={handleImageMouseMove}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={`${product.name} — TryNex Lifestyle`}
                    className="w-full h-full object-cover transition-transform duration-300"
                    width={800}
                    height={800}
                    fetchPriority="high"
                    decoding="async"
                    style={zoomActive ? {
                      transform: 'scale(2)',
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                    } : undefined}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
                    <ShoppingBag className="w-24 h-24 text-orange-300" />
                  </div>
                )}
                {discount > 0 && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl font-black text-white text-sm pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)' }}>
                    -{discount}% OFF
                  </div>
                )}
                {product.stock > 0 && product.stock <= (settings.scarcityThreshold || 10) && (
                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl font-bold text-amber-700 text-xs pointer-events-none"
                    style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)' }}>
                    Only {product.stock} left!
                  </div>
                )}
              </motion.div>

              {(() => {
                const rawImages = [product.imageUrl, ...(product.images || [])].filter(Boolean) as string[];
                const allImages = [...new Set(rawImages)];
                const hasMultiple = allImages.length > 1;
                const activeIdx = Math.max(0, activeImage ? allImages.indexOf(activeImage) : 0);
                const onTouchStart = (e: React.TouchEvent) => {
                  if (e.touches.length > 1) {
                    setLightboxIndex(activeIdx);
                    setLightboxOpen(true);
                    touchStartXRef.current = null;
                    touchStartYRef.current = null;
                    return;
                  }
                  if (!hasMultiple) {
                    const t = e.touches[0];
                    touchStartXRef.current = t.clientX;
                    touchStartYRef.current = t.clientY;
                    return;
                  }
                  const t = e.touches[0];
                  touchStartXRef.current = t.clientX;
                  touchStartYRef.current = t.clientY;
                };
                const onTouchEnd = (e: React.TouchEvent) => {
                  if (touchStartXRef.current === null) {
                    touchStartXRef.current = null;
                    touchStartYRef.current = null;
                    return;
                  }
                  const t = e.changedTouches[0];
                  const dx = t.clientX - touchStartXRef.current;
                  const dy = t.clientY - (touchStartYRef.current ?? 0);
                  touchStartXRef.current = null;
                  touchStartYRef.current = null;
                  if (hasMultiple && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
                    if (dx < 0) {
                      setActiveImage(allImages[(activeIdx + 1) % allImages.length]);
                    } else {
                      setActiveImage(allImages[(activeIdx - 1 + allImages.length) % allImages.length]);
                    }
                    return;
                  }
                  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                    setLightboxIndex(activeIdx);
                    setLightboxOpen(true);
                  }
                };
                return (
                  <motion.div
                    className="relative aspect-square rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm md:hidden touch-pan-y select-none"
                    layoutId={`product-image-mobile-${product.id}`}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                  >
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={product.name}
                        className="w-full h-full object-cover pointer-events-none"
                        width="600"
                        height="600"
                        fetchPriority="high"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
                        <ShoppingBag className="w-24 h-24 text-orange-300" />
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl font-black text-white text-sm"
                        style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)' }}>
                        -{discount}% OFF
                      </div>
                    )}
                    {product.stock > 0 && product.stock <= (settings.scarcityThreshold || 10) && (
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl font-bold text-amber-700 text-xs"
                        style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)' }}>
                        Only {product.stock} left!
                      </div>
                    )}
                    {hasMultiple && (
                      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/55 text-white backdrop-blur-sm pointer-events-none">
                        {activeIdx + 1} / {allImages.length}
                      </span>
                    )}
                    {displayImage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(activeIdx);
                          setLightboxOpen(true);
                        }}
                        aria-label="Open image viewer"
                        className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full bg-black/55 text-white backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <ZoomIn className="w-4.5 h-4.5" style={{ width: '1.1rem', height: '1.1rem' }} />
                      </button>
                    )}
                  </motion.div>
                );
              })()}

              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0">
                {(() => {
                  const rawImages = [product.imageUrl, ...(product.images || [])].filter(Boolean) as string[];
                  const allImages = [...new Set(rawImages)];
                  if (allImages.length <= 1) return null;
                  return allImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => { setActiveImage(img); setZoomActive(false); }}
                      className={cn(
                        "relative w-14 sm:w-16 aspect-square shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                        activeImage === img || (!activeImage && i === 0) ? "border-orange-500 scale-95" : "border-gray-100 hover:border-orange-200"
                      )}
                    >
                      <img
                        src={img}
                        alt={`${product.name} thumb ${i + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ));
                })()}
              </div>
            </div>

            {/* Product Info */}
            <div>
              {/* Category + Actions */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-orange-500">
                  {product.customizable ? "✨ Customizable" : "Ready Made"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWishlist({ id: product.id, name: product.name, price: product.price, discountPrice: product.discountPrice, imageUrl: product.imageUrl })}
                    className="p-2.5 rounded-xl transition-all"
                    style={{
                      background: wishlisted ? '#fff1f0' : '#f9fafb',
                      border: `1px solid ${wishlisted ? '#fecaca' : '#e5e7eb'}`
                    }}
                  >
                    <Heart className="w-4.5 h-4.5" style={{ width: '1.1rem', height: '1.1rem', color: wishlisted ? '#E85D04' : '#9ca3af', fill: wishlisted ? '#E85D04' : 'none' }} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700 transition-all"
                  >
                    <Share2 className="w-4.5 h-4.5" style={{ width: '1.1rem', height: '1.1rem' }} />
                  </button>
                </div>
              </div>

              <h1 className="text-3xl font-black font-display tracking-tight text-gray-900 mb-4 leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="w-4 h-4"
                      style={{ fill: j < Math.floor(rating) ? '#FB8500' : '#e5e7eb', color: j < Math.floor(rating) ? '#FB8500' : '#e5e7eb' }} />
                  ))}
                </div>
                <span className="font-bold text-sm text-gray-700">{rating}</span>
                <span className="text-sm text-gray-400">(128 reviews)</span>
              </div>

              {/* Price */}
              <div className="mb-8 p-5 rounded-2xl" style={{ background: '#fff8f5', border: '1px solid #fde4d0' }}>
                <div className="flex items-baseline gap-3 sm:gap-4 mb-3 flex-wrap">
                  {product.discountPrice ? (
                    <>
                      <span className="text-4xl font-black text-orange-600">{formatPrice(product.discountPrice)}</span>
                      <span className="text-xl line-through text-gray-400">{formatPrice(product.price)}</span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black text-white"
                        style={{ background: '#E85D04' }}>Save {discount}%</span>
                    </>
                  ) : (
                    <span className="text-4xl font-black text-gray-900">{formatPrice(product.price)}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide"
                    style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}
                  >
                    <Truck className="w-3 h-3" /> Cash on Delivery
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide"
                    style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
                  >
                    🇧🇩 5,000+ happy customers
                  </span>
                </div>
                <ViewerCount productId={product.id} />

                {/* Estimated Delivery */}
                {product.stock > 0 && (() => {
                  const today = new Date();
                  const minDate = addBusinessDays(today, 3);
                  const maxDate = addBusinessDays(today, 5);
                  return (
                    <div
                      className="flex items-center gap-2.5 mt-3 px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)' }}
                    >
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-blue-700">
                          Order today → Receive by {formatDeliveryDate(minDate)}–{formatDeliveryDate(maxDate)}
                        </p>
                        <p className="text-[10px] text-blue-500 font-medium">
                          Nationwide delivery across all 64 districts
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Sizes */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-6" id="size-picker">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-gray-900 text-sm">
                      Size
                      {!selectedSize && <span className="ml-1.5 text-[10px] font-bold text-orange-500 uppercase tracking-wider">· Required</span>}
                    </p>
                    <button
                      onClick={() => setShowSizeGuide(!showSizeGuide)}
                      className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                    >
                      <Ruler className="w-3.5 h-3.5" /> Size Guide
                    </button>
                  </div>
                  <motion.div
                    key={sizeShake}
                    animate={sizeShake > 0 ? { x: [0, -10, 10, -10, 10, -6, 6, 0] } : { x: 0 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="flex flex-wrap gap-2 sm:gap-3"
                  >
                    {product.sizes.map((size: string) => (
                      <button
                        key={size}
                        onClick={() => { setSelectedSize(size === selectedSize ? "" : size); setSizeShake(0); }}
                        className={cn(
                          "min-w-[48px] px-3 py-2.5 rounded-xl font-bold text-sm transition-all border",
                          selectedSize === size
                            ? "border-primary text-white"
                            : "bg-white text-gray-700 border-gray-200 hover:border-orange-400"
                        )}
                        style={selectedSize === size ? {
                          background: 'linear-gradient(135deg, #E85D04, #FB8500)',
                          boxShadow: '0 4px 12px rgba(232,93,4,0.3)'
                        } : undefined}
                      >
                        {size}
                      </button>
                    ))}
                  </motion.div>
                  {sizeShake > 0 && !selectedSize && (
                    <p className="text-xs font-bold text-red-500 mt-2 ml-1">Please select a size</p>
                  )}

                  {/* Size Guide Table */}
                  <AnimatePresence>
                    {showSizeGuide && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4"
                      >
                        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                          <p className="font-bold text-sm text-gray-900 mb-3">Size Chart (inches)</p>
                          <table className="w-full text-xs text-center">
                            <thead>
                              <tr className="border-b border-gray-100">
                                {["Size", "Chest", "Length", "Sleeve"].map(h => (
                                  <th key={h} className="py-2 font-black text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {SIZE_GUIDE.map((row, i) => (
                                <tr key={row.size} className={cn("border-b border-gray-50", i % 2 === 0 ? "bg-gray-50" : "bg-white")}>
                                  <td className="py-2 font-black text-orange-600">{row.size}</td>
                                  <td className="py-2 text-gray-600">{row.chest}</td>
                                  <td className="py-2 text-gray-600">{row.length}</td>
                                  <td className="py-2 text-gray-600">{row.sleeve}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Colors */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-6" id="color-picker">
                  <p className="font-bold text-gray-900 text-sm mb-3">
                    {selectedColor
                      ? <>Selected: <span className="text-orange-600">{selectedColor}</span></>
                      : <>Choose a color <span className="font-normal text-gray-400">(optional)</span></>}
                  </p>
                  <motion.div 
                    key={colorShake}
                    animate={colorShake > 0 ? { x: [0, -10, 10, -10, 10, -6, 6, 0] } : { x: 0 }}
                    transition={{ duration: 0.45, ease: "easeInOut" }}
                    className="flex flex-wrap gap-3 sm:gap-4"
                  >
                    {product.colors.map((color: string, colorIdx: number) => {
                      const variantMeta = (product.colorVariants ?? []).find((v: any) => v.name === color);
                      const isOutOfStock = variantMeta ? variantMeta.inStock === false : false;
                      const colorImages = product.colorImages || {};
                      const mappedImage = colorImages[color];

                      return (
                        <button
                          key={color}
                          onClick={() => {
                            if (isOutOfStock) return;
                            const isDeselect = color === selectedColor;
                            setSelectedColor(isDeselect ? "" : color);
                            setColorShake(0);
                            
                            if (isDeselect) {
                              setActiveImage("");
                            } else if (mappedImage) {
                              setActiveImage(mappedImage);
                            } else {
                              const allImages = [product.imageUrl, ...(product.images || [])].filter(Boolean) as string[];
                              if (allImages.length > 1 && colorIdx < allImages.length) {
                                setActiveImage(allImages[colorIdx]);
                              }
                            }
                          }}
                          title={isOutOfStock ? `${color} — Out of stock` : color}
                          className="relative"
                          disabled={isOutOfStock}
                          style={{ opacity: isOutOfStock ? 0.45 : 1 }}
                        >
                          <div
                            className="w-9 h-9 rounded-xl transition-all hover:scale-110"
                            style={{
                              background: COLOR_MAP[color] || '#aaa',
                              border: selectedColor === color
                                ? '3px solid #E85D04'
                                : color === 'White' ? '2px solid #d1d5db' : '2px solid transparent',
                              boxShadow: selectedColor === color ? '0 0 0 2px white, 0 0 0 4px #E85D04' : '0 2px 6px rgba(0,0,0,0.15)',
                            }}
                          />
                          {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-7 h-0.5 bg-red-400 rotate-45 rounded-full" />
                            </div>
                          )}
                          {selectedColor === color && !isOutOfStock && (
                            <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                  {product.colors.some((c: string) => (product.colorVariants ?? []).find((v: any) => v.name === c)?.inStock === false) && (
                    <p className="text-xs text-gray-400 mt-1.5">Crossed-out colors are currently out of stock.</p>
                  )}
                </div>
              )}

              {product.customizable && (
                <div className="mb-6 space-y-4">
                  <label className="block font-bold text-gray-900 text-sm mb-2">
                    <Sparkles className="inline w-4 h-4 mr-1.5 text-orange-500" />
                    Customize Your Design
                  </label>

                  {/* Design in Studio CTA */}
                  <Link href={`/design-studio?storeProductId=${product.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all"
                      style={{
                        background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
                        border: "2px solid #FED7AA",
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}>
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-gray-900">Open in Design Studio</p>
                        <p className="text-xs text-orange-600 mt-0.5">Add text, logos & artwork with our visual editor</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-orange-400 shrink-0" />
                    </motion.div>
                  </Link>

                  <p className="text-xs text-gray-400 text-center font-medium">— or describe your idea below —</p>

                  <textarea
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Describe your design idea, text, placement, or any instructions..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl text-sm font-medium focus:outline-none bg-white border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none text-gray-800 placeholder-gray-400"
                  />

                  <div className="p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-orange-300 transition-colors"
                    style={{ background: '#fffaf5' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <ImageIcon className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="font-bold text-sm text-gray-900">Upload Design / Logo</p>
                        <p className="text-xs text-gray-400">PNG, JPG, or SVG — Max 10MB each</p>
                      </div>
                    </div>
                    <label className={cn(
                      "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold cursor-pointer transition-all",
                      uploadingImage
                        ? "bg-gray-100 text-gray-400 cursor-wait"
                        : "bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                    )}>
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? "Uploading..." : "Choose Files"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                    {customImages.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {customImages.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img} alt={`Design ${idx + 1}`}
                              className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                            <button
                              onClick={() => setCustomImages(prev => prev.filter((_, i) => i !== idx))}
                              className="btn-press absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quantity + Add to Cart */}
              <div className="flex gap-3 mb-6">
                <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <motion.button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, quantity - 1);
                      if (next !== quantity) { setQuantity(next); setQtyPulse(p => p + 1); }
                    }}
                    aria-label="Decrease quantity"
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 600, damping: 15 }}
                    className="px-4 py-3 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <span className="px-5 font-black text-gray-900 text-lg min-w-[3rem] text-center overflow-hidden">
                    <motion.span
                      key={qtyPulse}
                      initial={prefersReducedMotion ? false : { scale: 0.7, opacity: 0.4 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className="inline-block"
                    >
                      {quantity}
                    </motion.span>
                  </span>
                  <motion.button
                    type="button"
                    onClick={() => {
                      const next = Math.min(quantity + 1, product.stock);
                      if (next !== quantity) { setQuantity(next); setQtyPulse(p => p + 1); }
                    }}
                    aria-label="Increase quantity"
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 600, damping: 15 }}
                    className="px-4 py-3 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
                <motion.button
                  ref={mainAddToCartRef}
                  onClick={handleAddToCart}
                  disabled={product.stock < 1}
                  aria-live="polite"
                  animate={
                    prefersReducedMotion || !addedToBag
                      ? { scale: 1 }
                      : { scale: [1, 1.06, 0.97, 1.02, 1] }
                  }
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], times: [0, 0.25, 0.5, 0.75, 1] }}
                  whileTap={prefersReducedMotion || addedToBag ? undefined : { scale: 0.97 }}
                  className="flex-1 h-14 rounded-xl font-bold text-white flex items-center justify-center gap-2.5 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: product.stock > 0
                      ? (addedToBag ? '#16a34a' : 'linear-gradient(135deg, #E85D04, #FB8500)')
                      : '#e5e7eb',
                    boxShadow: product.stock > 0 ? '0 6px 24px rgba(232,93,4,0.35)' : 'none',
                    color: product.stock === 0 ? '#9ca3af' : 'white',
                    transition: 'background 0.25s ease, box-shadow 0.25s ease',
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {addedToBag ? (
                      <motion.span
                        key="added"
                        initial={prefersReducedMotion ? false : { scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 600, damping: 18 }}
                        className="flex items-center gap-2.5"
                      >
                        <Check className="w-5 h-5" /> Added to Bag!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="add"
                        initial={prefersReducedMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2.5"
                      >
                        <ShoppingBag className="w-5 h-5" />{product.stock > 0 ? "Add to Bag" : "Sold Out"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Back-in-Stock Alert (only when sold out) */}
              {product.stock === 0 && (
                <div className="mb-6 p-5 rounded-2xl" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  {notifySubmitted ? (
                    <div className="flex items-center gap-3 text-center justify-center py-1">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-bold text-green-700 text-sm">You're on the list!</p>
                        <p className="text-xs text-gray-500">We'll email you when it's back in stock.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <Bell className="w-4 h-4 text-orange-500" />
                        <p className="font-bold text-gray-900 text-sm">Notify me when available</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Your email address"
                          value={notifyEmail}
                          onChange={e => setNotifyEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleNotifyMe()}
                          className="flex-1 px-3 py-2.5 rounded-xl text-sm border border-gray-200 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                        />
                        <button
                          onClick={handleNotifyMe}
                          disabled={!notifyEmail || notifySubmitting}
                          className="px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)' }}
                        >
                          {notifySubmitting ? "..." : "Notify"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* WhatsApp Order */}
              <button
                onClick={handleWhatsAppOrder}
                className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2.5 text-sm transition-all hover:-translate-y-0.5 mb-6"
                style={{ background: '#25D366', color: 'white', boxShadow: '0 4px 16px rgba(37,211,102,0.3)' }}
              >
                <MessageCircle className="w-4.5 h-4.5" style={{ width: '1.1rem', height: '1.1rem' }} />
                Order via WhatsApp
              </button>

              {/* Trust Guarantees */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Truck, label: "Nationwide Delivery", color: '#2563eb', bg: '#eff6ff' },
                  { icon: ShieldCheck, label: "Quality Guarantee", color: '#16a34a', bg: '#f0fdf4' },
                  { icon: RotateCcw, label: "Easy Returns", color: '#d97706', bg: '#fffbeb' },
                ].map(({ icon: Icon, label, color, bg }) => (
                  <div key={label}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
                    style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                    <span className="text-xs font-semibold text-gray-600 leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs: Details & Reviews */}
          <div className="mt-16">
            <div className="flex gap-1 border-b border-gray-200 mb-8">
              {[
                { id: "details", label: "Product Details" },
                { id: "reviews", label: "Customer Reviews" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as "details" | "reviews")}
                  className={cn(
                    "px-6 py-3 font-bold text-sm transition-all border-b-2 -mb-px",
                    activeTab === tab.id
                      ? "text-orange-600 border-orange-500"
                      : "text-gray-500 border-transparent hover:text-gray-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "details" ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div>
                    <h3 className="font-black text-gray-900 mb-4">Description</h3>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {product.description || "Premium quality product from TryNex Lifestyle. Crafted with care using the finest materials, designed to last and impress. Perfect for custom designs, corporate gifts, or personal style."}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 mb-4">Specifications</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Material", value: "230-320 GSM Premium Cotton" },
                        { label: "Print Method", value: "DTF / Screen Print / Sublimation" },
                        { label: "Available Sizes", value: product.sizes?.join(", ") || "S, M, L, XL, 2XL" },
                        { label: "Available Colors", value: product.colors?.join(", ") || "Multiple" },
                        { label: "Production Time", value: "24 hours", highlight: true },
                        { label: "Delivery", value: "24 hours nationwide", highlight: true },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-100">
                          <span className="font-bold text-sm text-gray-500 w-36 shrink-0">{label}</span>
                          {highlight ? (
                            <span className="text-sm font-bold text-green-600 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" /> {value}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-800 font-medium">{value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <ReviewsSection productId={product.id} rating={rating} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Frequently Bought Together */}
      {fbtProducts.length > 0 && (
        <section className="py-12 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-3"
                style={{ background: '#fff4ee', color: '#E85D04' }}>
                <Package2 className="w-3 h-3" /> Bundle &amp; Save
              </span>
              <h2 className="text-2xl font-black font-display tracking-tight text-gray-900">Frequently Bought Together</h2>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex flex-wrap gap-4 flex-1">
                {/* Current product */}
                <div className="relative flex flex-col items-center gap-2 w-28">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-orange-400 shadow-md">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                        <ShoppingCart className="w-8 h-8 text-orange-300" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-gray-700 text-center leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-xs font-black text-orange-600">{formatPrice(product.discountPrice || product.price)}</p>
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>

                {fbtProducts.map((fbtProduct: any, i: number) => (
                  <div key={fbtProduct.id} className="flex items-start gap-2">
                    <span className="text-gray-400 font-black text-xl mt-8 shrink-0">+</span>
                    <div className="flex flex-col items-center gap-2 w-28">
                      <Link href={`/product/${fbtProduct.id}`} className="w-28 h-28 rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:border-orange-300 transition-colors block">
                        {fbtProduct.imageUrl ? (
                          <img src={fbtProduct.imageUrl} alt={fbtProduct.name} className="w-full h-full object-cover" loading="lazy" onError={e => { e.currentTarget.style.display = "none"; }} />
                        ) : (
                          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                      </Link>
                      <p className="text-xs font-bold text-gray-700 text-center leading-tight line-clamp-2">{fbtProduct.name}</p>
                      <p className="text-xs font-black text-orange-600">{formatPrice(fbtProduct.discountPrice || fbtProduct.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:w-60 shrink-0 p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
                <p className="text-xs font-bold text-gray-500 mb-1">Bundle Total</p>
                <p className="text-2xl font-black text-orange-600 mb-1">
                  {formatPrice(
                    parseFloat(String(product.discountPrice || product.price)) +
                    fbtProducts.reduce((acc: number, p: any) => acc + parseFloat(String(p.discountPrice || p.price)), 0)
                  )}
                </p>
                <p className="text-xs text-gray-400 mb-4">for {1 + fbtProducts.length} items</p>
                <button
                  onClick={() => {
                    const mainPrice = parseFloat(String(product.discountPrice || product.price));
                    addToCart({
                      productId: product.id,
                      name: product.name,
                      price: mainPrice,
                      originalPrice: product.price,
                      quantity: 1,
                      imageUrl: product.imageUrl,
                    } as any);
                    fbtProducts.forEach((fbtP: any) => {
                      const fbtPrice = parseFloat(String(fbtP.discountPrice || fbtP.price));
                      addToCart({
                        productId: fbtP.id,
                        name: fbtP.name,
                        price: fbtPrice,
                        originalPrice: fbtP.price,
                        quantity: 1,
                        imageUrl: fbtP.imageUrl,
                      } as any);
                    });
                    toast({ title: "Bundle added to bag! 🎉", description: `${1 + fbtProducts.length} items ready for checkout` });
                  }}
                  className="w-full h-11 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                  style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)', boxShadow: '0 4px 16px rgba(232,93,4,0.3)' }}
                >
                  <ShoppingCart className="w-4 h-4" /> Add Bundle to Bag
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2">Items added separately to your cart</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="py-16 px-4 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-3"
                  style={{ background: '#fff4ee', color: '#E85D04' }}>
                  <Sparkles className="w-3 h-3" /> You may also like
                </span>
                <h2 className="text-2xl font-black font-display tracking-tight text-gray-900">Related Products</h2>
              </div>
              <Link href="/products" className="flex items-center gap-1.5 font-bold text-sm text-orange-600 hover:text-orange-700 transition-colors">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <RecentlyViewed />

      <Footer />

      <StickyAddToCart
        triggerRef={mainAddToCartRef}
        product={{
          id: product.id,
          name: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          imageUrl: product.imageUrl,
          stock: product.stock,
        }}
        quantity={quantity}
        onChangeQuantity={setQuantity}
        onAddToCart={handleAddToCart}
        added={addedToBag}
        imageOverride={displayImage}
      />

      {lightboxOpen && (() => {
        const rawImages = [product.imageUrl, ...(product.images || [])].filter(Boolean) as string[];
        const allImages = [...new Set(rawImages)];
        if (allImages.length === 0) return null;
        return (
          <MobileImageLightbox
            images={allImages}
            startIndex={Math.min(lightboxIndex, allImages.length - 1)}
            alt={product.name}
            onClose={() => setLightboxOpen(false)}
          />
        );
      })()}
    </div>
  );
}
