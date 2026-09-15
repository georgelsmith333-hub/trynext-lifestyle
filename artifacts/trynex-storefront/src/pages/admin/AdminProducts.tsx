import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListProducts, useCreateProduct, useDeleteProduct, useUpdateProduct, useListCategories,
  getListProductsQueryKey, type Category, type Product,
} from "@workspace/api-client-react";
import { Loader } from "@/components/ui/Loader";
import { getAuthHeaders, formatPrice, getApiUrl } from "@/lib/utils";
import {
  AlertTriangle, ArrowUpDown, Check, CheckCircle, CloudUpload,
  Edit3, FileText, ImageIcon, Link as LinkIcon, Loader2, Package, Plus, Search, SlidersHorizontal,
  Trash2, ToggleLeft, ToggleRight, Upload, Wand2, X, Zap,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useSearch } from "wouter";

const productSchema = z.object({
  name: z.string().min(2, "Name needs at least 2 characters"),
  slug: z.string().min(2, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  discountPrice: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().optional()),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  categoryId: z.coerce.number().optional(),
  imageUrl: z.string().optional(),
  galleryUrls: z.string().optional(),
  sizes: z.string().optional(),
  colors: z.string().optional(),
  featured: z.boolean().optional(),
  customizable: z.boolean().optional(),
}).refine((value) => !value.discountPrice || value.discountPrice <= value.price, {
  message: "Discount price must not exceed the regular price",
  path: ["discountPrice"],
});

type ProductForm = z.infer<typeof productSchema>;
type Variant = {
  id: string;
  name: string;
  price: number;
  customizationFee?: number;
  stock: number;
  sizes?: string[];
  colors?: string[];
  inStockColors?: string[];
  mockupKey?: string;
  oneSize?: boolean;
  active?: boolean;
};
type EditingProduct = { id: number } & ProductForm;
type ColorVariant = { name: string; inStock: boolean };

const inputClass = "w-full rounded-xl border border-[#dfe5dd] bg-white px-3.5 py-2.5 text-sm font-medium text-[#172019] placeholder:text-[#9aa39a] transition focus:border-[#e85d04] focus:outline-none focus:ring-4 focus:ring-[#e85d04]/10";
const labelClass = "mb-1.5 block text-[10px] font-black uppercase tracking-[.13em] text-[#788277]";

function readError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) return String((error as { message?: unknown }).message);
  return fallback;
}

function parseList(value: string | undefined) {
  return value?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
}

