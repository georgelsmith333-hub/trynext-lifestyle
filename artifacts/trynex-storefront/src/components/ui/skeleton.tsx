import { cn } from "@/lib/utils"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md",
        "bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 bg-[length:200%_100%]",
        className
      )}
      style={{ backgroundSize: "200% 100%", animation: "shimmer 1.8s ease-in-out infinite" }}
      {...props}
    />
  )
}

function ProductCardSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid #f0e8e0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
      aria-label="Loading product"
    >
      <div
        className="aspect-[4/5] animate-pulse"
        style={{ background: "linear-gradient(135deg, #f9f5f2, #f3ede8)" }}
      />
      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-2.5 w-2.5 rounded-full" />
          ))}
          <Skeleton className="h-2.5 w-6 ml-1" />
        </div>
        <Skeleton className="h-4 w-4/5 rounded-lg" />
        <Skeleton className="h-3.5 w-3/5 rounded-lg" />
        <div className="flex items-center gap-1.5 pt-0.5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-4 rounded-full" />
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-20 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function BlogCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100" aria-label="Loading post">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-3 w-1/4 rounded-full" />
        <Skeleton className="h-5 w-5/6 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4 rounded-lg" />
      </div>
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4" aria-label="Loading order">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-48 rounded-lg" />
      <div className="flex gap-3">
        <Skeleton className="h-16 w-16 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-1/2 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function AdminTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white border border-gray-100">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/5 rounded-md" />
            <Skeleton className="h-3 w-1/4 rounded-md" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Image gallery */}
          <div className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-3xl" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="w-16 h-16 rounded-xl flex-shrink-0" />
              ))}
            </div>
          </div>
          {/* Product info */}
          <div className="space-y-5">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-9 w-4/5 rounded-xl" />
            <Skeleton className="h-7 w-32 rounded-lg" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-5/6 rounded-lg" />
              <Skeleton className="h-4 w-3/4 rounded-lg" />
            </div>
            <div className="pt-2 space-y-3">
              <Skeleton className="h-5 w-20 rounded-lg" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-14 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="pt-2 space-y-3">
              <Skeleton className="h-5 w-16 rounded-lg" />
              <div className="flex gap-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-20 rounded-full" />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-13 flex-1 rounded-2xl" />
              <Skeleton className="h-13 w-14 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export { Skeleton, ProductCardSkeleton, BlogCardSkeleton, OrderSkeleton, ProductDetailSkeleton, AdminTableSkeleton }
