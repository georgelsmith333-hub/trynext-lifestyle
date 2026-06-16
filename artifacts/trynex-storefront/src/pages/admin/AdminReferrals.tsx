import { AdminLayout } from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl, formatPrice, getAuthHeaders } from "@/lib/utils";
import { Share2, Trash2, ToggleLeft, ToggleRight, RefreshCw, TrendingUp, Users, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Referral {
  id: number;
  referralCode: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  usedCount: number;
  totalEarnings: string;
  active: boolean;
  createdAt: string;
}

function authHeaders() {
  return getAuthHeaders();
}

export default function AdminReferrals() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<{ referrals: Referral[] }>({
    queryKey: ["/api/referrals"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/referrals"), { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load referrals");
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const referrals = data?.referrals ?? [];

  const { mutateAsync: patchReferral } = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await fetch(getApiUrl(`/api/referrals/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/referrals"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { mutateAsync: deleteReferral } = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(getApiUrl(`/api/referrals/${id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/referrals"] });
      toast({ title: "Referral deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalUses = referrals.reduce((s, r) => s + (r.usedCount || 0), 0);
  const totalEarnings = referrals.reduce((s, r) => s + parseFloat(r.totalEarnings || "0"), 0);
  const activeCount = referrals.filter(r => r.active).length;

  return (
    <AdminLayout>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-1">Referral Program</p>
          <h1 className="text-3xl font-black font-display tracking-tight text-gray-900">Referrals</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer referral codes and track earnings</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-orange-300 hover:text-orange-600 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: "Total Referral Links", value: String(referrals.length), icon: Users, color: "#E85D04", bg: "#fff7ed", border: "#fed7aa" },
          { label: "Total Uses", value: String(totalUses), icon: TrendingUp, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
          { label: "Total Commission Earned", value: `৳${totalEarnings.toLocaleString()}`, icon: DollarSign, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl border shadow-sm p-6" style={{ borderColor: card.border }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
              </div>
              <p className="text-2xl font-black text-gray-900 mb-1">{card.value}</p>
              <p className="text-xs text-gray-400 font-medium">{card.label}</p>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
      ) : referrals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#fff7ed" }}>
            <Share2 className="w-7 h-7 text-orange-400" />
          </div>
          <h3 className="text-base font-black text-gray-800 mb-1">No referrals yet</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Customers generate their own referral codes automatically. Share the referral program link on your storefront to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Code</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Uses</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Commission</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Created</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {referrals.map(ref => (
                  <tr key={ref.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{ref.ownerName}</p>
                      <p className="text-xs text-gray-400">{ref.ownerEmail}</p>
                      {ref.ownerPhone && <p className="text-xs text-gray-400">{ref.ownerPhone}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg text-xs">
                        {ref.referralCode}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-gray-800">{ref.usedCount || 0}</span>
                      <span className="text-gray-400 text-xs ml-1">times</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-green-600">৳{parseFloat(ref.totalEarnings || "0").toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      {ref.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">Paused</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title={ref.active ? "Pause" : "Activate"}
                          onClick={() => patchReferral({ id: ref.id, active: !ref.active })}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-orange-500"
                        >
                          {ref.active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Delete referral code for "${ref.ownerName}"? This cannot be undone.`)) {
                              deleteReferral(ref.id);
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs font-medium text-gray-400">
            {referrals.length} referral link{referrals.length !== 1 ? "s" : ""} · {activeCount} active · {totalUses} total uses
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
