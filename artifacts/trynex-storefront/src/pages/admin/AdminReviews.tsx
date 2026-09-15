import { AdminLayout } from "@/components/layout/AdminLayout";
import { getAuthHeaders } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Star, CheckCircle2, Trash2, Loader2, AlertCircle, RefreshCw, MessageSquare } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useListAdminReviews,
  useApproveReview,
  useDeleteReview,
  type Review,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminReviews() {
  const reqOpts = { request: { headers: getAuthHeaders() }, query: { staleTime: 0, refetchOnMount: "always" as const } };
  const queryClient = useQueryClient();
  const { data: reviewsData, isLoading: loading, isError, refetch, isFetching } = useListAdminReviews(reqOpts);
  const approveMutation = useApproveReview();
  const deleteMutationHook = useDeleteReview();

  const reviews: Review[] = reviewsData?.reviews ?? [];

  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const { toast } = useToast();

  const invalidateReviews = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });

  const approveReview = async (id: number) => {
    setActionLoading(id);
    try {
      await approveMutation.mutateAsync({ id, ...reqOpts });
      toast({ title: "Review approved" });
      invalidateReviews();
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteReview = async (id: number) => {
    setActionLoading(id);
    try {
      await deleteMutationHook.mutateAsync({ id, ...reqOpts });
      toast({ title: "Review deleted" });
      invalidateReviews();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = reviews.filter(r => {
    if (filter === "pending") return !r.approved;
    if (filter === "approved") return r.approved;
    return true;
  });

  const pendingCount = reviews.filter(r => !r.approved).length;
  const approvedCount = reviews.length - pendingCount;
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-1">Customer voice</p>
            <h1 className="text-2xl font-black font-display text-gray-900">Customer Reviews</h1>
            <p className="text-sm text-gray-500 mt-1">
              {reviews.length} total · {pendingCount} pending approval
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
            aria-label="Refresh reviews"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total reviews", value: reviews.length, icon: MessageSquare, className: "bg-orange-50 text-orange-600" },
            { label: "Pending", value: pendingCount, icon: AlertCircle, className: "bg-amber-50 text-amber-600" },
            { label: "Published", value: approvedCount, icon: CheckCircle2, className: "bg-green-50 text-green-600" },
            { label: "Average rating", value: averageRating, icon: Star, className: "bg-blue-50 text-blue-600" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${stat.className}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-black text-gray-900">{stat.value}</p>
              <p className="mt-0.5 text-xs font-bold text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["all", "pending", "approved"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === f
                  ? "text-white shadow-md"
                  : "text-gray-500 bg-gray-100 hover:bg-gray-200"
              }`}
              style={filter === f ? { background: "linear-gradient(135deg, #E85D04, #FB8500)" } : {}}>
              {f === "all" ? "All" : f === "pending" ? `Pending (${pendingCount})` : "Approved"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 py-16 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
            <p className="font-bold text-red-900">Reviews could not be loaded</p>
            <p className="mt-1 text-sm text-red-700">Try refreshing the review queue.</p>
            <button type="button" onClick={() => refetch()} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-semibold">No reviews found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px] space-y-3 pb-4">
              {filtered.map(review => (
                <div key={review.id} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0"
                        style={{ background: "linear-gradient(135deg, #E85D04, #FB8500)" }}>
                        {review.customerName?.[0] || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 flex items-center gap-2">
                          {review.customerName}
                          {review.verified && (
                            <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-bold border border-green-100">Verified Buyer</span>
                          )}
                          {!review.approved && (
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-bold border border-amber-100">Pending</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{review.customerEmail} · Product #{review.productId} · {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star key={j} className="w-3.5 h-3.5" style={{ fill: j < review.rating ? "#FB8500" : "#e5e7eb", color: j < review.rating ? "#FB8500" : "#e5e7eb" }} />
                        ))}
                      </div>
                      {!review.approved && (
                         <button onClick={() => approveReview(review.id)} disabled={actionLoading === review.id} aria-label={`Approve review from ${review.customerName}`}
                          className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-40">
                          {actionLoading === review.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      )}
                       <button onClick={() => setDeleteConfirm(review.id)} disabled={actionLoading === review.id} aria-label={`Delete review from ${review.customerName}`}
                        className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {review.text && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{review.text}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Delete this review?"
        description="This action cannot be undone. The review will be permanently removed."
        confirmText="Delete Review"
        onConfirm={() => {
          if (deleteConfirm !== null) {
            deleteReview(deleteConfirm);
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </AdminLayout>
  );
}
