import { X, Star, ShoppingCart, ArrowRight, Check, Loader2, Heart, Minus, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import { type Product } from "@workspace/api-client-react";
import { formatPrice, cn, resolveImageUrl } from "@/lib/utils";
import { useCartActions } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

const COLOR_MAP: Record<string, string> = {
  'Black': '#1a1a1a', 'White': '#f0f0f0', 'Grey': '#6b7280', 'Gray': '#6b7280',
  'Navy': '#1e3a5f', 'Olive': '#4a5240', 'Charcoal': '#374151', 'Maroon': '#7f1d1d',
  'Red': '#dc2626', 'Blue': '#1d4ed8', 'Cream': '#fef3c7', 'Khaki': '#a18b52',
  'Burgundy': '#6b1a2a', 'Brown': '#7c4a2b', 'Yellow': '#eab308', 'Green': '#16a34a',
  'Orange': '#ea580c', 'Pink': '#ec4899', 'Purple': '#7c3aed', 'Teal': '#0d9488',
  'Sky Blue': '#0ea5e9', 'Lime': '#84cc16', 'Coral': '#f97316', 'Indigo': '#6366f1',
};

interface QuickViewModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, open, onClose }: QuickViewModalProps) {
  const [, navigate] = useLocation();
  const { addToCart } = useCartActions();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { toast } = useToast();
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedSize("");
      setSelectedColor("");
      setQuantity(1);
      setAdded(false);
    }
  }, [open, product?.id]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!product) return null;

  const price = parseFloat(String(product.price)) || 0;
  const discountPrice = product.discountPrice ? parseFloat(String(product.discountPrice)) : null;
  const discount = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : 0;
  const rating = product.rating ? parseFloat(String(product.rating)) : 4.9;
  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = () => {
    if (product.stock === 0 || adding) return;
    setAdding(true);
    setTimeout(() => {
      addToCart({
        productId: product.id,
        name: product.name,
        price: discountPrice || price,
        originalPrice: price,
        quantity,
        imageUrl: resolveImageUrl(product.imageUrl),
        size: selectedSize || undefined,
        color: selectedColor || undefined,
      } as any);
      toast({
        title: "✓ Added to bag",
        description: `${product.name} × ${quantity}`,
        action: (
          <ToastAction
            altText="Checkout"
            onClick={() => { onClose(); navigate("/checkout"); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white border-0"
            style={{ background: '#E85D04' }}
          >
            Checkout <ArrowRight className="w-3 h-3" />
          </ToastAction>
        ),
      });
      setAdding(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }, 250);
  };

  const node = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 99980 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 99981, pointerEvents: 'none' }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Quick view: ${product.name}`}
              className="relative w-full max-w-3xl rounded-3xl overflow-hidden bg-white shadow-2xl"
              style={{ maxHeight: '92vh', overflowY: 'auto', pointerEvents: 'all' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                aria-label="Close quick view"
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/95 border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-5/12 aspect-square relative bg-gray-50 shrink-0">
                  {resolveImageUrl(product.imageUrl) ? (
                    <img
                      src={resolveImageUrl(product.imageUrl)}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={e => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                  {discount > 0 && (
                    <div
                      className="absolute top-3 left-3 px-2.5 py-1 rounded-xl text-xs font-black text-white pointer-events-none"
                      style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)' }}
                    >
                      -{discount}% OFF
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                      <span className="bg-white text-gray-900 font-black px-5 py-2.5 rounded-2xl text-sm shadow-lg">Sold Out</span>
                    </div>
                  )}
                  {product.stock > 0 && product.stock <= 10 && (
                    <div
                      className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl text-[11px] font-black text-amber-700 pointer-events-none"
                      style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.35)' }}
                    >
                      Only {product.stock} left!
                    </div>
                  )}
                </div>

                <div className="flex-1 p-6 sm:p-8 flex flex-col min-h-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-orange-500">
                      {product.customizable ? "✨ Customizable" : "Ready Made"}
                    </span>
                    <button
                      onClick={() => toggleWishlist({ id: product.id, name: product.name, price, discountPrice: discountPrice ?? undefined, imageUrl: resolveImageUrl(product.imageUrl) })}
                      className="p-2 rounded-xl shrink-0 transition-all"
                      style={{ background: wishlisted ? '#fff1f0' : '#f9fafb', border: `1px solid ${wishlisted ? '#fecaca' : '#e5e7eb'}` }}
                      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart className="w-4 h-4" style={{ color: wishlisted ? '#E85D04' : '#9ca3af', fill: wishlisted ? '#E85D04' : 'none' }} />
                    </button>
                  </div>

                  <h2 className="text-xl font-black font-display text-gray-900 leading-tight mb-2 pr-8">
                    {product.name}
                  </h2>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5"
                          style={{ fill: j < Math.floor(rating) ? '#FB8500' : '#e5e7eb', color: j < Math.floor(rating) ? '#FB8500' : '#e5e7eb' }} />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-gray-500">{rating}</span>
                    <span className="text-xs text-gray-400">· Verified Quality</span>
                  </div>

                  <div className="flex items-baseline gap-3 mb-5 p-3 rounded-2xl" style={{ background: '#fff8f5', border: '1px solid #fde4d0' }}>
                    {discountPrice ? (
                      <>
                        <span className="text-2xl font-black text-orange-600">{formatPrice(discountPrice)}</span>
                        <span className="text-base line-through text-gray-400">{formatPrice(price)}</span>
                        <span className="px-2 py-0.5 rounded-lg text-xs font-black text-white" style={{ background: '#E85D04' }}>
                          Save {discount}%
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-black text-gray-900">{formatPrice(price)}</span>
                    )}
                  </div>

                  {product.sizes && product.sizes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-gray-700 mb-2">Size</p>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes.map((size: string) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size === selectedSize ? "" : size)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl font-bold text-sm transition-all",
                              selectedSize === size
                                ? "text-white shadow-md"
                                : "bg-white text-gray-700 border border-gray-200 hover:border-orange-400 hover:text-orange-600"
                            )}
                            style={selectedSize === size ? { background: 'linear-gradient(135deg, #E85D04, #FB8500)', border: '1px solid transparent' } : undefined}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.colors && product.colors.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-gray-700 mb-2">
                        {selectedColor
                          ? <>Color: <span className="text-orange-600">{selectedColor}</span></>
                          : "Choose Color"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {product.colors.slice(0, 10).map((color: string, i: number) => (
                          <button
                            key={i}
                            title={color}
                            onClick={() => setSelectedColor(color === selectedColor ? "" : color)}
                            className="relative w-8 h-8 rounded-xl transition-all hover:scale-110"
                            style={{
                              background: COLOR_MAP[color] || '#ccc',
                              border: selectedColor === color ? '2.5px solid #E85D04' : color === 'White' ? '1.5px solid #d1d5db' : '1.5px solid rgba(0,0,0,0.1)',
                              boxShadow: selectedColor === color ? '0 0 0 2px white, 0 0 0 4px #E85D04' : '0 1px 4px rgba(0,0,0,0.12)',
                            }}
                          >
                            {selectedColor === color && (
                              <Check className="absolute inset-0 m-auto w-3.5 h-3.5 text-white drop-shadow" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-5">
                    <p className="text-sm font-bold text-gray-700">Qty:</p>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-10 text-center font-black text-gray-900 text-sm select-none">{quantity}</span>
                      <button
                        onClick={() => setQuantity(q => product.stock > 0 ? Math.min(q + 1, product.stock) : q)}
                        className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    {product.stock > 0 && (
                      <span className="text-xs text-gray-400 font-medium">{product.stock} in stock</span>
                    )}
                  </div>

                  <div className="flex gap-3 mt-auto">
                    <button
                      onClick={handleAddToCart}
                      disabled={product.stock === 0 || adding}
                      className="flex-1 h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                      style={{
                        background: added ? '#16a34a' : product.stock === 0 ? '#e5e7eb' : 'linear-gradient(135deg, #E85D04, #FB8500)',
                        boxShadow: product.stock > 0 && !added ? '0 4px 16px rgba(232,93,4,0.3)' : 'none',
                        color: product.stock === 0 ? '#9ca3af' : 'white',
                        transition: 'background 0.25s ease',
                      }}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        {adding ? (
                          <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Adding…
                          </motion.span>
                        ) : added ? (
                          <motion.span key="added" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <Check className="w-4 h-4" /> Added!
                          </motion.span>
                        ) : (
                          <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            {product.stock === 0 ? "Sold Out" : "Add to Bag"}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>

                    <Link
                      href={`/product/${product.id}`}
                      onClick={onClose}
                      className="h-12 px-4 rounded-xl font-bold text-gray-700 border border-gray-200 flex items-center gap-1.5 hover:border-orange-400 hover:text-orange-600 transition-all whitespace-nowrap text-sm"
                    >
                      Details <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}