export default function AdminProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchString = useSearch();
  const filterLowStock = new URLSearchParams(searchString).get("filter") === "lowstock";
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "price">("name");
  const [sortAscending, setSortAscending] = useState(true);
  const [showLowStock, setShowLowStock] = useState(filterLowStock);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [isSpecialOffer, setIsSpecialOffer] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [duplicateSlug, setDuplicateSlug] = useState(false);
  const [imgPickerMode, setImgPickerMode] = useState<"url" | "upload">("url");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const { data, isLoading, isError, refetch } = useListProducts(
    { limit: 200 },
    { query: { queryKey: ["/api/products", { limit: 200 }], staleTime: 0, refetchOnMount: "always" } }
  );
  const { data: categoriesData } = useListCategories({ query: { queryKey: ["/api/categories"], staleTime: 0, refetchOnMount: "always" } });
  const reqOpts = { request: { headers: getAuthHeaders() } };
  const { mutateAsync: createProduct, isPending: isCreating } = useCreateProduct(reqOpts);
  const { mutateAsync: updateProduct, isPending: isUpdating } = useUpdateProduct(reqOpts);
  const { mutateAsync: deleteProduct } = useDeleteProduct(reqOpts);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { featured: false, customizable: true, stock: 0 },
  });

  const products = data?.products ?? [];
  const categories: Category[] = categoriesData?.categories ?? [];
  const watchedName = watch("name") ?? "";
  const watchedSlug = watch("slug") ?? "";
  const watchedColors = watch("colors") ?? "";
  const watchedImage = watch("imageUrl") ?? "";
  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (editingProduct) return;
    const slug = watchedName.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "");
    if (slug) setValue("slug", slug, { shouldValidate: false });
  }, [watchedName, editingProduct, setValue]);

  useEffect(() => {
    const names = parseList(watchedColors);
    setColorVariants((previous) => {
      const previousMap = new Map(previous.map((variant) => [variant.name, variant.inStock]));
      return names.map((name) => ({ name, inStock: previousMap.get(name) ?? true }));
    });
  }, [watchedColors]);

  useEffect(() => {
    setDuplicateSlug(Boolean(watchedSlug && products.some((product) => product.slug === watchedSlug && product.id !== editingProduct?.id)));
  }, [watchedSlug, products, editingProduct]);

  const openAddModal = () => {
    setEditingProduct(null);
    setIsSpecialOffer(false);
    setImagePreviewUrl(null);
    setImgPickerMode("url");
    setColorVariants([]);
    setVariants([]);
    setDuplicateSlug(false);
    reset({ featured: false, customizable: true, stock: 0, categoryId: categories[0]?.id, name: "", slug: "", description: "", price: 0, discountPrice: undefined, imageUrl: "", galleryUrls: "", sizes: "", colors: "" });
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    const record = product as Product & { colorVariants?: ColorVariant[]; variants?: Variant[]; images?: string[] };
    setEditingProduct({ id: product.id } as EditingProduct);
    const tags = Array.isArray(product.tags) ? product.tags as string[] : [];
    setIsSpecialOffer(tags.includes("special-offer"));
    setImagePreviewUrl(product.imageUrl || null);
    setImgPickerMode("url");
    setColorVariants(record.colorVariants?.length ? record.colorVariants : (product.colors ?? []).map((name) => ({ name, inStock: true })));
    setVariants(Array.isArray(record.variants) ? record.variants : []);
    reset({
      name: product.name, slug: product.slug, description: product.description || "",
      price: Number(product.price), discountPrice: product.discountPrice ? Number(product.discountPrice) : undefined,
      stock: product.stock, categoryId: product.categoryId || undefined, imageUrl: product.imageUrl || "",
      galleryUrls: (record.images ?? []).join("\n"), sizes: (product.sizes || []).join(", "), colors: (product.colors || []).join(", "),
      featured: product.featured ?? false, customizable: product.customizable ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingProduct(null); };

  const handleImageFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid image", description: "Choose a JPG, PNG, WebP or GIF file.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Image is too large", description: "Maximum file size is 20 MB.", variant: "destructive" });
      return;
    }
    setIsUploadingImage(true);
    try {
      const request = await fetch(getApiUrl("/api/storage/uploads/request-url"), {
        method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!request.ok) throw new Error((await request.json().catch(() => ({})) as { message?: string }).message || "Could not prepare upload");
      const { uploadURL, objectPath } = await request.json() as { uploadURL: string; objectPath: string };
      const upload = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!upload.ok) throw new Error("Storage upload failed");
      const url = getApiUrl(`/api/storage/public-objects${objectPath}`);
      setValue("imageUrl", url, { shouldDirty: true });
      setImagePreviewUrl(url);
      toast({ title: "Image uploaded", description: "The product image is ready to save." });
    } catch (error) {
      toast({ title: "Upload failed", description: readError(error, "Please try again."), variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void handleImageFileUpload(file);
  };

  const onSubmit = async (formData: ProductForm) => {
    if (duplicateSlug) {
      toast({ title: "Slug already in use", description: "Choose a unique URL slug before saving.", variant: "destructive" });
      return;
    }
    let gallery: string[] = [];
    if (formData.galleryUrls?.trim()) {
      gallery = formData.galleryUrls.split(/\n|,/).map((url) => url.trim()).filter(Boolean);
    }
    const currentProduct = editingProduct ? products.find((product) => product.id === editingProduct.id) : undefined;
    const currentTags = currentProduct && Array.isArray(currentProduct.tags) ? currentProduct.tags as string[] : [];
    const tags = isSpecialOffer ? [...currentTags.filter((tag) => tag !== "special-offer"), "special-offer"] : currentTags.filter((tag) => tag !== "special-offer");
    const payload = {
      name: formData.name, slug: formData.slug, description: formData.description || undefined,
       price: Number(formData.price), discountPrice: formData.discountPrice === undefined ? (editingProduct ? null : undefined) : Number(formData.discountPrice),
      stock: Number(formData.stock), categoryId: formData.categoryId || undefined, imageUrl: formData.imageUrl || undefined,
      images: gallery, sizes: parseList(formData.sizes), colors: parseList(formData.colors), colorVariants, variants,
      featured: formData.featured ?? false, customizable: formData.customizable ?? true, tags,
    };
    try {
      if (editingProduct) await updateProduct({ id: editingProduct.id, data: payload as never });
      else await createProduct({ data: payload as never });
      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({ title: editingProduct ? "Product updated" : "Product added", description: `${formData.name} is now in the catalogue.` });
      closeModal();
      reset();
    } catch (error) {
      toast({ title: `Could not ${editingProduct ? "update" : "add"} product`, description: readError(error, "Check the fields and try again. Your changes are still here."), variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteProduct({ id });
      await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      toast({ title: "Product deleted" });
    } catch (error) {
      toast({ title: "Delete failed", description: readError(error, "The product was not removed."), variant: "destructive" });
    }
  };

  const lowStockCount = products.filter((product) => product.stock <= 5).length;
  const inventoryValue = products.reduce((total, product) => total + Number(product.price) * product.stock, 0);
  const filteredProducts = useMemo(() => products
    .filter((product) => !showLowStock || product.stock <= 5)
    .filter((product) => categoryFilter === "all" || String(product.categoryId) === categoryFilter)
    .filter((product) => !search || `${product.name} ${product.slug}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const first = sortBy === "name" ? a.name.localeCompare(b.name) : sortBy === "stock" ? a.stock - b.stock : Number(a.price) - Number(b.price);
      return sortAscending ? first : -first;
    }), [products, showLowStock, categoryFilter, search, sortBy, sortAscending]);

  const handleAiDescription = async () => {
    if (!watchedName.trim()) {
      toast({ title: "Enter a product name first", variant: "destructive" });
      return;
    }
    setIsAiGenerating(true);
    try {
      const response = await fetch(getApiUrl("/api/ai/chat"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai-large",
          messages: [{ role: "user", content: `Write a concise 2-3 sentence product description for Bangladesh store Trynext Lifestyle. Product: "${watchedName}". English only. Output only the description.` }],
          system: "You write product descriptions. Output only text, no labels or markdown.",
        }),
      });
      if (!response.ok) throw new Error("AI service unavailable");
      const result = await response.json() as { content?: string; error?: string };
      if (result.error || !result.content?.trim()) throw new Error(result.error || "Empty response");
      setValue("description", result.content.trim().replace(/^["']|["']$/g, ""), { shouldDirty: true });
      toast({ title: "Description drafted" });
    } catch (error) {
      toast({ title: "AI draft failed", description: readError(error, "Write the description manually."), variant: "destructive" });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const parseCsvRows = (text: string): string[][] => {
    const rows: string[][] = []; let current = ""; let inQuotes = false; let fields: string[] = [];
    const raw = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (let i = 0; i < raw.length; i += 1) {
      const char = raw[i];
      if (inQuotes) {
        if (char === '"' && raw[i + 1] === '"') { current += '"'; i += 1; }
        else if (char === '"') inQuotes = false;
        else current += char;
      } else if (char === '"') inQuotes = true;
      else if (char === ",") { fields.push(current.trim()); current = ""; }
      else if (char === "\n") { fields.push(current.trim()); if (fields.some(Boolean)) rows.push(fields); fields = []; current = ""; }
      else current += char;
    }
    fields.push(current.trim()); if (fields.some(Boolean)) rows.push(fields);
    return rows;
  };

  const parseCsvToBulk = (text: string) => {
    const rows = parseCsvRows(text); if (rows.length < 2) return [];
    const headers = rows[0].map((header) => header.toLowerCase());
    return rows.slice(1).map((row) => {
      const item: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = row[index] || "";
        if (header === "name") item.name = value;
        else if (header === "slug") item.slug = value || String(item.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        else if (header === "price") item.price = parseFloat(value) || 0;
        else if (header === "discountprice" || header === "discount_price") item.discountPrice = parseFloat(value) || undefined;
        else if (header === "stock") item.stock = parseInt(value, 10) || 0;
        else if (header === "description") item.description = value;
        else if (header === "imageurl" || header === "image_url" || header === "image") item.imageUrl = value;
        else if (header === "sizes" || header === "colors") item[header] = value.split(/[;|]/).map((entry) => entry.trim()).filter(Boolean);
        else if (header === "featured" || header === "customizable") item[header] = value === "true" || value === "1";
        else if (header === "categoryid" || header === "category_id") item.categoryId = parseInt(value, 10) || undefined;
      });
      return item;
    }).filter((item) => item.name && item.price);
  };

  const handleBulkFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => { setBulkText(String(loadEvent.target?.result || "")); setBulkResult(null); };
    reader.readAsText(file); event.target.value = "";
  };

  const handleBulkUpload = async () => {
    const bulkProducts = parseCsvToBulk(bulkText);
    if (!bulkProducts.length) {
      toast({ title: "No valid products found", description: "Use the required CSV headers shown below.", variant: "destructive" });
      return;
    }
    setBulkUploading(true); setBulkResult(null);
    try {
      const response = await fetch(getApiUrl("/api/products/bulk"), {
        method: "POST", headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ products: bulkProducts }),
      });
      const result = await response.json() as { success: number; failed: number; errors: string[] };
      if (!response.ok) throw new Error((result as unknown as { message?: string }).message || "Bulk upload failed");
      setBulkResult(result);
      if (result.success > 0) {
        await queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast({ title: `${result.success} products added`, description: result.failed ? `${result.failed} rows need attention.` : "Catalogue refreshed." });
      }
    } catch (error) {
      toast({ title: "Bulk upload failed", description: readError(error, "Check the file and try again."), variant: "destructive" });
    } finally { setBulkUploading(false); }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && isModalOpen) closeModal(); };
    document.addEventListener("keydown", onKeyDown); return () => document.removeEventListener("keydown", onKeyDown);
  }, [isModalOpen]);

  return (
    <AdminLayout>
      <div className="animate-page-enter space-y-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="admin-kicker">Catalogue control</p>
            <h1 className="mt-1 font-display text-4xl font-black tracking-[-.055em] text-[#172019] sm:text-5xl">Products</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6f7d70]">Manage what is sellable, what is running low, and what gets made to order.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-testid="button-open-bulk-upload" onClick={() => { setBulkModalOpen(true); setBulkText(""); setBulkResult(null); }} className="flex items-center gap-2 rounded-xl border border-[#e85d04]/25 bg-[#fff7f0] px-4 py-2.5 text-sm font-bold text-[#c94e00] hover:bg-[#ffede0]">
              <Upload className="h-4 w-4" /> Bulk CSV
            </button>
            <button type="button" data-testid="button-add-product" onClick={openAddModal} className="flex items-center gap-2 rounded-xl bg-[#e85d04] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(232,93,4,.2)] hover:bg-[#d95300]">
              <Plus className="h-4 w-4" /> Add product
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="admin-panel p-4" data-testid="card-inventory-total"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#788277]">Catalogue</span><Package className="h-4 w-4 text-[#e85d04]" /></div><p className="mt-3 font-display text-3xl font-black">{products.length}</p><p className="mt-1 text-xs text-[#8b948a]">active products loaded</p></div>
          <div className="admin-panel p-4" data-testid="card-inventory-stock"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#788277]">Units on hand</span><SlidersHorizontal className="h-4 w-4 text-[#3d8c65]" /></div><p className="mt-3 font-display text-3xl font-black">{products.reduce((sum, product) => sum + product.stock, 0).toLocaleString()}</p><p className="mt-1 text-xs text-[#8b948a]">across every listing</p></div>
          <div className="admin-panel border-[#f2c98d] bg-[#fffaf0] p-4" data-testid="card-inventory-low-stock"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#9a6815]">Needs attention</span><AlertTriangle className="h-4 w-4 text-[#d89017]" /></div><p className="mt-3 font-display text-3xl font-black text-[#9a6815]">{lowStockCount}</p><p className="mt-1 text-xs text-[#aa7d35]">at or below 5 units</p></div>
          <div className="admin-panel p-4" data-testid="card-inventory-value"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#788277]">Stock value</span><CheckCircle className="h-4 w-4 text-[#3d8c65]" /></div><p className="mt-3 font-display text-2xl font-black">{formatPrice(inventoryValue)}</p><p className="mt-1 text-xs text-[#8b948a]">retail value at current price</p></div>
        </div>

        <section className="admin-panel overflow-hidden" aria-label="Product inventory">
          <div className="flex flex-col gap-3 border-b border-[#e8ede6] p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b948a]" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-product-search" aria-label="Search products" placeholder="Search name or slug…" className={`${inputClass} pl-10`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} data-testid="select-product-category" aria-label="Filter by category" className={`${inputClass} w-auto min-w-[145px] py-2.5`}>
                <option value="all">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <button type="button" data-testid="button-filter-low-stock" aria-pressed={showLowStock} onClick={() => setShowLowStock((value) => !value)} className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold ${showLowStock ? "border-[#d89017] bg-[#fff4d7] text-[#9a6815]" : "border-[#dfe5dd] bg-white text-[#687468] hover:border-[#d89017]"}`}><AlertTriangle className="h-3.5 w-3.5" /> Low stock {lowStockCount}</button>
              <button type="button" data-testid="button-sort-products" aria-label={`Sort by ${sortBy}`} onClick={() => setSortAscending((value) => !value)} className="flex items-center gap-2 rounded-xl border border-[#dfe5dd] bg-white px-3.5 py-2.5 text-xs font-bold text-[#687468] hover:border-[#e85d04]"><ArrowUpDown className="h-3.5 w-3.5" /> Sort</button>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "stock" | "price")} data-testid="select-product-sort" aria-label="Sort products by" className={`${inputClass} w-auto py-2.5`}><option value="name">Name</option><option value="stock">Stock</option><option value="price">Price</option></select>
            </div>
          </div>
          <div className="flex items-center justify-between bg-[#fafcf9] px-4 py-3 text-xs text-[#788277]"><span><strong className="text-[#172019]">{filteredProducts.length}</strong> visible products</span><button type="button" data-testid="button-refresh-products" onClick={() => void refetch()} className="font-bold text-[#c94e00] hover:underline">Refresh list</button></div>
          {isLoading ? <div className="space-y-3 p-5"><div className="skeleton h-14 w-full" /><div className="skeleton h-14 w-full" /><div className="skeleton h-14 w-full" /></div> : isError ? <div className="p-12 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-[#d89017]" /><h2 className="mt-3 font-display text-xl font-black">Catalogue unavailable</h2><p className="mt-1 text-sm text-[#788277]">The list could not be loaded. Your saved products are safe.</p><button type="button" data-testid="button-retry-products" onClick={() => void refetch()} className="mt-5 rounded-xl bg-[#172019] px-4 py-2.5 text-sm font-bold text-white">Try again</button></div> : filteredProducts.length === 0 ? <div className="p-14 text-center"><Package className="mx-auto h-10 w-10 text-[#b3bdb2]" /><h2 className="mt-3 font-display text-xl font-black">{search || showLowStock || categoryFilter !== "all" ? "No products match these filters" : "Your catalogue is empty"}</h2><p className="mt-1 text-sm text-[#788277]">{search || showLowStock || categoryFilter !== "all" ? "Adjust the filters to see more listings." : "Add a product or import your catalogue to get started."}</p>{!search && !showLowStock && categoryFilter === "all" && <button type="button" data-testid="button-empty-add-product" onClick={openAddModal} className="mt-5 rounded-xl bg-[#e85d04] px-4 py-2.5 text-sm font-bold text-white">Add first product</button>}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-[#e8ede6] text-left"><th className="px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-[#8b948a]">Product</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-[#8b948a]">Category</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-[#8b948a]">Price</th><th className="px-5 py-3 text-[10px] font-black uppercase tracking-[.13em] text-[#8b948a]">Stock</th><th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-[.13em] text-[#8b948a]">Actions</th></tr></thead>
                <tbody className="divide-y divide-[#edf1eb]">{filteredProducts.map((product) => {
                  const low = product.stock <= 5;
                  return <tr key={product.id} data-testid={`row-product-${product.id}`} className="group hover:bg-[#fafcf9]">
                    <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e4eae2] bg-[#f4f7f2]">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-[#a9b4a8]" />}</div><div className="min-w-0"><p className="max-w-[250px] truncate font-bold text-[#172019]" data-testid={`text-product-name-${product.id}`}>{product.name}</p><p className="truncate font-mono text-[10px] text-[#8b948a]">{product.slug}</p></div></div></td>
                    <td className="px-5 py-3.5"><span className="rounded-lg bg-[#f0f4ee] px-2 py-1 text-xs font-bold text-[#617061]">{categories.find((category) => category.id === product.categoryId)?.name || "Uncategorized"}</span></td>
                     <td className="px-5 py-3.5">{product.discountPrice ? <><p className="font-bold text-[#c94e00]">{formatPrice(Number(product.discountPrice))}</p><p className="text-[10px] text-[#98a198] line-through">{formatPrice(Number(product.price))}</p></> : <p className="font-bold text-[#c94e00]">{formatPrice(Number(product.price))}</p>}</td>
                    <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold ${low ? "bg-[#fff1e1] text-[#bb5c09]" : "bg-[#edf8f0] text-[#278052]"}`}>{low && <AlertTriangle className="h-3 w-3" />}{product.stock} units</span></td>
                    <td className="px-5 py-3.5"><div className="flex justify-end gap-1"><button type="button" data-testid={`button-edit-product-${product.id}`} aria-label={`Edit ${product.name}`} onClick={() => openEditModal(product)} className="rounded-lg p-2 text-[#859085] hover:bg-[#fff0e5] hover:text-[#c94e00]"><Edit3 className="h-4 w-4" /></button><button type="button" data-testid={`button-delete-product-${product.id}`} aria-label={`Delete ${product.name}`} onClick={() => setDeleteConfirm({ id: product.id, name: product.name })} className="rounded-lg p-2 text-[#859085] hover:bg-[#fff0f0] hover:text-[#c43b3b]"><Trash2 className="h-4 w-4" /></button></div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {isModalOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111811]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
        <div className="flex max-h-[96dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-[#f9fbf8] shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
          <div className="flex items-start justify-between border-b border-[#e1e8df] bg-white px-5 py-4 sm:px-7"><div><p className="admin-kicker">{editingProduct ? "Edit listing" : "New listing"}</p><h2 id="product-editor-title" className="mt-1 font-display text-2xl font-black tracking-[-.04em]">{editingProduct ? "Update product" : "Add product"}</h2><p className="mt-1 text-xs text-[#788277]">{editingProduct ? `Product ID #${editingProduct.id}` : "Fill in the sellable details for your catalogue."}</p></div><button type="button" data-testid="button-close-product-editor" aria-label="Close product editor" onClick={closeModal} className="rounded-xl p-2 text-[#788277] hover:bg-[#f0f4ee]"><X className="h-5 w-5" /></button></div>
          <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto p-5 sm:p-7">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#e1e8df] bg-white p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fff0e5] text-[#e85d04]"><Package className="h-4 w-4" /></span><div><h3 className="text-sm font-black">Core listing</h3><p className="text-[11px] text-[#8b948a]">The details customers see first.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className={labelClass}>Product name *</label><input {...register("name")} data-testid="input-product-name" className={inputClass} placeholder="Premium oversized hoodie" />{errors.name && <p className="mt-1 text-xs font-bold text-red-500">{errors.name.message}</p>}</div><div><label className={labelClass}>URL slug *</label><input {...register("slug")} data-testid="input-product-slug" className={`${inputClass} ${duplicateSlug ? "border-red-400" : ""}`} placeholder="premium-hoodie" />{duplicateSlug && <p className="mt-1 text-xs font-bold text-red-500">This slug is already used.</p>}{errors.slug && <p className="mt-1 text-xs font-bold text-red-500">{errors.slug.message}</p>}</div><div><label className={labelClass}>Category</label><select {...register("categoryId")} data-testid="select-product-editor-category" className={inputClass}><option value="">Uncategorized</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div><label className={labelClass}>Price (৳) *</label><input type="number" min="0" {...register("price")} data-testid="input-product-price" className={inputClass} placeholder="1200" />{errors.price && <p className="mt-1 text-xs font-bold text-red-500">{errors.price.message}</p>}</div><div><label className={labelClass}>Sale price (৳)</label><input type="number" min="0" {...register("discountPrice")} data-testid="input-product-discount-price" className={inputClass} placeholder="Optional" />{errors.discountPrice && <p className="mt-1 text-xs font-bold text-red-500">{errors.discountPrice.message}</p>}</div><div><label className={labelClass}>Stock quantity *</label><input type="number" min="0" {...register("stock")} data-testid="input-product-stock" className={inputClass} placeholder="50" /></div><div><label className={labelClass}>Sizes</label><input {...register("sizes")} data-testid="input-product-sizes" className={inputClass} placeholder="S, M, L, XL" /></div><div className="sm:col-span-2"><label className={labelClass}>Description</label><div className="relative"><textarea {...register("description")} data-testid="input-product-description" rows={5} className={`${inputClass} resize-y`} placeholder="Describe the material, fit and why it belongs in a customer’s cart." /><button type="button" data-testid="button-ai-product-description" onClick={() => void handleAiDescription()} disabled={isAiGenerating} className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-[#f2c6a5] bg-[#fff7f0] px-2.5 py-1.5 text-[11px] font-bold text-[#c94e00] disabled:opacity-50">{isAiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}{isAiGenerating ? "Writing…" : "AI draft"}</button></div></div></div></div>
                <div className="rounded-2xl border border-[#e1e8df] bg-white p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf5ff] text-[#3972a8]"><ImageIcon className="h-4 w-4" /></span><div><h3 className="text-sm font-black">Product media</h3><p className="text-[11px] text-[#8b948a]">One primary image plus optional gallery URLs.</p></div></div><div className="mb-2 flex w-fit gap-1 rounded-lg bg-[#f0f4ee] p-1"><button type="button" data-testid="button-image-url-mode" onClick={() => setImgPickerMode("url")} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold ${imgPickerMode === "url" ? "bg-white text-[#c94e00] shadow-sm" : "text-[#788277]"}`}><LinkIcon className="h-3 w-3" /> URL</button><button type="button" data-testid="button-image-upload-mode" onClick={() => setImgPickerMode("upload")} className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold ${imgPickerMode === "upload" ? "bg-white text-[#c94e00] shadow-sm" : "text-[#788277]"}`}><CloudUpload className="h-3 w-3" /> Upload</button></div>{imgPickerMode === "url" ? <input {...register("imageUrl")} data-testid="input-product-image-url" className={inputClass} placeholder="https://…" onChange={(event) => { setValue("imageUrl", event.target.value, { shouldDirty: true }); setImagePreviewUrl(event.target.value || null); }} /> : <><input ref={imageFileInputRef} type="file" accept="image/*" className="hidden" data-testid="input-product-image-file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImageFileUpload(file); }} /><button type="button" data-testid="button-upload-product-image" onClick={() => imageFileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={handleFileDrop} disabled={isUploadingImage} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#f2c6a5] bg-[#fff9f4] py-7 text-[#c94e00] disabled:opacity-50">{isUploadingImage ? <Loader2 className="h-6 w-6 animate-spin" /> : <CloudUpload className="h-6 w-6" />}<span className="text-xs font-bold">{isUploadingImage ? "Uploading to storage…" : "Choose or drop primary image"}</span><span className="text-[10px] text-[#c98b68]">JPG, PNG, WebP or GIF · max 20 MB</span></button></>}{(imagePreviewUrl || watchedImage) && <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#e8ede6] bg-[#fafcf9] p-2"><img src={imagePreviewUrl || watchedImage} alt="Product preview" className="h-14 w-14 rounded-lg object-cover" /><p className="min-w-0 flex-1 truncate text-[10px] text-[#788277]">{imagePreviewUrl || watchedImage}</p><button type="button" data-testid="button-remove-product-image" aria-label="Remove product image" onClick={() => { setValue("imageUrl", "", { shouldDirty: true }); setImagePreviewUrl(null); }} className="rounded-lg p-1 text-[#8b948a] hover:text-red-500"><X className="h-4 w-4" /></button></div>}<label className={`${labelClass} mt-4`}>Gallery image URLs</label><textarea {...register("galleryUrls")} data-testid="input-product-gallery-urls" rows={3} className={`${inputClass} resize-y`} placeholder={"One URL per line\nhttps://…"} /><p className="mt-1 text-[11px] text-[#8b948a]">The first image remains the primary thumbnail.</p></div>
              </div>
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#e1e8df] bg-white p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef8f1] text-[#3d8c65]"><SlidersHorizontal className="h-4 w-4" /></span><div><h3 className="text-sm font-black">Options & availability</h3><p className="text-[11px] text-[#8b948a]">Fine-tune how this listing is sold.</p></div></div><label className={labelClass}>Colors</label><input {...register("colors")} data-testid="input-product-colors" className={inputClass} placeholder="Black, White, Grey" />{colorVariants.length > 0 && <div className="mt-3 space-y-1.5 rounded-xl bg-[#fafcf9] p-3"><p className="mb-2 text-[10px] font-black uppercase tracking-[.13em] text-[#8b948a]">Color availability</p>{colorVariants.map((variant) => <div key={variant.name} className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-[#536153]">{variant.name}</span><button type="button" data-testid={`button-toggle-color-${variant.name.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => setColorVariants((current) => current.map((item) => item.name === variant.name ? { ...item, inStock: !item.inStock } : item))} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${variant.inStock ? "bg-[#e8f7ed] text-[#278052]" : "bg-[#fff0f0] text-[#c43b3b]"}`}>{variant.inStock ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}{variant.inStock ? "In stock" : "Out of stock"}</button></div>)}</div>}<div className="mt-5 space-y-3 border-t border-[#edf1eb] pt-4"><label className="flex items-center gap-3 text-sm font-bold text-[#536153]"><input type="checkbox" {...register("featured")} data-testid="checkbox-product-featured" className="h-4 w-4 accent-[#e85d04]" /> Featured product</label><label className="flex items-center gap-3 text-sm font-bold text-[#536153]"><input type="checkbox" checked={isSpecialOffer} onChange={(event) => setIsSpecialOffer(event.target.checked)} data-testid="checkbox-product-special-offer" className="h-4 w-4 accent-[#e85d04]" /><Zap className="h-3.5 w-3.5 text-[#e85d04]" /> Special offer</label><label className="flex items-center gap-3 text-sm font-bold text-[#536153]"><input type="checkbox" {...register("customizable")} data-testid="checkbox-product-customizable" className="h-4 w-4 accent-[#e85d04]" /> Allow customization</label></div></div>
                <div className="rounded-2xl border border-[#e1e8df] bg-white p-4 sm:p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-black">Structured variants</h3><p className="mt-1 text-[11px] text-[#8b948a]">Optional variant-level price and stock.</p></div><button type="button" data-testid="button-add-product-variant" onClick={() => setVariants((current) => [...current, { id: `variant-${Date.now()}`, name: "", price: Number(watch("price") || 0), stock: 0, active: true }])} className="flex items-center gap-1 rounded-lg bg-[#172019] px-2.5 py-1.5 text-[10px] font-bold text-white"><Plus className="h-3 w-3" /> Add</button></div>{variants.length === 0 ? <p className="rounded-xl border border-dashed border-[#dfe5dd] p-4 text-center text-xs text-[#8b948a]">No variants. The base product options will be used.</p> : <div className="space-y-3">{variants.map((variant, index) => <div key={variant.id} className="rounded-xl border border-[#e8ede6] bg-[#fafcf9] p-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[.13em] text-[#8b948a]">Variant {index + 1}</span><button type="button" data-testid={`button-remove-product-variant-${index}`} aria-label={`Remove variant ${index + 1}`} onClick={() => setVariants((current) => current.filter((item) => item.id !== variant.id))} className="text-[#9aa39a] hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div><div className="grid grid-cols-2 gap-2"><input value={variant.name} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, name: event.target.value } : item))} data-testid={`input-product-variant-name-${index}`} className={inputClass} placeholder="Name" /><input type="number" min="0" value={variant.price} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, price: Number(event.target.value) } : item))} data-testid={`input-product-variant-price-${index}`} className={inputClass} placeholder="Price" /><input type="number" min="0" value={variant.stock} onChange={(event) => setVariants((current) => current.map((item) => item.id === variant.id ? { ...item, stock: Number(event.target.value) } : item))} data-testid={`input-product-variant-stock-${index}`} className={`${inputClass} col-span-2`} placeholder="Stock" /></div></div>)}</div>}</div>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[#e1e8df] pt-4 sm:flex-row sm:justify-end"><button type="button" data-testid="button-cancel-product-editor" onClick={closeModal} className="rounded-xl border border-[#dfe5dd] bg-white px-5 py-3 text-sm font-bold text-[#687468]">Cancel</button><button type="submit" data-testid="button-save-product" disabled={isSaving || duplicateSlug} className="flex items-center justify-center gap-2 rounded-xl bg-[#e85d04] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(232,93,4,.2)] disabled:opacity-50">{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingProduct ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{isSaving ? "Saving…" : editingProduct ? "Save changes" : "Add product"}</button></div>
          </form>
        </div>
      </div>}

      {bulkModalOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#111811]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="w-full max-w-2xl rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between border-b border-[#e8ede6] px-5 py-4 sm:px-7"><div><p className="admin-kicker">Import catalogue</p><h2 className="mt-1 font-display text-2xl font-black">Bulk CSV upload</h2></div><button type="button" data-testid="button-close-bulk-upload" aria-label="Close bulk upload" onClick={() => setBulkModalOpen(false)} className="rounded-xl p-2 text-[#788277] hover:bg-[#f0f4ee]"><X className="h-5 w-5" /></button></div><div className="space-y-4 p-5 sm:p-7"><div className="rounded-xl border border-[#f2d2b8] bg-[#fff8f2] p-3"><p className="text-xs font-bold text-[#a94c0a]">Required columns</p><code className="mt-1 block overflow-x-auto text-[10px] text-[#c16b32]">name,slug,price,stock,description,sizes,colors,imageUrl,featured,customizable</code><p className="mt-1 text-[10px] text-[#b27a55]">Separate sizes and colors with semicolons.</p></div><input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleBulkFileSelect} className="hidden" data-testid="input-bulk-csv-file" /><button type="button" data-testid="button-choose-bulk-csv" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-[#dfe5dd] px-4 py-2.5 text-sm font-bold text-[#536153] hover:bg-[#fafcf9]"><FileText className="h-4 w-4" /> Choose CSV file</button><textarea value={bulkText} onChange={(event) => { setBulkText(event.target.value); setBulkResult(null); }} data-testid="input-bulk-csv-text" rows={8} className={`${inputClass} font-mono text-xs`} placeholder={"name,slug,price,stock,sizes,colors\nPremium Hoodie,premium-hoodie,1500,50,S;M;L,Black;White"} />{bulkText && <p className="text-xs text-[#687468]"><strong>{parseCsvToBulk(bulkText).length}</strong> valid rows detected</p>}{bulkResult && <div className={`rounded-xl border p-3 ${bulkResult.failed ? "border-[#f2d69b] bg-[#fff9eb]" : "border-[#b9e3c7] bg-[#f0fbf3]"}`}><p className="text-sm font-bold">{bulkResult.success} added, {bulkResult.failed} failed</p>{bulkResult.errors?.slice(0, 8).map((error, index) => <p key={index} className="mt-1 text-xs text-red-500">{error}</p>)}</div>}<button type="button" data-testid="button-submit-bulk-upload" onClick={() => void handleBulkUpload()} disabled={bulkUploading || !bulkText.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e85d04] py-3.5 text-sm font-bold text-white disabled:opacity-50">{bulkUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{bulkUploading ? "Importing…" : "Import products"}</button></div></div></div>}

      <ConfirmDialog open={deleteConfirm !== null} title={`Delete "${deleteConfirm?.name}"?`} description="This action cannot be undone. The product will be permanently removed." confirmText="Delete product" onConfirm={() => { if (deleteConfirm) void handleDelete(deleteConfirm.id); setDeleteConfirm(null); }} onCancel={() => setDeleteConfirm(null)} />
    </AdminLayout>
  );
}